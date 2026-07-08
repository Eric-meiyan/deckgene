/**
 * 一次性脚本：把「整个 deck」里所有外链图片下载 → 转存到自有 Cloudflare R2
 * （deckgene-assets 桶）→ 把 slide.content 里的图片字段改成同域公开地址
 * https://deckgene.com/assets/<key>（由 Worker 路由 /assets/$ 提供）。
 *
 * 只处理这几个「图片字段」（含任意深度的嵌套 / 数组）：imageUrl、image、avatarUrl。
 * 绝不碰 buttonHref / url（链接）/ logos（文字）。
 *
 * 前置：本机已 `wrangler` 登录你的 Cloudflare 账号；Node 20+；项目已装 postgres。
 * 压缩：有 macOS `sips` 则等比缩到最长边 1600（保留原格式，不丢透明度）；无则原图上传。
 *
 * 用法（项目根目录；连接串走环境变量）：
 *   # 1) 干跑：只列出会转存哪些图，不上传不写库
 *   DATABASE_URL="postgres://…neon…?sslmode=require" \
 *     node scripts/rehost-deck-images.mjs deck_3k5A5ArQS2sA
 *   # 2) 确认后 --apply：真正上传 R2 + 写库
 *   DATABASE_URL="postgres://…neon…?sslmode=require" \
 *     node scripts/rehost-deck-images.mjs deck_3k5A5ArQS2sA --apply
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';

const deckId = process.argv[2] || 'deck_3k5A5ArQS2sA';
const APPLY = process.argv.includes('--apply');

const SITE = (process.env.APP_URL || 'https://deckgene.com').replace(
  /\/+$/,
  ''
);
const BUCKET = 'deckgene-assets';
const MAX_DIM = 1600;
const IMAGE_KEYS = new Set(['imageUrl', 'image', 'avatarUrl']); // 只改这些字段
const OK_CT = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']); // 白名单，拒 svg
const EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

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

/** 是否是"需要转存的外链图"：绝对 http(s) 且不在本站。 */
function isExternalHttp(v) {
  if (typeof v !== 'string' || !v) return false;
  if (v.startsWith('data:')) return false;
  if (v.startsWith(`${SITE}/assets/`)) return false;
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (v.startsWith(SITE)) return false; // 已是本站
    return true;
  } catch {
    return false;
  }
}

/** 递归收集 content 里所有图片字段的位置（parent 对象 + key + 原值）。 */
function collectImageRefs(node, refs) {
  if (Array.isArray(node)) {
    for (const item of node) collectImageRefs(item, refs);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (IMAGE_KEYS.has(k) && isExternalHttp(v))
        refs.push({ parent: node, key: k, url: v });
      else collectImageRefs(v, refs);
    }
  }
}

let sipsOk = true;
try {
  execFileSync('sips', ['--help'], { stdio: 'ignore' });
} catch {
  sipsOk = false;
}
const tmp = mkdtempSync(join(tmpdir(), 'rehost-deck-'));
const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

/** 下载 →（sips 等比缩，保留原格式）→ 本地文件 + 元信息。校验是图片，否则抛错。 */
async function fetchImage(url, tag) {
  const res = await fetch(toDownloadUrl(url));
  if (!res.ok) throw new Error(`下载失败 ${res.status}`);
  const ct = (res.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!OK_CT.has(ct)) throw new Error(`非白名单图片类型: ${ct || '未知'}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const ext = EXT[ct];
  const inPath = join(tmp, `${tag}.${ext}`);
  writeFileSync(inPath, raw);
  let outPath = inPath,
    outBytes = raw.length;
  if (sipsOk && ct !== 'image/gif') {
    // gif 不缩（sips 会丢动画帧）
    const o = join(tmp, `${tag}.out.${ext}`);
    try {
      execFileSync('sips', ['-Z', String(MAX_DIM), inPath, '--out', o], {
        stdio: 'ignore',
      });
      const oBytes = readFileSync(o).length;
      // 仅当缩放后确实更小才采用；否则（re-encode 反而变大）用原图。
      if (oBytes < raw.length) {
        outPath = o;
        outBytes = oBytes;
      }
    } catch {
      /* 缩放失败就用原图 */
    }
  }
  return { path: outPath, rawBytes: raw.length, outBytes, ct, ext };
}

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

  // 全 deck 去重：同一个源 URL 只上传一次，复用同一个 R2 key。
  const urlToNew = new Map();
  let seq = 0,
    found = 0,
    done = 0,
    skipped = 0;

  console.log(`deck ${deckId} 共 ${rows.length} 页，扫描图片字段…\n`);

  for (const row of rows) {
    const refs = [];
    collectImageRefs(row.content, refs);
    if (refs.length === 0) continue;
    let slideChanged = false;

    for (const ref of refs) {
      found++;
      if (urlToNew.has(ref.url)) {
        // 已处理过的相同 URL
        if (APPLY) {
          ref.parent[ref.key] = urlToNew.get(ref.url);
          slideChanged = true;
        }
        console.log(
          `  [第${row.order + 1}页 ${row.slide_type}.${ref.key}] 复用已转存: ${ref.url.slice(0, 70)}`
        );
        continue;
      }
      try {
        const info = await fetchImage(ref.url, `s${seq}`);
        const key = `deck/${deckId}/${row.id}-${seq}.${info.ext}`;
        const publicUrl = `${SITE}/assets/${key}`;
        console.log(
          `  [第${row.order + 1}页 ${row.slide_type}.${ref.key}] ${kb(info.rawBytes)}→${kb(info.outBytes)} ${info.ct}`
        );
        console.log(`     ${ref.url.slice(0, 70)}\n       → ${publicUrl}`);
        if (APPLY) {
          uploadR2(key, info.path, info.ct);
          ref.parent[ref.key] = publicUrl;
          slideChanged = true;
        }
        urlToNew.set(ref.url, publicUrl);
        seq++;
        done++;
      } catch (e) {
        skipped++;
        console.log(
          `  [第${row.order + 1}页 ${row.slide_type}.${ref.key}] ⚠ 跳过（保留原链接）：${e.message}`
        );
      }
    }

    if (APPLY && slideChanged) {
      // 写库容错：连接被池关闭时重试(postgres 会自动重连);仍失败则本页留待重跑。
      let ok = false;
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
        try {
          await sql`update slide set content = ${sql.json(row.content)}, updated_at = now() where id = ${row.id}`;
          ok = true;
        } catch (e) {
          console.log(
            `  第${row.order + 1}页 写库失败(第${attempt}次): ${e.message}`
          );
          await new Promise((r) => setTimeout(r, 800));
        }
      }
      if (!ok) skipped++; // 图已传 R2,但地址没写进库,重跑时会补上
    }
  }

  console.log(
    `\n统计：发现图片字段 ${found} 处 · 成功转存 ${done} · 跳过 ${skipped}`
  );
  if (!APPLY)
    console.log('（这是干跑，未上传未写库。确认后加 --apply 执行。）');
  else console.log('✓ 完成。刷新页面（Cmd+Shift+R）即可看到全部走本站地址。');
} catch (e) {
  console.error('✗', e.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
