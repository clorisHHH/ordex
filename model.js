export const uid = () => crypto.randomUUID();
export function swapSections(nodes,a,b){const x=nodes.findIndex(n=>n.id===a),y=nodes.findIndex(n=>n.id===b);if(x<0||y<0)throw Error('只能交换两个一级标');[nodes[x],nodes[y]]=[nodes[y],nodes[x]];}
export function recycle(nodes,trash,ids){
 const targets=ids.map(id=>locate(nodes,id)).filter(Boolean).filter(s=>!ids.some(id=>id!==s.node.id&&locate(nodes,id)&&locate(locate(nodes,id).node.children,s.node.id)));
 for(const s of targets)trash.push({id:uid(),node:s.node,parentId:s.parent?.id||null,index:s.index,previousId:s.list[s.index-1]?.id||null,nextId:s.list[s.index+1]?.id||null,number:s.path.join('.'),deletedAt:Date.now()});
 for(const s of targets){const current=locate(nodes,s.node.id);current.list.splice(current.index,1);}
}
export function restoreEntry(nodes,trash,id){
 const entry=trash.find(e=>e.id===id);if(!entry)throw Error('找不到回收项目');
 let parent=entry.parentId?locate(nodes,entry.parentId):null;
 if(entry.parentId&&!parent){
  if(trash.some(e=>e.node.id===entry.parentId||locate(e.node.children,entry.parentId)))throw Error('请先恢复所在的文件夹或一级标');
  const group=makeNode('恢复的文件','section');nodes.push(group);parent=locate(nodes,group.id);
 }
 if(parent&&(parent.path.length+height(entry.node)>5||(parent.node.type==='file'&&containsFolder(entry.node))))throw Error('原位置的层级已改变，请先将原位置移回较外层再恢复');
 const list=parent?parent.node.children:nodes,previous=list.findIndex(node=>node.id===entry.previousId),next=list.findIndex(node=>node.id===entry.nextId);
 const index=previous>=0?previous+1:next>=0?next:Math.min(entry.index,list.length);list.splice(index,0,entry.node);trash.splice(trash.indexOf(entry),1);
 return locate(nodes,entry.node.id).path.join('.');
}
export function discardTrashEntry(trash,id){
 const index=trash.findIndex(entry=>entry.id===id);if(index<0)throw Error('找不到回收项目');
 return trash.splice(index,1)[0].node;
}
export const makeNode = (name, type, extra = {}) => ({id:uid(),name,type,children:[],...extra});
export function locate(nodes,id,parent=null,path=[]){for(let i=0;i<nodes.length;i++){const n=nodes[i],p=[...path,i+1];if(n.id===id)return {node:n,parent,list:nodes,index:i,path:p};const found=locate(n.children,id,n,p);if(found)return found;}return null;}
export const height = n => 1 + Math.max(0,...n.children.map(height));
export function move(nodes,id,targetId,position='inside'){
 const source=locate(nodes,id),target=locate(nodes,targetId);if(!source||!target)throw Error('找不到这个项目');
 if(id===targetId||locate(source.node.children,targetId))throw Error('不能移入自身或自己的下级');
 if(source.node.type==='section')throw Error('一级标请在一级标之间排序');
 const parent=position==='inside'?target.node:target.parent;
 if(!parent)throw Error('文件需要放在一级标下');
 if(parent.type==='file' && containsFolder(source.node))throw Error('文件夹不能成为文件的下一级');
 const depth=locate(nodes,parent.id).path.length;
 if(depth+height(source.node)>5)throw Error('最多支持五级编号，子项也不能超过五级');
 source.list.splice(source.index,1);
 const list=parent.children;
 const index=position==='inside'?list.length:list.findIndex(n=>n.id===targetId)+(position==='after'?1:0);
 list.splice(index,0,source.node);
}
export const containsFolder = n => n.type==='folder'||n.children.some(containsFolder);
export function moveOut(nodes,id){const s=locate(nodes,id);if(!s?.parent)throw Error('已经在最外层');const p=locate(nodes,s.parent.id);if(!p.parent)throw Error('已经是二级标，不能继续移出');move(nodes,id,p.parent.id);}
export const clean = s => s.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').trim()||'未命名';
export function exportEntries(nodes,base='',prefix=[]){return nodes.flatMap((n,i)=>{const path=[...prefix,i+1],name=path.join('.')+' '+clean(n.name);const dest=base+name;if(n.type==='file')return [{path:dest,node:n},...exportEntries(n.children,base,path)];return [{path:dest+'/',node:n},...exportEntries(n.children,dest+'/',path)];});}
