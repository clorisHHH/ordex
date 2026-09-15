export function stripOrdinalPrefix(name){
 const value=String(name);
 const exhibit=/^\s*exhibit\s*[-_:：]?\s*\d{1,3}(?:\.\d{1,3}){0,8}(?:\.\s+|\s*[)、）:：_-]\s*|\s+)/i;
 const hierarchical=/^\s*\d{1,3}(?:\.\d{1,3}){1,4}(?:\.\s+|\s*[)、）:：_-]\s*|\s+)/;
 const simple=/^\s*(?:\(\d{1,3}\)|（\d{1,3}）|\[\d{1,3}\]|第\d{1,3}(?:项|份|篇|章)?|\d{1,3}(?:\.\s+|[)、）]\s*))\s*/;
 const cleaned=value.replace(exhibit,'').replace(hierarchical,'').replace(simple,'');
 return cleaned||value;
}

export function normalizeImportedName(name,removeNumbering=true){
 return removeNumbering?stripOrdinalPrefix(name):String(name);
}

export function applyNumberingPreference(nodes,removeNumbering){
 const visit=node=>{
  if(node.type==='file'){
   if(typeof node.originalName!=='string')node.originalName=node.name;
   node.name=normalizeImportedName(node.originalName,removeNumbering);
  }
  for(const child of node.children||[])visit(child);
 };
 for(const node of nodes||[])visit(node);
}
