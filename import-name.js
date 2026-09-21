import {stripOrdinalPrefix as stripByScheme} from './numbering.js';

export function stripOrdinalPrefix(name,scheme){
 return stripByScheme(name,scheme);
}

export function normalizeImportedName(name,removeNumbering=true,scheme){
 return removeNumbering?stripOrdinalPrefix(name,scheme):String(name);
}

export function applyNumberingPreference(nodes,removeNumbering,scheme){
 const visit=node=>{
  if(node.type==='file'){
   if(typeof node.originalName!=='string')node.originalName=node.name;
   node.name=normalizeImportedName(node.originalName,removeNumbering,scheme);
  }
  for(const child of node.children||[])visit(child);
 };
 for(const node of nodes||[])visit(node);
}
