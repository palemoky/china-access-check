export interface Env {
  ASSETS: Fetcher;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/api/ip":
        return handleIp(request);
      case "/api/ping":
        // 极小响应，供前端测量到 Cloudflare 边缘的 RTT
        return new Response(null, {
          status: 204,
          headers: { "cache-control": "no-store" },
        });
      default:
        // run_worker_first 只匹配 /api/*，走到这里说明是未知的 API 路径
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: JSON_HEADERS,
        });
    }
  },
} satisfies ExportedHandler<Env>;

function handleIp(request: Request): Response {
  const cf = (request.cf ?? {}) as IncomingRequestCfProperties;

  const body = {
    ip: request.headers.get("cf-connecting-ip"),
    country: cf.country ?? null,
    region: cf.region ?? null,
    city: cf.city ?? null,
    timezone: cf.timezone ?? null,
    asn: cf.asn ?? null,
    asOrganization: cf.asOrganization ?? null,
    // 处理本次请求的 Cloudflare 数据中心（IATA 代码）。
    // Cloudflare 在中国大陆无公开节点，大陆直连用户通常落在 HKG/SJC/LAX/NRT 等境外节点。
    colo: cf.colo ?? null,
    // Cloudflare 边缘到客户端的 TCP RTT（毫秒）。全球绝大多数用户 < 50ms，
    // 大陆直连用户因跨境链路通常 > 100ms，是一个低成本的旁路信号。
    clientTcpRtt: cf.clientTcpRtt ?? null,
    httpProtocol: cf.httpProtocol ?? null,
    acceptLanguage: request.headers.get("accept-language"),
  };

  return new Response(JSON.stringify(body), { headers: JSON_HEADERS });
}
