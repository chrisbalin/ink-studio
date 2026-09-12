// Publish an immutable asset set so cached scripts cannot mismatch newer HTML.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const output=path.resolve(process.argv[2]||'.pages');
fs.mkdirSync(output,{recursive:true});
const names={};
function emit(file,transform=content=>content){
 const content=transform(fs.readFileSync(path.join('dist',file),'utf8'));
 const hash=crypto.createHash('sha256').update(content).digest('hex').slice(0,16);
 const ext=path.extname(file),name=file.slice(0,-ext.length)+'.'+hash+ext;
 fs.writeFileSync(path.join(output,name),content);names[file]=name;
}
emit('style.css');emit('p5.min.js');emit('algorithms.js');
emit('reaction-worker.js',s=>s.replace("importScripts('algorithms.js')",`importScripts('${names['algorithms.js']}')`));
emit('app.js',s=>s.replace("new Worker('reaction-worker.js')",`new Worker('${names['reaction-worker.js']}')`));
let html=fs.readFileSync('dist/index.html','utf8');
for(const file of ['style.css','p5.min.js','algorithms.js','app.js']){
 const pattern=new RegExp('(["\\\'])'+file.replaceAll('.','\\.')+'(?:\\?[^"\\\']*)?\\1','g');
 html=html.replace(pattern,`"${names[file]}"`);
}
fs.writeFileSync(path.join(output,'index.html'),html);
fs.copyFileSync('dist/p5-LICENSE.txt',path.join(output,'p5-LICENSE.txt'));
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log('Prepared GitHub Pages with content-versioned scripts, worker, and stylesheet.');
