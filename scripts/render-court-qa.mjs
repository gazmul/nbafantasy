// Real native-canvas rendering of the browser athlete renderer. This is not
// browser or real-device QA. Requires the runtime's @napi-rs/canvas package.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const nativeRoot=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,loadImage}=await import(nativeRoot+'/@napi-rs/canvas/index.js');
const root=fileURLToPath(new URL('../public/',import.meta.url));
const {ATLAS_DATA}=await import('../public/art-manifest.js?v=081');
const {configureAthletes,makeAthleteRenderer}=await import('../public/athletes.js?v=081');
const {FEATURED}=await import('../public/featured.js?v=081');
const league=JSON.parse(await readFile(root+'league.json','utf8'));configureAthletes(league);
const images=new Map();for(const spec of Object.values(ATLAS_DATA))images.set(spec.src,await loadImage(root+spec.src));
function wrap(canvas){const get=canvas.getContext.bind(canvas);canvas.getContext=(...a)=>{const ctx=get(...a);return new Proxy(ctx,{get:(o,k)=>k==='drawImage'?(image,...args)=>o.drawImage(image?.bitmap||image,...args):typeof o[k]==='function'?o[k].bind(o):o[k],set:(o,k,v)=>(o[k]=v,true)});};return canvas;}
globalThis.Image=class{set src(path){this.bitmap=images.get(path);this.naturalWidth=this.bitmap?.width;this.naturalHeight=this.bitmap?.height;queueMicrotask(()=>this.bitmap?this.onload?.():this.onerror?.());}};
globalThis.document={createElement:()=>wrap(createCanvas(1,1))};

globalThis.window={devicePixelRatio:1,addEventListener(){}};globalThis.ResizeObserver=class{observe(){}};
const {makeCourt}=await import('../public/court.js?v=081');
const {createGame}=await import('../public/engine.js?v=081');
const teams=[league.teams[2],league.teams[0]].map(t=>({name:t.name,score:0,players:t.players.slice(0,4).map((p,i)=>({name:p.name,h:p.heightCm,w:p.weightKg,gp:0,pts:0,reb:0,ast:0,three:0,stl:0,blk:0,selected:i<2,injured:false,startOnFire:i===0}))}));
const renderer=makeAthleteRenderer();renderer.preload(teams.flatMap(t=>t.players.filter(p=>p.selected).map(p=>p.name)));await new Promise(r=>setImmediate(r));
const out=process.argv[2]||'/tmp/fantasy-dual-camera-qa';await mkdir(out,{recursive:true});
for(const [label,width,height,dunkSide] of [['landscape',1100,680,null],['portrait',430,850,null],['dunk-right',1100,680,0],['dunk-left',1100,680,1],['dunk-portrait',430,850,0]]){
 const canvas=wrap(createCanvas(width,height)),els=new Map(),get=id=>{if(id==='court')return canvas;if(!els.has(id))els.set(id,{style:{},getBoundingClientRect:()=>({width,height})});return els.get(id);};const court=makeCourt({$:get,ownerSide:()=>0,getPaused:()=>''});court.resize();const game=createGame(teams,{practice:true});game.state.phase='playing';game.state.ps[0].vx=160;
 if(dunkSide!==null){const p=game.state.ps[dunkSide*2],to={x:dunkSide?85:815,y:265},from={x:dunkSide?175:725,y:265},t=.80,ease=t*t*(3-2*t);p.x=from.x+(to.x-from.x)*ease;p.y=265;p.vx=p.vy=0;p.jump=.65-.58*t;game.state.ball={owner:-1,loose:false,shot:{from,to,t:.58*t,d:.58,dunk:true,shooter:p.id,team:dunkSide,made:true,fireShot:true}};}
 const before=JSON.stringify(game.state);court.draw(game.state);if(before!==JSON.stringify(game.state))throw Error('Renderer mutated authoritative state');await writeFile(out+'/'+label+'.png',canvas.toBuffer('image/png'));console.log('Rendered '+label+' without state mutation');
}
