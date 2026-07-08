/**
 * 一次性脚本：把某个 deck 指定页里的若干外链图片「下载 → 压缩 → 转存到你自己的
 * Cloudflare R2（deckgene-assets 桶）」，并把 slide.content 里的 imageUrl 改成
 * 同域公开地址 https://deckgene.com/assets/<key>（由 Worker 路由 /assets/$ 提供）。
 *
 * 为什么这样能在中国稳定：地址在 deckgene.com 自己域名下、走你站点同一套 Cloudflare，
 * 访问性和打开 deckgene.com 一致，不依赖 GitHub / jsDelivr / r2.dev。
 *
 * 前置：
 *   - 本机已 `wrangler` 登录到你的 Cloudflare 账号（npx wrangler whoami 可验证）。
 *   - macOS（用自带 sips 压缩；缺失则上传原图 + 告警）。
 *   - Node 20+（全局 fetch）。项目已装 postgres 驱动。
 *
 * 用法（项目根目录；连接串走环境变量，不发我、不入库、不落盘）：
 *
 *   # 1) 干跑：只下载+压缩+打印，不上传、不写库
 *   DATABASE_URL="postgres://…neon…?sslmode=require" \
 *     node scripts/rehost-slide-images.mjs deck_3k5A5ArQS2sA 5 0,1
 *
 *   # 2) 确认无误后 --apply：真正上传 R2 + 写库
 *   DATABASE_URL="postgres://…neon…?sslmode=require" \
 *     node scripts/rehost-slide-images.mjs deck_3k5A5ArQS2sA 5 0,1 --apply
 *
 * 参数：argv[2]=deckId(默认 deck_3k5A5ArQS2sA) argv[3]=第几页(1-based,默认5)
 *       argv[4]=该页 images[] 下标逗号分隔(默认 0,1) --apply=真正执行
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

const SITE = (process.env.APP_URL || 'https://deckgene.com').replace(
  /\/+$/,
  ''
);
const BUCKET = 'deckgene-assets';
const MAX_DIM = 1600; // 压缩：最长边像素
const JPEG_QUALITY = 72; // 压缩：JPEG 质量

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('✗ 请通过环境变量 DATABASE_URL 提供生产库连接串');
  process.exit(1);
}

/** raw.githubusercontent.com → jsDelivr（下载更稳）。其它域名原样。 */
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

const tmp = mkdtempSync(join(tmpdir(), 'rehost-'));
const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

/** 下载 →(sips 压缩 JPEG)→ 返回本地文件路径 + 体积信息。 */
async function fetchCompress(url, tag) {
  const dl = toDownloadUrl(url);
  const res = await fetch(dl);
  if (!res.ok) throw new Error(`下载失败 ${res.status}: ${dl}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const inPath = join(tmp, `${tag}.in`);
  writeFileSync(inPath, raw);
  if (!sipsOk)
    return {
      path: inPath,
      rawBytes: raw.length,
      outBytes: raw.length,
      ext: 'png',
      ct: 'image/png',
    };
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
  return {
    path: outPath,
    rawBytes: raw.length,
    outBytes: readFileSync(outPath).length,
    ext: 'jpg',
    ct: 'image/jpeg',
  };
}

/** wrangler 上传到 R2（--remote 打到真实桶）。 */
function uploadR2(key, filePath, contentType) {
  execFileSync(
    'npx',
    [
      'wrangler',
      'r2',
      'object',
      'put',
      `${BUCKET}/${key}`,
      '--file',
      filePath,
      '--content-type',
      contentType,
      '--remote',
    ],
    { stdio: 'ignore' }
  );
}

const sql = postgres(DB_URL, {
  ssl:
    DB_URL.includes('localhost') || DB_URL.includes('127.0.0.1')
      ? false
      : 'require',
  max: 1,
});

try {
  const rows = await sql`
    select id, "order", slide_type, content from slide
    where deck_id = ${deckId} order by "order" asc`;
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
      `第 ${page} 页（type=${target.slide_type}）无 images[] 结构`
    );

  console.log(
    `\n目标：第${page}页 slide=${target.id} type=${target.slide_type}`
  );
  let changed = 0;
  for (const idx of indices) {
    const item = images[idx];
    if (!item || !item.imageUrl) {
      console.log(`  images[${idx}] 不存在/无 url，跳过`);
      continue;
    }
    if (String(item.imageUrl).startsWith(`${SITE}/assets/`)) {
      console.log(`  images[${idx}] 已是本站地址，跳过`);
      continue;
    }
    console.log(`  images[${idx}] 源 = ${String(item.imageUrl).slice(0, 90)}`);
    const info = await fetchCompress(item.imageUrl, `img${idx}`);
    const key = `deck/${deckId}/${target.id}-${idx}.${info.ext}`;
    const publicUrl = `${SITE}/assets/${key}`;
    console.log(
      `    原图 ${kb(info.rawBytes)} → 压缩 ${kb(info.outBytes)} → key ${key}`
    );
    if (APPLY) {
      uploadR2(key, info.path, info.ct);
      item.imageUrl = publicUrl;
      console.log(`    ✓ 已传 R2 → ${publicUrl}`);
    } else {
      console.log(`    [dry-run] 将上传到 ${publicUrl}`);
    }
    changed++;
  }

  if (!APPLY) {
    console.log(
      `\n[dry-run] 就绪 ${changed} 张（未上传、未写库）。确认无误后加 --apply。`
    );
  } else if (changed > 0) {
    await sql`update slide set content = ${sql.json(content)}, updated_at = now() where id = ${target.id}`;
    console.log(
      `\n✓ 已写库：slide ${target.id} 的 ${changed} 张图改为本站 R2 地址。刷新页面（Cmd+Shift+R）即可。`
    );
  } else {
    console.log('\n无可更新的图片。');
  }
} catch (e) {
  console.error('✗', e.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
