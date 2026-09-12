'use strict';
const W=528,H=792;
const range=(key,label,min,max,step,value)=>({key,label,min,max,step,value,type:'range'});
const toggle=(key,label,value)=>({key,label,value,type:'toggle'});
const generators=[
{id:'truchet',name:'Truchet arcs',icon:'M2 12A10 10 0 0 0 12 2M12 22A10 10 0 0 1 22 12',description:'Quarter-circle tiles find their own winding paths.',controls:[range('tile','Tile size · px',12,132,1,44),range('weight','Line weight · px',1,16,.5,3),toggle('fill','Filled arcs',false)]},
{id:'flow',name:'Flow field',icon:'M2 6c10-10 10 14 20 4M2 12c10-10 10 14 20 4M2 18c10-10 10 14 20 4',description:'Lines trace the currents of a seeded noise field.',controls:[range('scale','Noise scale',.001,.03,.001,.005),range('density','Line density',50,1600,10,500),range('length','Line length · steps',10,250,1,90),range('step','Step size · px',.5,6,.5,2),range('weight','Line weight · px',1,4,.5,1)]},
{id:'subdivision',name:'Recursive subdivision',icon:'M2 2h20v20H2ZM10 2v20M10 12h12M16 12v10',description:'Split the page into a rhythm of solid and hatched regions.',controls:[range('depth','Depth',1,9,1,5),range('fill','Fill probability',0,1,.05,.35),toggle('hatch','Hatching',true),range('spacing','Hatch spacing · px',3,20,1,7),range('gap','Gutter · px',0,12,1,4)]},
{id:'ripple',name:'Ripple interference',icon:'M14 2a10 10 0 1 0 8 12M14 7a5 5 0 1 0 3 9M17 2v8h5',description:'Overlapping circular waves form contours of interference.',controls:[range('sources','Number of sources',2,8,1,3),range('frequency','Frequency',.02,.3,.005,.085),range('threshold','Threshold',-.8,.8,.05,0)]},
{id:'stipple',name:'Stippled gradient',icon:'M4 4h.01M12 4h.01M20 4h.01M4 12h.01M12 12h.01M20 12h.01M4 20h.01M12 20h.01',description:'A field of discrete dots gathers into light and shade.',controls:[range('density','Dot density',1000,30000,500,14000),{key:'direction',label:'Gradient direction',type:'select',value:'down',options:[['down','Top → bottom'],['up','Bottom → top'],['right','Left → right'],['left','Right → left'],['radial','Radial']]},range('min','Minimum dot · px',1,6,.5,1),range('max','Maximum dot · px',1,10,.5,3)]},
{id:'moire',name:'Moiré patterns',icon:'M4 2v20M8 2v20M12 2v20M16 2v20M20 2v20M2 6l20 8M2 12l20 8',description:'Two sets of fine lines overlap to reveal a larger rhythm.',controls:[range('count','Line count',20,220,1,100),range('rotation','Rotation offset · °',.5,45,.5,5),range('weight','Line weight · px',1,5,.5,1)]},
{id:'reaction',name:'Reaction–diffusion',icon:'M3 5c6-7 4 13 10 5S23 6 20 15s-10-5-13 4-7-3-4-7',description:'Growing chemical patterns form organic spots and labyrinths. Simulation runs in the background.',controls:[range('feed','Growth rate',.025,.055,.001,.035),range('kill','Decay rate',.055,.065,.001,.06),range('diffusion','Diffusion',.35,.65,.01,.5),range('iterations','Iterations',100,1600,50,700),range('threshold','Threshold',.1,.4,.01,.22)]},
{id:'topographic',name:'Topographic contours',icon:'M2 14C2 0 22 0 22 14S2 26 2 14ZM6 14c0-9 12-9 12 0s-12 8-12 0ZM10 14c0-3 4-3 4 0s-4 3-4 0',description:'Trace the elevations of an imaginary landscape.',controls:[range('scale','Terrain scale',.001,.015,.001,.004),range('spacing','Contour spacing',.02,.12,.005,.04),range('weight','Line weight · px',1,4,.5,1),range('elevation','Elevation offset',0,.12,.005,0)]},
{id:'packing',name:'Circle packing',icon:'M2 8a6 6 0 1 0 12 0 6 6 0 1 0-12 0M14 17a4 4 0 1 0 8 0 4 4 0 1 0-8 0M3 19a3 3 0 1 0 6 0 3 3 0 1 0-6 0',description:'Circles settle into the available space without overlapping. Density is a target; available space sets the limit.',controls:[range('minRadius','Minimum radius · px',2,12,1,4),range('maxRadius','Maximum radius · px',16,100,1,55),range('density','Target circle count',50,900,10,350),range('gap','Spacing · px',0,12,1,3),range('weight','Line weight · px',1,5,.5,1.5),toggle('nested','Nested circles',false),toggle('solid','Solid fill',false)]}
];
let active=generators[0],seed=18427,simulation=true,binary=null,pending=false,engine,renderVersion=0,reactionWorker=null,cancelReaction=null,reactionCache=null;
const settings=Object.fromEntries(generators.map(g=>[g.id,Object.fromEntries(g.controls.map(c=>[c.key,c.value]))]));
const $=id=>document.getElementById(id);
function renderControls(){
 $('pattern-name').textContent=active.name;$('description').textContent=active.description;
 document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===active.id));
 $('controls').replaceChildren();
 for(const c of active.controls){const wrap=document.createElement('div');wrap.className='control';const head=document.createElement('div');head.className='control-head';const label=document.createElement('label');label.textContent=c.label;label.htmlFor=c.key;head.append(label);wrap.append(head);
 const input=document.createElement(c.type==='select'?'select':'input');input.id=c.key;
 if(c.type==='range'){
 input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;input.value=settings[active.id][c.key];const number=document.createElement('input');number.type='number';number.min=c.min;number.max=c.max;number.step=c.step;number.value=input.value;number.setAttribute('aria-label',c.label+' value');head.append(number);wrap.append(input);
 const update=(raw)=>{if(raw==='')return;let v=Number(raw);if(!Number.isFinite(v))return;v=Math.min(c.max,Math.max(c.min,v));v=Number((Math.round((v-c.min)/c.step)*c.step+c.min).toFixed(4));settings[active.id][c.key]=v;input.value=v;number.value=v;if(active.id==='stipple'&&(c.key==='min'||c.key==='max')){const s=settings.stipple;const other=c.key==='min'?'max':'min';s[other]=c.key==='min'?Math.max(s.max,v):Math.min(s.min,v);const el=$(other);el.value=s[other];el.parentElement.querySelector('input[type=number]').value=s[other];}schedule();};input.oninput=()=>update(input.value);number.onchange=()=>{update(number.value);number.value=settings[active.id][c.key];};
 }else if(c.type==='toggle'){input.type='checkbox';input.checked=settings[active.id][c.key];head.append(input);input.onchange=()=>{settings[active.id][c.key]=input.checked;schedule();};}
 else{for(const [value,text]of c.options){const o=new Option(text,value);input.add(o);}input.value=settings[active.id][c.key];wrap.append(input);input.onchange=()=>{settings[active.id][c.key]=input.value;schedule();};}
 $('controls').append(wrap);}
}
for(const g of generators){const b=document.createElement('button');b.dataset.id=g.id;b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${g.icon}"/></svg><span>${g.name}</span>`;b.onclick=()=>{active=g;renderControls();schedule();if(narrowPanels.matches){setGenerators(false);}};$('generators').append(b);}
function schedule(){
 if(!engine)return;
 renderVersion++;
 if(cancelReaction){cancelReaction();cancelReaction=null;}
 if(reactionWorker){reactionWorker.terminate();reactionWorker=null;}
 $('save').disabled=true;
 $('status').textContent=active.id==='reaction'?'Simulating…':'Rendering…';
 if(pending)return;
 pending=true;
 requestAnimationFrame(()=>{pending=false;const version=renderVersion;drawPattern(version).catch(error=>{if(version!==renderVersion)return;$('status').textContent='Rendering failed. Try Reset.';console.error(error);});});
}
async function getReaction(s){
 const key=JSON.stringify([seed,s.feed,s.kill,s.diffusion,s.iterations]);
 if(reactionCache?.key===key)return reactionCache.result;
 return new Promise((resolve,reject)=>{
  const worker=new Worker('reaction-worker.js');reactionWorker=worker;cancelReaction=()=>resolve(null);
  worker.onmessage=({data})=>{worker.terminate();reactionWorker=null;cancelReaction=null;if(data.error){reject(new Error(data.error));return;}reactionCache={key,result:data};resolve(data);};
  worker.onerror=()=>{worker.terminate();reactionWorker=null;cancelReaction=null;reject(new Error('Simulation worker failed'));};
  worker.postMessage({seed,settings:s});
 });
}
async function drawPattern(version){const p=engine,s=settings[active.id];p.randomSeed(seed);p.noiseSeed(seed);p.background(255);p.stroke(0);p.strokeWeight(1);p.noFill();
 if(active.id==='truchet'){const t=s.tile;p.strokeWeight(s.weight);if(s.fill){p.noStroke();p.fill(0);}for(let y=0;y<H;y+=t)for(let x=0;x<W;x+=t){if(p.random()<.5){p.arc(x,y,t,t,0,p.HALF_PI,s.fill?p.PIE:p.OPEN);p.arc(x+t,y+t,t,t,p.PI,p.PI+p.HALF_PI,s.fill?p.PIE:p.OPEN);}else{p.arc(x+t,y,t,t,p.HALF_PI,p.PI,s.fill?p.PIE:p.OPEN);p.arc(x,y+t,t,t,p.PI+p.HALF_PI,p.TWO_PI,s.fill?p.PIE:p.OPEN);}}}
 if(active.id==='flow'){p.strokeWeight(s.weight);for(let i=0;i<s.density;i++){let x=p.random(W),y=p.random(H);p.beginShape();for(let j=0;j<s.length;j++){p.vertex(x,y);const a=p.noise(x*s.scale,y*s.scale)*p.TWO_PI*2;x+=Math.cos(a)*s.step;y+=Math.sin(a)*s.step;if(x<0||x>W||y<0||y>H)break;}p.endShape();}}
 if(active.id==='subdivision'){function split(x,y,w,h,d){if(d>0){const f=p.random(.3,.7);if(w/h>1.3||(w/h>.7&&p.random()<.5)){split(x,y,w*f,h,d-1);split(x+w*f,y,w*(1-f),h,d-1);}else{split(x,y,w,h*f,d-1);split(x,y+h*f,w,h*(1-f),d-1);}return;}const gap=Math.min(s.gap,w/3,h/3);x+=gap/2;y+=gap/2;w-=gap;h-=gap;const filled=p.random()<s.fill;p.stroke(0);if(filled){p.fill(0);p.rect(x,y,w,h);p.noFill();}else{p.rect(x,y,w,h);if(s.hatch){const ctx=p.drawingContext;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(let z=-h;z<w;z+=s.spacing)p.line(x+z,y,x+z+h,y+h);ctx.restore();}}}split(0,0,W,H,s.depth);}
 if(active.id==='ripple'){const sources=Array.from({length:s.sources},()=>[p.random(W),p.random(H),p.random(p.TWO_PI)]);p.loadPixels();for(let y=0;y<H;y++)for(let x=0;x<W;x++){let wave=0;for(const [sx,sy,phase]of sources)wave+=Math.cos(Math.hypot(x-sx,y-sy)*s.frequency+phase);const v=wave/s.sources>s.threshold?0:255,idx=(y*W+x)*4;p.pixels[idx]=p.pixels[idx+1]=p.pixels[idx+2]=v;p.pixels[idx+3]=255;}p.updatePixels();}
 if(active.id==='stipple'){p.noStroke();p.fill(0);for(let i=0;i<s.density;i++){const x=p.random(W),y=p.random(H);const t={down:y/H,up:1-y/H,right:x/W,left:1-x/W,radial:Math.min(1,Math.hypot((x-W/2)/(W/2),(y-H/2)/(H/2)))}[s.direction];const r=p.random(),diam=p.random(s.min,s.max);if(r<t)p.circle(x,y,diam);}}
 if(active.id==='moire'){p.strokeWeight(s.weight);const diagonal=Math.hypot(W,H),spacing=diagonal/s.count,base=p.random(-.2,.2),phase=p.random(spacing);for(const angle of [base,base+s.rotation*Math.PI/180]){p.push();p.translate(W/2,H/2);p.rotate(angle);for(let i=-s.count/2;i<=s.count/2;i++)p.line(i*spacing+phase,-diagonal/2,i*spacing+phase,diagonal/2);p.pop();}}

 if(active.id==='topographic'){
  const cell=3,cols=W/cell+1,rows=H/cell+1,values=new Float32Array(cols*rows);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)values[y*cols+x]=p.noise(x*cell*s.scale,y*cell*s.scale);
  p.strokeWeight(s.weight);for(const line of InkAlgorithms.contours(values,cols,rows,cell,s.spacing,s.elevation))p.line(...line);
 }
 if(active.id==='packing'){
  p.strokeWeight(s.weight);
  const circles=InkAlgorithms.packing(seed,s,W,H);
  for(const c of circles){if(s.solid){p.fill(0);p.noStroke();}else{p.noFill();p.stroke(0);}p.circle(c.x,c.y,c.r*2);
   if(s.nested){const step=Math.max(6,s.gap+s.weight+3);let level=1;for(let r=c.r-step;r>=s.minRadius;r-=step,level++){if(s.solid)p.fill(level%2?255:0);p.circle(c.x,c.y,r*2);}}
  }
 }
 if(active.id==='reaction'){
  const result=await getReaction({...s});if(!result||version!==renderVersion)return;
  const {field,width:fw,height:fh}=result;p.loadPixels();
  // Interpolate concentration before the binary threshold, avoiding blocky simulation cells.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const gx=x/4,gy=y/4,x0=Math.floor(gx),y0=Math.floor(gy),x1=(x0+1)%fw,y1=(y0+1)%fh,tx=gx-x0,ty=gy-y0;
   const v=(field[y0*fw+x0]*(1-tx)+field[y0*fw+x1]*tx)*(1-ty)+(field[y1*fw+x0]*(1-tx)+field[y1*fw+x1]*tx)*ty;
   const color=v>s.threshold?0:255,i=(y*W+x)*4;p.pixels[i]=p.pixels[i+1]=p.pixels[i+2]=color;p.pixels[i+3]=255;
  }p.updatePixels();
 }
 if(version!==renderVersion)return;
 p.loadPixels();binary=new Uint8Array(W*H);for(let i=0;i<binary.length;i++){binary[i]=p.pixels[i*4]<128?0:1;}paintPreview();$('save').disabled=false;$('status').textContent='';}
function paintPreview(){if(!binary)return;const ctx=$('preview').getContext('2d'),img=ctx.createImageData(W,H);for(let i=0;i<binary.length;i++){const color=simulation?(binary[i]?[232,228,223]:[34,34,34]):(binary[i]?[255,255,255]:[0,0,0]);const j=i*4;img.data[j]=color[0];img.data[j+1]=color[1];img.data[j+2]=color[2];img.data[j+3]=255;}ctx.putImageData(img,0,0);}
function setMode(value){simulation=value;$('paper').classList.toggle('simulation',value);$('simulation').setAttribute('aria-pressed',value);$('raw').setAttribute('aria-pressed',!value);$('preview-note').textContent=value?'E-ink simulation · preview only':'Raw 1-bit · exact export pixels';paintPreview();}
$('simulation').onclick=()=>setMode(true);$('raw').onclick=()=>setMode(false);
function newSeed(){seed=crypto.getRandomValues(new Uint32Array(1))[0];$('seed').value=seed;}
$('reseed').onclick=()=>{newSeed();schedule();};$('seed').onchange=()=>{seed=Math.max(0,Math.min(4294967295,Math.trunc(Number($('seed').value)||0)));$('seed').value=seed;schedule();};
$('randomize').onclick=()=>{newSeed();for(const c of active.controls){let v;if(c.type==='toggle')v=Math.random()<.5;else if(c.type==='select')v=c.options[Math.floor(Math.random()*c.options.length)][0];else v=Number((c.min+Math.floor(Math.random()*(Math.round((c.max-c.min)/c.step)+1))*c.step).toFixed(4));settings[active.id][c.key]=v;}if(active.id==='stipple'){const s=settings.stipple;s.max=Math.max(s.min,s.max);}renderControls();schedule();};
$('reset').onclick=()=>{settings[active.id]=Object.fromEntries(active.controls.map(c=>[c.key,c.value]));renderControls();schedule();};
const narrowPanels=matchMedia('(max-width:1000px)');
function setGenerators(open){
 document.body.classList.toggle('generators-hidden',!open);
 $('collapse').setAttribute('aria-expanded',open);
}
$('collapse').onclick=()=>setGenerators(document.body.classList.contains('generators-hidden'));
function adaptPanels(){setGenerators(!narrowPanels.matches);}
narrowPanels.addEventListener('change',adaptPanels);adaptPanels();
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&narrowPanels.matches&&!$('instructions').matches(':popover-open')){const focused=$('sidebar').contains(document.activeElement);setGenerators(false);if(focused)$('collapse').focus();}});
function encodeBMP(pixels){const stride=Math.ceil(W/32)*4,offset=62,size=offset+stride*H,buffer=new ArrayBuffer(size),v=new DataView(buffer),bytes=new Uint8Array(buffer);v.setUint16(0,0x4d42,true);v.setUint32(2,size,true);v.setUint32(10,offset,true);v.setUint32(14,40,true);v.setInt32(18,W,true);v.setInt32(22,H,true);v.setUint16(26,1,true);v.setUint16(28,1,true);v.setUint32(34,stride*H,true);v.setInt32(38,2835,true);v.setInt32(42,2835,true);v.setUint32(46,2,true);v.setUint32(50,2,true);bytes.set([0,0,0,0,255,255,255,0],54);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(pixels[y*W+x])bytes[offset+(H-1-y)*stride+(x>>3)]|=128>>(x&7);return buffer;}
$('save').onclick=()=>{if(pending||$('save').disabled||!binary)return;const blob=new Blob([encodeBMP(binary)],{type:'image/bmp'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ink-studio-${active.id}-${seed}.bmp`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
const grainCtx=$('grain').getContext('2d'),grainImage=grainCtx.createImageData(W,H);let n=12345;for(let i=0;i<W*H;i++){n=(Math.imul(n,1664525)+1013904223)>>>0;const v=n>>>24;grainImage.data[i*4]=grainImage.data[i*4+1]=grainImage.data[i*4+2]=v;grainImage.data[i*4+3]=255;}grainCtx.putImageData(grainImage,0,0);
renderControls();if(typeof p5==='undefined'){$('status').textContent='p5.js could not load. Reload to try again.';}else new p5(p=>{p.setup=()=>{p.pixelDensity(1);p.createCanvas(W,H).parent('render-source');p.noLoop();engine=p;schedule();};});
