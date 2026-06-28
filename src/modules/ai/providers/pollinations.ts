import type { GenerateImageOptions, ImageProvider } from './types';

/**
 * Pollinations.ai 生图 —— 免费、无需 key。作为零成本默认 ImageProvider。
 * 返回直链 URL；P1 起改为下载后落 R2。
 */
export class PollinationsImageProvider implements ImageProvider {
  readonly name = 'pollinations';

  async generateImage(opts: GenerateImageOptions): Promise<{ url: string }> {
    const [w = 1280, h = 720] = (opts.size ?? '1280x720')
      .split('x')
      .map((n) => Number(n));
    const text = opts.style ? `${opts.prompt}, ${opts.style}` : opts.prompt;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      text
    )}?width=${w}&height=${h}&nologo=true`;
    return { url };
  }
}
