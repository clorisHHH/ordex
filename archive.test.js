import {test} from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {makeNode as n} from './model.js';
import {buildArchive} from './archive.js';
test('ZIP 保留完整编号、单个分隔空格、空文件夹与超过十项的顺序',async()=>{
 const children=Array.from({length:12},(_,i)=>n('文档 '+(i+1)+'.txt','file'));
 children[2]=n('资料','folder',{children:[n('附件.txt','file')]});
 children.push(n('空文件夹','folder'));
 const nodes=[n('项目','section',{children}),n('第二组','section')];
 const zip=await JSZip.loadAsync(await buildArchive(nodes,id=>new Blob(['content:'+id])),{checkCRC32:true});
 const paths=Object.keys(zip.files);assert.equal(paths[0],'1 项目/');
 assert.ok(paths.indexOf('1 项目/1.9 文档 9.txt')<paths.indexOf('1 项目/1.10 文档 10.txt'));
 assert.ok(zip.files['1 项目/1.13 空文件夹/'].dir);assert.ok(zip.files['2 第二组/'].dir);
 assert.equal(await zip.file('1 项目/1.3 资料/1.3.1 附件.txt').async('string'),'content:'+children[2].children[0].id);
 for(const p of paths)for(const part of p.split('/').filter(Boolean))assert.match(part,/^\d+(?:\.\d+){0,4} [^ ]/);
});
test('普通文件的逻辑下级保持完整编号，同目录导出，缺失文件阻止导出',async()=>{
 const child=n('附件.pdf','file'),parent=n('说明.pdf','file',{children:[child]}),nodes=[n('组','section',{children:[parent]})];
 const zip=await JSZip.loadAsync(await buildArchive(nodes,()=>new Blob(['pdf'])));
 assert.ok(zip.file('1 组/1.1 说明.pdf'));assert.ok(zip.file('1 组/1.1.1 附件.pdf'));
 await assert.rejects(()=>buildArchive(nodes,id=>id===child.id?null:new Blob(['pdf'])),/文件内容缺失/);
});

test('ZIP 文件名使用当前编号方案',async()=>{
 const {PRESETS}=await import('./numbering.js');
 const child=n('附件.pdf','file'),parent=n('说明.pdf','file',{children:[child]}),nodes=[n('组','section',{children:[parent]})];
 const scheme=PRESETS.find(p=>p.id==='legal');
 const zip=await JSZip.loadAsync(await buildArchive(nodes,()=>new Blob(['pdf']),scheme));
 assert.ok(zip.file('1 组/1(a) 说明.pdf'));
 assert.ok(zip.file('1 组/1(a)(i) 附件.pdf'));
});
