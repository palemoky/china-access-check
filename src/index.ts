import { isChinaIP } from "./chnroutes";

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
      case "/api/ip-china":
        // 判断任意 IPv4 是否属于中国大陆（供 WebRTC 泄露检测比对泄露的公网 IP）
        return handleIpChina(url);
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
  const ip = request.headers.get("cf-connecting-ip");

  const body = {
    ip,
    country: cf.country ?? null,
    region: cf.region ?? null,
    city: cf.city ?? null,
    timezone: cf.timezone ?? null,
    asn: cf.asn ?? null,
    asOrganization: cf.asOrganization ?? null,
    // 处理本次请求的 Cloudflare 数据中心（IATA 代码）。
    // Cloudflare 在中国大陆无公开节点，大陆直连用户通常落在 HKG/SJC/LAX/NRT 等境外节点。
    colo: cf.colo ?? null,
    httpProtocol: cf.httpProtocol ?? null,
    acceptLanguage: request.headers.get("accept-language"),
    // 用 chnroutes 独立核对 HTTP 出口 IP 是否在大陆（与 cf.country 互为佐证）
    ipInChina: ip ? isChinaIP(ip) : null,
  };

  return new Response(JSON.stringify(body), { headers: JSON_HEADERS });
}

function handleIpChina(url: URL): Response {
  const ip = url.searchParams.get("ip") ?? "";
  return new Response(JSON.stringify({ ip, china: isChinaIP(ip) }), {
    headers: JSON_HEADERS,
  });
}
