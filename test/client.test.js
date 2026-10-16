import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Execute the real client and renderer with DOM/canvas adapters. This is a
// runtime regression test, not a substitute for browser or real-phone QA.
test('practice renders past countdown, responds to movement/shots and restarts; invitations target the exact room',async(t)=>{
 const random=Math.random;Math.random=()=>.5;t.after(()=>{Math.random=random;});
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const league=JSON.parse(await readFile(new URL('../public/league.json',import.meta.url),'utf8'));
 let size={width:900,height:530},frames=[],calls=0;const listeners={},requests=[],sent=[];
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(...args)=>{calls++;},set:(o,k,v)=>(o[k]=v,true)});
 class Element{
  constructor(id){this.id=id;this.hidden=/hidden/.test(html.match(new RegExp('<[^>]*id="'+id+'"[^>]*>'))?.[0]||'');this.value=id==='modeInput'?'test':'';this.style={};this.checked=false;this.disabled=false;this.textContent='';}
  set innerHTML(v){this.html=v;const options=[...v.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]);if(options.length){this.options=options.map(value=>({value,disabled:false}));this.value=options[0];}}
  get innerHTML(){return this.html||'';}
  set selectedIndex(v){this.value=this.options[v].value;}
  getBoundingClientRect(){return {...size,left:0,top:0};}
  getContext(){return context;}
  checkValidity(){return true;}
  setPointerCapture(){}
 }
 const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
 const $=id=>{assert(elements.has(id),'Missing real DOM element: '+id);return elements.get(id);};
 const location=new URL('https://test.local/');
 Object.assign(globalThis,{location,window:{devicePixelRatio:1,addEventListener(){}},document:{hidden:false,getElementById:id=>elements.get(id)||null,addEventListener:(k,v)=>listeners[k]=v},ResizeObserver:class{observe(){}},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},requestAnimationFrame:f=>frames.push(f)});
 const code='ABCDEF0123456789ABCD',token='a'.repeat(64);
 const owner={name:league.teams[2].name,teamId:'team-3',ready:false,online:true,selected:[]};
 const room={code,mode:'test',owners:[owner,null]};
 globalThis.fetch=async(path,opts)=>{requests.push({path,opts});return {ok:true,json:async()=>path==='/league.json'?league:path.endsWith('/preview')?{teamId:'team-3',teamName:owner.name,mode:'test',canJoin:true}:{token,side:0,room}};};
 globalThis.WebSocket=class{static OPEN=1;constructor(url){this.url=url;this.readyState=1;this.bufferedAmount=0;queueMicrotask(()=>{this.onopen?.();this.onmessage?.({data:JSON.stringify({type:'welcome',side:0,room})});});}send(m){sent.push(JSON.parse(m));}close(){this.readyState=3;}};
 await import('../public/app.js?client-regression');
 const start=performance.now();let tick=0;
 function run(n){for(let i=0;i<n;i++){const callbacks=frames;frames=[];assert.equal(callbacks.length,1,'Exactly one animation loop');callbacks[0](start+(++tick)*1000/60);}}
 $('practiceBtn').onclick();run(245);assert.equal($('game').hidden,false);assert.equal($('arenaOverlay').hidden,true);assert.notEqual($('clock').textContent,'2:00');assert(calls>1000,'Court actually draws');
 listeners.keydown({key:'d',preventDefault(){}});run(40);listeners.keyup({key:'d'});
 listeners.keydown({key:' ',repeat:false,preventDefault(){}});run(45);assert.equal($('shotMeter').hidden,false);listeners.keyup({key:' '});run(12);assert.equal($('shotMeter').hidden,true);
 $('exitBtn').onclick();run(5);assert.equal($('overlayTitle').textContent,'PAUSED');$('resumeBtn').onclick();run(5);assert.equal($('arenaOverlay').hidden,true);
 $('exitBtn').onclick();$('leaveBtn').onclick();size={width:360,height:640};$('practiceBtn').onclick();run(250);assert.equal($('arenaOverlay').hidden,true);assert.equal($('game').hidden,false);
 $('exitBtn').onclick();$('leaveBtn').onclick();
 await $('loginForm').onsubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));
 assert.equal(requests.find(x=>x.path==='/api/rooms')?.opts.method,'POST');assert.equal(JSON.parse(requests.find(x=>x.path==='/api/rooms').opts.body).mode,'test');
 assert.equal($('inviteLink').value,'https://test.local/?duel='+code);assert.equal($('eligibilityLabel').hidden,true);assert.equal($('selectionCount').textContent,'2 / 2');$('readyBtn').onclick();assert(sent.some(m=>m.type==='ready'&&m.submission.selected.length===2&&m.submission.eligible));
 // A separate client module, representing an incognito owner, follows its invite.
 location.search='?duel='+code;frames=[];await import('../public/app.js?invited-client-regression');await new Promise(r=>setImmediate(r));assert.notEqual($('teamInput').value,'team-3');
 assert.equal($('createBtn').textContent,'JOIN INVITED MATCH ↗');assert.equal($('findRivalBtn').hidden,true);await $('loginForm').onsubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));
 assert(requests.some(x=>x.path===`/api/rooms/${code}/join`));
});
