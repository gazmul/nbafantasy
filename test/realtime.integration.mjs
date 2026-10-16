import './runtime-compat.cjs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import assert from 'node:assert/strict';
import {catalog} from '../src/room-policy.js';

const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'fantasy-dual-test',modules:true,scriptPath:new URL('../.build/worker.js',import.meta.url).pathname,compatibilityDate:'2026-10-15',durableObjects:{DUELS:{className:'DuelRoom',useSQLite:true},LOBBY:{className:'LeagueLobby',useSQLite:true}}}],cf:false}));
const checks=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms));let sockets=[];
const request=async(path,body,token)=>{const headers={'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;const r=await mf.dispatchFetch('http://test.local'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
async function open(code,token){let response=await mf.dispatchFetch(`http://test.local/api/rooms/${code}/socket`,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'fd-v1, fd-session.'+token}});assert.equal(response.status,101);const socket=response.webSocket;socket.accept();const peer={socket,received:[],state:null,room:null,paused:''};socket.addEventListener('message',e=>{const msg=JSON.parse(e.data);peer.received.push(msg);if(msg.room)peer.room=msg.room;if(msg.state)peer.state=msg.state;if(msg.type==='state')peer.paused=msg.pausedReason||'';if(msg.type==='pause')peer.paused=msg.reason||'';});sockets.push(socket);return peer;}
const send=(p,m)=>p.socket.send(JSON.stringify(m));
const wait=async(predicate,message,ms=5000)=>{const until=Date.now()+ms;while(Date.now()<until){if(predicate())return;await sleep(30);}throw Error(message);};
const selected=i=>catalog.teams[i].players.slice(0,2).map(p=>p.id);
try{
 await mf.ready;
 const health=await request('/api/health');assert.equal(health.data.players,117);checks.push('Worker boots in the actual Cloudflare workerd runtime');
 const inviteHost=await request('/api/rooms',{teamId:'team-6',mode:'test'});assert.equal(inviteHost.status,200);
 const inviteCode=inviteHost.data.room.code;const preview=await request(`/api/rooms/${inviteCode}/preview`);assert.equal(preview.data.teamId,'team-6');assert.equal(preview.data.canJoin,true);assert(!JSON.stringify(preview.data).includes('token'));
 const inviteGuest=await request(`/api/rooms/${inviteCode}/join`,{teamId:'team-7'});assert.equal(inviteGuest.status,200);assert.equal(inviteGuest.data.room.code,inviteCode);assert.equal((await request(`/api/rooms/${inviteCode}/preview`)).data.canJoin,false);checks.push('Direct invitation joins the exact room; public preview exposes no session credentials');
 await request(`/api/rooms/${inviteCode}/leave`,{},inviteHost.data.token);await request(`/api/rooms/${inviteCode}/leave`,{},inviteGuest.data.token);
 assert.equal((await request(`/api/rooms/${inviteCode}/join`,{teamId:'team-8'})).status,410);checks.push('Closed invitations are rejected clearly');
 const created=await request('/api/play',{teamId:'team-3',mode:'test'});assert.equal(created.status,200);const code=created.data.room.code,h=created.data.token;assert.equal(h.length,64);
 assert.equal((await request(`/api/rooms/${code}`)).status,401);checks.push('Room sign-in is required to view match data');
 const same=await request('/api/play',{teamId:'team-3',mode:'test'});assert.equal(same.status,409);
 const joined=await request('/api/play',{teamId:'team-1',mode:'test'});assert.equal(joined.status,200);const g=joined.data.token;assert.equal(joined.data.room.code,code);checks.push('Two team selections automatically enter the same room without names or codes');
 assert.equal((await request(`/api/rooms/${code}/join`,{owner:'Third QA',teamId:'team-2'})).status,409);checks.push('Different teams required; a third owner cannot join');
 const blue=await open(code,h),orange=await open(code,g);
 send(blue,{type:'ready',submission:{eligible:true,selected:selected(0)}});await wait(()=>blue.received.some(m=>m.type==='error'),'Foreign roster should be rejected');checks.push('A player from a different fantasy roster is rejected');
 send(blue,{type:'ready',submission:{eligible:true,selected:selected(2)}});await sleep(150);assert(!blue.received.some(m=>m.type==='start'));checks.push('One ready owner cannot start the duel alone');
 send(orange,{type:'ready',submission:{eligible:true,selected:selected(0)}});await wait(()=>blue.received.some(m=>m.type==='start')&&orange.received.some(m=>m.type==='start'),'Both owners should receive match start');
 const beat=setInterval(()=>{send(blue,{type:'ping',at:Date.now()});send(orange,{type:'ping',at:Date.now()});},1000);
 await wait(()=>blue.state?.phase==='playing'&&orange.state?.phase==='playing','Countdown should enter live play');assert(blue.state.ps[0].fire>0,'Room-selected demo weekly guard should start on fire');assert.equal(blue.state.ps[1].fire,0);checks.push('Both owners receive shared countdown, live match and server-seeded weekly fire');
 const start=blue.state.ps[2].x;send(orange,{type:'input',control:{x:-1,y:0},events:[]});await sleep(550);send(orange,{type:'input',control:{x:0,y:0},events:[]});await sleep(80);assert(blue.state.ps[2].x<start-35);assert.deepEqual(blue.state.scores,orange.state.scores);checks.push('Orange input moves the authoritative simulation visible to blue');
 send(blue,{type:'scores',scores:[999,0],fire:999});await sleep(60);assert.notEqual(blue.state.scores[0],999);checks.push('Clients cannot submit their own score');
 send(orange,{type:'active',active:false});await wait(()=>blue.paused.length>0,'Hidden owner should pause both clients');const pausedAt=blue.state.time;await sleep(350);assert(Math.abs(blue.state.time-pausedAt)<.05);checks.push('Leaving the browser pauses the shared match clock');
 send(orange,{type:'active',active:true});await wait(()=>blue.state.time<pausedAt-.1,'Returning owner should resume the clock');checks.push('Returning owner resumes the same match');
 send(blue,{type:'input',control:{x:0,y:0},events:[{type:'down',seq:1}]});await sleep(730);send(blue,{type:'input',control:{x:0,y:0},events:[{type:'up',seq:2}]});await wait(()=>blue.state.stats[0].attempts>=1,'Actual server should resolve shot input');checks.push('Timed shooting is processed by the server');
 clearInterval(beat);orange.socket.close(1000,'QA disconnect');await wait(()=>blue.paused.length>0,'Disconnected owner must pause match');const before=blue.state.time;await sleep(250);assert(Math.abs(blue.state.time-before)<.05);checks.push('Disconnect pauses play rather than substituting an AI owner');
 const resumed=await open(code,g);await wait(()=>resumed.state!==null,'Session token must resume current match');checks.push('Original owner session resumes the same room');
 const simultaneous=await Promise.all(['team-4','team-5'].map(teamId=>request('/api/play',{teamId,mode:'test'})));
 assert(simultaneous.every(x=>x.status===200));assert.equal(simultaneous[0].data.room.code,simultaneous[1].data.room.code);assert.notEqual(simultaneous[0].data.side,simultaneous[1].data.side);checks.push('Simultaneous arrivals pair atomically into one shared room');
 const abandoned=await request('/api/play',{teamId:'team-6',mode:'test'});await request(`/api/rooms/${abandoned.data.room.code}/leave`,{},abandoned.data.token);
 const fresh=await request('/api/play',{teamId:'team-7',mode:'test'});assert.equal(fresh.data.side,0);assert.notEqual(fresh.data.room.code,abandoned.data.room.code);checks.push('Leaving the queue removes the abandoned room from future matchmaking');
 const separate=await request('/api/play',{teamId:'team-8',mode:'week',weekEnding:'2026-10-18'});assert.equal(separate.data.side,0);checks.push('Final-week and neutral test queues remain separate');
 console.log(JSON.stringify({pass:true,checks,browserQA:'Not run: no supported control-browser skill available in the managed environment.'},null,2));
}finally{for(const ws of sockets)try{ws.close();}catch(e){}await mf.dispose();}
