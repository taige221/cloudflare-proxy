const PROXY_PREFIX = '/proxy/';
const BLOCKED_HEADERS = ['host', 'content-length', 'cf-', 'x-forwarded-for', 'x-real-ip'];
const BLOCKED_RESPONSE_HEADERS = ['content-encoding', 'transfer-encoding', 'content-length', 'connection'];

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (!url.pathname.startsWith(PROXY_PREFIX)) {
			return new Response('Not Found', { status: 404 });
		}

		const targetUrlStr = decodeURIComponent(url.pathname.slice(PROXY_PREFIX.length)) + url.search;

		let targetUrl: URL;
		try {
			targetUrl = new URL(targetUrlStr);
		} catch {
			return new Response('Invalid target URL', { status: 400, statusText: 'Bad Request' });
		}

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
		headers.set('X-Forwarded-Host', url.host);

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
	},
} satisfies ExportedHandler<Env>;
