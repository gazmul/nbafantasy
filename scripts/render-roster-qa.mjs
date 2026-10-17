// Real native-canvas rendering of the browser athlete renderer. This is not
// browser or real-device QA. Requires the runtime's @napi-rs/canvas package.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const nativeRoot=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,loadImage}=await import(nativeRoot+'/@napi-rs/canvas/index.js');
const root=fileURLToPath(new URL('../public/',import.meta.url));
const {ATLAS_DATA}=await import('../public/art-manifest.js?v=080');
const {configureAthletes,makeAthleteRenderer}=await import('../public/athletes.js?v=080');
const {FEATURED}=await import('../public/featured.js?v=080');
const league=JSON.parse(await readFile(root+'league.json','utf8'));configureAthletes(league);
const images=new Map();for(const spec of Object.values(ATLAS_DATA))images.set(spec.src,await loadImage(root+spec.src));
function wrap(canvas){const get=canvas.getContext.bind(canvas);canvas.getContext=(...a)=>{const ctx=get(...a);return new Proxy(ctx,{get:(o,k)=>k==='drawImage'?(image,...args)=>o.drawImage(image?.bitmap||image,...args):typeof o[k]==='function'?o[k].bind(o):o[k],set:(o,k,v)=>(o[k]=v,true)});};return canvas;}
globalThis.Image=class{set src(path){this.bitmap=images.get(path);this.naturalWidth=this.bitmap?.width;this.naturalHeight=this.bitmap?.height;queueMicrotask(()=>this.bitmap?this.onload?.():this.onerror?.());}};
globalThis.document={createElement:()=>wrap(createCanvas(1,1))};
const out=process.argv[2]||'/tmp/fantasy-dual-roster-qa';await mkdir(out,{recursive:true});
const renderer=makeAthleteRenderer(),cols=6,cellW=250,cellH=210,rows=Math.ceil(FEATURED.length/cols);
for(const side of [0,1]){
 const canvas=wrap(createCanvas(cols*cellW,rows*cellH)),ctx=canvas.getContext('2d');ctx.fillStyle='#101827';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let i=0;i<FEATURED.length;i++){
  const player=FEATURED[i];renderer.preload([player.name]);await new Promise(r=>setImmediate(r));if(renderer.statusFor(player.name)!=='ready')throw Error(player.name+' failed to load');
  for(const dir of [1,-1]){ctx.save();ctx.translate(i%cols*cellW+(dir===1?75:175),Math.floor(i/cols)*cellH+160);ctx.scale(1.1,1.1);const p={id:i*2+(dir===1?0:1),name:player.name,team:side,x:0,y:0,vx:160,vy:0,jump:0,hold:0,distance:0},m={ps:[p],phase:'playing',ball:{owner:0}};renderer.draw(ctx,p,m,1000,{facingX:dir*160,forcePose:{name:'run',frame:5}});ctx.restore();}
  ctx.fillStyle='#f4ebdd';ctx.textAlign='center';ctx.font='13px sans-serif';ctx.fillText(player.name,i%cols*cellW+cellW/2,Math.floor(i/cols)*cellH+190);
 }
 await writeFile(out+`/roster-${side?'ivory':'cobalt'}.png`,canvas.toBuffer('image/png'));
}
console.log(JSON.stringify({athletes:FEATURED.length,directions:2,kits:2,output:out,browserQA:'Not run'}));
