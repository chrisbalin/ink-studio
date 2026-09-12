const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ink-pages-test-'));
try{
 execFileSync(process.execPath,['scripts/build-pages.cjs',dir]);
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const refs=[...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css))"/g)].map(m=>m[1]);
 assert.equal(refs.length,4);
 for(const ref of refs){assert.match(ref,/\.[a-f0-9]{16}\.(js|css)$/);assert.ok(fs.existsSync(path.join(dir,ref)));}
 const app=fs.readFileSync(path.join(dir,refs.find(r=>r.startsWith('app.'))),'utf8');
 const worker=app.match(/new Worker\('([^']+)'\)/)[1];
 assert.match(worker,/reaction-worker\.[a-f0-9]{16}\.js/);
 const workerSource=fs.readFileSync(path.join(dir,worker),'utf8');
 const dependency=workerSource.match(/importScripts\('([^']+)'\)/)[1];
 assert.ok(refs.includes(dependency));assert.ok(!app.includes('toggle-parameters'));
 console.log('Pages asset graph verified: HTML, scripts and worker share versioned dependencies.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
