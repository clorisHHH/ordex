import JSZip from 'jszip';
import {DEFAULT_SCHEME} from './numbering.js';
import {exportEntries} from './model.js';
export async function buildArchive(nodes,readFile,scheme=DEFAULT_SCHEME){
 const entries=exportEntries(structuredClone(nodes),scheme),zip=new JSZip();
 for(const entry of entries){
  if(entry.node.type!=='file'){zip.folder(entry.path);continue;}
  const file=await readFile(entry.node.id);
  if(!file)throw Error('文件内容缺失：'+entry.node.name);
  zip.file(entry.path,await file.arrayBuffer());
 }
 return zip.generateAsync({type:'uint8array'});
}
