// 从 misakaio/chnroutes2 抓取中国大陆 IPv4 CIDR 列表，
// 转成排序、去重、合并的 [start, end] uint32 区间，写入 src/chnroutes-data.ts。
// 运行：node scripts/build-chnroutes.mjs
import { writeFile } from "node:fs/promises";

const SOURCE = "https://raw.githubusercontent.com/misakaio/chnroutes2/master/chnroutes.txt";
const OUT = new URL("../src/chnroutes-data.ts", import.meta.url);

const ipToInt = (ip) =>
  ip.split(".").reduce((acc, oct) => (acc * 256 + Number(oct)) >>> 0, 0) >>> 0;

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`下载失败: ${res.status}`);
const text = await res.text();

const ranges = [];
for (const line of text.split("\n")) {
  const cidr = line.trim();
  if (!cidr || cidr.startsWith("#") || !cidr.includes("/")) continue;
  const [ip, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip) || bits < 0 || bits > 32) continue;
  const start = ipToInt(ip);
  const size = bits === 0 ? 2 ** 32 : 2 ** (32 - bits);
  const end = (start + size - 1) >>> 0;
  ranges.push([start, end]);
}

// 排序后合并相邻/重叠区间
ranges.sort((a, b) => a[0] - b[0]);
const merged = [];
for (const [s, e] of ranges) {
  const last = merged[merged.length - 1];
  if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
  else merged.push([s, e]);
}

// 展平成一维数组：[s0, e0, s1, e1, ...]，二分查找更省空间
const flat = merged.flat();
const body =
  "// 自动生成，请勿手改。源: misakaio/chnroutes2（APNIC 派生）。\n" +
  "// 运行 `node scripts/build-chnroutes.mjs` 刷新（GitHub Actions 每日自动更新）。\n" +
  `// ${merged.length} 个区间，覆盖中国大陆 IPv4。\n` +
  // 不写入生成时间戳：否则数据未变也会产生 diff，导致每天空提交与无谓部署
  "export const CN_RANGES: number[] = [\n" +
  flat.map((n, i) => (i % 12 === 0 ? "  " : "") + n + (i < flat.length - 1 ? "," : "") + (i % 12 === 11 ? "\n" : " ")).join("") +
  "\n];\n";

await writeFile(OUT, body);
console.log(`写入 ${merged.length} 个区间 → src/chnroutes-data.ts`);
