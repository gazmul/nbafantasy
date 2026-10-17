import {THEME,recolourKitPixel} from './themes.js?v=080';
import {ATLAS_DATA} from './art-manifest.js?v=080';
// Presentation only. No sprites, poses or cosmetic choices change match physics.
const profiles=new Map();
export function configureAthletes(league){for(const t of league.teams)for(const p of t.players)profiles.set(p.name,{height:p.heightCm,weight:p.weightKg});}
export function athleteMetrics(p){const physical=profiles.get(p.name)||{height:193.04*(p.r?.scale||1),weight:102.05828325};const height=physical.height/193.04;return {height:96*height,build:Math.max(.78,Math.min(1.25,Math.sqrt(physical.weight/102.05828325)/height))};}
export const EDWARDS_FRAMES=ATLAS_DATA['Anthony Edwards']?.frames||[];
export function animationPose(p,m,now){
 const shot=m.ball?.shot,carrier=m.ball?.owner>=0?m.ps[m.ball.owner]:null,speed=Math.hypot(p.vx||0,p.vy||0);
 if(m.phase==='reset'&&p.team===1-m.nextSide)return {name:'celebrate',frame:15};
 if(shot?.shooter===p.id)return {name:shot.dunk?'dunk':'release',frame:shot.dunk?12:11};
 if(p.hold>0)return {name:'shoot',frame:p.hold<.3?10:11};
 if(p.jump>0)return {name:'defend',frame:14};
 if(speed>20)return {name:'run',frame:2+Math.floor(((p.distance??now*speed/1000)/96)*8)%8};
 if(carrier&&carrier.team!==p.team&&m.phase==='playing')return {name:'defend',frame:14};
 return {name:'idle',frame:Math.floor(now/430)%2};
}
const skins={
 'Anthony Edwards':{skin:'#895032',light:'#bd7950',dark:'#4d2b26',hair:'#17151d',beard:false},
 'Dyson Daniels':{skin:'#b47b50',light:'#d9a77c',dark:'#805233',hair:'#211a20',beard:false},
 'Domantas Sabonis':{skin:'#d5a37c',light:'#f2c8a2',dark:'#a96d4d',hair:'#493529',beard:true},
 'Walker Kessler':{skin:'#dcb390',light:'#f7d7b5',dark:'#af805e',hair:'#71503a',beard:true}
};
function poly(ctx,points,fill){ctx.fillStyle=fill;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function limb(ctx,a,b,c,width,skin){ctx.lineCap='square';for(const [stroke,w] of [['#241c29',width+2],[skin.dark,width],[skin.skin,width-2]]){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.stroke();}ctx.fillStyle=skin.light;ctx.fillRect(Math.round(b[0])-1,Math.round(b[1])-2,2,4);}
// Detailed proportionate rig while other athletes await their own art sheets.
function drawRig(ctx,p,pose,now){
 const skin=skins[p.name]||{skin:'#ab7758',light:'#d19b70',dark:'#744731',hair:'#241e25',beard:false},kit=p.team?THEME.away:THEME.home,shade=p.team?'#b9b0a3':'#24458e',gold='#cdb58f';
 const running=pose.name==='run',s=running?Math.sin(now/95+p.id):0,shoot=pose.name==='shoot'||pose.name==='release'||pose.name==='dunk',defend=pose.name==='defend';
 const leftK=[-8-s*7,-24+Math.max(0,s)*8],rightK=[8+s*7,-24+Math.max(0,-s)*8],leftFoot=[-10+s*13,0],rightFoot=[12-s*13,0];
 limb(ctx,[-6,-46],leftK,leftFoot,7,skin);limb(ctx,[6,-46],rightK,rightFoot,7,skin);
 ctx.fillStyle='#eef0e8';for(const foot of [leftFoot,rightFoot]){ctx.fillRect(foot[0]-3,-11,6,9);poly(ctx,[[foot[0]-4,-4],[foot[0]+5,-4],[foot[0]+9,1],[foot[0]-5,1]],'#f7efda');ctx.fillStyle=kit;ctx.fillRect(foot[0]-3,-3,9,3);ctx.fillStyle='#eef0e8';}
 const elbowLeft=shoot?[-11,-79]:defend?[-22,-59]:[-17-s*5,-53],handLeft=shoot?[-8,-94]:defend?[-32,-56]:[-18-s*8,-40+s*5];
 const elbowRight=shoot?[10,-81]:defend?[23,-59]:[18+s*5,-51],handRight=shoot?[8,-96]:defend?[34,-54]:[18+s*8,-41-s*5];
 limb(ctx,[-11,-74],elbowLeft,handLeft,7,skin);limb(ctx,[11,-74],elbowRight,handRight,7,skin);
 poly(ctx,[[-11,-76],[11,-76],[14,-55],[10,-48],[-11,-48],[-14,-57]],'#231c29');poly(ctx,[[-9,-74],[9,-74],[12,-54],[8,-49],[-9,-49],[-11,-56]],kit);poly(ctx,[[-9,-70],[-5,-68],[-6,-51],[-10,-51]],shade);
 ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,-75);ctx.lineTo(0,-70);ctx.lineTo(7,-75);ctx.stroke();
 poly(ctx,[[-12,-51],[12,-51],[14,-36],[1,-37],[0,-43],[-2,-36],[-14,-37]],kit);ctx.fillStyle=shade;ctx.fillRect(-12,-49,24,3);ctx.fillStyle=gold;ctx.fillRect(-13,-39,11,2);ctx.fillRect(2,-39,11,2);
 ctx.fillStyle='#fff3d5';ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillText('FD',0,-59);
 ctx.fillStyle=skin.dark;ctx.fillRect(-3,-83,7,9);poly(ctx,[[-6,-93],[-3,-97],[4,-96],[7,-91],[6,-83],[2,-79],[-4,-82],[-7,-88]],skin.skin);poly(ctx,[[-5,-93],[2,-95],[5,-90],[4,-84],[1,-82],[-3,-84]],skin.light);
 poly(ctx,[[-7,-91],[-7,-95],[-3,-98],[5,-97],[8,-93],[6,-90],[2,-93],[-3,-92]],skin.hair);ctx.fillStyle='#211b23';ctx.fillRect(3,-89,2,2);if(skin.beard){ctx.fillStyle=skin.hair;ctx.fillRect(1,-83,5,3);}
}
const resources=new Map();
function loadAtlas(name,onLoad){
 if(resources.has(name)){const existing=resources.get(name);resources.delete(name);resources.set(name,existing);return existing;}
 const spec=ATLAS_DATA[name];if(!spec||typeof Image==='undefined')return null;
 const resource={spec,image:null,kits:[],failed:false};resources.set(name,resource);while(resources.size>8)resources.delete(resources.keys().next().value);
 const image=new Image();image.onload=()=>{resource.image=image;try{
  for(const side of [0,1]){
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
   for(let i=0;i<d.length;i+=4)if(d[i+3]>0){const colour=recolourKitPixel(d[i],d[i+1],d[i+2],side);d[i]=colour[0];d[i+1]=colour[1];d[i+2]=colour[2];}
   c.putImageData(pixels,0,0);resource.kits[side]=canvas;
  }
 }catch{}onLoad();};image.onerror=()=>{resource.failed=true;onLoad();};image.src=spec.src;return resource;
}
export function makeAthleteRenderer({onLoad=()=>{}}={}){
 const facing=new Map(),poses=new Map();
 function statusFor(name){const r=resources.get(name);return r?.image?'ready':r?.failed?'fallback':'loading';}
 return {
  get status(){return [...resources.values()].some(r=>r.image)?'ready':[...resources.values()].some(r=>r.failed)?'fallback':'loading';},
  statusFor,preload(names){for(const name of names)loadAtlas(name,onLoad);},
  draw(ctx,p,m,now,{facingX,forcePose}={}){
   const resource=loadAtlas(p.name,onLoad),key=p.name+':'+p.id;
   if(Math.abs(facingX??p.vx)>15)facing.set(key,(facingX??p.vx)<0?-1:1);
   const direction=facing.get(key)||(p.team?-1:1),metrics=athleteMetrics(p),pose=forcePose||animationPose(p,m,now),old=poses.get(key);
   if(!old||old.name!==pose.name)poses.set(key,{name:pose.name,at:now,from:old?.frame??pose.frame,frame:pose.frame});
   const history=poses.get(key);history.frame=pose.frame;
   const jump=Math.sin(Math.min(1,(p.jump||0)/.65)*Math.PI)*27,bob=pose.name==='run'?-Math.abs(Math.sin((p.distance??now*.16)/96*Math.PI*2))*1.5:pose.name==='idle'?Math.sin(now/350)*.45:0;
   ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(p.x,p.y-jump+bob);ctx.scale(direction*metrics.build,1);
   if(resource?.image){
    const image=resource.kits[p.team]||resource.image,scale=metrics.height/resource.spec.bodyPixels;
    const paint=index=>{const f=resource.spec.frames[index],[sx,sy,w,h]=f.box,[ax,ay]=f.anchor;ctx.drawImage(image,sx,sy,w,h,(sx-ax)*scale,(sy-ay)*scale,w*scale,h*scale);};
    const mix=Math.min(1,(now-history.at)/75),alpha=ctx.globalAlpha??1;
    if(mix<1&&history.from!==pose.frame){ctx.globalAlpha=alpha*(1-mix);paint(history.from);ctx.globalAlpha=alpha*mix;paint(pose.frame);ctx.globalAlpha=alpha;}else paint(pose.frame);
   }else{const scale=metrics.height/96;ctx.scale(scale,scale);drawRig(ctx,p,pose,now);}
   ctx.restore();return {pose:pose.name,frame:pose.frame,height:metrics.height,facing:direction};
  }
 };
}
