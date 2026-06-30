/**
 * 品牌可选的精选字体（均来自 Google Fonts，已在 __root 注入加载）。
 * 用于品牌编辑器字体选择器 + 公开渲染/演示/导出预览的真实字体显示。
 */
export const BRAND_FONTS = [
  'Inter',
  'Manrope',
  'Sora',
  'Space Grotesk',
  'IBM Plex Sans',
  'Archivo',
  'Poppins',
  'Syne',
  'Bricolage Grotesque',
  'Unbounded',
  'Anton',
  'Familjen Grotesk',
  'Noto Sans SC',
] as const;

// Google Fonts CSS（family 名空格转 +）
export const BRAND_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  [
    'Inter:wght@400;500;700',
    'Manrope:wght@400;700',
    'Sora:wght@400;700',
    'Space+Grotesk:wght@400;700',
    'IBM+Plex+Sans:wght@400;700',
    'Archivo:wght@400;700',
    'Poppins:wght@400;700',
    'Syne:wght@400;700',
    'Bricolage+Grotesque:wght@400;700',
    'Unbounded:wght@400;700',
    'Anton',
    'Familjen+Grotesk:wght@400;700',
    'Noto+Sans+SC:wght@400;700',
  ]
    .map((f) => `family=${f}`)
    .join('&') +
  '&display=swap';
