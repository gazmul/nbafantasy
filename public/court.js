import {THEME,sideLabel} from './themes.js?v=081';
import {clamp,DUNK_RADIUS} from './engine.js?v=081';
import {makeAthleteRenderer,athleteMetrics,athleteReach} from './athletes.js?v=081';
import {courtCamera,RIM_HEIGHT,shotPosition,dunkLift} from './camera.js?v=081';
export function makeCourt({$,ownerSide,getPaused}){
 const canvas=$('court'),ctx=canvas.getContext('2d'),athletes=makeAthleteRenderer(),air=new Map();
 let CW=900,CH=530,pausedReason='',camera=courtCamera(),rimAction=null;
 const portraitCourt=()=>CW<CH;
 function orientInput(x,y){return courtCamera(portraitCourt()).orientInput(x,y);}
 function resize(){const r=$('arena').getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);CW=r.width;CH=r.height;camera=courtCamera(portraitCourt());}
 window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('arena'));
 function line(x1,y1,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function polygon(points,fill,stroke,width=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
 function floorPath(points,fill,stroke=THEME.lines,width=1.8,close=false){const p=points.map(([x,y])=>camera.project(x,y));ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));if(close)ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 const rect=(x,y,w,h,fill,stroke=THEME.lines,width=1.8)=>floorPath([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],fill,stroke,width,true);
 function arc(x,y,r,from=0,to=Math.PI*2,color=THEME.lines,width=1.8){const p=[];for(let i=0;i<=64;i++){const a=from+(to-from)*i/64;p.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}floorPath(p,null,color,width);}
 function courtArt(){
  const backdrop=ctx.createLinearGradient(0,0,0,camera.height);backdrop.addColorStop(0,'#0c1422');backdrop.addColorStop(.65,'#1b2b41');backdrop.addColorStop(1,THEME.background);ctx.fillStyle=backdrop;ctx.fillRect(0,0,camera.width,camera.height);
  // Quiet architectural light and wall panels; no spectators or crowd dots.
  const wallY=camera.portrait?135:195;line(35,wallY,camera.width-35,wallY,'#31425a',2);line(35,wallY+6,camera.width-35,wallY+6,'#0a111e',5);
  for(let i=0;i<5;i++){const x=65+i*(camera.width-130)/4;line(x,wallY-75,x,wallY-14,'#23334a',2);line(x-17,wallY-76,x+17,wallY-76,'#8ca8d34d',3);}
  ctx.textAlign='center';ctx.fillStyle='#9cb1cf';ctx.font='700 12px sans-serif';ctx.fillText('MIDNIGHT ARENA',camera.width/2,42);ctx.font='600 9px sans-serif';ctx.fillStyle='#637c9d';ctx.fillText('2 ON 2  ·  OWN THE COURT',camera.width/2,60);
  const corners=[[36,55],[864,55],[864,475],[36,475]].map(([x,y])=>camera.project(x,y));polygon(corners.map(p=>({x:p.x,y:p.y+10})),'#080f1d');
  const wood=ctx.createLinearGradient(0,210,0,camera.height);wood.addColorStop(0,THEME.courtDark);wood.addColorStop(.5,THEME.courtLight);wood.addColorStop(1,THEME.court);polygon(corners,wood,'#ead7b5',2);
  for(let x=36;x<864;x+=34){rect(x,55,Math.min(34,864-x),420,(Math.round(x/34)%2)?'#ffffff07':'#74553109',null);floorPath([[x,55],[x,475]],null,'#79664d30',.8);}
  for(let row=0;row<5;row++)for(let col=0;col<24;col++){const x=36+col*34,y=55+((col%3)*23+row*87)%420;if(y<474)floorPath([[x,y],[Math.min(x+34,864),y]],null,'#79664d22',.6);}
  rect(57,75,786,380,null);floorPath([[450,75],[450,455]],null);arc(450,265,60);arc(450,265,10,0,Math.PI*2,'#34445f70');
  rect(57,173,164,184,'#467bff91');rect(679,173,164,184,'#f4ebdd70');arc(221,265,57,-Math.PI/2,Math.PI/2);arc(679,265,57,Math.PI/2,Math.PI*1.5);
  arc(85,265,226,-1.05,1.05);arc(815,265,226,Math.PI-1.05,Math.PI+1.05);
  for(const x of [57,704])for(const y of [68,462])floorPath([[x,y],[x+139,y]],null);
  const q=camera.project(450,265),qx=camera.project(451,265),qy=camera.project(450,266);ctx.save();ctx.transform(qx.x-q.x,qx.y-q.y,qy.x-q.x,qy.y-q.y,q.x,q.y);ctx.textAlign='center';ctx.fillStyle='#2534494d';ctx.font='900 37px sans-serif';ctx.fillText('FANTASY DUAL',0,0);ctx.font='700 11px sans-serif';ctx.fillText('MIDNIGHT ARENA',0,23);ctx.restore();
  if(!camera.portrait){ctx.font='700 11px sans-serif';ctx.fillStyle=THEME.home;ctx.fillText(sideLabel(0)+'  →',235,600);ctx.fillStyle=THEME.away;ctx.fillText('←  '+sideLabel(1),805,600);}
 }
 function hoop(x,m,frontOnly=false){
  const right=x>450,q=camera.project(x,265,RIM_HEIGHT),g=camera.project(x,265),s=q.scale,rawBase=camera.project(x+(right?53:-53),265),base={...rawBase,x:rawBase.x+(camera.portrait?110*s:0)},color=right?THEME.away:THEME.home;
  if(frontOnly){ctx.save();ctx.translate(q.x,q.y);ctx.scale(s,s);ctx.beginPath();ctx.ellipse(0,0,19,6,0,0,Math.PI);ctx.strokeStyle='#ffbd62';ctx.lineWidth=4;ctx.stroke();ctx.restore();return;}
  ctx.fillStyle='#030a1459';ctx.beginPath();ctx.ellipse(base.x,base.y+4,30*s,9*s,0,0,Math.PI*2);ctx.fill();
  const sign=right?1:-1,attach={x:q.x+(camera.portrait?24:sign*52)*s,y:q.y-28*s};
  line(base.x,base.y-8*s,attach.x,attach.y,'#07101e',12*s);line(base.x,base.y-8*s,attach.x,attach.y,'#718197',6*s);line(base.x+(camera.portrait?17:sign*17)*s,base.y-12*s,attach.x,attach.y+20*s,'#314258',5*s);
  ctx.fillStyle='#17283f';ctx.strokeStyle='#4c6485';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(base.x-15*s,base.y-54*s,30*s,57*s,4*s);ctx.fill();ctx.stroke();line(base.x-10*s,base.y-43*s,base.x+10*s,base.y-43*s,color,3*s);
  ctx.save();ctx.translate(q.x,q.y);ctx.scale(s,s);
  const board=camera.portrait?[{x:-34,y:-59},{x:34,y:-59},{x:34,y:-9},{x:-34,y:-9}]:[{x:sign*25,y:-65},{x:sign*64,y:-49},{x:sign*64,y:3},{x:sign*25,y:-13}];
  polygon(board,'#a8c5e721','#d9e8f3',3);line(board[0].x+2,board[0].y+5,board[2].x-4,board[2].y-6,'#edf6ff30',1.5);
  if(camera.portrait){ctx.strokeStyle='#f6f6ed';ctx.lineWidth=2;ctx.strokeRect(-13,-34,26,21);line(0,-11,0,0,'#e1e9ed',3);}else{polygon([{x:sign*34,y:-35},{x:sign*53,y:-28},{x:sign*53,y:-8},{x:sign*34,y:-15}],null,'#f4f6ec',2);line(sign*29,-11,0,0,'#dce4eb',3);}
  const clockX=camera.portrait?0:sign*48;ctx.fillStyle='#09121f';ctx.strokeStyle='#42536a';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(clockX-19,-96,38,29,4);ctx.fill();ctx.stroke();ctx.font='800 22px monospace';ctx.textAlign='center';ctx.fillStyle='#ffb65c';ctx.fillText(String(Math.ceil(m.shotClock)).padStart(2,'0'),clockX,-74);
  const swing=rimAction?.side===(right?0:1)?Math.max(0,1-(performance.now()-rimAction.at)/450)*Math.sin(performance.now()/48)*4:0;
  for(let k=-2;k<=2;k++){const a=k*7,b=k*4+swing;ctx.beginPath();ctx.moveTo(a,2);ctx.quadraticCurveTo(a*.8+swing,12,b,22);ctx.strokeStyle='#eff5f3bd';ctx.lineWidth=1.3;ctx.stroke();}
  for(const y of [8,15,21]){ctx.beginPath();ctx.ellipse(swing*y/22,y,16-y*.3,3,0,0,Math.PI);ctx.strokeStyle='#dce8ecb0';ctx.lineWidth=1;ctx.stroke();}
  ctx.beginPath();ctx.ellipse(0,0,19,6,0,0,Math.PI*2);ctx.strokeStyle='#653e21';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#f5a544';ctx.lineWidth=3;ctx.stroke();ctx.restore();
 }
 function liftFor(p,m,now){const sh=m.ball.shot,active=sh?.dunk&&sh.shooter===p.id,key=p.name+':'+p.id,target=active?dunkLift(sh.t/sh.d,athleteReach(p)):0;let state=air.get(key);if(!state||m.phase==='countdown')state={value:target,at:now};const dt=clamp((now-state.at)/1000,0,.1);state.value+=(target-state.value)*(1-Math.exp(-dt*(active?28:19)));state.at=now;if(state.value<.1)state.value=0;air.set(key,state);return state.value;}
 function shadow(p){const q=camera.project(p.x,p.y);ctx.save();ctx.translate(q.x,q.y);ctx.scale(q.scale,q.scale);ctx.fillStyle='#0b112e55';ctx.beginPath();ctx.ellipse(0,3,20,6,0,0,Math.PI*2);ctx.fill();const selected=p.id===mActive;ctx.strokeStyle=selected?THEME.accent:p.team?THEME.away:THEME.home;ctx.lineWidth=selected?2.5:1.3;ctx.beginPath();ctx.ellipse(0,3,selected?25:21,selected?9:7,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 let mActive=0;
 function character(p,m,now,lift){const q=camera.project(p.x,p.y),v=camera.project(p.x+(p.vx||0)*.1,p.y+(p.vy||0)*.1),selected=p.id===mActive,c=p.team?THEME.away:THEME.home;ctx.save();ctx.translate(q.x,q.y-lift*q.scale);ctx.scale(q.scale,q.scale);
  if(p.fire>0){const glow=ctx.createRadialGradient(0,-18,3,0,-18,43);glow.addColorStop(0,'#ffbc4760');glow.addColorStop(1,'#ff692800');ctx.fillStyle=glow;ctx.fillRect(-45,-65,90,90);for(let i=0;i<7;i++){const x=-21+i*7,h=21+Math.sin(now/120+i*1.8)*10+(i%3)*6,sway=Math.sin(now/155+i)*5;ctx.fillStyle=i%2?'#ffc548bd':'#ff6729b8';ctx.beginPath();ctx.moveTo(x-4,3);ctx.bezierCurveTo(x-10,-10,x+sway-6,-h*.6,x+sway,-h);ctx.quadraticCurveTo(x+sway+10,-10,x+4,3);ctx.fill();}}
  if(Math.hypot(p.vx||0,p.vy||0)>185){for(let i=0;i<3;i++)line(-(v.x-q.x)*1.5-i*5,-28+i*8,-(v.x-q.x)*.5-i*5,-28+i*8,c,2);}
  athletes.draw(ctx,{...p,x:0,y:0,jump:lift>0?0:p.jump},m,now,{facingX:(v.x-q.x)*10});ctx.restore();
  ctx.textAlign='center';ctx.font='700 '+Math.max(8,10*q.scale)+'px sans-serif';ctx.strokeStyle='#101827';ctx.lineWidth=3;const label=p.name.split(' · ')[0].slice(0,21);ctx.strokeText(label,q.x,q.y+20*q.scale);ctx.fillStyle=selected?THEME.accent:'#f4ebdd';ctx.fillText(label,q.x,q.y+20*q.scale);if(p.fire>0){ctx.fillStyle=THEME.fire;ctx.font='800 9px sans-serif';ctx.fillText('ON FIRE '+Math.ceil(p.fire)+'s',q.x,q.y+32*q.scale);}else if(p.heat>0){ctx.fillStyle='#ff9a54';ctx.fillRect(q.x-12,q.y+26,p.heat*9,3);}
 }
 function ball(world,hot=false){const q=camera.project(world.x,world.y,world.z||0),g=camera.project(world.x,world.y),r=(world.r||8)*q.scale;ctx.fillStyle='#08121b2b';ctx.beginPath();ctx.ellipse(g.x,g.y+2,r*1.1,3*q.scale,0,0,Math.PI*2);ctx.fill();if(hot){ctx.fillStyle='#ff792844';ctx.beginPath();ctx.arc(q.x,q.y,r+7,0,Math.PI*2);ctx.fill();for(let i=0;i<3;i++){ctx.fillStyle=i%2?'#ffe5a0':'#ff762d';ctx.beginPath();ctx.moveTo(q.x-5+i*4,q.y+3);ctx.lineTo(q.x-8+i*4,q.y-18-Math.sin(performance.now()/70+i)*4);ctx.lineTo(q.x+4+i*4,q.y+3);ctx.fill();}}ctx.fillStyle='#eea358';ctx.strokeStyle='#533323';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();line(q.x-r,q.y,q.x+r,q.y,'#8d4c29',1);ctx.beginPath();ctx.ellipse(q.x,q.y,r*.45,r,0,0,Math.PI*2);ctx.strokeStyle='#8d4c29';ctx.stroke();}
 function draw(m){if(!m)return;const now=performance.now(),scale=Math.min(canvas.width/camera.width,canvas.height/camera.height),ox=(canvas.width-camera.width*scale)/2,oy=(canvas.height-camera.height*scale)/2;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=THEME.background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,ox,oy);courtArt();mActive=m.active[ownerSide()];athletes.preload(m.ps.map(p=>p.name));const lifts=new Map(m.ps.map(p=>[p.id,liftFor(p,m,now)]));for(const p of m.ps)shadow(p);
  const entities=m.ps.map(p=>({depth:camera.project(p.x,p.y).depth,paint:()=>character(p,m,now,lifts.get(p.id))}));for(const x of [85,815])entities.push({depth:camera.project(x+(x>450?53:-53),265).depth+.1,paint:()=>hoop(x,m)});entities.sort((a,b)=>a.depth-b.depth).forEach(e=>e.paint());
  const b=m.ball,hot=!!(b.shot?.fireShot||b.owner>=0&&m.ps[b.owner].fire>0);if(b.shot){const sh=b.shot,t=clamp(sh.t/sh.d,0,1),p=m.ps[sh.shooter];let position=shotPosition(sh,athleteReach(p,11)+26);if(sh.dunk){const blend=clamp((t-.70)/.30,0,1),hand={x:p.x+(p.team?-15:15),y:p.y,z:athleteReach(p)+(lifts.get(p.id)||0)};position={x:hand.x+(sh.to.x-hand.x)*blend,y:hand.y+(sh.to.y-hand.y)*blend,z:hand.z+(RIM_HEIGHT-hand.z)*blend};}ball(position,hot);if(t>.86)rimAction={side:sh.team,at:now};
  }else if(b.pass){const pass=b.pass,p=m.ps[pass.to],t=clamp(pass.t/pass.d,0,1);ball({x:pass.from.x+(p.x-pass.from.x)*t,y:pass.from.y+(p.y-pass.from.y)*t,z:42+Math.sin(t*Math.PI)*12},hot);
  }else if(b.loose)ball({x:b.x,y:b.y,z:8});else if(b.owner>=0){const p=m.ps[b.owner],h=athleteMetrics(p).height;ball({x:p.x+(p.team?-14:14),y:p.y,z:p.hold>0?h*.88:14+Math.abs(Math.sin(now/130))*25},hot);}
  for(const x of [85,815])hoop(x,m,true);
  if(m.flashTimer>0){ctx.save();ctx.translate(camera.width/2,camera.portrait?93:91);ctx.textAlign='center';ctx.font='900 18px sans-serif';ctx.lineWidth=5;ctx.strokeStyle=THEME.background;ctx.strokeText(m.flash,0,0,camera.width-70);ctx.fillStyle=THEME.accent;ctx.fillText(m.flash,0,0,camera.width-70);ctx.restore();}
  updateHUD(m);
 }
function updateHUD(m){const side=ownerSide(),p=m.ps[m.active[side]],b=m.ball,attacking=b.owner>=0&&m.ps[b.owner].team===side,hasBall=b.owner===p.id; $('homeScore').textContent=m.scores[0];$('awayScore').textContent=m.scores[1];const t=Math.ceil(m.time);$('clock').textContent=m.sudden?'NEXT':`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;$('shotClock').textContent=(m.overtime?'OT · ':'')+Math.ceil(m.shotClock)+' SEC';$('activeName').textContent=p.name.split(' · ')[0]+(p.fire>0?' · ON FIRE '+Math.ceil(p.fire)+'s':'');$('possession').textContent=b.loose?'· REBOUND!':attacking?'· ATTACK '+(portraitCourt()?(side?'↓':'↑'):(side?'←':'→')):'· DEFEND';$('energy').style.width=p.energy+'%';const nearRim=hasBall&&Math.hypot(p.x-(side?85:815),p.y-265)<DUNK_RADIUS;$('shootBtn').innerHTML=nearRim?'TAP<br>DUNK!':hasBall?'HOLD<br>SHOOT':'STEAL<br>/ BLOCK';$('passBtn').textContent=hasBall?'PASS':'SWITCH';$('shootBtn').style.background=side?THEME.away:THEME.home;$('shootBtn').style.color=side?'#253449':'#ffffff';$('shootBtn').style.borderColor=side?'#fff7e9':'#abc2ff';const hold=p.hold>0&&hasBall;$('shotMeter').hidden=!hold;if(hold)$('needle').style.left=clamp(p.hold/1.05*100,0,98)+'%';let overlay='',sub='';if(pausedReason){overlay='PAUSED';sub=pausedReason;}else if(m.phase==='countdown'){overlay=String(Math.ceil(m.countdown));sub='YOUR WEEK ENDS HERE.';}else if(m.phase==='ended'){overlay='FINAL';} $('arenaOverlay').hidden=!overlay;$('overlayTitle').textContent=overlay;$('overlaySub').textContent=sub;} return {draw(m){pausedReason=getPaused();draw(m);},resize,portraitCourt,orientInput};
}
