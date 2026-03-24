import { handleProxyRequest, parseProxyUrl } from './proxy-handler';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (!url.pathname.startsWith('/proxy/')) {
			return new Response('Not Found', { status: 404 });
		}

		const targetUrl = parseProxyUrl(url);
		if (!targetUrl) {
			return new Response('Invalid target URL', { status: 400, statusText: 'Bad Request' });
		}

		return handleProxyRequest({ request, targetUrl });
	},
} satisfies ExportedHandler<Env>;
