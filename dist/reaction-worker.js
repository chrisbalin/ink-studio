importScripts('algorithms.js');
self.onmessage=({data})=>{try{const result=InkAlgorithms.reaction(data.seed,data.settings);self.postMessage(result,[result.field.buffer]);}catch(error){self.postMessage({error:error.message});}};
