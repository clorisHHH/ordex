const {app,BrowserWindow,ipcMain,protocol,net,Menu,dialog,session,shell}=require('electron');
const path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const {DiskStore}=require('./storage.cjs');
app.setName('Ordex');
if(process.platform==='win32')app.setAppUserModelId('local.ordex.desktop');
protocol.registerSchemesAsPrivileged([{scheme:'ordex',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let win,store,closing=false,previewedFile=null,language='zh',dataRoot;
const nativeMessages={
 zh:{chooseLocation:name=>`选择“${name}”的保存位置`,saveHere:'保存到这里',exportTitle:'导出编号文件',exportName:'Ordex_编号文件.zip',zip:'ZIP 文件',pending:'当前操作或保存尚未完成',pendingDetail:'请等操作完成后再次关闭。',back:'返回工作区',about:'关于 Ordex',openSettings:'打开 Ordex 设置目录',quit:'退出 Ordex',edit:'编辑',undo:'撤销',redo:'重做',cut:'剪切',copy:'复制',paste:'粘贴',selectAll:'全选',window:'窗口',minimize:'最小化',zoom:'缩放'},
 en:{chooseLocation:name=>`Choose where to save “${name}”`,saveHere:'Save Here',exportTitle:'Export Numbered Files',exportName:'Ordex_Numbered_Files.zip',zip:'ZIP File',pending:'An operation or save is still in progress',pendingDetail:'Wait for it to finish, then close Ordex again.',back:'Back to Workspace',about:'About Ordex',openSettings:'Open Ordex Settings Folder',quit:'Quit Ordex',edit:'Edit',undo:'Undo',redo:'Redo',cut:'Cut',copy:'Copy',paste:'Paste',selectAll:'Select All',window:'Window',minimize:'Minimize',zoom:'Zoom'}
};
const nt=key=>nativeMessages[language][key];
function buildMenu(){const text=nativeMessages[language];Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Ordex',submenu:[{role:'about',label:text.about},{type:'separator'},{label:text.openSettings,click:()=>shell.openPath(dataRoot)},{type:'separator'},{role:'quit',label:text.quit}]},{label:text.edit,submenu:[{label:text.undo,accelerator:'CmdOrCtrl+Z',click:()=>win?.webContents.send('history-command','undo')},{label:text.redo,accelerator:'CmdOrCtrl+Shift+Z',click:()=>win?.webContents.send('history-command','redo')},{type:'separator'},{role:'cut',label:text.cut},{role:'copy',label:text.copy},{role:'paste',label:text.paste},{role:'selectAll',label:text.selectAll}]},{label:text.window,submenu:[{role:'minimize',label:text.minimize},{role:'zoom',label:text.zoom}]}]));}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
 app.whenReady().then(()=>{
 dataRoot=process.env.ORDEX_DATA_ROOT||path.join(app.getPath('appData'),'Ordex');store=new DiskStore(dataRoot);
 const dist=path.join(__dirname,'../dist');
 // 热预览时 vite 会先清空 dist 再写入，加载撞上这个窗口会 404，这里短暂等待文件出现
 const waitForFile=(file,timeout=2500)=>new Promise(resolve=>{const start=Date.now();const check=()=>{if(fs.existsSync(file)||Date.now()-start>timeout)return resolve();setTimeout(check,50);};check();});
 protocol.handle('ordex',async request=>{const u=new URL(request.url);const target=path.resolve(dist,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(u.host!=='app'||!target.startsWith(dist+path.sep))return new Response('Not found',{status:404});if(process.env.ORDEX_HOT==='1')await waitForFile(target);return net.fetch(pathToFileURL(target).href);});
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:/^https?:|^wss?:/.test(details.url)}));
 session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 const trusted=e=>{if(!win||e.sender!==win.webContents||!e.senderFrame?.url.startsWith('ordex://app/'))throw Error('拒绝非应用来源');};
 ipcMain.handle('disk-read',(e,s,k)=>{trusted(e);return store.read(s,k);});
 ipcMain.handle('disk-missing-cases',e=>{trusted(e);return store.missingCaseIds();});
 ipcMain.handle('disk-remove-missing-case',(e,id)=>{trusted(e);return store.removeMissingCase(id);});
 ipcMain.handle('disk-file-read',(e,caseId,id)=>{trusted(e);return store.readFile(caseId,id);});
 ipcMain.handle('disk-file-open',async(e,caseId,id)=>{trusted(e);const file=store.previewPath(caseId,id);if(!file)return 'missing';return shell.openPath(file);});
 ipcMain.handle('disk-file-write',(e,caseId,id,name,value)=>{trusted(e);store.writeFile(caseId,id,name,value);});
 ipcMain.handle('quick-look-toggle',(e,caseId,id)=>{trusted(e);if(process.platform!=='darwin')return 'unsupported';const file=store.previewPath(caseId,id);if(!file)return 'missing';if(previewedFile===file){win.closeFilePreview();previewedFile=null;return 'closed';}win.previewFile(file);previewedFile=file;return 'opened';});
 ipcMain.handle('quick-look-close',e=>{trusted(e);if(previewedFile)win.closeFilePreview();previewedFile=null;return true;});
 ipcMain.handle('set-language',(e,value)=>{trusted(e);language=value==='en'?'en':'zh';buildMenu();return language;});
 ipcMain.handle('case-directory',async(e,name)=>{trusted(e);const result=await dialog.showOpenDialog(win,{title:nt('chooseLocation')(name),buttonLabel:nt('saveHere'),properties:['openDirectory','createDirectory']});if(result.canceled)return null;return store.prepareCaseDirectory(result.filePaths[0],name);});
 ipcMain.on('disk-sync',(e,op,s,k,v)=>{try{trusted(e);if(op!=='write'||!['state','view'].includes(s))throw Error('无效操作');store.write(s,k,v);e.returnValue={value:true};}catch(err){e.returnValue={error:err.message};}});
 ipcMain.handle('disk-purge',(e,ids,state)=>{trusted(e);store.purge(ids,state);});
 ipcMain.handle('save-zip',async(e,bytes)=>{trusted(e);const result=await dialog.showSaveDialog(win,{title:nt('exportTitle'),defaultPath:nt('exportName'),filters:[{name:nt('zip'),extensions:['zip']}]});if(result.canceled)return false;fs.writeFileSync(result.filePath,Buffer.from(bytes));return true;});
 ipcMain.on('close-ready',async(e,ok)=>{trusted(e);if(ok){closing=true;win.close();}else{await dialog.showMessageBox(win,{type:'warning',message:nt('pending'),detail:nt('pendingDetail'),buttons:[nt('back')]});}});
 let bounds={width:1220,height:820};try{bounds={...bounds,...JSON.parse(fs.readFileSync(path.join(dataRoot,'window.json'),'utf8'))};}catch{}
 win=new BrowserWindow({...bounds,minWidth:760,minHeight:520,title:'Ordex',icon:fs.existsSync(path.join(__dirname,'ordex.ico'))?path.join(__dirname,'ordex.ico'):undefined,backgroundColor:'#fafbf9',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.on('focus',()=>win.webContents.send('project-directory-check'));
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('ordex://app/'))e.preventDefault();});
 win.on('close',e=>{if(previewedFile){win.closeFilePreview();previewedFile=null;}store.atomic('window.json',JSON.stringify(win.getNormalBounds()));if(!closing){e.preventDefault();win.webContents.send('closing');}});
 win.on('closed',()=>{win=null;app.quit();});
 buildMenu();
 win.loadURL('ordex://app/');
 if(process.env.ORDEX_HOT==='1'){let reloadTimer;try{fs.watch(dist,{recursive:true},()=>{clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>{if(win&&!win.isDestroyed()){console.log('[ordex] 构建产物已更新，重新加载');win.webContents.reload();}},250);});console.log('[ordex] 热重载已开启');}catch(e){console.error('[ordex] 无法监听构建产物：'+e.message);}}
 }).catch(e=>{dialog.showErrorBox('Ordex 启动失败',e.message);app.exit(1);});
}
