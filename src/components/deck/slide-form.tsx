import { Plus, Trash2 } from 'lucide-react';

import { getSlideTemplate } from '@/modules/deck/templates/registry';
import { getLocale } from '@/paraglide/runtime.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

/**
 * 从 slide_type 的 zod schema 自动生成的表单（替代手写 JSON）。
 * 受控：content 为唯一数据源，编辑回调 onChange(新 content)。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Z = any;
interface Field {
  kind:
    | 'string'
    | 'number'
    | 'enum'
    | 'array-object'
    | 'array-string'
    | 'object'
    | 'unsupported';
  name: string;
  label: string;
  optional: boolean;
  long?: boolean;
  values?: string[];
  fields?: Field[]; // for object / array-object
}

const isZh = () => getLocale() === 'zh';
const tt = (zh: string, en: string) => (isZh() ? zh : en);

const LABELS_ZH: Record<string, string> = {
  variant: '表面色调',
  layoutVariant: '版式',
  indent: '左缩进(px)',
  fontScale: '整体缩放(%)',
  title: '标题',
  subtitle: '副标题',
  heading: '标题',
  eyebrow: '眉标',
  items: '列表项',
  text: '文本',
  detail: '说明',
  label: '标签',
  value: '数值',
  stats: '数据',
  steps: '步骤',
  body: '正文',
  left: '左侧',
  right: '右侧',
  footnote: '脚注',
  caption: '图注',
  source: '来源',
  client: '客户',
  date: '日期',
  number: '编号',
  attribution: '署名',
  kpis: 'KPI',
  delta: '变化',
  trend: '趋势',
  series: '数据序列',
  note: '备注',
  chartType: '图表类型',
  strengths: '优势',
  weaknesses: '劣势',
  opportunities: '机会',
  threats: '威胁',
  problem: '问题',
  solution: '方案',
  result: '结果',
  name: '名称',
  email: '邮箱',
  links: '链接',
  url: '网址',
  buttonLabel: '按钮文字',
  buttonHref: '按钮链接',
  image: '配图链接',
  imageUrl: '图片链接',
  fit: '图片填充',
  imageSide: '图片位置',
  bullets: '要点',
  events: '事件',
  align: '对齐',
  size: '字号',
};
const ENUM_ZH: Record<string, string> = {
  light: '浅色',
  subtle: '柔和',
  dark: '深色',
  accent: '品牌色',
  up: '上升',
  down: '下降',
  flat: '持平',
  left: '左对齐',
  center: '居中',
  right: '右对齐',
  sm: '小',
  md: '中',
  lg: '大',
  cover: '填充(裁切)',
  contain: '完整(留白)',
};
const ENUM_EN: Record<string, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  cover: 'Fill (crop)',
  contain: 'Fit (whole)',
};

// 英文：把 key 拆词首字母大写（buttonHref → Button Href）
function humanize(k: string) {
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
const LABELS_EN: Record<string, string> = {
  variant: 'Surface',
  layoutVariant: 'Layout',
  indent: 'Left indent (px)',
  fontScale: 'Scale (%)',
};
function labelFor(k: string) {
  return isZh() ? (LABELS_ZH[k] ?? humanize(k)) : (LABELS_EN[k] ?? humanize(k));
}
function enumLabel(v: string) {
  return isZh() ? (ENUM_ZH[v] ?? v) : (ENUM_EN[v] ?? humanize(v));
}

function unwrap(v: Z): { node: Z; optional: boolean } {
  let optional = false;
  let n = v;
  while (n?._def) {
    const t = n._def.type;
    if (t === 'optional' || t === 'nullable') {
      optional = true;
      n = n._def.innerType;
    } else if (t === 'default' || t === 'catch') {
      n = n._def.innerType;
    } else if (t === 'pipe') {
      n = n._def.out ?? n._def.in;
    } else break;
  }
  return { node: n, optional };
}

function strMax(node: Z): number {
  for (const c of node._def.checks ?? []) {
    const d = c?._zod?.def ?? c?.def ?? c;
    if (d?.check === 'max_length') return d?.maximum ?? d?.value ?? 0;
  }
  return 0;
}

function describe(v: Z, name: string): Field | null {
  const { node, optional } = unwrap(v);
  const t = node?._def?.type;
  const label = labelFor(name);
  if (t === 'string')
    return { kind: 'string', name, label, optional, long: strMax(node) >= 160 };
  if (t === 'number') return { kind: 'number', name, label, optional };
  if (t === 'enum') {
    const values = Object.values(
      node._def.entries ?? node._def.values ?? {}
    ) as string[];
    return { kind: 'enum', name, label, optional, values };
  }
  if (t === 'array') {
    const { node: el } = unwrap(node._def.element);
    const et = el?._def?.type;
    if (et === 'object')
      return {
        kind: 'array-object',
        name,
        label,
        optional,
        fields: subFields(el),
      };
    if (et === 'string') return { kind: 'array-string', name, label, optional };
    return { kind: 'unsupported', name, label, optional }; // 如二维数组(dataTable.rows)
  }
  if (t === 'object')
    return { kind: 'object', name, label, optional, fields: subFields(node) };
  return null;
}

function subFields(objNode: Z): Field[] {
  const shape = objNode._def.shape;
  const s = typeof shape === 'function' ? shape() : shape;
  return Object.entries(s)
    .map(([k, v]) => describe(v, k))
    .filter(Boolean) as Field[];
}

export function describeSlideSchema(slideType: string): Field[] {
  const tpl = getSlideTemplate(slideType);
  if (!tpl) return [];
  const shape = (tpl.schema as Z).shape;
  return Object.entries(shape)
    .map(([k, v]) => describe(v, k))
    .filter(Boolean) as Field[];
}

// ─── 自动示例内容（页型库预览用）─────────────────────────────────────────────

function sampleVal(f: Field, idx = 0): unknown {
  switch (f.kind) {
    case 'string': {
      if (f.name === 'variant') return undefined; // 用默认表面
      const n = f.name.toLowerCase();
      if (n.includes('image') || n.includes('url') || n.includes('avatar'))
        return `https://picsum.photos/seed/${f.name}${idx}/800/450`;
      if (n === 'email') return 'hello@example.com';
      return f.long
        ? `${f.label}${tt('：这里是一段示例说明文字。', ': sample description text goes here.')}`
        : f.label;
    }
    case 'number':
      // 版式微调字段不进样例，避免污染页型库预览（默认无缩进/缩放）
      if (f.name === 'indent' || f.name === 'fontScale') return undefined;
      return [68, 45, 82, 30, 55, 20][idx % 6];
    case 'enum':
      // 表面色调留空（用默认），其余取首个枚举值
      return f.name === 'variant' ? undefined : f.values?.[0];
    case 'array-string':
      return [1, 2, 3].map((n) => `${f.label} ${n}`);
    case 'array-object':
      return [0, 1, 2].map((i) =>
        Object.fromEntries(
          (f.fields ?? [])
            .map((sf) => [sf.name, sampleVal(sf, i)])
            .filter(([, v]) => v !== undefined)
        )
      );
    case 'object':
      return Object.fromEntries(
        (f.fields ?? [])
          .map((sf) => [sf.name, sampleVal(sf)])
          .filter(([, v]) => v !== undefined)
      );
    default:
      return undefined;
  }
}

// 复杂结构（二维数组等）自动造不出，手动给示例
const SAMPLE_OVERRIDES: Record<string, Content> = {
  dataTable: {
    heading: 'Data table',
    columns: ['Metric', 'Q1', 'Q2'],
    rows: [
      ['Revenue', '120', '180'],
      ['Users', '1.2k', '2.0k'],
    ],
  },
};

/** 按 schema 自动生成一份占位内容，用于预览该页型长什么样。 */
export function sampleSlideContent(slideType: string): Content {
  const out: Content = {};
  for (const f of describeSlideSchema(slideType)) {
    const v = sampleVal(f);
    if (v !== undefined) out[f.name] = v;
  }
  return { ...out, ...(SAMPLE_OVERRIDES[slideType] ?? {}) };
}

// ─── 渲染 ────────────────────────────────────────────────────────────────────

type Content = Record<string, unknown>;

function Scalar({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.kind === 'enum') {
    return (
      <Select
        value={(value as string) ?? ''}
        onValueChange={(v) => onChange(v || undefined)}
      >
        <SelectTrigger className="h-7">
          <SelectValue
            placeholder={
              field.optional ? tt('默认', 'Default') : tt('选择', 'Select')
            }
          >
            {(v: unknown) =>
              v
                ? enumLabel(String(v))
                : field.optional
                  ? tt('默认', 'Default')
                  : tt('选择', 'Select')
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {field.optional && (
            <SelectItem value="">{tt('默认', 'Default')}</SelectItem>
          )}
          {field.values!.map((v) => (
            <SelectItem key={v} value={v}>
              {enumLabel(v)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (field.kind === 'number') {
    return (
      <Input
        type="number"
        className="h-7"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) =>
          onChange(e.target.value === '' ? undefined : Number(e.target.value))
        }
      />
    );
  }
  if (field.long) {
    return (
      <Textarea
        rows={2}
        className="min-h-0 py-1.5"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    );
  }
  return (
    <Input
      className="h-7"
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  // 数组（对象行）
  if (field.kind === 'array-object') {
    const rows = (Array.isArray(value) ? value : []) as Content[];
    const setRow = (i: number, row: Content) =>
      onChange(rows.map((r, idx) => (idx === i ? row : r)));
    return (
      <div className="space-y-2">
        <div className="text-muted-foreground text-xs font-medium">
          {field.label}
        </div>
        {rows.map((row, i) => (
          <div key={i} className="bg-muted/40 space-y-1.5 rounded-md p-2">
            <div className="flex justify-end">
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                aria-label="remove"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {field.fields!.map((sf) => (
              <div
                key={sf.name}
                className="grid grid-cols-[5rem_1fr] items-center gap-2"
              >
                <span className="text-muted-foreground text-xs">
                  {sf.label}
                </span>
                <Scalar
                  field={sf}
                  value={row?.[sf.name]}
                  onChange={(v) => setRow(i, { ...row, [sf.name]: v })}
                />
              </div>
            ))}
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1"
          onClick={() => onChange([...rows, {}])}
        >
          <Plus className="size-3.5" /> {tt('添加', 'Add')}
        </Button>
      </div>
    );
  }
  // 数组（字符串）
  if (field.kind === 'array-string') {
    const rows = (Array.isArray(value) ? value : []) as string[];
    return (
      <div className="space-y-2">
        <div className="text-muted-foreground text-xs font-medium">
          {field.label}
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="h-7"
              value={row ?? ''}
              onChange={(e) =>
                onChange(rows.map((r, idx) => (idx === i ? e.target.value : r)))
              }
            />
            <button
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              aria-label="remove"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1"
          onClick={() => onChange([...rows, ''])}
        >
          <Plus className="size-3.5" /> {tt('添加', 'Add')}
        </Button>
      </div>
    );
  }
  // 嵌套对象（如 compare 的 left/right）
  if (field.kind === 'object') {
    const obj = (value ?? {}) as Content;
    return (
      <div className="space-y-1.5">
        <div className="text-muted-foreground text-xs font-medium">
          {field.label}
        </div>
        <div className="bg-muted/40 space-y-1.5 rounded-md p-2">
          {field.fields!.map((sf) => (
            <div
              key={sf.name}
              className="grid grid-cols-[5rem_1fr] items-center gap-2"
            >
              <span className="text-muted-foreground text-xs">{sf.label}</span>
              <Scalar
                field={sf}
                value={obj?.[sf.name]}
                onChange={(v) => onChange({ ...obj, [sf.name]: v })}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  // 不支持的复杂结构 → 引导用高级 JSON
  if (field.kind === 'unsupported') {
    return (
      <div className="text-muted-foreground text-xs">
        {field.label}
        {tt(
          '：结构较复杂，请用下方「高级:原始 JSON」编辑。',
          ': complex structure — edit via "Advanced: raw JSON" below.'
        )}
      </div>
    );
  }
  // 标量
  return (
    <div className="grid grid-cols-[6rem_1fr] items-center gap-2">
      <span className="text-muted-foreground text-xs">{field.label}</span>
      <Scalar field={field} value={value} onChange={onChange} />
    </div>
  );
}

export function SlideForm({
  slideType,
  content,
  onChange,
}: {
  slideType: string;
  content: Content;
  onChange: (next: Content) => void;
}) {
  const fields = describeSlideSchema(slideType);
  if (!fields.length)
    return (
      <div className="text-muted-foreground text-xs">
        {tt(
          '未知页型，无法生成表单。',
          'Unknown slide type — no form available.'
        )}
      </div>
    );
  const setField = (name: string, v: unknown) => {
    const next = { ...content };
    if (v === undefined) delete next[name];
    else next[name] = v;
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {fields.map((f) => (
        <FieldRow
          key={f.name}
          field={f}
          value={content[f.name]}
          onChange={(v) => setField(f.name, v)}
        />
      ))}
    </div>
  );
}
