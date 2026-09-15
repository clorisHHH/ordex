import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileType} from './file-type.js';
test('根据最后的扩展名识别类别，支持大小写，其他文件使用通用图标',()=>{
 for(const [name,type] of [['A.DOCX','word'],['报告.doc','word'],['合同.PDF','pdf'],['预算.xlsx','excel'],['数据.CSV','excel'],['演示.PPTX','ppt'],['照片.HEIC','image'],['图形.svg','image'],['打包.zip','file'],['清单.txt','file'],['README','file'],['假名.pdf.txt','file']])assert.equal(fileType({name,type:'file'}),type,name);
 assert.equal(fileType({name:'文件夹.pdf',type:'folder'}),'folder');
});
