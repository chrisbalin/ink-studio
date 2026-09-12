/* Seeded geometry and Gray–Scott simulation. Shared by the app, worker and tests. */
(function(root){
'use strict';
function random(seed){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function reaction(seed,s){
 const w=132,h=198,size=w*h,rng=random(seed);
 let a=new Float32Array(size).fill(1),b=new Float32Array(size),nextA=new Float32Array(size),nextB=new Float32Array(size);
 for(let k=0;k<90;k++){const cx=Math.floor(rng()*w),cy=Math.floor(rng()*h),r=2+Math.floor(rng()*4);for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r){const i=((cy+dy+h)%h)*w+(cx+dx+w)%w;a[i]=.5;b[i]=.25+rng()*.25;}}
 const left=new Int32Array(size),right=new Int32Array(size),up=new Int32Array(size),down=new Int32Array(size);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;left[i]=y*w+(x+w-1)%w;right[i]=y*w+(x+1)%w;up[i]=((y+h-1)%h)*w+x;down[i]=((y+1)%h)*w+x;}
 for(let t=0;t<s.iterations;t++){
  for(let i=0;i<size;i++){const l=left[i],r=right[i],u=up[i],d=down[i];
   const lapA=-a[i]+.2*(a[l]+a[r]+a[u]+a[d])+.05*(a[up[l]]+a[up[r]]+a[down[l]]+a[down[r]]);
   const lapB=-b[i]+.2*(b[l]+b[r]+b[u]+b[d])+.05*(b[up[l]]+b[up[r]]+b[down[l]]+b[down[r]]);
   const ab=a[i]*b[i]*b[i];nextA[i]=Math.max(0,Math.min(1,a[i]+lapA-ab+s.feed*(1-a[i])));nextB[i]=Math.max(0,Math.min(1,b[i]+s.diffusion*lapB+ab-(s.kill+s.feed)*b[i]));
  }[a,nextA]=[nextA,a];[b,nextB]=[nextB,b];
 }
 return {field:b,width:w,height:h};
}
function packing(seed,s,width=528,height=792){
 const rng=random(seed),circles=[],pad=s.weight/2+1;
 // Each accepted radius is bounded by every existing circle and the page edges.
 for(let n=0;n<s.density*20&&circles.length<s.density;n++){
  const x=pad+rng()*(width-2*pad),y=pad+rng()*(height-2*pad);
  let r=Math.min(s.maxRadius,x-pad,y-pad,width-pad-x,height-pad-y);
  for(const c of circles){r=Math.min(r,Math.hypot(x-c.x,y-c.y)-c.r-s.gap-s.weight);if(r<s.minRadius)break;}
  if(r>=s.minRadius)circles.push({x,y,r});
 }
 return circles;
}
function contours(values,cols,rows,cell,spacing,elevation){
 const segments=[];
 // Triangulate each grid cell to resolve saddle cases deterministically.
 function triangle(points,level){const hits=[];for(let j=0;j<3;j++){const a=points[j],b=points[(j+1)%3];if((a[2]<level)!==(b[2]<level)){const f=(level-a[2])/(b[2]-a[2]);hits.push([a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])]);}}if(hits.length===2)segments.push([...hits[0],...hits[1]]);}
 for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){
  const a=[x*cell,y*cell,values[y*cols+x]],b=[(x+1)*cell,y*cell,values[y*cols+x+1]],c=[(x+1)*cell,(y+1)*cell,values[(y+1)*cols+x+1]],d=[x*cell,(y+1)*cell,values[(y+1)*cols+x]];
  const min=Math.min(a[2],b[2],c[2],d[2]),max=Math.max(a[2],b[2],c[2],d[2]);
  for(let k=Math.ceil((min-elevation)/spacing);k*spacing+elevation<=max;k++){const level=k*spacing+elevation;triangle([a,b,c],level);triangle([a,c,d],level);}
 }return segments;
}
const api={reaction,packing,contours};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.InkAlgorithms=api;
})(typeof self!=='undefined'?self:globalThis);
