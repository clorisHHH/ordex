import {fileType} from './file-type.js';
import word from './assets/file-icons/doc_line.svg?raw';
import pdf from './assets/file-icons/pdf_line.svg?raw';
import excel from './assets/file-icons/xls_line.svg?raw';
import ppt from './assets/file-icons/ppt_line.svg?raw';
import image from './assets/file-icons/pic_2_line.svg?raw';
import file from './assets/file-icons/file_line.svg?raw';
import folder from './assets/file-icons/folder_line.svg?raw';
import open from './assets/file-icons/folder_open_line.svg?raw';
const icons={word,pdf,excel,ppt,image,file,folder,open};
export function fileIcon(node,expanded=false){const type=fileType(node);return `<span class="item-icon type-${type}">${icons[type==='folder'&&expanded?'open':type]}</span>`;}
