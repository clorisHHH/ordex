import JSZip from 'jszip';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export function previewKind(name){
 const ext=String(name).split('.').pop().toLowerCase();
 if(['png','jpg','jpeg','gif','webp','bmp','svg','avif'].includes(ext))return 'image';
 if(ext==='pdf')return 'pdf';
 if(['mp4','webm','mov','m4v','ogv'].includes(ext))return 'video';
 if(['mp3','wav','ogg','m4a','flac','aac'].includes(ext))return 'audio';
 if(['txt','md','csv','json','xml','html','css','js','log','yaml','yml','ini'].includes(ext))return 'text';
 if(ext==='docx')return 'word';
 if(ext==='xlsx')return 'excel';
 if(ext==='pptx')return 'powerpoint';
 return 'other';
}

const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const extMime={svg:'image/svg+xml',mov:'video/quicktime',m4a:'audio/mp4'};
const mime=(name,kind)=>extMime[String(name).split('.').pop().toLowerCase()]||({image:'image/'+String(name).split('.').pop().toLowerCase(),video:'video/mp4',audio:'audio/mpeg'}[kind]||'application/octet-stream');
let active=null;
export function previewIsOpen(){return !!active;}
export function closeDesktopPreview(){if(!active)return;active.urls.forEach(URL.revokeObjectURL);active.dialog.close();active.dialog.remove();active=null;}

async function renderPdf(blob,body,translate){
 const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
 const documentTask=pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer())});
 const pdf=await documentTask.promise;let page=1;
 const controls=el('div','desktop-preview-pages'),canvas=el('canvas','desktop-preview-canvas');
 const back=el('button','', '‹'),label=el('span'),next=el('button','', '›');
 back.type=next.type='button';controls.append(back,label,next);body.append(controls,canvas);
 const draw=async()=>{const current=page,source=await pdf.getPage(current);if(current!==page)return;const width=Math.max(300,Math.min(1000,body.clientWidth-50));const viewport=source.getViewport({scale:width/source.getViewport({scale:1}).width});canvas.width=viewport.width;canvas.height=viewport.height;await source.render({canvasContext:canvas.getContext('2d'),viewport}).promise;label.textContent=translate('previewPage',{page,total:pdf.numPages});back.disabled=page===1;next.disabled=page===pdf.numPages;};
 back.onclick=()=>{page--;draw();};next.onclick=()=>{page++;draw();};await draw();
}

async function renderWord(blob,body){
 const {renderAsync}=await import('docx-preview');
 const pages=el('div','desktop-preview-word');body.append(pages);
 await renderAsync(await blob.arrayBuffer(),pages,null,{inWrapper:true,breakPages:true});
}

async function renderExcel(blob,body){
 const zip=await JSZip.loadAsync(await blob.arrayBuffer()),shared=zip.file('xl/sharedStrings.xml')?descendants(xml(await zip.file('xl/sharedStrings.xml').async('string')),'si').map(item=>descendants(item,'t').map(text=>text.textContent).join('')):[];
 const workbook=zip.file('xl/workbook.xml')?xml(await zip.file('xl/workbook.xml').async('string')):null,names=workbook?descendants(workbook,'sheet').map(item=>item.getAttribute('name')):[];
 const files=Object.keys(zip.files).filter(name=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort((a,b)=>Number(a.match(/sheet(\d+)/)[1])-Number(b.match(/sheet(\d+)/)[1]));
 const tabs=el('div','desktop-preview-tabs'),sheetBody=el('div','desktop-preview-sheet');body.append(tabs,sheetBody);
 const show=async(file,index)=>{sheetBody.replaceChildren();const doc=xml(await zip.file(file).async('string')),cells=new Map();let maxRow=0,maxCol=0;for(const cell of descendants(doc,'c')){const match=/^([A-Z]+)(\d+)$/.exec(cell.getAttribute('r')||'');if(!match)continue;const row=Number(match[2]),col=[...match[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);if(row>300||col>80)continue;const value=descendants(cell,'v')[0]?.textContent||'',text=cell.getAttribute('t')==='s'?shared[Number(value)]||'':cell.getAttribute('t')==='inlineStr'?descendants(cell,'t').map(n=>n.textContent).join(''):value;if(!cells.has(row))cells.set(row,new Map());cells.get(row).set(col,text);maxRow=Math.max(maxRow,row);maxCol=Math.max(maxCol,col);}const table=el('table','desktop-preview-grid');for(let row=1;row<=maxRow;row++){const tr=el('tr');for(let col=1;col<=maxCol;col++)tr.append(el('td','',cells.get(row)?.get(col)||''));table.append(tr);}sheetBody.append(table);for(const tab of tabs.children)tab.classList.toggle('active',tab.dataset.index===String(index));};
 files.forEach((file,index)=>{const tab=el('button','',names[index]||`Sheet ${index+1}`);tab.type='button';tab.dataset.index=String(index);tab.onclick=()=>show(file,index);tabs.append(tab);});if(files[0])await show(files[0],0);
}

const xml=(text)=>new DOMParser().parseFromString(text,'application/xml');
const descendants=(node,name)=>[...node.getElementsByTagName('*')].filter(item=>item.localName===name);
const attribute=(node,name)=>[...node.attributes].find(item=>item.localName===name)?.value;
export async function pptxSlides(blob){
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());const names=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
 const presentation=zip.file('ppt/presentation.xml')?xml(await zip.file('ppt/presentation.xml').async('string')):null,slideSize=presentation&&descendants(presentation,'sldSz')[0],slideWidth=Number(slideSize?.getAttribute('cx')||12192000),slideHeight=Number(slideSize?.getAttribute('cy')||6858000);
 const slides=[];for(const name of names){const doc=xml(await zip.file(name).async('string'));const boxes=[];
  const relName=name.replace('/slides/','/slides/_rels/')+'.rels',relations=new Map();if(zip.file(relName)){const relDoc=xml(await zip.file(relName).async('string'));for(const relation of descendants(relDoc,'Relationship'))relations.set(relation.getAttribute('Id'),relation.getAttribute('Target'));}
  for(const shape of [...descendants(doc,'sp'),...descendants(doc,'pic')]){const xfrm=descendants(shape,'xfrm')[0],off=xfrm&&descendants(xfrm,'off')[0],size=xfrm&&descendants(xfrm,'ext')[0];const text=descendants(shape,'t').map(n=>n.textContent).join(' '),embed=attribute(descendants(shape,'blip')[0]||{attributes:[]},'embed'),target=relations.get(embed),media=target&&zip.file('ppt/'+target.replace(/^\.\.\//,''));if(text||media){const box={text,x:Number(off?.getAttribute('x')||0),y:Number(off?.getAttribute('y')||0),w:Number(size?.getAttribute('cx')||0),h:Number(size?.getAttribute('cy')||0)};if(media)box.image=await media.async('blob');boxes.push(box);}}
  slides.push({boxes,width:slideWidth,height:slideHeight});
 }return slides;
}
async function renderPowerPoint(blob,body,translate){
 const slides=await pptxSlides(blob);for(let i=0;i<slides.length;i++){const card=el('section','desktop-preview-slide'),heading=el('div','desktop-preview-slide-label',translate('previewSlide',{number:i+1}));card.append(heading);const content=el('div','desktop-preview-slide-content');content.style.aspectRatio=slides[i].width+'/'+slides[i].height;for(const box of slides[i].boxes){const item=el(box.image?'img':'div','desktop-preview-slide-text',box.image?undefined:box.text);if(box.image){item.src=URL.createObjectURL(box.image);active.urls.push(item.src);}item.style.left=Math.min(95,box.x/slides[i].width*100)+'%';item.style.top=Math.min(90,box.y/slides[i].height*100)+'%';item.style.width=Math.max(10,box.w/slides[i].width*100)+'%';item.style.height=Math.max(5,box.h/slides[i].height*100)+'%';content.append(item);}card.append(content);body.append(card);}if(!slides.length)body.textContent=translate('previewEmpty');
}

export async function openDesktopPreview({name,blob,translate,openOriginal}){
 closeDesktopPreview();const kind=previewKind(name),dialog=el('dialog','desktop-preview-dialog'),urls=[];
 const header=el('div','desktop-preview-header'),title=el('strong','',name),close=el('button','desktop-preview-close','×');close.type='button';close.setAttribute('aria-label',translate('previewClose'));close.onclick=closeDesktopPreview;header.append(title,close);dialog.append(header);
 if(['word','excel','powerpoint'].includes(kind))dialog.append(el('div','desktop-preview-note',translate('previewApproximate')));
 const body=el('div','desktop-preview-body');dialog.append(body);document.body.append(dialog);active={dialog,urls};dialog.addEventListener('close',closeDesktopPreview,{once:true});dialog.showModal();
 try{
  if(kind==='image'||kind==='video'||kind==='audio'){const url=URL.createObjectURL(new Blob([blob],{type:mime(name,kind)}));urls.push(url);const media=el(kind==='image'?'img':kind);media.src=url;if(kind!=='image')media.controls=true;body.append(media);}
  else if(kind==='text')body.append(el('pre','desktop-preview-text',(await blob.text()).slice(0,2_000_000)));
  else if(kind==='pdf')await renderPdf(blob,body,translate);
  else if(kind==='word')await renderWord(blob,body);
  else if(kind==='excel')await renderExcel(blob,body);
  else if(kind==='powerpoint')await renderPowerPoint(blob,body,translate);
  else body.append(el('p','desktop-preview-empty',translate('previewUnsupported')));
 }catch(error){body.replaceChildren(el('p','desktop-preview-empty',translate('previewFailed',{error:error.message})));}
 if(kind==='other'||body.querySelector('.desktop-preview-empty')){const button=el('button','desktop-preview-open-original',translate('previewOpenOriginal'));button.type='button';button.onclick=openOriginal;body.append(button);}
}
