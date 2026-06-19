import { readFileSync } from 'fs';
import { TLSError } from '../errors';

export type TLSMode = 'disable' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';

export interface TLSConfig {
	mode: TLSMode;
	caCertPath?: string | null;
	clientCertPath?: string | null;
	clientKeyPath?: string | null;
	serverName?: string | null;
}

export interface PostgresSSLOptions {
	rejectUnauthorized: boolean;
	ca?: string;
	cert?: string;
	key?: string;
	servername?: string;
}

export interface MySQLSSLOptions {
	rejectUnauthorized: boolean;
	ca?: string;
	cert?: string;
	key?: string;
}

export interface MongoTLSOptions {
	tls: boolean;
	tlsCAFile?: string;
	tlsCertificateKeyFile?: string;
	tlsAllowInvalidCertificates?: boolean;
	tlsAllowInvalidHostnames?: boolean;
}

/**
 * Build PostgreSQL ssl option from a TLS config.
 * Returns false for 'disable', true for 'prefer'/'require', or an options object
 * for 'verify-ca'/'verify-full'.
 */
export function buildPostgresSSL(
	config: TLSConfig,
): false | true | PostgresSSLOptions {
	switch (config.mode) {
		case 'disable':
			return false;
		case 'prefer':
			// pg driver falls back to plaintext if TLS not available when ssl is true
			return true;
		case 'require':
			return { rejectUnauthorized: false };
		case 'verify-ca':
			return {
				rejectUnauthorized: true,
				ca: config.caCertPath ? readCert(config.caCertPath) : undefined,
				cert: config.clientCertPath ? readCert(config.clientCertPath) : undefined,
				key: config.clientKeyPath ? readCert(config.clientKeyPath) : undefined,
			};
		case 'verify-full':
			return {
				rejectUnauthorized: true,
				ca: config.caCertPath ? readCert(config.caCertPath) : undefined,
				cert: config.clientCertPath ? readCert(config.clientCertPath) : undefined,
				key: config.clientKeyPath ? readCert(config.clientKeyPath) : undefined,
				servername: config.serverName ?? undefined,
			};
	}
}

/**
 * Build MySQL ssl option from a TLS config.
 * Returns undefined for 'disable', or an ssl options object otherwise.
 */
export function buildMySQLSSL(config: TLSConfig): undefined | MySQLSSLOptions {
	switch (config.mode) {
		case 'disable':
			return undefined;
		case 'prefer':
		case 'require':
			return { rejectUnauthorized: false };
		case 'verify-ca':
		case 'verify-full':
			return {
				rejectUnauthorized: true,
				ca: config.caCertPath ? readCert(config.caCertPath) : undefined,
				cert: config.clientCertPath ? readCert(config.clientCertPath) : undefined,
				key: config.clientKeyPath ? readCert(config.clientKeyPath) : undefined,
			};
	}
}

/**
 * Build MongoDB TLS options from a TLS config.
 * Returns empty object for 'disable'.
 */
export function buildMongoTLS(config: TLSConfig): MongoTLSOptions | Record<string, never> {
	switch (config.mode) {
		case 'disable':
			return {};
		case 'prefer':
		case 'require':
			return { tls: true, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true };
		case 'verify-ca':
			return {
				tls: true,
				tlsCAFile: config.caCertPath ?? undefined,
				tlsCertificateKeyFile: config.clientCertPath ?? undefined,
				tlsAllowInvalidHostnames: true,
			};
		case 'verify-full':
			return {
				tls: true,
				tlsCAFile: config.caCertPath ?? undefined,
				tlsCertificateKeyFile: config.clientCertPath ?? undefined,
			};
	}
}

/**
 * Parse a PEM-encoded certificate and return the expiry date (Not After).
 * Returns null if the certificate cannot be parsed.
 */
export function parseCertExpiry(pemContent: string): Date | null {
	try {
		// Extract the base64 body between -----BEGIN CERTIFICATE----- and -----END CERTIFICATE-----
		const match = pemContent.match(
			/-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/,
		);
		if (!match) return null;

		const der = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');

		// Walk the ASN.1 DER structure to find the validity Not After date.
		// DER: SEQUENCE (Certificate)
		//   SEQUENCE (tbsCertificate)
		//     [0] version (optional)
		//     INTEGER serialNumber
		//     SEQUENCE signatureAlgorithm
		//     SEQUENCE issuer
		//     SEQUENCE validity
		//       UTCTime/GeneralizedTime notBefore
		//       UTCTime/GeneralizedTime notAfter  <-- we want this

		let offset = 0;

		function readTag(): number {
			return der[offset++];
		}

		function readLength(): number {
			const first = der[offset++];
			if (first < 0x80) return first;
			const numBytes = first & 0x7f;
			let len = 0;
			for (let i = 0; i < numBytes; i++) {
				len = (len << 8) | der[offset++];
			}
			return len;
		}

		function skipValue(): void {
			const len = readLength();
			offset += len;
		}

		function enterSequence(): void {
			readLength(); // consume sequence length, we walk children
		}

		// Certificate SEQUENCE
		if (readTag() !== 0x30) return null;
		enterSequence();

		// tbsCertificate SEQUENCE
		if (readTag() !== 0x30) return null;
		enterSequence();

		// Optional [0] version
		if (der[offset] === 0xa0) {
			readTag();
			skipValue();
		}

		// serialNumber INTEGER
		if (readTag() !== 0x02) return null;
		skipValue();

		// signatureAlgorithm SEQUENCE
		if (readTag() !== 0x30) return null;
		skipValue();

		// issuer SEQUENCE
		if (readTag() !== 0x30) return null;
		skipValue();

		// validity SEQUENCE
		if (readTag() !== 0x30) return null;
		readLength(); // enter validity

		// notBefore — skip
		const notBeforeTag = readTag();
		if (notBeforeTag !== 0x17 && notBeforeTag !== 0x18) return null;
		skipValue();

		// notAfter — read it
		const notAfterTag = readTag();
		const notAfterLen = readLength();
		const notAfterBytes = der.slice(offset, offset + notAfterLen);
		const notAfterStr = notAfterBytes.toString('ascii');

		if (notAfterTag === 0x17) {
			// UTCTime: YYMMDDHHMMSSZ
			const yy = parseInt(notAfterStr.slice(0, 2), 10);
			const year = yy >= 50 ? 1900 + yy : 2000 + yy;
			const month = parseInt(notAfterStr.slice(2, 4), 10) - 1;
			const day = parseInt(notAfterStr.slice(4, 6), 10);
			const hour = parseInt(notAfterStr.slice(6, 8), 10);
			const min = parseInt(notAfterStr.slice(8, 10), 10);
			const sec = parseInt(notAfterStr.slice(10, 12), 10);
			return new Date(Date.UTC(year, month, day, hour, min, sec));
		} else if (notAfterTag === 0x18) {
			// GeneralizedTime: YYYYMMDDHHMMSSZ
			const year = parseInt(notAfterStr.slice(0, 4), 10);
			const month = parseInt(notAfterStr.slice(4, 6), 10) - 1;
			const day = parseInt(notAfterStr.slice(6, 8), 10);
			const hour = parseInt(notAfterStr.slice(8, 10), 10);
			const min = parseInt(notAfterStr.slice(10, 12), 10);
			const sec = parseInt(notAfterStr.slice(12, 14), 10);
			return new Date(Date.UTC(year, month, day, hour, min, sec));
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Check certificate expiry status from a PEM file path.
 * Returns: 'ok' | 'expiring-soon' (< 30 days) | 'expired' | 'unreadable'
 */
export function checkCertExpiry(
	certPath: string,
): { status: 'ok' | 'expiring-soon' | 'expired' | 'unreadable'; expiresAt?: Date } {
	try {
		const pem = readFileSync(certPath, 'utf-8');
		const expiresAt = parseCertExpiry(pem);
		if (!expiresAt) return { status: 'unreadable' };

		const now = Date.now();
		const msUntilExpiry = expiresAt.getTime() - now;
		const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

		if (msUntilExpiry < 0) return { status: 'expired', expiresAt };
		if (msUntilExpiry < thirtyDaysMs) return { status: 'expiring-soon', expiresAt };
		return { status: 'ok', expiresAt };
	} catch {
		return { status: 'unreadable' };
	}
}

function readCert(filePath: string): string {
	try {
		return readFileSync(filePath, 'utf-8');
	} catch (err) {
		throw new TLSError(
			`Cannot read certificate file "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}
