import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {ATLAS_DATA} from '../public/art-manifest.js';
// Decode the real RGBA PNGs without adding a browser or image dependency to CI.
function pixels(png){
 const w=png.readUInt32BE(16),h=png.readUInt32BE(20),chunks=[];
 for(let i=8;i<png.length;){const n=png.readUInt32BE(i);if(png.toString('ascii',i+4,i+8)==='IDAT')chunks.push(png.subarray(i+8,i+8+n));i+=n+12;}
 const raw=inflateSync(Buffer.concat(chunks)),stride=w*4,out=Buffer.alloc(h*stride);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const f=raw[y*(stride+1)];assert(f<=4);for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?out[i-4]:0,b=y?out[i-stride]:0,c=y&&x>=4?out[i-stride-4]:0;out[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][f])&255;}}
 return {w,out};
}
test('every pose silhouette has transparent side margins before either facing is drawn',async()=>{
 for(const [name,spec] of Object.entries(ATLAS_DATA)){
  const {w,out}=pixels(await readFile(new URL('../public'+spec.src,import.meta.url)));
  for(let f=0;f<16;f++){
   const [x,y,bw,bh]=spec.frames[f].box;
   // A clipped pose has solid pixels right on the source rectangle edge;
   // mirroring exchanges these edges, so both must retain their padding.
   const visited=new Uint8Array(bw*bh);let largest={size:0,edge:0};
   for(let seed=0;seed<visited.length;seed++){
    if(visited[seed]||out[((y+Math.floor(seed/bw))*w+x+seed%bw)*4+3]<=100)continue;
    const queue=[seed];visited[seed]=1;let edge=0;
    for(let q=0;q<queue.length;q++){const v=queue[q],cx=v%bw,cy=Math.floor(v/bw);if(cx===0||cx===bw-1)edge++;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy,n=ny*bw+nx;if(nx<0||nx>=bw||ny<0||ny>=bh||visited[n])continue;if(out[((y+ny)*w+x+nx)*4+3]>100){visited[n]=1;queue.push(n);}}
    }
    if(queue.length>largest.size)largest={size:queue.length,edge};
   }
   assert(largest.size>3000);assert.equal(largest.edge,0,`${name} frame ${f}: main silhouette reaches crop side`);
  }
 }
});
test('Edwards and Flagg map their shorter sheets to valid gather/release/dunk poses',()=>{
 for(const name of ['Anthony Edwards','Cooper Flagg']){const f=ATLAS_DATA[name].frames;assert.deepEqual(f[9],f[7]);assert(f[12].box[0]>900,'Dunk is in the final column of row three');assert(f[15].box[1]>940,'Celebration is in the final row');}
});
