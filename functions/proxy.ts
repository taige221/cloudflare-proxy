import { handleProxyRequest } from '../src/proxy-handler';

export const onRequest = async (context: { request: Request }) => {
	const { request } = context;
	const url = new URL(request.url);

	const targetUrlStr = url.searchParams.get('url');

	if (!targetUrlStr) {
		return new Response('Missing url parameter. Usage: /proxy?url=https://example.com', { status: 400 });
	}

	let targetUrl: URL;
	try {
		targetUrl = new URL(targetUrlStr);
	} catch {
		return new Response('Invalid target URL', { status: 400 });
	}

	return handleProxyRequest({ request, targetUrl });
};
