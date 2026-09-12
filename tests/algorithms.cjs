const assert=require('node:assert/strict');
const {reaction,packing,contours}=require('../dist/algorithms.js');
const s={feed:.035,kill:.06,diffusion:.5,iterations:700};
const t=performance.now(),r=reaction(18427,s),again=reaction(18427,s),different=reaction(18428,s);
assert.deepEqual(r.field,again.field);assert.notDeepEqual(r.field,different.field);
assert.ok(r.field.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
const ink=r.field.filter(v=>v>.22).length/r.field.length;
assert.ok(ink>.05&&ink<.95,`Default should contain both ink and paper: ${ink}`);
assert.notDeepEqual(r.field,reaction(18427,{...s,feed:.04}).field);
console.log(`Reaction: deterministic, seed/parameter-sensitive, ${(ink*100).toFixed(1)}% ink. Four runs: ${Math.round(performance.now()-t)} ms.`);
const options={weight:1.5,minRadius:4,maxRadius:55,density:350,gap:3};
const circles=packing(18427,options);assert.ok(circles.length>100&&circles.length<=350);assert.deepEqual(circles,packing(18427,options));assert.notDeepEqual(circles,packing(18428,options));
for(let i=0;i<circles.length;i++){const c=circles[i];assert.ok(c.r>=4&&c.r<=55);assert.ok(c.x-c.r>=0&&c.y-c.r>=0&&c.x+c.r<=528&&c.y+c.r<=792);for(let j=0;j<i;j++){const d=circles[j];assert.ok(Math.hypot(c.x-d.x,c.y-d.y)+1e-8>=c.r+d.r+options.gap+options.weight);}}
console.log(`Packing: ${circles.length} circles, reproducible, inside page, no overlapping strokes.`);
// A known sloping plane must yield straight vertical contours at x=.5 and 1.5.
const lines=contours(new Float32Array([0,1,2,0,1,2,0,1,2]),3,3,1,1,.5);
assert.equal(lines.length,8);for(const [x,y,x2,y2]of lines){assert.equal(x,x2);assert.ok(x===.5||x===1.5);assert.ok(y>=0&&y<=2&&y2>=0&&y2<=2);}
const flat=contours(new Float32Array(9).fill(.5),3,3,1,.1,0);assert.equal(flat.length,0);
console.log('Contours: correct interpolation and level placement; flat fields produce no spurious lines.');
