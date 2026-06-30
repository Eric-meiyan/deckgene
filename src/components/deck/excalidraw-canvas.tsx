import { useRef, useState } from 'react';
import { Excalidraw, exportToBlob, exportToSvg } from '@excalidraw/excalidraw';

import '@excalidraw/excalidraw/index.css';

import { uploadAsset } from '@/lib/upload-asset';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

/**
 * 全屏 Excalidraw 画布编辑器（仅客户端：父级懒加载，不进 SSR/Workers 包）。
 * 保存时导出 SVG(网页) + PNG(PPTX) + 场景 JSON(可再编辑)。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Scene = { elements?: any[]; appState?: any; files?: any };

export default function ExcalidrawCanvas({
  initial,
  onSave,
  onClose,
}: {
  initial?: Scene | null;
  onSave: (data: { scene: Scene; png: string; svg: string }) => void;
  onClose: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const api = apiRef.current;
    if (!api) return;
    setSaving(true);
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      // SVG：网页矢量显示（保留插入图片原始分辨率 + 文字矢量，永不糊）
      const svgEl = await exportToSvg({
        elements,
        appState: { ...appState, exportBackground: true },
        files,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' });
      // PNG：PPTX 导出用（pptxgenjs 嵌不了 SVG），2x 清晰
      const pngBlob = await exportToBlob({
        elements,
        appState: { ...appState, exportBackground: true, exportScale: 2 },
        files,
        mimeType: 'image/png',
      });
      // 两张都上传 R2，content 里只存 URL（不再背 base64）
      const [svg, png] = await Promise.all([
        uploadAsset(svgBlob, 'svg'),
        uploadAsset(pngBlob, 'png'),
      ]);
      // 只存可序列化的部分（去掉 collaborators 等非序列化字段）
      const scene: Scene = {
        elements,
        files,
        appState: { viewBackgroundColor: appState.viewBackgroundColor },
      };
      onSave({ scene, png, svg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="font-semibold">
          {m['settings.deck_editor.edit_canvas']()}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            {m['settings.deck_editor.canvas_close']()}
          </Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {m['settings.deck_editor.save']()}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Excalidraw
          excalidrawAPI={(api) => (apiRef.current = api)}
          initialData={
            initial?.elements
              ? {
                  elements: initial.elements,
                  files: initial.files,
                  appState: initial.appState,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
