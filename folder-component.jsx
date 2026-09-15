import React,{useId,useState} from 'react';
import {motion} from 'motion/react';
import './folder-component.css';

const themes={
 black:{backFill:'black',backInsetShadow:'inset 0 0 6px 2px rgba(255,255,255,0.37)',flapFill:'#292929',flapFillOpacity:.25,flapStroke:'#979797',flapInsetColor:'0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0',cardFill:'#F1F1F1',cardStroke:'#E0E0E0',cardLineFill:'#D4D4D4',cardInsetColor:'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'},
 white:{backFill:'#ffffff',backInsetShadow:'inset 0 0 6px 2px rgba(178,178,178,0.25)',flapFill:'#f5f5f5',flapFillOpacity:.85,flapStroke:'#d4d4d4',flapInsetColor:'0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0.15 0',cardFill:'#262626',cardStroke:'#404040',cardLineFill:'#737373',cardInsetColor:'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.15 0'},
 blue:{backFill:'#50B1FD',backInsetShadow:'inset 0 0 6px 2px rgba(255,255,255,0.35)',flapFill:'#3a9ae8',flapFillOpacity:.45,flapStroke:'#7ec8ff',flapInsetColor:'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0',cardFill:'#F1F1F1',cardStroke:'#E0E0E0',cardLineFill:'#D4D4D4',cardInsetColor:'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'}
};
const sizeScales={sm:.65,md:1,lg:1.35};
const BASE_WIDTH=321,BASE_HEIGHT=270;
const FLAP_PATH='M0 25C0 11.1929 11.1929 0 25 0H136.084C143.044 0 149.689 2.90139 154.42 8.00608L178.08 33.5343C182.811 38.639 189.456 41.5404 196.416 41.5404H296C309.807 41.5404 321 52.7333 321 66.5404V216C321 229.807 309.807 241 296 241H25C11.1929 241 0 229.807 0 216V25Z';
const rowPairs=[
 [60.9939,60.9617],[75.1122,75.0801],[89.2306,89.1985],[103.349,103.317],[117.467,117.435],
 [131.586,131.554],[145.704,145.672],[159.823,159.79],[173.941,173.909]
];

export function Folder({color='black',size='md',className='',hovered,...props}){
 const theme=themes[color]??themes.black,scale=sizeScales[size];
 const filterPrefix=useId().replaceAll(':','');
 const [pointerHovered,setIsHovered]=useState(false);
 const isHovered=hovered??pointerHovered;
 return <div data-slot="folder" className={`folder-component ${className}`} {...props}>
  <div className="folder-component-shell" style={{width:BASE_WIDTH*scale,height:BASE_HEIGHT*scale,touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}} onMouseEnter={()=>setIsHovered(true)} onMouseLeave={()=>setIsHovered(false)}>
   <div className="folder-component-canvas" style={{width:BASE_WIDTH,height:BASE_HEIGHT,transform:`translate(-50%, -50%) scale(${scale})`,perspective:800*scale}}>
    <div className="folder-component-center"><div style={{width:BASE_WIDTH,height:BASE_HEIGHT,borderRadius:25,backgroundColor:theme.backFill,boxShadow:theme.backInsetShadow}}/></div>
    <div className="folder-component-center folder-component-cards">
     <motion.div className="folder-component-card" initial={false} animate={{y:isHovered?-30:-10,x:40,rotate:isHovered?14:10}} transition={{type:'spring',stiffness:120,damping:13,delay:isHovered?.12:0}}><Card id={1} prefix={filterPrefix} theme={theme}/></motion.div>
     <motion.div className="folder-component-card" initial={false} animate={{y:isHovered?-35:-20,x:3,rotate:isHovered?-1:2}} transition={{type:'spring',stiffness:120,damping:13,delay:isHovered?.06:0}}><Card id={2} prefix={filterPrefix} theme={theme}/></motion.div>
     <motion.div className="folder-component-card" initial={false} animate={{y:isHovered?-44:-22,x:-40,rotate:isHovered?-9:-5}} transition={{type:'spring',stiffness:120,damping:13,delay:0}}><Card id={3} prefix={filterPrefix} theme={theme}/></motion.div>
    </div>
    <motion.div className="folder-component-flap" initial={false} style={{transformOrigin:'bottom center',transformStyle:'preserve-3d',width:321,height:241}} animate={{rotateX:isHovered?-45:-15}} transition={{type:'spring',stiffness:120,damping:14}}>
     <div className="folder-component-glass" style={{clipPath:`path('${FLAP_PATH}')`,WebkitClipPath:`path('${FLAP_PATH}')`}}/>
     <svg className="folder-component-svg" width="321" height="241" viewBox="0 0 321 241" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter={`url(#${filterPrefix}-flap)`}><path d={FLAP_PATH} fill={theme.flapFill} fillOpacity={theme.flapFillOpacity}/><path d="M25 0.5H136.084C142.905 0.5 149.417 3.3431 154.054 8.3457L177.713 33.874C182.539 39.0808 189.317 42.04 196.416 42.04H296C309.531 42.04 320.5 53.0092 320.5 66.54V216C320.5 229.531 309.531 240.5 296 240.5H25C11.469 240.5 0.5 229.531 0.5 216V25C0.5 11.469 11.469 0.5 25 0.5Z" stroke={theme.flapStroke}/></g>
      <defs><filter id={`${filterPrefix}-flap`} x="-25.4" y="-25.4" width="371.8" height="291.8" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="2.65"/><feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/><feColorMatrix type="matrix" values={theme.flapInsetColor}/><feBlend mode="normal" in2="shape" result="effect1_innerShadow"/></filter></defs>
     </svg>
    </motion.div>
   </div>
  </div>
 </div>;
}

function Card({id,prefix,theme}){
 const filterId=`${prefix}-card-${id}`;
 return <div data-slot="folder-card"><svg width="164" height="214" viewBox="0 0 164 214" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g filter={`url(#${filterId})`}><rect width="163.078" height="213.262" rx="20" fill={theme.cardFill}/></g>
  <rect x="0.5" y="0.5" width="162.078" height="212.262" rx="19.5" stroke={theme.cardStroke}/>
  <rect x="14.1193" y="31.2091" width="134.84" height="11.8892" rx="5.94459" fill={theme.cardLineFill}/>
  {rowPairs.flatMap(([leftY,rightY],index)=>[
   <rect key={`l${index}`} width="64.5183" height="5.88276" rx="2.94138" transform={`matrix(1 -0.000409158 0.00201956 0.999998 14.8253 ${leftY})`} fill={theme.cardLineFill}/>,
   <rect key={`r${index}`} width="64.5183" height="5.88276" rx="2.94138" transform={`matrix(1 -0.000461045 0.00179228 0.999998 84.4303 ${rightY})`} fill={theme.cardLineFill}/>
  ])}
  <defs><filter id={filterId} x="0" y="0" width="166.078" height="218.262" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feMorphology radius="2" operator="erode" in="SourceAlpha" result={`effect1_innerShadow_${id}`}/><feOffset dx="3" dy="5"/><feGaussianBlur stdDeviation="3.05"/><feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/><feColorMatrix type="matrix" values={theme.cardInsetColor}/><feBlend mode="normal" in2="shape" result={`effect1_innerShadow_${id}`}/></filter></defs>
 </svg></div>;
}
