const {contextBridge,ipcRenderer}=require('electron');
const sync=(...args)=>{const reply=ipcRenderer.sendSync('disk-sync',...args);if(reply.error)throw Error(reply.error);return reply.value;};
contextBridge.exposeInMainWorld('desktop',{
 platform:process.platform,
 read:(store,key)=>ipcRenderer.invoke('disk-read',store,key),
 missingCaseIds:()=>ipcRenderer.invoke('disk-missing-cases'),
 removeMissingCase:id=>ipcRenderer.invoke('disk-remove-missing-case',id),
 write:(store,key,value)=>sync('write',store,key,value),
 readFile:(caseId,id)=>ipcRenderer.invoke('disk-file-read',caseId,id),
 writeFile:(caseId,id,name,value)=>ipcRenderer.invoke('disk-file-write',caseId,id,name,value),
 togglePreview:(caseId,id)=>ipcRenderer.invoke('quick-look-toggle',caseId,id),
 closePreview:()=>ipcRenderer.invoke('quick-look-close'),
 openFile:(caseId,id)=>ipcRenderer.invoke('disk-file-open',caseId,id),
 setLanguage:language=>ipcRenderer.invoke('set-language',language),
 chooseCaseDirectory:name=>ipcRenderer.invoke('case-directory',name),
 purge:(ids,state)=>ipcRenderer.invoke('disk-purge',ids,state),
 saveZip:(bytes)=>ipcRenderer.invoke('save-zip',bytes),
 onHistory:callback=>ipcRenderer.on('history-command',(_event,action)=>callback(action)),
 onProjectDirectoryCheck:callback=>ipcRenderer.on('project-directory-check',callback),
 onClosing:callback=>ipcRenderer.on('closing',async()=>{try{ipcRenderer.send('close-ready',await callback());}catch(e){ipcRenderer.send('close-ready',false);}})
});
