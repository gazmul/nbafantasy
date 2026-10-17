import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {configureAthletes,athleteMetrics,animationPose,EDWARDS_FRAMES,makeAthleteRenderer} from '../public/athletes.js';
const league=JSON.parse(await readFile(new URL('../public/league.json',import.meta.url),'utf8'));configureAthletes(league);
const player=(name='Anthony Edwards')=>({name,id:0,team:0,vx:0,vy:0,hold:0,jump:0,x:220,y:200,r:{scale:1}});
const match=p=>({ps:[p],phase:'playing',ball:{owner:0},streak:[0,0]});
test('visual height ratios use exact roster measurements and never mutate physics',()=>{
 const names=['Anthony Edwards','Dyson Daniels','Domantas Sabonis','Walker Kessler'],source=league.teams.flatMap(t=>t.players);const guard=source.find(p=>p.name===names[0]);
 for(const name of names){const p=player(name),before=JSON.stringify(p),m=athleteMetrics(p),record=source.find(q=>q.name===name);assert(Math.abs(m.height/96-record.heightCm/guard.heightCm)<1e-10);assert.equal(JSON.stringify(p),before);}
 assert(athleteMetrics(player('Dyson Daniels')).build<athleteMetrics(player()).build);
});
test('animation selects real game actions and all eight sprint frames',()=>{
 const p=player(),m=match(p);assert.equal(animationPose(p,m,0).name,'idle');p.vx=160;assert.deepEqual([0,75,150,225,300,375,450,525].map(t=>animationPose(p,m,t).frame),[2,3,4,5,6,7,8,9]);p.hold=.1;assert.equal(animationPose(p,m,0).frame,10);p.hold=.6;assert.equal(animationPose(p,m,0).frame,11);m.ball.shot={shooter:0,dunk:true};assert.equal(animationPose(p,m,0).frame,12);m.ball.shot=null;p.hold=0;p.vx=0;m.phase='reset';m.nextSide=1;assert.equal(animationPose(p,m,0).frame,15);
});
test('all sixteen atlas crops remain in the real RGBA PNG; feet anchors share its scale',async()=>{
 const data=await readFile(new URL('../public/art/player-1630162-v2.png',import.meta.url));assert.equal(data.subarray(1,4).toString(),'PNG');const w=data.readUInt32BE(16),h=data.readUInt32BE(20);assert.equal(data[25],6,'RGBA PNG');assert.equal(EDWARDS_FRAMES.length,16);
 for(const f of EDWARDS_FRAMES){const [x,y,bw,bh]=f.box;assert(x>=0&&y>=0&&x+bw<=w&&y+bh<=h);assert(f.anchor.every(Number.isFinite));}
});
test('loaded sprite is actually drawn, mirrored and team-coloured; failed art uses fallback',()=>{
 const oldImage=globalThis.Image,oldDoc=globalThis.document;let instance,loaded=0;const palettes=[];const recolour={getImageData:()=>({data:new Uint8ClampedArray([20,150,180,255,120,75,40,255])}),drawImage(){},putImageData(p){assert.equal(p.data[4],120,'Skin colour is preserved');palettes.push([...p.data.slice(0,4)]);}};
 globalThis.document={createElement:()=>({getContext:()=>recolour})};globalThis.Image=class{constructor(){instance=this;this.naturalWidth=1536;this.naturalHeight=1024;}set src(v){this.path=v;}};
 try{const renderer=makeAthleteRenderer({onLoad:()=>loaded++});renderer.preload(['Anthony Edwards']);assert.equal(renderer.status,'loading');assert.equal(instance.path,'/art/player-1630162-v2.png');instance.onload();assert.equal(renderer.status,'ready');assert.equal(loaded,1);assert(palettes[0][2]>palettes[0][0]*2,'Home kit is cobalt');assert(palettes[1][0]>180&&palettes[1][1]>180,'Away kit is ivory');
 const draws=[],scales=[];const ctx=new Proxy({drawImage:(...a)=>draws.push(a),scale:(...a)=>scales.push(a)}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});const p=player(),m=match(p),before=JSON.stringify(m);renderer.draw(ctx,p,m,0,{facingX:-100});assert.equal(draws.length,1);assert(scales[0][0]<0);assert.equal(JSON.stringify(m),before);p.team=1;renderer.draw(ctx,p,m,100);assert.notEqual(draws[0][0],draws[1][0],'Away uniform uses prepared palette');
 const failed=makeAthleteRenderer();failed.preload(['Cade Cunningham']);instance.onerror();assert.equal(failed.statusFor('Cade Cunningham'),'fallback');p.name='Cade Cunningham';assert.doesNotThrow(()=>failed.draw(ctx,p,m,0));
 }finally{globalThis.Image=oldImage;globalThis.document=oldDoc;}
});
