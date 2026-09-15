const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),JSZip=require('jszip');
const {DiskStore}=require('./storage.cjs');
(async()=>{
 const archive=process.argv[2],root=process.argv[3];if(!archive||!root)throw Error('需要迁移包和目标目录');if(fs.existsSync(path.join(root,'workspace.json')))throw Error('目标已有工作区，停止以避免覆盖');
 const zip=await JSZip.loadAsync(fs.readFileSync(archive),{checkCRC32:true});const state=JSON.parse(await zip.file('workspace.json').async('string'));const view=JSON.parse(await zip.file('view.json').async('string'));
 const ids=new Set(),walk=ns=>ns.forEach(n=>{if(n.type==='file')ids.add(n.id);walk(n.children);});for(const s of [state,...state.history,...state.future]){walk(s.nodes);s.trash.forEach(e=>walk([e.node]));}
 const store=new DiskStore(root);let bytes=0;for(const id of ids){const entry=zip.file('files/'+id);if(!entry)throw Error('迁移包缺失文件 '+id);const data=await entry.async('nodebuffer');store.write('files',id,data);const hash=b=>crypto.createHash('sha256').update(b).digest('hex');if(hash(data)!==hash(store.read('files',id)))throw Error('文件校验失败');bytes+=data.length;}
 store.write('view','ui',view);store.write('state','workspace',state);
 console.log(JSON.stringify({sections:state.nodes.length,storedFiles:ids.size,history:state.history.length,trash:state.trash.length,bytes,verified:'SHA-256',root}));
})().catch(e=>{console.error(e);process.exitCode=1;});
