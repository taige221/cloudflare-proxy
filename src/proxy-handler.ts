export interface ProxyOptions {
	request: Request;
	targetUrl: URL;
}

const BLOCKED_HEADERS = ['host', 'content-length', 'cf-', 'x-forwarded-for', 'x-real-ip'];
const BLOCKED_RESPONSE_HEADERS = ['content-encoding', 'transfer-encoding', 'content-length', 'connection'];
const PROXY_PREFIX = '/proxy/';

export type ProxyHandler = (context: { request: Request; params: Record<string, string> }) => Promise<Response>;

export async function handleProxyRequest(options: ProxyOptions): Promise<Response> {
	const { request, targetUrl } = options;

	if (!['http:', 'https:'].includes(targetUrl.protocol)) {
		return new Response('Unsupported protocol. Only HTTP and HTTPS are allowed.', {
			status: 400,
			statusText: 'Bad Request',
		});
	}

	const headers = new Headers();
	request.headers.forEach((value, key) => {
		if (!BLOCKED_HEADERS.some((blocked) => key.toLowerCase().startsWith(blocked))) {
			headers.set(key, value);
		}
	});

	headers.set('Host', targetUrl.host);
	headers.set('X-Forwarded-Host', new URL(request.url).host);

	const requestInit: RequestInit = {
		method: request.method,
		headers,
	};

	if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
		const contentType = headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			requestInit.body = await request.text();
		} else if (contentType.includes('application/x-www-form-urlencoded')) {
			requestInit.body = await request.text();
		} else if (contentType.includes('multipart/form-data')) {
			requestInit.body = await request.arrayBuffer();
		} else {
			requestInit.body = await request.text();
		}
	}

	try {
		const response = await fetch(targetUrl, requestInit);

		const contentType = response.headers.get('content-type') || '';

		const responseHeaders = new Headers();
		response.headers.forEach((value, key) => {
			if (!BLOCKED_RESPONSE_HEADERS.includes(key.toLowerCase())) {
				responseHeaders.set(key, value);
			}
		});

		responseHeaders.set('Access-Control-Allow-Origin', '*');
		responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
		responseHeaders.set('Access-Control-Allow-Headers', '*');

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: responseHeaders });
		}

		if (contentType.includes('text/html')) {
			const { rewriteHtml } = await import('./html-rewriter');
			const originalBody = await response.text();
			const baseUrl = targetUrl.toString();

			try {
				const rewrittenHtml = rewriteHtml(originalBody, {
					baseUrl,
					targetOrigin: targetUrl.origin,
				});
				return new Response(rewrittenHtml, {
					status: response.status,
					statusText: response.statusText,
					headers: responseHeaders,
				});
			} catch {
				return new Response(originalBody, {
					status: response.status,
					statusText: response.statusText,
					headers: responseHeaders,
				});
			}
		}

		const originalBody = await response.arrayBuffer();

		return new Response(originalBody, {
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
		});
	} catch (err) {
		const error = err as Error;
		return new Response(`Proxy request failed: ${error.message}`, {
			status: 502,
			statusText: 'Bad Gateway',
		});
	}
}

export function parseProxyUrl(url: URL): URL | null {
	if (!url.pathname.startsWith(PROXY_PREFIX)) {
		return null;
	}

	const targetUrlStr = decodeURIComponent(url.pathname.slice(PROXY_PREFIX.length)) + url.search;

	try {
		return new URL(targetUrlStr);
	} catch {
		return null;
	}
}
