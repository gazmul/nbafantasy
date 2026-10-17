// One authoritative event -> one primary typographic celebration. Persistent
// sequence IDs survive skipped network snapshots and rebound flash messages.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const STYLES={
 dunk:{word:'DUNK!',sub:'RIM WRECKER  ·  +2',color:'#ffd36a',edge:'#f56a37',duration:1150,angle:-.09},
 steal:{word:'STEAL!',sub:'MINE NOW.',color:'#b7d4ff',edge:'#467bff',duration:900,angle:.075},
 block:{word:'BLOCK!',sub:'ACCESS DENIED.',color:'#f6f3e9',edge:'#76a7ff',duration:1000,angle:-.055},
 miss:{word:'MISS!',sub:'CHASE THE REBOUND.',color:'#f4d8ba',edge:'#c77858',duration:850,angle:.10}
};
export function makePlayEffects({reducedMotion=false}={}){
 let active=null,seen=0,lastLegacy='',serial=0;
 function update(m,now){
  if(m.phase==='countdown'){active=null;seen=m.playSeq||0;lastLegacy='';return;}
  const e=m.playEvent;
  if(Number.isSafeInteger(m.playSeq)&&m.playSeq<seen){seen=0;active=null;}
  if(e&&Number.isSafeInteger(e.id)&&e.id>seen){seen=e.id;const age=e.time-m.time;if(STYLES[e.kind]&&age>=-.05&&age<1.4)active={...e,start:now-age*1000,serial:++serial};}
  // Compatibility while an older room/server is rolling forward. Failed
  // reaches, shot gathers and passes never trigger a major word.
  if(!('playEvent' in m)&&m.flash!==lastLegacy){const kind=m.flash==='STOLEN!'?'steal':m.flash==='BLOCK!'?'block':m.flash?.startsWith('DUNK!')?'dunk':m.flash?.startsWith('OFF THE RIM')?'miss':null;if(kind&&m.flashTimer>0)active={id:++serial,kind,side:m.nextSide===undefined?0:1-m.nextSide,x:450,y:265,start:now,serial};lastLegacy=m.flash;}
  if(active&&now-active.start>STYLES[active.kind].duration)active=null;
 }
 function impulse(side,now){if(!active||active.kind!=='dunk'||active.side!==side)return 0;return clamp(1-(now-active.start)/520);}
 function scenePunch(camera,now,shot){
  if(reducedMotion)return {zoom:1,x:0,y:0,focus:{x:camera.width/2,y:camera.height/2}};
  const age=active?now-active.start:9999,hit=active&&['dunk','block'].includes(active.kind)?clamp(1-age/260):0;
  const flight=shot?.dunk?Math.sin(Math.PI*clamp(shot.t/shot.d)):0;
  return {zoom:1+flight*.028+hit*.02,x:Math.sin(age*.11)*hit*5,y:Math.cos(age*.14)*hit*3,
   focus:shot?.dunk?camera.project(shot.to.x,shot.to.y,90):active?camera.project(active.x,active.y,75):{x:camera.width/2,y:camera.height/2}};
 }
 function drawWorld(ctx,camera,now){
  if(!active||reducedMotion)return;const age=(now-active.start)/1000;if(age<0||age>.65)return;
  const a=active,q=camera.project(a.x,a.y,a.kind==='dunk'?148:65),g=camera.project(a.x,a.y),style=STYLES[a.kind],fade=1-age/.65;
  ctx.save();ctx.globalAlpha=fade;
  if(a.kind==='dunk'){ctx.lineWidth=3*fade;for(const gap of [0,22]){ctx.strokeStyle=gap?style.edge:style.color;ctx.beginPath();ctx.ellipse(g.x,g.y,24+age*160+gap,8+age*45+gap*.25,0,0,Math.PI*2);ctx.stroke();}}
  const count=a.kind==='dunk'?20:12;
  for(let i=0;i<count;i++){const angle=i/count*Math.PI*2+(a.serial%3)*.3,speed=70+(i*37%90),r=14+age*speed,x=q.x+Math.cos(angle)*r,y=q.y+Math.sin(angle)*r+age*age*90;ctx.strokeStyle=i%2?style.color:style.edge;ctx.lineWidth=2+(i%3);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*(5+fade*8),y+Math.sin(angle)*(5+fade*8));ctx.stroke();}
  ctx.restore();
 }
 function drawTypography(ctx,camera,now){
  if(!active)return;const style=STYLES[active.kind],age=now-active.start,t=clamp(age/style.duration);if(age<0)return;
  const fade=clamp((1-t)/.24),enter=clamp(age/140),settle=1+Math.sin(clamp(age/280)*Math.PI)*.16;
  const scale=reducedMotion?1:(.42+.58*(1-(1-enter)**3))*settle;
  const leave=reducedMotion?0:Math.max(0,(t-.75)/.25),x=camera.width/2+(!reducedMotion&&active.kind==='steal'?Math.sin(t*Math.PI*2)*8*(1-t):0),y=(camera.portrait?370:159)-leave*30;
  const font=camera.portrait?106:116;ctx.save();ctx.translate(x,y);ctx.rotate(reducedMotion?0:style.angle*(1-leave));ctx.scale(scale*(1+leave*.22),scale*(1-leave*.12));ctx.globalAlpha=fade;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.font=`900 italic ${font}px Impact, Haettenschweiler, "Arial Black", sans-serif`;
  const limit=camera.width*(camera.portrait?.86:.70),measured=ctx.measureText?.(style.word)?.width||font*style.word.length*.65,squeeze=Math.min(1,limit/measured);ctx.scale(squeeze,1);
  // Local speed ticks and a short underline, never a full-screen wash/panel.
  if(!reducedMotion){for(let i=0;i<8;i++){const a=i*Math.PI/4,r=80+enter*34;ctx.strokeStyle=i%2?style.color:style.edge;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*1.7,Math.sin(a)*r*.6);ctx.lineTo(Math.cos(a)*(r+12)*1.7,Math.sin(a)*(r+12)*.6);ctx.stroke();}}
  ctx.strokeStyle='#091221';ctx.lineWidth=17;ctx.strokeText(style.word,6,9);ctx.fillStyle=style.edge;ctx.fillText(style.word,6,9);ctx.lineWidth=12;ctx.strokeText(style.word,0,0);ctx.fillStyle=style.color;ctx.fillText(style.word,0,0);ctx.strokeStyle='#ffffff90';ctx.lineWidth=1;ctx.strokeText(style.word,0,-1);
  ctx.font='900 13px sans-serif';ctx.fillStyle='#f6f4eb';ctx.strokeStyle='#101827';ctx.lineWidth=4;const sub=active.kind==='dunk'&&active.fire?'ON FIRE  ·  +2':style.sub;ctx.strokeText(sub,0,font*.65);ctx.fillText(sub,0,font*.65);
  ctx.restore();
 }
 return {update,scenePunch,drawWorld,drawTypography,impulse,get active(){return active;},ownsFlash:flash=>/^(STOLEN!|BLOCK!|DUNK!|OFF THE RIM)/.test(flash||'')};
}
