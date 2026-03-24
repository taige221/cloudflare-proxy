import { handleProxyRequest } from '../../src/proxy-handler';

export const onRequest = async (context: { request: Request; params: Record<string, string> }) => {
	const { request } = context;
	const originalUrl = new URL(request.url);

	const pathAfterProxy = originalUrl.pathname.slice('/proxy/'.length) + originalUrl.search;

	if (!pathAfterProxy) {
		return new Response('Not Found', { status: 404 });
	}

	let targetUrl: URL;
	try {
		targetUrl = new URL(pathAfterProxy);
	} catch {
		return new Response('Invalid target URL', { status: 400, statusText: 'Bad Request' });
	}

	return handleProxyRequest({ request, targetUrl });
};
