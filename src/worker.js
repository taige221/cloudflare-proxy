const ROUTES = {
  '/hupu': 'bbs.hupu.com',
  '/weibo': 'weibo.com',
  '/twitter': 'twitter.com',
};

const DEFAULT_TARGET = 'bbs.hupu.com';

function matchTarget(pathname) {
  for (const [prefix, host] of Object.entries(ROUTES)) {
    if (pathname.startsWith(prefix)) {
      return { host, prefix };
    }
  }
  return { host: DEFAULT_TARGET, prefix: '' };
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const { host, prefix } = matchTarget(url.pathname);

  const targetPath = prefix ? url.pathname.slice(prefix.length) || '/' : url.pathname;
  const proxyUrl = new URL(`https://${host}${targetPath}${url.search}`);

  const headers = new Headers(request.headers);
  headers.set('Host', host);
  headers.delete('Referer');
  headers.delete('Origin');

  const modifiedRequest = new Request(proxyUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'follow'
  });

  try {
    const response = await fetch(modifiedRequest);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 500 });
  }
}

export default {
  fetch: handleRequest,
};
