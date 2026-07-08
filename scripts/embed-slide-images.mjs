/**
 * 一次性脚本：把某个 deck 指定页里的若干图片「压缩后内嵌成 base64 data URI」，
 * 直接写回生产库的 slide.content（jsonb）。用于修复图片外链在中国无法访问的问题——
 * 内嵌后该图不再依赖 GitHub / jsDelivr 等外部域名，零外部请求，国内稳定显示。
 *
 * 用法（在项目根目录，本地机器上跑；连接串走环境变量，不落盘、不入库）：
 *
 *   # 先干跑（dry-run）：只打印找到的页 / 图片 / 压缩前后体积，不写库
 *   DATABASE_URL="postgres://…neon…/db?sslmode=require" \
 *     node scripts/embed-slide-images.mjs deck_3k5A5ArQS2sA 5 0,1
 *
 *   # 确认无误后加 --apply 才真正写库
 *   DATABASE_URL="postgres://…neon…/db?sslmode=require" \
 *     node scripts/embed-slide-images.mjs deck_3k5A5ArQS2sA 5 0,1 --apply
 *
 * 参数：
 *   argv[2] deckId       目标 deck id（默认 deck_3k5A5ArQS2sA）
 *   argv[3] page         第几页（1-based，默认 5）
 *   argv[4] indices      该页 images[] 里要处理的下标，逗号分隔（默认 0,1 = 第1、2张）
 *   --apply              真正写库（不加则只干跑）
 *
 * 依赖：项目已装的 `postgres`；压缩用 macOS 自带 `sips`（缺失则原图内嵌 + 告警）。
 * Node 20+（用到全局 fetch）。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';

const deckId = process.argv[2] || 'deck_3k5A5ArQS2sA';
const page = Number(process.argv[3] || '5');
const indices = (process.argv[4] || '0,1')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n >= 0);
const APPLY = process.argv.includes('--apply');

// 压缩参数：最长边缩到 1600px，转 JPEG 质量 72——清晰够用、体积可控。
const MAX_DIM = 1600;
const JPEG_QUALITY = 72;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('✗ 请通过环境变量 DATABASE_URL 提供生产库连接串');
  process.exit(1);
}

/** raw.githubusercontent.com → jsDelivr（下载更稳，绕开被墙/限流）。其它域名原样。 */
function toDownloadUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'raw.githubusercontent.com') {
      const p = u.pathname.replace(/^\/+/, '').split('/');
      if (p.length >= 4) {
        const [user, repo, branch, ...rest] = p;
        return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${rest.join('/')}${u.search}`;
      }
    }
  } catch {}
  return url;
}

let sipsOk = true;
try {
  execFileSync('sips', ['--help'], { stdio: 'ignore' });
} catch {
  sipsOk = false;
}

const tmp = mkdtempSync(join(tmpdir(), 'embed-img-'));

/** 下载 → (sips 压缩为 JPEG) → 返回 { dataUri, rawBytes, outBytes }。 */
async function fetchCompressEncode(url, tag) {
  const dl = toDownloadUrl(url);
  const res = await fetch(dl);
  if (!res.ok) throw new Error(`下载失败 ${res.status}: ${dl}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const inPath = join(tmp, `${tag}.in`);
  writeFileSync(inPath, raw);

  let outBuf = raw;
  let mime = res.headers.get('content-type') || 'image/png';
  if (sipsOk) {
    const outPath = join(tmp, `${tag}.jpg`);
    execFileSync(
      'sips',
      [
        '-Z',
        String(MAX_DIM),
        '--setProperty',
        'format',
        'jpeg',
        '--setProperty',
        'formatOptions',
        String(JPEG_QUALITY),
        inPath,
        '--out',
        outPath,
      ],
      { stdio: 'ignore' }
    );
    outBuf = readFileSync(outPath);
    mime = 'image/jpeg';
  }
  const dataUri = `data:${mime};base64,${outBuf.toString('base64')}`;
  return { dataUri, rawBytes: raw.length, outBytes: outBuf.length };
}

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

const sql = postgres(DB_URL, {
  ssl:
    DB_URL.includes('localhost') || DB_URL.includes('127.0.0.1')
      ? false
      : 'require',
  max: 1,
});

try {
  const rows = await sql`
    select id, "order", slide_type, content
    from slide where deck_id = ${deckId} order by "order" asc`;
  if (rows.length === 0)
    throw new Error(`deck 无 slide 或 deckId 不存在：${deckId}`);

  console.log(`deck ${deckId} 共 ${rows.length} 页：`);
  rows.forEach((r, i) => {
    const imgs = Array.isArray(r.content?.images) ? r.content.images.length : 0;
    console.log(
      `  第${i + 1}页 order=${r.order} type=${r.slide_type} images=${imgs}`
    );
  });

  const target = rows[page - 1];
  if (!target) throw new Error(`第 ${page} 页不存在（共 ${rows.length} 页）`);
  const content = target.content;
  const images = content?.images;
  if (!Array.isArray(images))
    throw new Error(
      `第 ${page} 页（type=${target.slide_type}）没有 images[] 结构，无法处理`
    );

  console.log(
    `\n目标：第${page}页 slide=${target.id} type=${target.slide_type}`
  );
  for (const idx of indices) {
    const item = images[idx];
    if (!item) {
      console.log(`  images[${idx}] 不存在，跳过`);
      continue;
    }
    console.log(
      `  images[${idx}] 当前 = ${String(item.imageUrl).slice(0, 90)}`
    );
  }

  console.log('\n处理中…');
  let changed = 0;
  for (const idx of indices) {
    const item = images[idx];
    if (!item || !item.imageUrl) continue;
    if (String(item.imageUrl).startsWith('data:')) {
      console.log(`  images[${idx}] 已是 data URI，跳过`);
      continue;
    }
    const { dataUri, rawBytes, outBytes } = await fetchCompressEncode(
      item.imageUrl,
      `img${idx}`
    );
    console.log(
      `  images[${idx}] 原图 ${kb(rawBytes)} → 压缩 ${kb(outBytes)} → base64 ${kb(dataUri.length)}`
    );
    item.imageUrl = dataUri;
    changed++;
  }

  if (!APPLY) {
    console.log(
      `\n[dry-run] 已就绪 ${changed} 张（未写库）。确认无误后加 --apply 重新运行以写入。`
    );
  } else if (changed > 0) {
    await sql`update slide set content = ${sql.json(content)}, updated_at = now() where id = ${target.id}`;
    console.log(
      `\n✓ 已写库：slide ${target.id} 更新 ${changed} 张图为内嵌 base64。`
    );
    console.log('  刷新页面（Cmd+Shift+R）即可看到。');
  } else {
    console.log('\n无可更新的图片。');
  }
} catch (e) {
  console.error('✗', e.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
