/**
 * 图片外链改写：把在中国大陆无法稳定访问的图床域名，改写成可访问的镜像 / 代理。
 *
 * 背景：deck 生成时文本 LLM 常直接把 `raw.githubusercontent.com/...` 之类的外链写进
 * slide 的 imageUrl（见 modules/deck/generation.service.ts），这些域名在国内被墙 / DNS
 * 污染，导致图片刷不出来。这里在渲染层做一次域名改写，存量 + 新增 deck 一并生效。
 *
 * 目前覆盖：GitHub raw（raw.githubusercontent.com）→ jsDelivr CDN 镜像。
 * 其它域名（含相对路径、自有 R2 域名）原样返回，不做任何改动。
 *
 * 注意：jsDelivr 在国内属于「一般可用但非 100% 稳定」。若要彻底稳定，应把外链图片
 * 转存到自有 R2 或国内对象存储（阿里云 OSS / 腾讯云 COS / 七牛）——那是后端层的方案。
 */
export function proxifyImage(url?: string | null): string {
  if (!url) return '';
  try {
    // 提供 base 使相对路径（如本地存储兜底的 /uploads/xxx）也能安全解析而不抛错；
    // 绝对 URL 会忽略 base。
    const u = new URL(url, 'https://_local_');
    if (u.hostname === 'raw.githubusercontent.com') {
      // /<user>/<repo>/<branch>/<...path>  →  jsDelivr: /gh/<user>/<repo>@<branch>/<...path>
      const parts = u.pathname.replace(/^\/+/, '').split('/');
      if (parts.length >= 4) {
        const [user, repo, branch, ...rest] = parts;
        return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${rest.join('/')}${u.search}`;
      }
    }
    return url;
  } catch {
    return url;
  }
}
