export function formatModified(value){
 if(!Number.isFinite(value))return '—';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return '—';
 const pad=n=>String(n).padStart(2,'0');
 return `${date.getFullYear()}/${pad(date.getMonth()+1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function formatSize(value){
 if(!Number.isFinite(value)||value<0)return '—';
 if(value<1024)return `${value} B`;
 const units=['KB','MB','GB','TB'];
 let amount=value/1024,index=0;
 while(amount>=1024&&index<units.length-1){amount/=1024;index++;}
 return `${Number(amount.toFixed(1))} ${units[index]}`;
}
