import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SCHEME, PRESETS, MAX_LEVELS, LEVEL_STYLES,
  toAlpha, toRoman, toChinese, fromAlpha, fromRoman,
  formatOrdinal, formatNumber, normalizeScheme, sampleNumbers, findPreset, sortKey, stripOrdinalPrefix, styleKind,
} from './numbering.js';

test('字母编号超过 26 位按 Excel 列式进位',()=>{
  assert.equal(toAlpha(1),'a');
  assert.equal(toAlpha(26),'z');
  assert.equal(toAlpha(27),'aa');
  assert.equal(toAlpha(28),'ab');
  assert.equal(toAlpha(52),'az');
  assert.equal(toAlpha(53),'ba');
  assert.equal(toAlpha(27,true),'AA');
});

test('罗马数字双向转换，超过 3999 回退阿拉伯数字',()=>{
  assert.equal(toRoman(1),'i');
  assert.equal(toRoman(4),'iv');
  assert.equal(toRoman(9),'ix');
  assert.equal(toRoman(14),'xiv');
  assert.equal(toRoman(40),'xl');
  assert.equal(toRoman(944),'cmxliv');
  assert.equal(toRoman(4,true),'IV');
  assert.equal(toRoman(4000),'4000');
  assert.equal(fromRoman('xiv'),14);
  assert.equal(fromRoman('cmxliv'),944);
  assert.equal(fromRoman('IIII'),null);
  assert.equal(fromRoman('abc'),null);
});

test('中文数字一到九十九',()=>{
  assert.equal(toChinese(1),'一');
  assert.equal(toChinese(9),'九');
  assert.equal(toChinese(10),'十');
  assert.equal(toChinese(11),'十一');
  assert.equal(toChinese(20),'二十');
  assert.equal(toChinese(35),'三十五');
  assert.equal(toChinese(99),'九十九');
  assert.equal(toChinese(100),'100');
});

test('字母可反解回序号',()=>{
  assert.equal(fromAlpha('a'),1);
  assert.equal(fromAlpha('z'),26);
  assert.equal(fromAlpha('aa'),27);
  assert.equal(fromAlpha('A'),1);
  assert.equal(fromAlpha(''),null);
});

test('层级编号按每层的样式与分隔符生成',()=>{
  assert.equal(formatNumber([1,2,3]),'1.2.3');
  assert.equal(formatNumber([1,2,3],{levels:['A','a','i','i','i'],separator:'.'}),'A.b.iii');
  assert.equal(formatNumber([1,2,3],{levels:['1','(a)','(i)','(a)','(i)'],separator:''}),'1(b)(iii)');
  assert.equal(formatNumber([1,2],{levels:['一','（一）','1','1','1'],separator:''}),'一（二）');
});

test('第六层沿用第五层样式且不越界',()=>{
  const scheme={levels:['1','a','A','i','I'],separator:'.'};
  assert.equal(formatNumber([1,2,3,4,5,6],scheme).split('.').length,MAX_LEVELS+1);
  assert.equal(formatNumber([1,2,3,4,5,6],scheme),'1.b.C.iv.V.VI');
});

test('非法方案回退到默认值',()=>{
  assert.deepEqual(normalizeScheme(null),{levels:['1','1','1','1','1'],separator:'.'});
  assert.deepEqual(normalizeScheme({levels:['x','a'],separator:'|'}),{levels:['1','a','1','1','1'],separator:'.'});
  assert.equal(formatNumber([1,2],{}),'1.2');
});

test('内置预设可识别且示例正确',()=>{
  assert.equal(findPreset(DEFAULT_SCHEME),'decimal');
  assert.equal(findPreset({levels:['A','a','i','i','i'],separator:'.'}),'alpha');
  assert.equal(findPreset({levels:['1','(a)','(i)','(a)','(i)'],separator:''}),'legal');
  assert.equal(findPreset({levels:['I','A','1','a','i'],separator:'.'}),'roman');
  assert.equal(findPreset({levels:['一','（一）','1','1','1'],separator:''}),'chinese');
  assert.equal(findPreset({levels:['1','a','1','1','1'],separator:'.'}),null);
  assert.deepEqual(sampleNumbers({levels:['1','(a)','(i)','(a)','(i)'],separator:''}),['1','1(a)','1(a)(i)']);
  for(const preset of PRESETS)for(const style of preset.levels)assert.ok(LEVEL_STYLES.includes(style));
});

test('排序键按数值定长，避免字符串排序错乱',()=>{
  assert.ok(sortKey([1,2,10])<sortKey([1,2,9])===false);
  assert.ok(sortKey([1,2,9])<sortKey([1,2,10]));
  assert.equal(sortKey([1]),'00001');
});

test('样式种类识别包含括号变体',()=>{
  assert.equal(styleKind('(a)'),'a');
  assert.equal(styleKind('（一）'),'cn');
  assert.equal(styleKind('(I)'),'I');
  assert.equal(formatOrdinal(3,'(i)'),'(iii)');
  assert.equal(formatOrdinal(2,'（一）'),'（二）');
});

test('去除原编号仍处理数字，并按方案识别字母与罗马',()=>{
  assert.equal(stripOrdinalPrefix('1.2 合同.pdf'),'合同.pdf');
  assert.equal(stripOrdinalPrefix('(3) 说明.pdf'),'说明.pdf');
  assert.equal(stripOrdinalPrefix('Exhibit 4. 证据.pdf'),'证据.pdf');
  assert.equal(stripOrdinalPrefix('a. 护照.pdf',{levels:['A','a','a','a','a'],separator:'.'}),'护照.pdf');
  assert.equal(stripOrdinalPrefix('ii) 学位证.pdf',{levels:['1','i','i','i','i'],separator:'.'}),'学位证.pdf');
  assert.equal(stripOrdinalPrefix('（二）成绩单.pdf',{levels:['一','（一）','1','1','1'],separator:''}),'成绩单.pdf');
  assert.equal(stripOrdinalPrefix('1.b. 附件.pdf',{levels:['1','a','a','a','a'],separator:'.'}),'附件.pdf');
});

test('去除原编号不误伤正常文件名',()=>{
  const scheme={levels:['I','i','i','i','i'],separator:'.'};
  assert.equal(stripOrdinalPrefix('PDF 说明.pdf',scheme),'PDF 说明.pdf');
  assert.equal(stripOrdinalPrefix('VIP名单.pdf',scheme),'VIP名单.pdf');
  assert.equal(stripOrdinalPrefix('年度报告.pdf',scheme),'年度报告.pdf');
  assert.equal(stripOrdinalPrefix('一二三.pdf',scheme),'一二三.pdf');
});
