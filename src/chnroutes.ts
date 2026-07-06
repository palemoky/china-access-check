import { CN_RANGES } from "./chnroutes-data";

/** 点分十进制 IPv4 转 uint32，非法输入返回 null */
export function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let acc = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    acc = (acc * 256 + n) >>> 0;
  }
  return acc >>> 0;
}

/**
 * 判断一个 IPv4 是否属于中国大陆（基于 chnroutes CIDR 列表二分查找）。
 * CN_RANGES 是展平的 [start0, end0, start1, end1, ...]，升序不重叠。
 * IPv6 或非法输入一律返回 false（此列表仅覆盖 IPv4）。
 */
export function isChinaIP(ip: string): boolean {
  const v = ipToInt(ip);
  if (v === null) return false;
  let lo = 0;
  let hi = CN_RANGES.length / 2 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const start = CN_RANGES[mid * 2];
    const end = CN_RANGES[mid * 2 + 1];
    if (v < start) hi = mid - 1;
    else if (v > end) lo = mid + 1;
    else return true;
  }
  return false;
}
