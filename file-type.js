const extensions={
 word:['doc','docx','docm','dot','dotx','dotm'],
 pdf:['pdf'],
 excel:['xls','xlsx','xlsm','xlsb','xlt','xltx','xltm','csv','tsv'],
 ppt:['ppt','pptx','pptm','pps','ppsx','ppsm','pot','potx','potm'],
 image:['jpg','jpeg','png','gif','webp','svg','bmp','tif','tiff','heic','heif','avif','ico']
};
export function fileType(node){
 if(node.type==='folder'||node.type==='section')return 'folder';
 const ext=node.name.includes('.')?node.name.split('.').pop().toLowerCase():'';
 return Object.keys(extensions).find(type=>extensions[type].includes(ext))||'file';
}
