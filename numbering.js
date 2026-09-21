export const MAX_LEVELS = 5;
export const ROMAN_MAX = 3999;
export const SEPARATORS = ['.', '-', '_', ''];
export const LEVEL_STYLES = ['1', 'a', 'A', 'i', 'I', '一', '(1)', '(a)', '(A)', '(i)', '(I)', '（一）'];

export const DEFAULT_SCHEME = Object.freeze({levels: ['1', '1', '1', '1', '1'], separator: '.'});

export const PRESETS = [
  {id: 'decimal', levels: ['1', '1', '1', '1', '1'], separator: '.'},
  {id: 'alpha', levels: ['A', 'a', 'i', 'i', 'i'], separator: '.'},
  {id: 'legal', levels: ['1', '(a)', '(i)', '(a)', '(i)'], separator: ''},
  {id: 'roman', levels: ['I', 'A', '1', 'a', 'i'], separator: '.'},
  {id: 'chinese', levels: ['一', '（一）', '1', '1', '1'], separator: ''},
];

const ROMAN_TABLE = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
const ROMAN_VALUES = {i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000};
const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function toAlpha(index, upper = false){
  let n = Math.max(1, Math.floor(index)), out = '';
  while (n > 0){
    const rest = (n - 1) % 26;
    out = String.fromCharCode(97 + rest) + out;
    n = Math.floor((n - 1) / 26);
  }
  return upper ? out.toUpperCase() : out;
}

export function toRoman(index, upper = false){
  let n = Math.max(1, Math.floor(index));
  if (n > ROMAN_MAX) return String(n);
  let out = '';
  for (const [value, glyph] of ROMAN_TABLE){
    while (n >= value){ out += glyph; n -= value; }
  }
  return upper ? out.toUpperCase() : out;
}

export function toChinese(index){
  const n = Math.max(1, Math.floor(index));
  if (n > 99) return String(n);
  if (n < 10) return CN_DIGITS[n];
  if (n === 10) return '十';
  const tens = Math.floor(n / 10), ones = n % 10;
  return (tens > 1 ? CN_DIGITS[tens] : '') + '十' + (ones ? CN_DIGITS[ones] : '');
}

export function fromAlpha(text){
  const value = String(text).toLowerCase();
  if (!/^[a-z]{1,4}$/.test(value)) return null;
  let n = 0;
  for (const char of value) n = n * 26 + (char.charCodeAt(0) - 96);
  return n;
}

export function fromRoman(text){
  const value = String(text).toLowerCase();
  if (!/^[ivxlcdm]{1,7}$/.test(value)) return null;
  let total = 0;
  for (let i = 0; i < value.length; i++){
    const current = ROMAN_VALUES[value[i]], next = ROMAN_VALUES[value[i + 1]] || 0;
    if (!current) return null;
    total += current < next ? -current : current;
  }
  return toRoman(total) === value ? total : null;
}

export function styleSample(style){
  return [1, 2].map(index => formatOrdinal(index, style)).join(' ');
}

export function styleKind(style){
  const core = String(style).replace(/[()（）]/g, '');
  if (core === 'a') return 'a';
  if (core === 'A') return 'A';
  if (core === 'i') return 'i';
  if (core === 'I') return 'I';
  if (core === '一') return 'cn';
  return '1';
}

export function normalizeScheme(scheme){
  const source = scheme && typeof scheme === 'object' ? scheme : {};
  const raw = Array.isArray(source.levels) ? source.levels : [];
  const levels = Array.from({length: MAX_LEVELS}, (_, i) => LEVEL_STYLES.includes(raw[i]) ? raw[i] : DEFAULT_SCHEME.levels[i]);
  const separator = SEPARATORS.includes(source.separator) ? source.separator : DEFAULT_SCHEME.separator;
  return {levels, separator};
}

export function formatOrdinal(index, style = '1'){
  const n = Math.max(1, Math.floor(index) || 1);
  const kind = styleKind(style);
  const wrapped = /^[（(]/.test(String(style));
  const core = kind === 'a' ? toAlpha(n)
    : kind === 'A' ? toAlpha(n, true)
    : kind === 'i' ? toRoman(n)
    : kind === 'I' ? toRoman(n, true)
    : kind === 'cn' ? toChinese(n)
    : String(n);
  if (!wrapped) return core;
  return kind === 'cn' ? `（${core}）` : `(${core})`;
}

export function formatNumber(path, scheme = DEFAULT_SCHEME){
  const config = normalizeScheme(scheme);
  const parts = Array.isArray(path) ? path : [];
  return parts.map((value, i) => formatOrdinal(value, config.levels[Math.min(i, MAX_LEVELS - 1)])).join(config.separator);
}

export function sortKey(path){
  return (Array.isArray(path) ? path : []).map(value => String(Math.max(0, Math.floor(value))).padStart(5, '0')).join('.');
}

export function sampleNumbers(scheme, depth = 3){
  const config = normalizeScheme(scheme);
  const path = [];
  const out = [];
  for (let i = 1; i <= Math.min(depth, MAX_LEVELS); i++){
    path.push(1);
    out.push(formatNumber(path, config));
  }
  return out;
}

export function findPreset(scheme){
  const config = normalizeScheme(scheme);
  return PRESETS.find(preset => preset.separator === config.separator && preset.levels.every((style, i) => style === config.levels[i]))?.id || null;
}

export function matchesPreset(scheme, id){
  const preset = PRESETS.find(item => item.id === id);
  if (!preset) return false;
  const config = normalizeScheme(scheme);
  return preset.separator === config.separator && preset.levels.every((style, i) => style === config.levels[i]);
}

const TOKEN_PATTERNS = {
  '1': '\\d{1,3}',
  a: '[a-z]{1,3}',
  A: '[A-Z]{1,3}',
  i: '[ivxlcdm]{1,7}',
  I: '[IVXLCDM]{1,7}',
  cn: '[一二三四五六七八九十]{1,4}',
};
const STRICT_TAIL = '\\s*[.、\\-_]\\s+';
const PAREN_TAIL = '\\s*[)\\]、）]\\s*';

export function stripOrdinalPrefix(name, scheme = DEFAULT_SCHEME){
  const value = String(name);
  const legacy = /^\s*exhibit\s*[-_:：]?\s*\d{1,3}(?:\.\d{1,3}){0,8}(?:\.\s+|\s*[)、）:：_-]\s*|\s+)/i;
  const hierarchical = /^\s*\d{1,3}(?:\.\d{1,3}){1,4}(?:\.\s+|\s*[)、）:：_-]\s*|\s+)/;
  const simple = /^\s*(?:\(\d{1,3}\)|（\d{1,3}）|\[\d{1,3}\]|第\d{1,3}(?:项|份|篇|章)?|\d{1,3}(?:\.\s+|[)、）]\s*))\s*/;
  let cleaned = value.replace(legacy, '').replace(hierarchical, '').replace(simple, '');

  const kinds = [...new Set(['1', ...normalizeScheme(scheme).levels.map(styleKind)])];
  const group = `(?:${kinds.map(kind => TOKEN_PATTERNS[kind]).join('|')})`;
  const unit = `(?:\\(${group}\\)|（${group}）|${group})`;
  const sep = `(?:\\s*[.、\\-_]\\s*|\\s*(?=[（(]))`;
  const tail = `(?:${STRICT_TAIL}|${PAREN_TAIL}|\\s*$)`;
  const patterns = [
    `^\\s*(?:\\(${group}\\)|（${group}）)\\s*`,
    `^\\s*${unit}(?:${sep}${unit}){1,4}${tail}`,
    `^\\s*${unit}(?:${STRICT_TAIL}|${PAREN_TAIL})`,
  ];
  for (const pattern of patterns){
    const next = cleaned.replace(new RegExp(pattern), '');
    if (next !== cleaned){ cleaned = next; break; }
  }
  return cleaned || value;
}
