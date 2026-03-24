import { handleProxyRequest } from '../../src/proxy-handler';

export const onRequest = async (context: { request: Request; params: Record<string, string | string[] | undefined> }) => {
	const { request, params } = context;
	const url = new URL(request.url);

	if (!url.pathname.startsWith('/proxy/')) {
		return new Response('Not Found', { status: 404 });
	}

	const pathParam = params.path;
	const pathArray = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
	const targetPath = '/' + pathArray.join('/') + url.search;

	let targetUrl: URL;
	try {
		targetUrl = new URL(targetPath);
	} catch {
		return new Response('Invalid target URL', { status: 400, statusText: 'Bad Request' });
	}

	return handleProxyRequest({ request, targetUrl });
};
