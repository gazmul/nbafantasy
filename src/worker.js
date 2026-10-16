import {createGame} from './engine.js';
import {teamFor,buildTeam,cleanName,publicOwner} from './room-policy.js';

const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const token=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const digest=async x=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const TTL=4*60*60*1000;

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return secure(await env.ASSETS.fetch(request),url);
  if(url.pathname==='/api/health')return json({ok:true,version:'0.4.0',realtime:'cloudflare-durable-objects',rosters:9,players:117});
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Use this game’s own website.'},403);
  const max=Number(request.headers.get('Content-Length')||0);if(max>16000)return json({error:'Request too large.'},413);
  try{
   if(url.pathname==='/api/play'&&request.method==='POST')return await env.LOBBY.getByName('league').fetch(new Request(url.origin+'/play',request));
   if(url.pathname==='/api/rooms'&&request.method==='POST'){
    const code=crypto.randomUUID().replaceAll('-','').slice(0,20).toUpperCase();
    return await env.DUELS.getByName(code).fetch(new Request(url.origin+'/create',{method:'POST',body:JSON.stringify({...await request.json(),code})}));
   }
   const m=url.pathname.match(/^\/api\/rooms\/([A-Fa-f0-9]{20})(?:\/(join|socket|leave|preview))?$/);
   if(!m)return json({error:'Unknown game route.'},404);
   const next=new URL(request.url);next.pathname='/'+(m[2]||'view');
   return await env.DUELS.getByName(m[1].toUpperCase()).fetch(new Request(next,request));
  }catch(e){return json({error:'The room request could not be completed. Please try again.'},400);}
 }
};
function secure(response,url){const r=new Response(response.body,response),socketOrigin=(url.protocol==='https:'?'wss://':'ws://')+url.host;r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' "+socketOrigin+"; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");r.headers.set('Cache-Control','no-cache');r.headers.set('X-Content-Type-Options','nosniff');r.headers.set('Referrer-Policy','no-referrer');r.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');return r;}

export class DuelRoom {
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;this.room=null;this.engine=null;this.loop=null;this.ticks=0;this.persisting=false;this.lastTick=Date.now();this.stats=new Map();
  ctx.blockConcurrencyWhile(async()=>{
   this.room=await ctx.storage.get('room')||null;
   if(this.room?.snapshot&&this.room.owners.every(o=>o?.team))this.engine=createGame(this.room.owners.map(o=>o.team),{state:this.room.snapshot});
   if(this.engine&&this.engine.state.phase!=='ended')this.ensureLoop();
  });
 }
 sockets(){return this.ctx.getWebSockets();}
 online(side){return this.sockets().some(s=>s.deserializeAttachment()?.side===side&&s.readyState===1);}
 view(){return {code:this.room.code,mode:this.room.mode,weekEnding:this.room.weekEnding,createdAt:this.room.createdAt,expiresAt:this.room.createdAt+TTL,owners:this.room.owners.map((o,s)=>publicOwner(o,this.online(s))),phase:this.engine?.state.phase||'lobby'};}
 pauseReason(){if(!this.engine||this.engine.state.phase==='ended')return '';for(let side=0;side<2;side++){const sockets=this.sockets().filter(s=>s.deserializeAttachment()?.side===side&&s.readyState===1);if(!sockets.length)return 'An owner disconnected. Waiting for them to return.';const a=sockets[0].deserializeAttachment();if(!a.active)return 'Both owners must return to the court.';if(Date.now()-a.lastSeen>4500)return 'Waiting for the other owner’s connection…';}return '';}
 async save(){if(this.room){if(this.engine)this.room.snapshot=this.engine.snapshot();await this.ctx.storage.put('room',this.room);}}
 send(ws,x){try{ws.send(JSON.stringify(x));}catch(e){}}
 broadcast(x){for(const s of this.sockets())this.send(s,x);}
 update(){this.broadcast({type:'room',room:this.view()});}
 async authorised(request){const h=request.headers.get('Authorization')||'';const protocols=(request.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(s=>s.trim());const raw=h.startsWith('Bearer ')?h.slice(7):protocols.find(s=>s.startsWith('fd-session.'))?.slice(11);if(!raw||!/^[a-f0-9]{64}$/.test(raw))return -1;const hash=await digest(raw);return this.room.owners.findIndex(o=>o?.tokenHash===hash);}
 async fetch(request){
  const path=new URL(request.url).pathname;
  try{
   if(path==='/create'&&request.method==='POST'){
    if(this.room)return json({error:'Room already exists.'},409);
    const b=await request.json();b.owner=teamFor(b.teamId)?.name;if(!teamFor(b.teamId)||!cleanName(b.owner))return json({error:'Enter your owner name and choose a team.'},400);
    const mode=b.mode==='week'?'week':'test';if(mode==='week'&&!/^\d{4}-\d{2}-\d{2}$/.test(b.weekEnding||''))return json({error:'Choose the week ending date.'},400);
    const auth=token();this.room={code:b.code,mode,weekEnding:mode==='week'?b.weekEnding:null,createdAt:Date.now(),owners:[{name:cleanName(b.owner),teamId:b.teamId,tokenHash:await digest(auth),ready:false},null]};await this.save();await this.ctx.storage.setAlarm(Date.now()+TTL);return json({token:auth,side:0,room:this.view()});
   }
   if(!this.room)return json({error:'Duel not found. Enter the live court again.'},404);
   if(Date.now()>this.room.createdAt+TTL)return json({error:'This test room has expired. Create a new duel.'},410);
   if(path==='/preview')return json({teamId:this.room.owners[0].teamId,teamName:teamFor(this.room.owners[0].teamId).name,mode:this.room.mode,canJoin:!this.room.abandoned&&!this.engine&&!this.room.owners[1]});
   if(path==='/availability')return json({available:!this.engine&&!this.room.abandoned&&!this.room.owners[1]&&(this.online(0)||Date.now()-this.room.createdAt<20000),teamId:this.room.owners[0].teamId});
   if(path==='/join'&&request.method==='POST'){
    if(this.room.abandoned)return json({error:'That match was closed. Ask your rival for a new match link.'},410);
    if(this.room.owners[1])return json({error:'This duel already has two owners. Use Resume on the device you joined with.'},409);
    const b=await request.json();b.owner=teamFor(b.teamId)?.name;if(!teamFor(b.teamId)||b.teamId===this.room.owners[0].teamId||!cleanName(b.owner))return json({error:'Select a different fantasy team from your rival.'},400);
    const auth=token(),hash=await digest(auth);if(this.room.owners[1])return json({error:'Another owner just joined this duel.'},409);
    this.room.owners[1]={name:cleanName(b.owner),teamId:b.teamId,tokenHash:hash,ready:false};await this.save();this.update();return json({token:auth,side:1,room:this.view()});
   }
   const side=await this.authorised(request);if(side<0)return json({error:'This browser cannot resume that duel. Enter the live court again.'},401);
   if(path==='/view')return json({side,room:this.view(),state:this.engine?.snapshot()||null,pausedReason:this.pauseReason()});
   if(path==='/leave'&&request.method==='POST'){
    for(const socket of this.sockets())if(socket.deserializeAttachment()?.side===side)socket.close(1000,'Owner left');
    if(this.engine&&this.engine.state.phase!=='ended'){this.room.abandoned=true;this.engine.pause('An owner left. Create a new duel.');}
    this.room.abandoned=true;this.room.owners[side].ready=false;await this.save();this.update();return json({ok:true});
   }
   if(path!=='/socket'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket upgrade required.'},426);
   for(const old of this.sockets())if(old.deserializeAttachment()?.side===side){old.serializeAttachment({...old.deserializeAttachment(),replaced:true});old.close(1000,'Resumed in another tab');}
   const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server);server.serializeAttachment({side,lastSeen:Date.now(),lastInput:0,lastSeq:0,active:true,replaced:false});
   this.send(server,{type:'welcome',side,room:this.view(),state:this.engine?.snapshot()||null,pausedReason:this.pauseReason()});this.update();
   if(!this.engine&&this.room.owners.every(o=>o?.ready)&&[0,1].every(s=>this.online(s))){this.engine=createGame(this.room.owners.map(o=>o.team));this.broadcast({type:'start',state:this.engine.snapshot(),room:this.view()});this.ctx.waitUntil(this.save());}
   if(this.engine&&this.engine.state.phase!=='ended')this.ensureLoop();
   return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'fd-v1'}});
  }catch(e){return json({error:e.message||'Invalid room request.'},400);}
 }
 async webSocketMessage(ws,message){
  if(typeof message!=='string'||message.length>10000)return ws.close(1009,'Message too large');
  const a=ws.deserializeAttachment();if(!a||a.replaced)return;
  let m;try{m=JSON.parse(message);}catch(e){return;}
  const now=Date.now(),rate=this.stats.get(ws)||{at:now,count:0};if(now-rate.at>1000){rate.at=now;rate.count=0;}if(++rate.count>80)return ws.close(1008,'Too many messages');this.stats.set(ws,rate);
  a.lastSeen=now;ws.serializeAttachment(a);
  if(this.engine&&!this.loop&&!this.room.abandoned&&!this.pauseReason()&&this.engine.state.phase!=='ended')this.ensureLoop();
  try{
   if(m.type==='ping'){this.send(ws,{type:'pong',at:m.at,serverAt:now});return;}
   if(m.type==='active'){a.active=m.active===true;ws.serializeAttachment(a);this.engine?.clear(a.side);this.broadcast({type:'pause',reason:this.pauseReason()});return;}
   if(m.type==='ready'&&!this.engine){
    const owner=this.room.owners[a.side];owner.team=buildTeam(owner.teamId,m.submission,this.room.mode);owner.submission=m.submission;owner.ready=true;
    if(this.room.owners.every(o=>o?.ready)&&[0,1].every(s=>this.online(s))){this.engine=createGame(this.room.owners.map(o=>o.team));this.room.snapshot=this.engine.snapshot();this.broadcast({type:'start',state:this.engine.snapshot(),room:this.view()});this.ensureLoop();}
    await this.save();this.update();return;
   }
   if(m.type==='unready'&&!this.engine){this.room.owners[a.side].ready=false;await this.save();this.update();return;}
   if(m.type==='input'&&this.engine&&!this.room.abandoned){
    if(now-a.lastInput<15)return;a.lastInput=now;const actions=[];
    if(Array.isArray(m.events))for(const event of m.events.slice(0,8)){if(Number.isInteger(event.seq)&&event.seq>a.lastSeq&&['down','up','pass','cancel'].includes(event.type)){a.lastSeq=event.seq;actions.push(event.type);}}
    ws.serializeAttachment(a);this.engine.setInput(a.side,m.control,actions);this.send(ws,{type:'ack',seq:a.lastSeq});return;
   }
  }catch(e){this.send(ws,{type:'error',message:e.message});}
 }
 ensureLoop(){if(this.loop)return;this.lastTick=Date.now();this.loop=setInterval(()=>this.tick(),1000/30);}
 tick(){
  if(!this.engine)return;const now=Date.now(),elapsed=Math.min(.12,(now-this.lastTick)/1000);this.lastTick=now;
  const reason=this.room.abandoned?'An owner left. Create a new duel.':this.pauseReason();this.engine.pause(reason);
  for(let i=0;i<Math.max(1,Math.ceil(elapsed*60));i++)this.engine.step(elapsed/Math.max(1,Math.ceil(elapsed*60)));
  this.broadcast({type:'state',state:this.engine.snapshot(),pausedReason:reason});
  if(++this.ticks%30===0&&!this.persisting){this.persisting=true;this.ctx.waitUntil(this.save().finally(()=>this.persisting=false));}
  if(this.engine.state.phase==='ended'){clearInterval(this.loop);this.loop=null;this.ctx.waitUntil(this.save());}
  // No active simulation is kept alive while both owners are away.
  if(reason||this.sockets().filter(s=>s.readyState===1).length===0){clearInterval(this.loop);this.loop=null;this.ctx.waitUntil(this.save());}
 }
 async webSocketClose(ws,code,reason,wasClean){const a=ws.deserializeAttachment();this.stats.delete(ws);if(a?.replaced)return;this.engine?.clear(a?.side);if(this.room){this.broadcast({type:'pause',reason:'An owner disconnected. Waiting for them to return.'});this.update();await this.save();}}
 async webSocketError(ws){try{ws.close(1011,'Connection interrupted');}catch(e){}}
 async alarm(){for(const socket of this.sockets())socket.close(1000,'Test room expired');if(this.loop)clearInterval(this.loop);this.loop=null;await this.ctx.storage.deleteAll();this.room=null;this.engine=null;}
}

// One league queue serialises simultaneous arrivals; game rooms remain independent.
export class LeagueLobby {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){return this.ctx.blockConcurrencyWhile(async()=>{
  const b=await request.json();if(!teamFor(b.teamId))return json({error:'Choose your fantasy team.'},400);
  const mode=b.mode==='week'?'week':'test';
  if(mode==='week'&&!/^\d{4}-\d{2}-\d{2}$/.test(b.weekEnding||''))return json({error:'Choose the week ending date.'},400);
  const key='queue:'+mode+(mode==='week'?':'+b.weekEnding:'');
  const waiting=await this.ctx.storage.get(key)||[];const available=[];
  for(const item of waiting){
   const stub=this.env.DUELS.getByName(item.code);
   const check=await stub.fetch(new Request('https://room/availability'));
   if(check.ok&&(await check.json()).available)available.push(item);
  }
  if(available.some(x=>x.teamId===b.teamId))return json({error:'Your team is already waiting. Resume its duel on the original device, or choose another team.'},409);
  if(available.length){
   const rival=available.shift();
   const response=await this.env.DUELS.getByName(rival.code).fetch(new Request('https://room/join',{method:'POST',body:JSON.stringify(b)}));
   await this.ctx.storage.put(key,available);return response;
  }
  const code=crypto.randomUUID().replaceAll('-','').slice(0,20).toUpperCase();
  const response=await this.env.DUELS.getByName(code).fetch(new Request('https://room/create',{method:'POST',body:JSON.stringify({...b,code})}));
  if(response.ok)available.push({code,teamId:b.teamId});
  await this.ctx.storage.put(key,available);return response;
 });}
}
