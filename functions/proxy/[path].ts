import { handleProxyRequest } from '../../src/proxy-handler';

export const onRequest = async (context: { request: Request; params: Record<string, string> }) => {
	const { request, params } = context;

	const pathParam = params.path;

	let targetPath: string;
	try {
		const url = new URL('http://localhost');
		url.pathname = '/' + pathParam;
		url.search = new URL(request.url).search;
		targetPath = url.toString().replace('http://localhost', '');
	} catch {
		return new Response('Invalid target URL', { status: 400, statusText: 'Bad Request' });
	}

	let targetUrl: URL;
	try {
		targetUrl = new URL(targetPath);
	} catch {
		return new Response('Invalid target URL', { status: 400, statusText: 'Bad Request' });
	}

	return handleProxyRequest({ request, targetUrl });
};
