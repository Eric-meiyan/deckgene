/**
 * 上传一个文件/Blob 到 R2（经 POST /api/assets），返回可直接用于 <img src> 的 URL
 * （形如 /assets/{key}，由本站 GET /assets/$ 路由从 R2 提供）。
 */
export async function uploadAsset(blob: Blob, ext: string): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
  const res = await fetch(`/api/assets?ext=${safeExt}`, {
    method: 'POST',
    headers: { 'content-type': blob.type || 'application/octet-stream' },
    body: blob,
  });
  const json = (await res.json()) as {
    code: number;
    message?: string;
    data?: { url: string };
  };
  if (json.code !== 0 || !json.data?.url) {
    throw new Error(json.message || 'upload failed');
  }
  return json.data.url;
}
