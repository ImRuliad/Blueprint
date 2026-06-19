const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function isAllowedHost(host: string): boolean {
	// Bracketed IPv6 like [::1]:8080 — strip the port after the closing bracket
	if (host.startsWith('[')) {
		const hostname = host.replace(/\]:(\d+)$/, ']').slice(1, -1);
		return ALLOWED_HOSTS.has(`[${hostname}]`) || ALLOWED_HOSTS.has(hostname);
	}
	// Unbracketed IPv6 like ::1 — contains more than one colon, no port stripping
	if ((host.match(/:/g) ?? []).length > 1) {
		return ALLOWED_HOSTS.has(host);
	}
	// hostname or IPv4 with optional :port
	const hostname = host.replace(/:\d+$/, '');
	return ALLOWED_HOSTS.has(hostname);
}
