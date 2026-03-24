import { handleProxyRequest } from '../src/proxy-handler';

export const onRequest = async (context: { request: Request }) => {
	const { request } = context;
	const url = new URL(request.url);

	let pathAfterProxy = url.pathname.slice('/proxy/'.length) + url.search;

	if (pathAfterProxy.startsWith('/')) {
		pathAfterProxy = pathAfterProxy.slice(1);
	}

	if (!pathAfterProxy) {
		return new Response('Missing target URL. Usage: /proxy/https://example.com', { status: 400 });
	}

	let targetUrl: URL;
	try {
		targetUrl = new URL(pathAfterProxy);
	} catch {
		try {
			targetUrl = new URL(`https://${pathAfterProxy}`);
		} catch {
			return new Response('Invalid target URL', { status: 400 });
		}
	}

	return handleProxyRequest({ request, targetUrl });
};
