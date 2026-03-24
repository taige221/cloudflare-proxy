const targetHost = 'bbs.hupu.com';
const targetUrl = `https://${targetHost}`;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // 构造新的请求 URL，保留原路径和查询参数
  const proxyUrl = new URL(targetUrl + url.pathname + url.search);
  
  // 复制原始请求头，但修改 Host 头为目标域名
  const headers = new Headers(request.headers);
  headers.set('Host', targetHost);
  // 可选：移除一些可能导致问题的头
  headers.delete('Referer');
  headers.delete('Origin');
  
  // 创建新的请求
  const modifiedRequest = new Request(proxyUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'follow'
  });
  
  // 发送请求并返回响应
  try {
    const response = await fetch(modifiedRequest);
    
    // 创建新响应，可添加自定义 CORS 头（如果前端需要）
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (error) {
    return new Response(`代理请求失败：${error.message}`, { status: 500 });
  }
}