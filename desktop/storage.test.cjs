const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {DiskStore}=require('./storage.cjs');

const workspace=node=>({nodes:[{id:'section-1',name:'材料',type:'section',children:node?[node]:[]}],trash:[],history:[],future:[]});
const library=(directory,node)=>({activeId:'case-1',cases:[{id:'case-1',name:'测试 Case',directory,workspace:workspace(node),view:{active:'section-1'},updatedAt:1}]});

test('Case 索引留在 Ordex 设置目录，真实文件和编排数据写入用户选择的文件夹',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-')),directory=path.join(root,'测试 Case');
 try{
  const store=new DiskStore(path.join(root,'settings')),file={id:'file-1',name:'材料.pdf',type:'file',children:[],size:4,lastModified:1};assert.equal(store.prepareCaseDirectory(root,'测试 Case'),directory);store.write('state','case-library',library(directory,file));store.writeFile('case-1',file.id,file.name,Buffer.from('data'));
  assert.equal(fs.readFileSync(path.join(directory,'Ordex 文件','材料.pdf'),'utf8'),'data');assert.equal(fs.existsSync(path.join(directory,'.ordex','case.json')),true);assert.equal(fs.existsSync(path.join(root,'settings','library.json')),true);assert.equal(store.previewPath('case-1','file-1'),path.join(directory,'Ordex 文件','材料.pdf'));
  const reopened=new DiskStore(path.join(root,'settings')),saved=reopened.read('state','case-library');assert.equal(saved.cases[0].directory,directory);assert.equal(saved.cases[0].workspace.nodes[0].children[0].name,'材料.pdf');assert.equal(reopened.readFile('case-1','file-1').toString(),'data');
  assert.equal(reopened.previewPath('case-1','missing-file'),null);assert.throws(()=>reopened.previewPath('missing-case','file-1'),/找不到项目/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('删除把文件副本移入 Case 回收站，恢复后回到文件区',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-')),directory=path.join(root,'测试 Case');
 try{
  const store=new DiskStore(path.join(root,'settings')),file={id:'file-1',name:'材料.pdf',type:'file',children:[]},data=library(directory,file);store.prepareCaseDirectory(root,'测试 Case');store.write('state','case-library',data);store.writeFile('case-1','file-1','材料.pdf',Buffer.from('data'));
  data.cases[0].workspace.nodes[0].children=[];data.cases[0].workspace.trash=[{id:'trash-1',node:file,parentId:'section-1',index:0,number:'1.1',deletedAt:2}];store.write('state','case-library',data);assert.equal(fs.existsSync(path.join(directory,'.ordex','trash','材料.pdf')),true);
  data.cases[0].workspace.nodes[0].children=[file];data.cases[0].workspace.trash=[];store.write('state','case-library',data);assert.equal(fs.existsSync(path.join(directory,'Ordex 文件','材料.pdf')),true);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('一键清空只永久删除回收站副本并原子保存新索引',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-')),directory=path.join(root,'测试 Case');
 try{
  const store=new DiskStore(path.join(root,'settings')),keep={id:'keep-1',name:'保留.pdf',type:'file',children:[]},remove={id:'remove-1',name:'删除.pdf',type:'file',children:[]},data=library(directory,keep);data.cases[0].workspace.nodes[0].children.push(remove);store.prepareCaseDirectory(root,'测试 Case');store.write('state','case-library',data);store.writeFile('case-1',keep.id,keep.name,Buffer.from('keep'));store.writeFile('case-1',remove.id,remove.name,Buffer.from('remove'));
  data.cases[0].workspace.nodes[0].children=[keep];data.cases[0].workspace.trash=[{id:'trash-1',node:remove,parentId:'section-1',index:1,number:'1.2',deletedAt:2}];store.write('state','case-library',data);const cleared=structuredClone(data);cleared.cases[0].workspace.trash=[];store.purge([remove.id],cleared);
  assert.equal(store.readFile('case-1',remove.id),null);assert.equal(store.readFile('case-1',keep.id).toString(),'keep');assert.equal(store.read('state','case-library').cases[0].workspace.trash.length,0);assert.equal(fs.existsSync(path.join(root,'settings','purge.json')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('已有 Ordex 项目的文件夹不能被新项目覆盖',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-')),directory=path.join(root,'测试 Case');
 try{const store=new DiskStore(path.join(root,'settings'));store.prepareCaseDirectory(root,'测试 Case');store.write('state','case-library',library(directory));assert.throws(()=>store.prepareCaseDirectory(root,'测试 Case'),/同名 Ordex 项目/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('同名文件保留可读文件名并自动添加序号',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-')),directory=path.join(root,'测试 Case');
 try{const store=new DiskStore(path.join(root,'settings'));store.prepareCaseDirectory(root,'测试 Case');store.write('state','case-library',library(directory));store.writeFile('case-1','file-1','材料.pdf',Buffer.from('a'));store.writeFile('case-1','file-2','材料.pdf',Buffer.from('b'));assert.deepEqual(fs.readdirSync(path.join(directory,'Ordex 文件')).sort(),['材料 (2).pdf','材料.pdf']);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Case 文件夹使用用户输入的名称并保护同名非空文件夹',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-'));
 try{const store=new DiskStore(path.join(root,'settings')),directory=store.prepareCaseDirectory(root,'李运凯 NIW');assert.equal(directory,path.join(root,'李运凯 NIW'));assert.equal(fs.existsSync(directory),true);fs.mkdirSync(path.join(root,'已有材料'));fs.writeFileSync(path.join(root,'已有材料','说明.txt'),'keep');assert.throws(()=>store.prepareCaseDirectory(root,'已有材料'),/非空/);for(const invalid of ['../越界','客户:材料','CON','案件.'])assert.throws(()=>store.prepareCaseDirectory(root,invalid),/文件夹名称/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('桌面项目文件夹消失后显示缺失，不会在保存时重新创建；确认后只移除卡片索引',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-')),directory=path.join(root,'测试 Case');
 try{
  const store=new DiskStore(path.join(root,'settings'));store.prepareCaseDirectory(root,'测试 Case');store.write('state','case-library',library(directory));fs.rmSync(directory,{recursive:true});
  assert.deepEqual(store.missingCaseIds(),['case-1']);assert.equal(store.read('state','case-library').cases[0].missingDirectory,true);
  store.write('state','case-library',library(directory));assert.equal(fs.existsSync(directory),false);
  assert.deepEqual(store.removeMissingCase('case-1').cases,[]);assert.deepEqual(store.missingCaseIds(),[]);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('项目文件夹恢复后不能按缺失项目移除',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-')),directory=path.join(root,'测试 Case');
 try{const store=new DiskStore(path.join(root,'settings'));store.prepareCaseDirectory(root,'测试 Case');store.write('state','case-library',library(directory));fs.rmSync(directory,{recursive:true});fs.mkdirSync(directory);assert.throws(()=>store.removeMissingCase('case-1'),/已恢复/);assert.equal(store.registry().cases.length,1);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('暂时不可用的项目文件夹恢复后仍能读取原编排数据',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordex-')),directory=path.join(root,'测试 Case'),aside=path.join(root,'暂存');
 try{const store=new DiskStore(path.join(root,'settings')),file={id:'file-1',name:'材料.pdf',type:'file',children:[]};store.prepareCaseDirectory(root,'测试 Case');store.write('state','case-library',library(directory,file));store.writeFile('case-1','file-1','材料.pdf',Buffer.from('data'));fs.renameSync(directory,aside);const missing=store.read('state','case-library');store.write('state','case-library',missing);fs.renameSync(aside,directory);const restored=store.read('state','case-library');assert.equal(restored.cases[0].missingDirectory,false);assert.equal(restored.cases[0].workspace.nodes[0].children[0].name,'材料.pdf');assert.equal(store.readFile('case-1','file-1').toString(),'data');}finally{fs.rmSync(root,{recursive:true,force:true});}
});
