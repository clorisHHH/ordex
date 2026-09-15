import plusIcon from './assets/file-icons/add_line.svg?raw';
import uploadIcon from './assets/file-icons/upload_2_line.svg?raw';
import storageIcon from './assets/file-icons/storage_line.svg?raw';
import trashIcon from './assets/file-icons/delete_2_line.svg?raw';
import folderIcon from './assets/file-icons/folder_line.svg?raw';
import editIcon from './assets/file-icons/edit_2_line.svg?raw';
import earthIcon from './assets/file-icons/earth_2_line.svg?raw';
import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {Folder} from './folder-component.jsx';
import './style.css';
import {formatModified,formatSize} from './file-metadata.js';
import {fileIcon} from './file-icons.js';
import {buildArchive} from './archive.js';
import {rowDropTarget} from './drop-target.js';
import {applyNumberingPreference,normalizeImportedName} from './import-name.js';
import {makeNode,locate,move,moveOut,height,containsFolder,swapSections,recycle,restoreEntry,discardTrashEntry} from './model.js';
import {translate,translateError} from './i18n.js';
import {previewIsOpen,closeDesktopPreview,openDesktopPreview} from './desktop-preview.js';
const icons={folder:'<path d="M3 7h6l2 2h10v11H3z"/><path d="M3 7V4h6l2 3"/>',file:'<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v6h5M9 13h6M9 17h5"/>',plus:'<path d="M12 5v14M5 12h14"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',undo:'<path d="m8 5-5 5 5 5M3 10h11a7 7 0 0 1 7 7"/>',redo:'<path d="m16 5 5 5-5 5M21 10H10a7 7 0 0 0-7 7"/>',arrow:'<path d="m8 4 8 8-8 8"/>',out:'<path d="M4 15v5h16v-5M12 17V4m-5 5 5-5 5 5"/>',trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',grip:'<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]||icons.file}</svg>`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function folderArtwork(id,label){return `<div class="folder-case-visual"><div data-folder-mount data-label="${esc(label)}" data-case-id="${id}"></div></div>`;}
let language=localStorage.getItem('ordex-language')==='en'?'en':'zh';
const t=(key,values)=>translate(language,key,values);
const applyLanguageMetadata=()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=t('appTitle');};
const languagePickerMarkup=()=>`<div class="language-control" data-language-control><button class="language-picker" type="button" data-language-trigger aria-label="${t('languageMenu')}" aria-haspopup="listbox" aria-expanded="false" title="${t('languageMenu')}"><span class="language-icon">${earthIcon}</span><svg class="language-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></button><div class="language-menu" data-language-menu role="listbox" aria-label="${t('languageMenu')}"><button type="button" role="option" aria-selected="${language==='zh'}" data-language-value="zh"><span>中文</span>${language==='zh'?'<svg class="language-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.5 10 3 3 6-6"/></svg>':''}</button><button type="button" role="option" aria-selected="${language==='en'}" data-language-value="en"><span>English</span>${language==='en'?'<svg class="language-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.5 10 3 3 6-6"/></svg>':''}</button></div></div>`;
let trash=[],multi=false,checked=new Set(),removeImportNumbering=true;
let folderRoots=[];
function clearFolderRoots(){folderRoots.forEach(root=>root.unmount());folderRoots=[];}
let nodes=[],selected=null,active=null,history=[],future=[],dragged=null,collapsed=new Set(),busy=false,status=t('saved');
const desktop=window.desktop;
applyLanguageMetadata();desktop?.setLanguage(language);
const db=desktop?null:await new Promise((resolve,reject)=>{const r=indexedDB.open('file-order-studio',2);r.onupgradeneeded=()=>{for(const name of ['state','files','view'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function read(store,key){if(desktop){const data=store==='files'?await desktop.readFile(currentCase?.id,key):await desktop.read(store,key);return store==='files'&&data?new Blob([data]):data;}return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function write(store,key,value,options={}){if(desktop)return store==='files'?desktop.writeFile(currentCase?.id,key,options.name,await value.arrayBuffer()):desktop.write(store,key,value);return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
const storedLibrary=await read('state','case-library');
const library=storedLibrary||{cases:[],activeId:null};
let warehousePage=true,warehouseQuery='';
let currentCase=library.cases.find(c=>c.id===library.activeId&&!c.deletedAt)||library.cases.find(c=>!c.deletedAt);
const saved=currentCase?.workspace||(!storedLibrary?await read('state','workspace'):null);if(saved){nodes=saved.nodes;trash=saved.trash||[];history=(saved.history||[]).map(x=>Array.isArray(x)?{nodes:x,trash:[]}:x);future=(saved.future||[]).map(x=>Array.isArray(x)?{nodes:x,trash:[]}:x);}active=nodes[0]?.id;selected=active;
// Recover metadata from previously imported File objects, including undo and recycle entries.
const metadataNodes=new Map();
function collectMetadata(list){for(const n of list){if(n.type==='file'&&(n.lastModified===undefined||n.size===undefined)){if(!metadataNodes.has(n.id))metadataNodes.set(n.id,[]);metadataNodes.get(n.id).push(n);}collectMetadata(n.children);}}
for(const snapshot of [{nodes,trash},...history,...future]){collectMetadata(snapshot.nodes);for(const entry of snapshot.trash||[])collectMetadata([entry.node]);}
let metadataChanged=false;
for(const [id,items] of metadataNodes){const file=await read('files',id);if(!file)continue;for(const n of items){if(n.lastModified===undefined&&Number.isFinite(file.lastModified)){n.lastModified=file.lastModified;metadataChanged=true;}if(n.size===undefined){n.size=file.size;metadataChanged=true;}}}
if(metadataChanged)await write('state','workspace',{nodes,trash,history,future});
if(!currentCase&&!storedLibrary&&saved&&(nodes.length||trash.length)){currentCase={id:crypto.randomUUID(),name:t('unnamedProject'),workspace:{nodes,trash,history,future},view:await read('view','ui'),updatedAt:Date.now()};library.cases.push(currentCase);library.activeId=currentCase.id;await write('state','case-library',library);}
const savedView=currentCase?.view;if(savedView){active=savedView.active||active;selected=savedView.selected||active;collapsed=new Set(savedView.collapsed||[]);multi=!!savedView.multi;checked=new Set(savedView.checked||[]);removeImportNumbering=savedView.removeImportNumbering!==false;}
const currentSnapshots=()=>[{nodes,trash},...history,...future];
async function migrateCurrentOriginalNames(){
 const byId=new Map();
 const collect=list=>{for(const node of list||[]){if(node.type==='file'){if(!byId.has(node.id))byId.set(node.id,[]);byId.get(node.id).push(node);}collect(node.children);}};
 for(const snapshot of currentSnapshots()){collect(snapshot.nodes);for(const entry of snapshot.trash||[])collect([entry.node]);}
 let changed=false;
 for(const [id,items] of byId){if(items.every(node=>node.originalNameCaptured))continue;const stored=await read('files',id),original=stored?.name||items.find(node=>typeof node.originalName==='string')?.originalName||items[0].name;for(const node of items){if(node.originalNameCaptured)continue;node.originalName=original;node.originalNameCaptured=true;changed=true;}}
 return changed;
}
function applyCurrentNumberingPreference(){for(const snapshot of currentSnapshots()){applyNumberingPreference(snapshot.nodes,removeImportNumbering);for(const entry of snapshot.trash||[])applyNumberingPreference([entry.node],removeImportNumbering);}}
const originalNamesMigrated=await migrateCurrentOriginalNames();
applyCurrentNumberingPreference();
if(originalNamesMigrated&&currentCase)await write('state','case-library',structuredClone(library));
let saveQueue=Promise.resolve(),viewTimer,started=false;
function save(){status=t('saving');updateStatus();if(currentCase&&!warehousePage){currentCase.workspace={nodes,trash,history,future};currentCase.view=currentView();currentCase.updatedAt=Date.now();}const snapshot=structuredClone(library);saveQueue=saveQueue.then(()=>write('state','case-library',snapshot)).then(()=>{status=t('saved');updateStatus();}).catch(()=>{status=t('saveFailed');updateStatus();});}
async function refreshMissingCases(){if(!desktop)return;await saveQueue;const missing=new Set(await desktop.missingCaseIds()),recovered=[];let changed=false;for(const item of library.cases){const isMissing=missing.has(item.id);if(!!item.missingDirectory===isMissing)continue;if(item.missingDirectory&&!isMissing)recovered.push(item);item.missingDirectory=isMissing;if(isMissing)item.unavailable=true;changed=true;}if(recovered.length){const refreshed=await desktop.read('state','case-library');for(const item of recovered){const saved=refreshed.cases.find(c=>c.id===item.id);if(saved)Object.assign(item,saved);}}if(currentCase?.missingDirectory){warehousePage=true;currentCase=null;changed=true;}if(changed)render();}
function updateStatus(){const el=document.querySelector('#save-state');if(el)el.textContent=status;}
function commit(fn){const before=structuredClone({nodes,trash});try{fn();history.push(before);history=history.slice(-60);future=[];save();render();}catch(e){({nodes,trash}=before);toast(translateError(language,e.message));}}
function undo(){if(!history.length)return;future.push(structuredClone({nodes,trash}));({nodes,trash}=history.pop());save();render();}
function redo(){if(!future.length)return;history.push(structuredClone({nodes,trash}));({nodes,trash}=future.pop());save();render();}
let toastTimer;function toast(message){document.querySelector('#toast').textContent=message;document.querySelector('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>document.querySelector('#toast')?.classList.remove('show'),4000);}
const count=ns=>ns.reduce((a,n)=>a+(n.type==='file'?1:0)+count(n.children),0);
const collectFileIds=(node,ids)=>{if(node.type==='file')ids.add(node.id);for(const child of node.children||[])collectFileIds(child,ids);};
async function persistPurge(ids,nextLibrary){
 const currentId=currentCase?.id;
 if(desktop)await desktop.purge([...ids],nextLibrary);else await new Promise((resolve,reject)=>{const tx=db.transaction(['state','files'],'readwrite');ids.forEach(id=>tx.objectStore('files').delete(id));tx.objectStore('state').put(nextLibrary,'case-library');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
 library.cases=nextLibrary.cases;library.activeId=nextLibrary.activeId;currentCase=currentId?library.cases.find(caseItem=>caseItem.id===currentId):null;if(currentCase)({nodes,trash,history,future}=currentCase.workspace);
}
function row(n,depth=0){const l=locate(nodes,n.id),number=l.path.join('.');return `<div class="row ${selected===n.id?'selected':''}" data-id="${n.id}" draggable="${!multi}" style="--depth:${depth}">${multi?`<input class="item-check" type="checkbox" data-check="${n.id}" aria-label="${esc(t('selectItem',{name:number+' '+n.name}))}" ${checked.has(n.id)?'checked':''}>`:''}<span class="grip">${icon('grip')}</span><button class="chevron ${collapsed.has(n.id)?'closed':''}" data-toggle="${n.id}" aria-label="${t('expandCollapse')}" ${!n.children.length?'disabled':''}>${icon('arrow')}</button>${fileIcon(n,n.children.length>0&&(!collapsed.has(n.id)||multi))}<span class="number">${number}</span><span class="filename">${esc(n.name)}</span><span class="modified">${n.type==='file'?formatModified(n.lastModified):'—'}</span><span class="file-size">${n.type==='file'?formatSize(n.size):'—'}</span><span class="drop-halves" aria-hidden="true"><span class="drop-half drop-left"><b>${t('insertAfter')}</b><small>${t('sameLevel')}</small></span><span class="drop-half drop-right"><b>${t('moveInside')}</b><small>${t('appendLastChild')}</small></span></span><span class="drop-caption" role="status"></span></div>${collapsed.has(n.id)&&!multi?'':n.children.map(c=>row(c,depth+1)).join('')}`;}
function render(){clearFolderRoots();document.querySelector('#app').classList.toggle('warehouse-home',warehousePage);if(warehousePage)return renderWarehouse();const scrollTop=window.scrollY;checked=new Set([...checked].filter(id=>locate(nodes,id)));if(!nodes.some(n=>n.id===active))active=nodes[0]?.id;if(selected&&!locate(nodes,selected))selected=active;const section=nodes.find(n=>n.id===active),sel=locate(nodes,selected),parent=sel?.parent;const fileCount=count(nodes);
document.querySelector('#app').innerHTML=`<aside class="sidebar"><div class="brand"><img class="brand-logo" src="./ordex-logo-transparent.png" alt="Ordex" draggable="false"></div><div class="sidebar-context"><nav>${nodes.map((n,i)=>`<button class="section ${active===n.id?'active':''}" data-section="${n.id}" draggable="${!multi}" title="${t('sectionSwapTitle')}"><span class="section-number">${i+1}</span><b class="section-name"><span>${esc(n.name)}</span></b></button>`).join('')}</nav><button class="add-section" id="add-section">${plusIcon}${t('newSection')}</button></div><div class="sidebar-bottom"><button id="trash-open" class="trash-open">${trashIcon}${t('trash')}</button><div class="sidebar-divider"></div><button id="warehouse" class="warehouse-button">${storageIcon}${t('myProjects')}</button></div><button class="primary sidebar-export" id="export" ${!nodes.length||busy?'disabled':''} title="${t('exportTitle')}">${icon('download')}${t('exportAll')}</button></aside><div class="workspace"><header class="case-header"><span id="case-name">${esc(currentCase.name)}</span></header><main><div class="heading"><div><div class="title-line">${section?`<span class="title-number">${nodes.indexOf(section)+1}</span>`:''}<h1>${esc(section?.name||t('tagline'))}</h1>${section?`<button id="rename-title" class="title-edit" title="${t('renameSection')}" aria-label="${t('renameSection')}">${editIcon}</button>`:''}</div></div><div class="history"><button id="undo" title="${t('undo')}" ${!history.length?'disabled':''}>${icon('undo')}</button><button id="redo" title="${t('redo')}" ${!future.length?'disabled':''}>${icon('redo')}</button></div></div><div class="toolbar"><button id="import" ${!section||busy?'disabled':''}>${uploadIcon}${t('importFiles')}</button><button id="import-folder" ${!section||busy?'disabled':''}>${folderIcon}${t('importFolder')}</button><button id="new-folder" ${!section?'disabled':''}>${plusIcon}${t('newFolder')}</button></div><div class="selection-tools"><button id="multi">${t(multi?'exitSelect':'selectMultiple')}</button>${multi?`<button id="select-all">${t('selectAll')}</button><span class="check-count">${t('selectedCount',{count:checked.size})}</span>`:''}${parent&&parent.type!=='section'?`<button id="move-out" data-out="${sel.node.id}">${t('moveUp')}</button>`:''}<button id="delete" ${multi?!checked.size?'disabled':'':!sel?'disabled':''}>${t('delete')}${multi&&checked.size?` (${checked.size})`:''}</button></div><div class="table-head"><span>${t('tableName')}</span><span>${t('modified')}</span><span>${t('size')}</span></div><div class="file-list" role="tree" aria-label="${t('organizer')}">${section?.children.length?section.children.map(n=>row(n)).join(''):`<div class="empty"><span class="empty-icon">${folderIcon}</span><h2>${t(section?'dropToStart':'firstSection')}</h2>${!section?`<p>${t('sectionExamples')}</p><button class="text-button" id="empty-action">${t('newSection')}</button>`:''}</div>`}</div>${section?.children.length?`<div class="append-zone" data-append="${section.id}">${plusIcon}${t('appendImport')} <span>${t('appendLevel')}</span></div>`:''}</main><footer><span id="save-state">${status}</span><span>${t('workspaceCount',{files:fileCount,sections:nodes.length})}</span></footer></div><input id="file-input" type="file" multiple hidden><input id="folder-input" type="file" webkitdirectory multiple hidden><div id="toast" role="status"></div>`;
const numberingButton=document.createElement('button');numberingButton.id='strip-numbering';numberingButton.className=`numbering-toggle ${removeImportNumbering?'is-on':''}`;numberingButton.type='button';numberingButton.setAttribute('aria-pressed',String(removeImportNumbering));numberingButton.title=t('numberingTitle');numberingButton.innerHTML=`<span class="numbering-switch" aria-hidden="true"><i></i></span>${t('numberingLabel')}`;document.querySelector('#new-folder').after(numberingButton);
document.querySelector('#app>.workspace>footer')?.remove();
const caseHeaderActions=document.createElement('div');caseHeaderActions.className='case-header-actions';
caseHeaderActions.innerHTML=languagePickerMarkup();
const trashButton=document.querySelector('#trash-open'),warehouseButton=document.querySelector('#warehouse');warehouseButton.classList.add('primary');caseHeaderActions.append(trashButton,warehouseButton);document.querySelector('.case-header').append(caseHeaderActions);document.querySelector('.sidebar-bottom')?.remove();
const addSectionButton=document.querySelector('#add-section');addSectionButton.classList.add('compact-add-section');addSectionButton.innerHTML=plusIcon;addSectionButton.setAttribute('aria-label',t('newSection'));addSectionButton.title=t('newSection');document.querySelector('.sidebar-context').prepend(addSectionButton);
const toolbar=document.querySelector('.toolbar');toolbar.append(document.querySelector('.selection-tools'));
const stickyControls=document.createElement('div'),main=document.querySelector('.workspace main'),heading=document.querySelector('.heading'),tableHead=document.querySelector('.table-head');stickyControls.className='sticky-workspace-controls';main.insertBefore(stickyControls,heading);stickyControls.append(heading,toolbar,tableHead);
bind();if(started){window.scrollTo(0,scrollTop);persistView();}}
function on(id,fn){document.getElementById(id)?.addEventListener('click',fn);}
function setLanguage(next){if(next===language)return;language=next==='en'?'en':'zh';localStorage.setItem('ordex-language',language);status=t('saved');applyLanguageMetadata();desktop?.setLanguage(language);render();}
let closeLanguageMenu;
function bindLanguagePicker(root=document){
 closeLanguageMenu?.();
 root.querySelectorAll('[data-language-control]').forEach(control=>{
  const trigger=control.querySelector('[data-language-trigger]'),menu=control.querySelector('[data-language-menu]'),options=[...menu.querySelectorAll('[data-language-value]')];
  const close=focus=>{control.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',onKey);if(closeLanguageMenu===close)closeLanguageMenu=null;if(focus)trigger.focus();};
  const open=()=>{control.classList.add('is-open');trigger.setAttribute('aria-expanded','true');closeLanguageMenu=close;document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',onKey);requestAnimationFrame(()=>options.find(option=>option.getAttribute('aria-selected')==='true')?.focus());};
  const dismiss=event=>{if(!control.contains(event.target))close(false);};
  const onKey=event=>{if(event.key==='Escape'){event.preventDefault();close(true);return;}if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const current=Math.max(0,options.indexOf(document.activeElement));const next=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='ArrowDown'?(current+1)%options.length:(current-1+options.length)%options.length;options[next].focus();};
  trigger.onclick=()=>control.classList.contains('is-open')?close(false):open();
  trigger.onkeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();open();}};
  options.forEach(option=>option.onclick=()=>{const next=option.dataset.languageValue;close(false);setLanguage(next);});
 });
}

function startRename(id=selected){
 const current=locate(nodes,id);if(!current)return;
 const host=current.node.type==='section'?document.querySelector('h1'):document.querySelector(`[data-id="${current.node.id}"] .filename`);
 if(!host)return;
 host.closest('.row')?.setAttribute('draggable','false');
 host.innerHTML=`<input id="rename" aria-label="${t('name')}" value="${esc(current.node.name)}">`;
 const input=host.querySelector('input');input.onclick=e=>e.stopPropagation();input.ondblclick=e=>e.stopPropagation();input.onpointerdown=e=>e.stopPropagation();input.focus();input.select();
 let finished=false;
 const finish=cancel=>{if(finished)return;finished=true;const name=input.value.trim();if(!cancel&&name&&name!==current.node.name)commit(()=>{const node=locate(nodes,current.node.id).node;node.name=name;if(node.type==='file'){node.originalName=name;node.originalNameCaptured=true;}});else render();};
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finish(false);}if(e.key==='Escape')finish(true);};
 input.onblur=()=>finish(false);
}
function setDragGhost(event,row){
 document.querySelector('#drag-ghost')?.remove();
 const canvas=document.createElement('canvas');canvas.id='drag-ghost';canvas.width=320;canvas.height=36;
 canvas.style.cssText='position:fixed;left:-1000px;top:0;pointer-events:none';
 const ctx=canvas.getContext('2d');ctx.globalAlpha=.22;ctx.fillStyle='#e0f4ed';ctx.fillRect(0,0,320,36);
 ctx.fillStyle='#203b36';ctx.font='13px sans-serif';ctx.fillText(row.querySelector('.number').textContent+' '+row.querySelector('.filename').textContent,10,23,300);
 document.body.append(canvas);event.dataTransfer.setDragImage(canvas,20,18);
}

function deleteItems(ids){
 if(!ids.filter(Boolean).length)return;
 commit(()=>{recycle(nodes,trash,ids);checked.clear();});
 toast(t('movedToTrash'));
}
function showSectionMenu(event,id){
 document.querySelector('.section-menu')?.remove();
 const section=nodes.find(node=>node.id===id),isEmpty=!section?.children.length;
 const menu=document.createElement('div');menu.className='section-menu';menu.setAttribute('role','menu');
 const button=document.createElement('button');button.textContent=t(isEmpty?'delete':'moveToTrash');button.setAttribute('role','menuitem');
 button.onclick=()=>{menu.remove();if(!isEmpty)return deleteItems([id]);commit(()=>{const index=nodes.findIndex(node=>node.id===id);if(index<0)return;nodes.splice(index,1);if(active===id)active=nodes[index]?.id||nodes[index-1]?.id||null;if(selected===id)selected=active;});toast(t('sectionDeleted'));};menu.append(button);document.body.append(menu);
 menu.style.left=Math.min(event.clientX,innerWidth-170)+'px';menu.style.top=Math.min(event.clientY,innerHeight-50)+'px';button.focus();
 const dismiss=e=>{if(!menu.contains(e.target)){menu.remove();document.removeEventListener('pointerdown',dismiss);}};
 document.addEventListener('pointerdown',dismiss);menu.onkeydown=e=>{if(e.key==='Escape'){menu.remove();document.removeEventListener('pointerdown',dismiss);}};
}
function showTrash(){
 document.querySelector('#trash-drawer-layer')?.remove();
 const layer=document.createElement('div');layer.id='trash-drawer-layer';layer.className='trash-drawer-layer';
 layer.innerHTML=`<button class="trash-drawer-backdrop" aria-label="${t('closeTrash')}"></button><aside class="trash-drawer" role="dialog" aria-modal="true" aria-labelledby="trash-title"><header class="trash-drawer-header"><div><h2 id="trash-title">${t('trash')}</h2><span data-trash-count></span></div><button class="trash-drawer-close" aria-label="${t('closeTrash')}">×</button></header><div class="trash-drawer-content"></div><footer class="trash-drawer-footer"><span class="trash-drawer-status" role="status"></span><button class="trash-empty-all">${t('emptyTrash')}</button></footer></aside>`;
 document.body.append(layer);document.body.classList.add('trash-drawer-open');
 const close=()=>{document.removeEventListener('keydown',onKey);layer.classList.remove('is-open');document.body.classList.remove('trash-drawer-open');setTimeout(()=>layer.remove(),340);};
 layer.querySelector('.trash-drawer-backdrop').onclick=close;layer.querySelector('.trash-drawer-close').onclick=close;
 const onKey=e=>{if(e.key==='Escape'){document.removeEventListener('keydown',onKey);close();}};document.addEventListener('keydown',onKey);
 const entries=()=>library.cases.flatMap(caseItem=>caseItem.deletedAt?[{type:'case',caseItem,deletedAt:caseItem.deletedAt}]:((caseItem.workspace?.trash||[]).map(entry=>({type:'item',caseItem,entry,deletedAt:entry.deletedAt})))).sort((a,b)=>b.deletedAt-a.deletedAt);
 const refresh=()=>{
  const items=entries(),content=layer.querySelector('.trash-drawer-content'),status=layer.querySelector('.trash-drawer-status');
  layer.querySelector('[data-trash-count]').textContent=t('itemCount',{count:items.length});
  layer.querySelector('.trash-empty-all').disabled=!items.length;
  content.innerHTML=items.length?items.map(item=>{const node=item.type==='case'?{type:'folder',name:item.caseItem.name,children:item.caseItem.workspace.nodes}:item.entry.node;const kind=t(item.type==='case'?'projectFolder':node.type==='file'?'file':'folder');const detail=item.type==='case'?t('fileCount',{count:count(node.children)}):`${esc(item.caseItem.name)} · ${t('originalPosition',{number:esc(item.entry.number)})}${node.children.length?` · ${t('containsFiles',{count:count(node.children)})}`:''}`;const target=`data-case="${item.caseItem.id}" ${item.entry?`data-entry="${item.entry.id}"`:''}`;return `<article class="trash-drawer-row">${fileIcon(node)}<div><b>${esc(node.name)}</b><small>${kind} · ${detail}</small></div><span class="trash-row-actions"><button class="trash-restore" ${target}>${t('restore')}</button><button class="trash-delete-one" ${target}>${t('delete')}</button></span></article>`;}).join(''):`<div class="trash-drawer-empty"><em>${t('empty')}</em></div>`;
  content.querySelectorAll('.trash-restore').forEach(button=>button.onclick=()=>{
   const caseItem=library.cases.find(item=>item.id===button.dataset.case);let number;
   try{
    if(!button.dataset.entry){delete caseItem.deletedAt;save();render();status.textContent=t('projectRestored');}
    else if(caseItem===currentCase){commit(()=>{number=restoreEntry(nodes,trash,button.dataset.entry);});status.textContent=number?t('restoredPosition',{number}):'';}
    else{const workspace=caseItem.workspace,before=structuredClone({nodes:workspace.nodes,trash:workspace.trash});number=restoreEntry(workspace.nodes,workspace.trash,button.dataset.entry);workspace.history=[...(workspace.history||[]),before].slice(-60);workspace.future=[];caseItem.updatedAt=Date.now();save();render();status.textContent=t('restoredTo',{project:caseItem.name,number});}
    refresh();
   }catch(error){status.textContent=translateError(language,error.message);}
  });
  content.querySelectorAll('.trash-delete-one').forEach(button=>button.onclick=()=>{
   const item=entries().find(candidate=>candidate.caseItem.id===button.dataset.case&&(button.dataset.entry?candidate.entry?.id===button.dataset.entry:candidate.type==='case'));if(!item)return;
   const name=item.type==='case'?item.caseItem.name:item.entry.node.name,dialog=document.createElement('dialog');dialog.id='purge-dialog';dialog.innerHTML=`<h2 data-title></h2><p>${t('cannotUndo')}</p><div class="purge-dialog-actions"><button data-cancel>${t('cancel')}</button><button data-confirm class="purge-danger">${t('confirmPermanentDelete')}</button></div>`;dialog.querySelector('[data-title]').textContent=t('permanentQuestion',{name});document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
   dialog.querySelector('[data-confirm]').onclick=async()=>{const confirm=dialog.querySelector('[data-confirm]');confirm.disabled=true;try{await saveQueue;const ids=new Set(),nextLibrary=structuredClone(library),nextCase=nextLibrary.cases.find(candidate=>candidate.id===item.caseItem.id);if(item.type==='case'){for(const snapshot of [nextCase.workspace,...(nextCase.workspace.history||[]),...(nextCase.workspace.future||[])]){for(const node of snapshot.nodes||[])collectFileIds(node,ids);for(const entry of snapshot.trash||[])collectFileIds(entry.node,ids);}nextLibrary.cases=nextLibrary.cases.filter(candidate=>candidate.id!==nextCase.id);if(nextLibrary.activeId===nextCase.id)nextLibrary.activeId=null;}else{const node=discardTrashEntry(nextCase.workspace.trash,item.entry.id);collectFileIds(node,ids);nextCase.workspace.history=[];nextCase.workspace.future=[];nextCase.updatedAt=Date.now();}await persistPurge(ids,nextLibrary);dialog.close();render();refresh();layer.querySelector('.trash-drawer-status').textContent=t('permanentlyDeleted',{name});}catch(error){confirm.disabled=false;dialog.querySelector('p').textContent=t('deleteFailed');}};
  });
 };
 layer.querySelector('.trash-empty-all').onclick=()=>{
  const dialog=document.createElement('dialog');dialog.id='purge-dialog';dialog.innerHTML=`<h2>${t('emptyQuestion')}</h2><p>${t('emptyCannotUndo')}</p><div class="purge-dialog-actions"><button data-cancel>${t('cancel')}</button><button data-confirm class="purge-danger">${t('confirmEmptyTrash')}</button></div>`;document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('[data-confirm]').onclick=async()=>{
   const confirm=dialog.querySelector('[data-confirm]');confirm.disabled=true;
   try{
    await saveQueue;
    const ids=new Set(),nextLibrary=structuredClone(library);
    for(const caseItem of nextLibrary.cases){const workspace=caseItem.workspace;if(caseItem.deletedAt){for(const snapshot of [workspace,...(workspace.history||[]),...(workspace.future||[])]){for(const node of snapshot.nodes||[])collectFileIds(node,ids);for(const entry of snapshot.trash||[])collectFileIds(entry.node,ids);}}else{for(const entry of workspace.trash||[])collectFileIds(entry.node,ids);workspace.trash=[];workspace.history=[];workspace.future=[];}}
    nextLibrary.cases=nextLibrary.cases.filter(caseItem=>!caseItem.deletedAt);
    await persistPurge(ids,nextLibrary);
    dialog.close();render();refresh();layer.querySelector('.trash-drawer-status').textContent=t('trashEmptied');
   }catch(error){confirm.disabled=false;dialog.querySelector('p').textContent=t('emptyFailed');}
  };
 };
 refresh();requestAnimationFrame(()=>{layer.classList.add('is-open');layer.querySelector('.trash-drawer-close').focus();});
}

function addSection(){commit(()=>{const n=makeNode(t('untitledSection'),'section');nodes.push(n);active=selected=n.id;});startRename();}
function addFolder(){const p=locate(nodes,selected||active);if(!p)return;if(p.node.type==='file')return toast(t('folderUnderFileHelp'));if(p.path.length>=5)return toast(t('maxFive'));commit(()=>{const n=makeNode(t('newFolder'),'folder');p.node.children.push(n);selected=n.id;});startRename();}
const sectionResize=new ResizeObserver(entries=>{for(const {target} of entries){const text=target.firstElementChild;const distance=Math.max(0,text.scrollWidth-target.clientWidth);target.classList.toggle('overflows',distance>0);target.style.setProperty('--title-shift',`-${distance}px`);target.style.setProperty('--title-duration',`${Math.max(.6,distance/80)}s`);}});
function bind(){on('warehouse',()=>showWarehouse());bindLanguagePicker();sectionResize.disconnect();document.querySelectorAll('.section-name').forEach(el=>sectionResize.observe(el));on('add-section',addSection);on('undo',undo);on('redo',redo);on('new-folder',addFolder);on('strip-numbering',()=>{removeImportNumbering=!removeImportNumbering;applyCurrentNumberingPreference();save();render();toast(t(removeImportNumbering?'numberingHidden':'originalNamesRestored'));});on('empty-action',()=>active?document.querySelector('#file-input').click():addSection());on('import',()=>document.querySelector('#file-input').click());on('import-folder',()=>document.querySelector('#folder-input').click());on('rename-title',()=>startRename(active));on('move-out',()=>commit(()=>moveOut(nodes,selected)));on('delete',()=>deleteItems(multi?[...checked]:[selected]));on('multi',()=>{multi=!multi;checked.clear();render();});on('select-all',()=>{const all=[];const walk=ns=>ns.forEach(n=>{all.push(n.id);walk(n.children);});walk(nodes.find(n=>n.id===active)?.children||[]);checked=new Set(all);render();});on('trash-open',showTrash);on('export',exportZip);
document.querySelectorAll('[data-section]').forEach(el=>{el.onclick=()=>{active=selected=el.dataset.section;checked.clear();render();};wireDrop(el,()=>({target:el.dataset.section,position:'inside'}));
 el.ondragstart=e=>{dragged=el.dataset.section;e.dataTransfer.setData('application/x-file-order',dragged);e.dataTransfer.effectAllowed='move';};
 el.ondragend=()=>{dragged=null;clearDrop();};
 el.oncontextmenu=e=>{e.preventDefault();showSectionMenu(e,el.dataset.section);};});
document.querySelectorAll('[data-check]').forEach(el=>{el.onclick=e=>e.stopPropagation();el.onchange=()=>{el.checked?checked.add(el.dataset.check):checked.delete(el.dataset.check);render();};});
document.querySelectorAll('[data-toggle]').forEach(el=>el.onclick=e=>{e.stopPropagation();const id=el.dataset.toggle;collapsed.has(id)?collapsed.delete(id):collapsed.add(id);render();});
document.querySelectorAll('.row').forEach(el=>{el.onclick=()=>{if(multi){checked.has(el.dataset.id)?checked.delete(el.dataset.id):checked.add(el.dataset.id);render();return;}if(selected===el.dataset.id)return;selected=el.dataset.id;render();};el.ondblclick=()=>{if(multi)return;selected=el.dataset.id;startRename();};el.ondragstart=e=>{dragged=el.dataset.id;e.dataTransfer.setData('application/x-file-order',dragged);e.dataTransfer.effectAllowed='move';setDragGhost(e,el);document.body.classList.add('dragging');requestAnimationFrame(()=>el.classList.add('drag-source'));};el.ondragend=()=>{dragged=null;clearDrop();document.body.classList.remove('dragging');el.classList.remove('drag-source');document.querySelector('#drag-ghost')?.remove();};wireDrop(el,e=>{return {target:el.dataset.id,...rowDropTarget(el.getBoundingClientRect(),e.clientX,e.clientY)};});});
document.querySelectorAll('[data-append]').forEach(el=>wireDrop(el,()=>({target:el.dataset.append,position:'inside'})));document.querySelectorAll('[data-out]').forEach(el=>wireDrop(el,()=>({out:true})));const empty=document.querySelector('.empty');if(empty&&active)wireDrop(empty,()=>({target:active,position:'inside'}));
document.querySelector('#file-input').onchange=e=>importFiles([...e.target.files],active);document.querySelector('#folder-input').onchange=e=>importFiles([...e.target.files],active,true);
}
function clearDrop(){document.querySelectorAll('.drop-before,.drop-after,.drop-inside,.drop-hover').forEach(el=>{el.classList.remove('drop-before','drop-after','drop-inside','drop-hover','drop-invalid','swap-target');delete el.dataset.zone;});}
function dropPreview(d){
 if(!dragged||d.out)return {number:null};
 const copy=structuredClone(nodes);
 try{if(copy.some(n=>n.id===dragged)&&copy.some(n=>n.id===d.target))swapSections(copy,dragged,d.target);else move(copy,dragged,d.target,d.position);return {number:locate(copy,dragged).path.join('.')};}
 catch(e){return {error:e.message};}
}

function wireDrop(el,get){el.ondragover=e=>{e.preventDefault();e.stopPropagation();const d=get(e);clearDrop();el.classList.add('drop-'+(d.position||'inside'));
 const preview=dropPreview(d);
 e.dataTransfer.dropEffect=dragged?'move':'copy';
 if(el.dataset.section){el.classList.toggle('swap-target',!!dragged&&nodes.some(n=>n.id===dragged));}
 const caption=el.querySelector('.drop-caption');
 if(caption){
  el.classList.add('drop-hover');el.dataset.zone=d.zone;
  el.classList.toggle('drop-invalid',!!preview.error);
  const action=t(d.position==='inside'?'moveInside':d.position==='before'?'insertBefore':'insertAfter');
  const targetNumber=locate(nodes,d.target).path.join('.');
  caption.textContent=preview.error?translateError(language,preview.error):`${action} · ${preview.number?t('newNumber',{number:preview.number}):t('target',{number:targetNumber})}`;
 }
 };el.ondragleave=e=>{if(!el.contains(e.relatedTarget))clearDrop();};el.ondrop=async e=>{e.preventDefault();e.stopPropagation();clearDrop();const d=get(e),id=e.dataTransfer.getData('application/x-file-order');if(id){commit(()=>d.out?moveOut(nodes,id):nodes.some(n=>n.id===id)&&nodes.some(n=>n.id===d.target)?swapSections(nodes,id,d.target):move(nodes,id,d.target,d.position));dragged=null;document.body.classList.remove('dragging');}else if(!d.out){const entries=[...e.dataTransfer.items].map(x=>x.webkitGetAsEntry?.()).filter(Boolean);try{const files=entries.length?await collectEntries(entries):[...e.dataTransfer.files];await importFiles(files,d.target,true,d.position);}catch(err){toast(t('readFolderFailed',{error:translateError(language,err.message)}));}}};}
async function collectEntries(entries,base=''){const files=[];for(const entry of entries){if(entry.isFile){const file=await new Promise((r,j)=>entry.file(r,j));files.push({file,path:base+file.name});}else{files.push({directory:base+entry.name});const reader=entry.createReader();let batch;do{batch=await new Promise((r,j)=>reader.readEntries(r,j));files.push(...await collectEntries(batch,base+entry.name+'/'));}while(batch.length);}}return files;}
async function importFiles(items,targetId,paths=false,position='inside'){if(busy)return;if(!targetId)return toast(t('createSectionFirst'));busy=true;try{const imported=[];const fileWrites=[];let strippedCount=0;for(const item of items){const f=item.file||item;const parts=(item.directory||item.path||(paths&&f.webkitRelativePath)||f.name).split('/');let list=imported;for(let i=0;i<parts.length;i++){const folder=!!item.directory||i<parts.length-1;if(folder){let n=list.find(n=>n.type==='folder'&&n.name===parts[i]);if(!n){n=makeNode(parts[i],'folder');list.push(n);}list=n.children;}else{const originalName=parts[i],name=normalizeImportedName(originalName,removeImportNumbering);if(name!==originalName)strippedCount++;const n=makeNode(name,'file',{originalName,originalNameCaptured:true,size:f.size,lastModified:f.lastModified});list.push(n);fileWrites.push([n.id,f,n.name]);}}}
const target=locate(nodes,targetId),parent=position==='inside'?target?.node:target?.parent;if(!parent)throw Error(t('chooseSectionLocation'));if(parent.type==='file'&&imported.some(containsFolder))throw Error(t('folderUnderFile'));if(locate(nodes,parent.id).path.length+Math.max(0,...imported.map(height))>5)throw Error(t('importTooDeep'));for(const [id,f,name] of fileWrites)await write('files',id,f,{name});
commit(()=>{const list=parent.children,index=position==='inside'?list.length:list.findIndex(n=>n.id===targetId)+(position==='after'?1:0);list.splice(index,0,...imported);collapsed.delete(parent.id);});toast(t('imported',{count:fileWrites.length,removed:strippedCount?t('removedCount',{count:strippedCount}):''}));
}catch(e){toast(translateError(language,e.message));}finally{busy=false;for(const id of ['import','import-folder','export']){const button=document.getElementById(id);if(button)button.disabled=false;}}}
async function exportZip(){if(busy)return;busy=true;document.querySelector('#export').disabled=true;document.querySelector('#export').textContent=t('generatingZip');toast(t('preparingExport'));try{const bytes=await buildArchive(nodes,id=>read('files',id));const blob=new Blob([bytes],{type:'application/zip'});if(desktop){const done=await desktop.saveZip(await blob.arrayBuffer());if(done)toast(t('exported'));}else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(language==='en'?'Ordex_Numbered_Files_':'Ordex_编号文件_')+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);toast(t('exported'));}}catch(e){toast(t('exportFailed',{error:translateError(language,e.message)}));}finally{busy=false;document.querySelector('#export').disabled=false;document.querySelector('#export').innerHTML=icon('download')+t('exportAll');}}
async function toggleSelectedPreview(){const node=locate(nodes,selected)?.node;if(!desktop||!currentCase||node?.type!=='file')return;try{if(desktop.platform==='darwin'){const result=await desktop.togglePreview(currentCase.id,node.id);if(result==='missing')toast(t('previewMissing'));}else if(desktop.platform==='win32'){const file=await read('files',node.id);if(!file)return toast(t('previewMissing'));await openDesktopPreview({name:node.originalName||node.name,blob:file,translate:t,openOriginal:()=>desktop.openFile(currentCase.id,node.id)});}}catch(error){toast(t('previewFailed',{error:translateError(language,error.message)}));}}
document.addEventListener('keydown',e=>{if(previewIsOpen()){if(e.key==='Escape'||e.code==='Space'){e.preventDefault();closeDesktopPreview();}return;}if(document.querySelector('dialog[open]')||warehousePage)return;if(e.target.closest?.('input,textarea,button,select,[contenteditable="true"]'))return;if(e.key==='Escape'){desktop?.closePreview();return;}if(['darwin','win32'].includes(desktop?.platform)&&e.code==='Space'&&!e.repeat&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.shiftKey&&!multi&&locate(nodes,selected)?.node.type==='file'){e.preventDefault();toggleSelectedPreview();return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}});
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());

function currentView(){return {active,selected,collapsed:[...collapsed],multi,checked:[...checked],removeImportNumbering,scrollY:window.scrollY};}
function persistView(){clearTimeout(viewTimer);if(warehousePage||!currentCase)return;currentCase.view=currentView();const snapshot=structuredClone(library);saveQueue=saveQueue.then(()=>write('state','case-library',snapshot)).catch(()=>{status=t('viewSaveFailed');updateStatus();});}
window.addEventListener('scroll',()=>{if(started){clearTimeout(viewTimer);viewTimer=setTimeout(persistView,120);}},{passive:true});
desktop?.onHistory(action=>{if(document.querySelector('dialog[open]'))return;if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))document.execCommand(action);else action==='undo'?undo():redo();});
desktop?.onClosing(async()=>{if(busy)return false;document.activeElement?.blur();await saveQueue;await write('view','ui',currentView());return status===t('saved');});
desktop?.onProjectDirectoryCheck(()=>refreshMissingCases().catch(()=>{}));

render();
requestAnimationFrame(()=>{window.scrollTo(0,0);started=true;});

function renameCase(item){
 if(!warehousePage||item.deletedAt)return;
 const button=document.querySelector(`[data-rename="${CSS.escape(item.id)}"]`);
 const title=button?.closest('.folder-case-heading')?.querySelector('b');
 if(!title)return;
 const input=document.createElement('input');input.className='case-inline-rename';input.value=item.name;input.setAttribute('aria-label',t('renameProject',{name:item.name}));
 title.replaceWith(input);button.hidden=true;input.focus();input.select();
 let settled=false;
 const finish=async saveName=>{if(settled)return;const name=input.value.trim();settled=true;if(saveName&&name&&name!==item.name){item.name=name;item.updatedAt=Date.now();save();await saveQueue;}render();};
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finish(true);}else if(e.key==='Escape'){e.preventDefault();finish(false);}};
 input.onblur=()=>finish(true);
}
async function openCase(item){
 if(busy)return;if(desktop){item.missingDirectory=(await desktop.missingCaseIds()).includes(item.id);if(item.missingDirectory){item.unavailable=true;render();toast(t('projectFolderMissing'));return;}if(item.unavailable){const refreshed=await desktop.read('state','case-library'),saved=refreshed.cases.find(c=>c.id===item.id);if(saved)Object.assign(item,saved);if(item.unavailable){render();toast(t('projectDataMissing'));return;}}}clearTimeout(viewTimer);save();await saveQueue;
 currentCase=item;library.activeId=item.id;warehousePage=false;
 ({nodes,trash,history,future}=item.workspace);
 const view=item.view||{};active=view.active||nodes[0]?.id;selected=view.selected||active;collapsed=new Set(view.collapsed||[]);multi=false;checked.clear();removeImportNumbering=view.removeImportNumbering!==false;const migrated=await migrateCurrentOriginalNames();applyCurrentNumberingPreference();if(migrated)await write('state','case-library',structuredClone(library));
 await write('state','case-library',structuredClone(library));
 document.querySelector('#warehouse-dialog')?.close();render();window.scrollTo(0,view.scrollY||0);
}
function showWarehouse(){
 if(busy)return;
 if(!warehousePage)save();
 clearTimeout(viewTimer);warehousePage=true;render();window.scrollTo(0,0);
}
function createCase(){
 const dialog=document.createElement('dialog');dialog.id='new-case-dialog';
 dialog.innerHTML=`<form><h2>${t('newProject')}</h2><input id="new-case-name" required autocomplete="off" aria-label="${t('projectName')}" placeholder="${t('enterProjectName')}"><p class="case-name-error" role="status"></p><div class="warehouse-tools"><button type="button" data-cancel>${t('cancel')}</button><button type="submit" class="primary">${t('createOpen')}</button></div></form>`;
 document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();
 const input=dialog.querySelector('input');input.focus();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const name=input.value.trim(),error=dialog.querySelector('.case-name-error'),submit=dialog.querySelector('[type="submit"]');if(!name){error.textContent=t('projectNameRequired');input.focus();return;}submit.disabled=true;
 let directory;try{directory=desktop?await desktop.chooseCaseDirectory(name):null;}catch(reason){error.textContent=translateError(language,reason.message);submit.disabled=false;return;}if(desktop&&!directory){error.textContent=t('chooseProjectFolder');submit.disabled=false;return;}
 const item={id:crypto.randomUUID(),name,directory,workspace:{nodes:[],trash:[],history:[],future:[]},view:{},updatedAt:Date.now()};library.cases.push(item);dialog.close();await openCase(item);
 };
}
function confirmMissingCase(item){
 const dialog=document.createElement('dialog');dialog.id='missing-case-dialog';dialog.innerHTML=`<h2>${esc(t('removeMissingQuestion',{name:item.name}))}</h2><p>${t('removeMissingDetail')}</p><div class="purge-dialog-actions"><button type="button" data-cancel>${t('cancel')}</button><button type="button" class="purge-danger" data-confirm>${t('removeCard')}</button></div>`;document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 dialog.querySelector('[data-confirm]').onclick=async()=>{const button=dialog.querySelector('[data-confirm]');button.disabled=true;try{await saveQueue;const updated=await desktop.removeMissingCase(item.id);library.cases=updated.cases;library.activeId=updated.activeId;if(currentCase?.id===item.id)currentCase=null;dialog.close();render();toast(t('missingProjectRemoved'));}catch(error){button.disabled=false;dialog.close();await refreshMissingCases();toast(translateError(language,error.message));}};
}
function renderWarehouse(){
 sectionResize.disconnect();
 const date=value=>language==='en'?new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric'}).format(value):new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(value).replaceAll('/','-');
 const matches=c=>c.name.toLocaleLowerCase().includes(warehouseQuery.trim().toLocaleLowerCase());
 const items=library.cases.filter(c=>!c.deletedAt).sort((a,b)=>b.updatedAt-a.updatedAt);
 const card=c=>{const missing=!!c.missingDirectory,unavailable=!!c.unavailable,fileCount=count(c.workspace.nodes);return `<article class="folder-case-card${unavailable?' is-missing':''}">${folderArtwork(c.id,c.name)}<div class="folder-case-summary"><div class="folder-case-heading"><b title="${esc(c.name)}">${esc(c.name)}</b>${unavailable?'':`<span class="case-inline-actions"><button class="case-icon-button case-edit-button" data-rename="${c.id}" aria-label="${esc(t('renameProject',{name:c.name}))}" title="${t('rename')}">${editIcon}</button><button class="case-icon-button" data-action="${c.id}" aria-label="${esc(t('moveProjectTrash',{name:c.name}))}" title="${t('moveToTrash')}">${trashIcon}</button></span>`}</div><span class="case-meta${unavailable?' case-missing':''}">${unavailable?`${t(missing?'projectFolderMissing':'projectDataMissing')}${missing?` <button type="button" data-remove-missing="${c.id}">${t('removeCard')}</button>`:''}`:t('fileCount',{count:fileCount})}</span><span class="case-updated">${icon('clock')}<span>${t('updated',{date:date(c.updatedAt)})}</span></span></div></article>`;};
 const emptyMessage=t(warehouseQuery?'noMatchingProjects':'firstProject');
 document.querySelector('#app').innerHTML=`<div class="workspace warehouse-shell"><header class="warehouse-topbar"><div class="warehouse-identity"><span class="warehouse-logo"><img src="./ordex-logo-transparent.png" alt="Ordex"></span><span class="warehouse-title-divider"></span><h1>${t('myProjects')}</h1></div><div class="warehouse-home-actions">${languagePickerMarkup()}<button data-trash-open>${trashIcon}${t('trash')}</button><button data-new class="primary">${plusIcon}${t('newProject')}</button></div></header><main class="warehouse-main"><div class="warehouse-controls"><div class="warehouse-search search"><input id="case-search" type="search" class="search__input" placeholder="${t('searchProjects')}" value="${esc(warehouseQuery)}"><button type="button" class="search__button" aria-label="${t('search')}"><svg class="search__icon" aria-hidden="true" viewBox="0 0 24 24"><g><path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"></path></g></svg></button></div></div><div class="case-list grid">${items.map(card).join('')}${!items.length?`<div class="empty warehouse-empty"><span class="empty-icon">${storageIcon}</span><h2>${emptyMessage}</h2>${!warehouseQuery?`<p>${t('newProjectHelp')}</p>`:''}</div>`:''}</div></main></div><div id="toast" role="status"></div>`;
 const page=document.querySelector('.warehouse-main');
 bindLanguagePicker();
 document.querySelector('[data-trash-open]').onclick=showTrash;
 document.querySelectorAll('[data-new]').forEach(button=>button.addEventListener('click',createCase));
 const search=document.querySelector('#case-search'),list=page.querySelector('.case-list');
 const filterCards=()=>{warehouseQuery=search.value;let visible=0;page.querySelectorAll('.folder-case-card').forEach((card,index)=>{const show=matches(items[index]);card.hidden=!show;if(show)visible++;});page.querySelector('.warehouse-empty')?.remove();if(!visible){const message=t(warehouseQuery?'noMatchingProjects':'firstProject');list.insertAdjacentHTML('beforeend',`<div class="empty warehouse-empty"><span class="empty-icon">${storageIcon}</span><h2>${message}</h2>${!warehouseQuery?`<p>${t('newProjectHelp')}</p>`:''}</div>`);}};
 search.oninput=filterCards;filterCards();document.querySelector('.search__button').onclick=()=>search.focus();
 page.querySelectorAll('[data-folder-mount]').forEach(host=>{const item=library.cases.find(c=>c.id===host.dataset.caseId),root=createRoot(host);const open=()=>openCase(item);root.render(createElement(Folder,{color:'blue',size:'sm',role:'button',tabIndex:0,'aria-label':t('openProject',{name:host.dataset.label}),onClick:open,onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}}}));folderRoots.push(root);});
 page.querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>renameCase(library.cases.find(c=>c.id===b.dataset.rename)));
 page.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openCase(library.cases.find(c=>c.id===b.dataset.open)));
 page.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
 const item=library.cases.find(c=>c.id===b.dataset.action);
 item.deletedAt=Date.now();if(item===currentCase){currentCase=null;library.activeId=null;}
 save();await saveQueue;render();
 });
 page.querySelectorAll('[data-remove-missing]').forEach(b=>b.onclick=()=>confirmMissingCase(library.cases.find(c=>c.id===b.dataset.removeMissing)));
}
