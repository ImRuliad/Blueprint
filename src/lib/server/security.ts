const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function isAllowedHost(host: string): boolean {
	let hostname: string;

	if (host.startsWith('[')) {
		// Bracketed IPv6 like [::1]:8080
		const closeBracket = host.indexOf(']');
		if (closeBracket === -1) return false;
		hostname = host.slice(1, closeBracket);
		return ALLOWED_HOSTS.has(`[${hostname.toLowerCase()}]`) || ALLOWED_HOSTS.has(hostname.toLowerCase());
	}

	// Unbracketed IPv6 like ::1 — multiple colons, no port stripping
	if ((host.match(/:/g) ?? []).length > 1) {
		return ALLOWED_HOSTS.has(host.toLowerCase());
	}

	// hostname or IPv4 — split on first colon to separate host from port
	const colonIdx = host.indexOf(':');
	if (colonIdx === -1) {
		hostname = host;
	} else {
		hostname = host.slice(0, colonIdx);
		const port = host.slice(colonIdx + 1);
		if (!/^\d+$/.test(port)) return false;
	}
	return ALLOWED_HOSTS.has(hostname.toLowerCase());
}
