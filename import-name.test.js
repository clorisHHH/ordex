import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyNumberingPreference,normalizeImportedName,stripOrdinalPrefix} from './import-name.js';

test('导入时移除明确的数字层级编号',()=>{
 for(const [name,expected] of [
  ['1.1 材料.pdf','材料.pdf'],
  ['2.3.1 证明.docx','证明.docx'],
  ['10.12.3- 附件.png','附件.png'],
  ['3、清单.xlsx','清单.xlsx'],
  ['(4) 合同.pdf','合同.pdf'],
  ['第5项 证据.pdf','证据.pdf'],
  ['Exhibit 2.1.1 辅导一等奖.pdf','辅导一等奖.pdf'],
  ['Exhibit 2.1.1.1 EN Award.pdf','EN Award.pdf'],
  ['EXHIBIT 3-主办方证明.docx','主办方证明.docx'],
 ])assert.equal(stripOrdinalPrefix(name),expected,name);
});

test('不把年份和普通文件名误判为编号',()=>{
 for(const name of ['2024 年度报告.pdf','2024.10 报告.pdf','140阶段材料.docx','1.1.pdf','Exhibit A 证明.pdf','Exhibit 2.1.1.pdf','README'])assert.equal(stripOrdinalPrefix(name),name);
});

test('关闭去编号时完整保留所有原始文件名',()=>{
 for(const name of ['1.1 材料.pdf','Exhibit 2.1.1 获奖证书.pdf','EXHIBIT 3-证明.docx','  4、原始名称.txt'])assert.equal(normalizeImportedName(name,false),name);
});

test('开启去编号时继续清理数字及 Exhibit 编号',()=>{
 assert.equal(normalizeImportedName('1.1 材料.pdf',true),'材料.pdf');
 assert.equal(normalizeImportedName('eXhIbIt 2.1.1 获奖证书.pdf',true),'获奖证书.pdf');
});

test('开关即时切换已导入文件名，并始终保留原始名称',()=>{
 const nodes=[{type:'section',name:'获奖',children:[
  {type:'file',name:'1.1 材料.pdf',children:[]},
  {type:'folder',name:'2. 文件夹',children:[{type:'file',name:'EXHIBIT 3-证明.docx',children:[]}]},
 ]}];
 applyNumberingPreference(nodes,true);
 assert.equal(nodes[0].children[0].name,'材料.pdf');
 assert.equal(nodes[0].children[0].originalName,'1.1 材料.pdf');
 assert.equal(nodes[0].children[1].name,'2. 文件夹');
 assert.equal(nodes[0].children[1].children[0].name,'证明.docx');
 applyNumberingPreference(nodes,false);
 assert.equal(nodes[0].children[0].name,'1.1 材料.pdf');
 assert.equal(nodes[0].children[1].children[0].name,'EXHIBIT 3-证明.docx');
});
