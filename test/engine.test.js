import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,normalise} from '../src/engine.js';
import {buildTeam,catalog} from '../src/room-policy.js';
const ids=i=>catalog.teams[i].players.slice(0,2).map(p=>p.id);
const submission=i=>({eligible:true,selected:ids(i)});
const teams=()=>[0,1].map(i=>buildTeam(catalog.teams[i].id,submission(i),'test'));

test('117 verified players, nine exact 13-player rosters and exact conversions',()=>{
 assert.equal(catalog.teams.length,9);assert.equal(catalog.teams.flatMap(t=>t.players).length,117);
 const unique=new Set();for(const t of catalog.teams){assert.equal(t.players.length,13);for(const p of t.players){assert(!unique.has(p.id));unique.add(p.id);assert(p.heightCm>140&&p.heightCm<240);const height=p.heightDisplay.match(/(\d+)'(\d+)/);assert(height);assert(Math.abs(p.heightCm-(Number(height[1])*12+Number(height[2]))*2.54)<.00001);assert(Math.abs(p.weightKg-p.weightLb*.45359237)<.00001);assert(p.profileUrl.startsWith('https://www.nba.com/player/'));}}
});
test('eligibility confirmation and own-roster selections are required',()=>{
 assert.throws(()=>buildTeam('team-1',{selected:ids(0)},'test'));
 assert.throws(()=>buildTeam('team-1',{eligible:true,selected:ids(1)},'test'));
 assert.throws(()=>buildTeam('team-1',{eligible:true,selected:[ids(0)[0],ids(0)[0]]},'test'));
});
test('test mode neutralises weekly figures and uses verified body measurements',()=>{
 const t=buildTeam('team-1',{...submission(0),score:99999,stats:{},heightCm:999},'test');assert.equal(t.score,0);
 assert.equal(t.players[0].h,catalog.teams[0].players[0].heightCm);assert.equal(t.players[0].pts,0);
});
test('final-week mode requires actual complete, coherent totals',()=>{
 assert.throws(()=>buildTeam('team-1',submission(0),'week'));
 const stats=Object.fromEntries(ids(0).map(id=>[id,{gp:3,pts:75,reb:20,ast:16,three:9,stl:4,blk:2}]));
 const t=buildTeam('team-1',{...submission(0),score:1234.5,stats,final:true},'week');assert.equal(t.score,1234.5);assert.equal(t.players[0].pts,75);
 stats[ids(0)[0]].three=30;assert.throws(()=>buildTeam('team-1',{...submission(0),score:1,stats,final:true},'week'));
});
test('weekly performance affects abilities without a score head start',()=>{
 const ts=teams();ts[0].score=2000;ts[1].score=1000;ts[0].players[0].gp=3;ts[0].players[0].pts=105;ts[0].players[0].three=15;
 const g=createGame(ts);assert.deepEqual(g.state.scores,[0,0]);assert(g.state.ps[0].r.range>g.state.ps[2].r.range);
 assert(g.state.ps[0].r.range<=96);
});
test('movement, stamina, passing and cancelled shots',()=>{
 const g=createGame(teams());for(let i=0;i<182;i++)g.step(1/60);const p=g.state.ps[0],x=p.x;
 g.setInput(0,{x:1,y:0,boost:true});g.step(.1);assert(p.x>x);assert(p.energy<100);
 g.setInput(0,{x:0,y:0},['pass']);g.step(.01);assert.equal(g.state.ball.owner,1);
 g.state.ball.pass=null;g.setInput(0,{},['down']);g.step(.01);g.setInput(0,{},['cancel']);g.step(.01);assert.equal(g.state.ps[1].hold,0);
});
test('perfect dunk, possession reset, shot-clock turnover and overtime',()=>{
 const g=createGame(teams(),{rng:()=>0});g.state.phase='playing';g.state.ps[0].x=750;g.state.ps[0].y=265;g.state.ps[2].x=200;g.state.ps[3].x=200;
 g.setInput(0,{},['down']);g.step(.016);assert(g.state.ball.shot.perfect);assert(g.state.ball.shot.dunk);
 for(let i=0;i<110;i++)g.step(1/60);assert.equal(g.state.scores[0],2);assert.equal(g.state.stats[0].dunks,1);
 g.state.phase='playing';g.state.ball.shot=null;g.state.ball.owner=0;g.state.shotClock=0;g.step(.001);assert.equal(g.state.ps[g.state.ball.owner].team,1);
 g.state.time=0;g.state.scores=[4,4];g.step(.001);assert(g.state.overtime);g.state.time=0;g.step(.001);assert(g.state.sudden);
 g.state.scores=[6,4];g.step(.001);assert.equal(g.state.phase,'ended');
});
test('pausing clears held input, stops the clock and state survives checkpoint restore',()=>{
 const g=createGame(teams());g.state.phase='playing';g.setInput(0,{x:1,y:0},['down']);g.step(.1);g.pause('Owner away');const t=g.state.time;g.step(.1);assert.equal(g.state.time,t);assert.equal(g.state.ps[0].hold,0);
 const restored=createGame(teams(),{state:g.snapshot()});assert.deepEqual(restored.state,g.state);restored.pause('');restored.step(.01);assert(restored.state.time<t);
});

test('near-rim tap dunks immediately; outside the radius still requires shot timing',()=>{
 const g=createGame(teams(),{rng:()=>0});g.state.phase='playing';g.state.ps[0].x=720;g.state.ps[0].y=265;g.setInput(0,{},['down']);g.step(.016);assert(g.state.ball.shot?.dunk);assert(g.state.ball.shot.perfect);assert.equal(g.state.ball.shot.points,2);
 const far=createGame(teams());far.state.phase='playing';far.state.ps[0].x=650;far.state.ps[0].y=265;far.setInput(0,{},['down']);far.step(.016);assert.equal(far.state.ball.shot,null);assert(far.state.ps[0].hold>0);
});
test('weekly stars start burning and pause/countdown never consume their advantage',()=>{
 const ts=teams();ts[0].players[0].startOnFire=true;const g=createGame(ts);assert.equal(g.state.ps[0].fire,30);assert.equal(g.state.ps[1].fire,0);g.step(.1);assert.equal(g.state.ps[0].fire,30);g.state.phase='playing';g.step(.1);assert(g.state.ps[0].fire<30);g.pause('away');const f=g.state.ps[0].fire;g.step(.1);assert.equal(g.state.ps[0].fire,f);
});
test('three personal makes ignite; an opponent score clears earned fire but preserves opening weekly fire',()=>{
 const ts=teams();ts[1].players[0].startOnFire=true;const g=createGame(ts,{rng:()=>0});g.state.phase='playing';
 function bucket(side,shooter){g.state.phase='playing';g.state.ball.shot={from:{x:220,y:200},to:{x:815,y:265},t:0,d:.001,made:true,points:2,team:side,dunk:false,shooter};g.state.ball.owner=-1;g.step(.01);}
 bucket(0,0);bucket(0,0);assert.equal(g.state.ps[0].heat,2);bucket(0,0);assert.equal(g.state.ps[0].fire,25);assert.equal(g.state.ps[0].heat,0);assert(g.state.ps[2].fire>0);bucket(1,2);assert.equal(g.state.ps[0].fire,0);
});

test('fire provides real finishing, pace and recovery bonuses rather than only effects',()=>{const setup=hot=>{const t=teams();t[0].players[0].startOnFire=hot;const g=createGame(t,{rng:()=>.78});g.state.phase='playing';g.state.ps[0].x=600;g.state.ps[0].y=265;g.state.ps[2].x=150;g.state.ps[3].x=150;return g;};const cold=setup(false),hot=setup(true);for(const g of [cold,hot]){g.state.ps[0].hold=.74;g.setInput(0,{},['up']);g.step(.01);}assert(!cold.state.ball.shot.made);assert(hot.state.ball.shot.made);const c=setup(false),h=setup(true);for(const g of [c,h]){g.state.ps[0].energy=50;g.setInput(0,{x:1,y:0});g.step(.1);}assert(h.state.ps[0].x>c.state.ps[0].x);assert(h.state.ps[0].energy>c.state.ps[0].energy);});

test('authoritative major plays persist through rebound flashes and checkpoint restoration',()=>{
 const g=createGame(teams(),{rng:()=>0});g.state.phase='playing';const p=g.state.ps[0],def=g.state.ps[2];def.x=p.x+20;def.y=p.y;g.setInput(1,{},['down']);g.step(.01);assert.equal(g.state.playEvent.kind,'steal');assert.equal(g.state.playEvent.side,1);assert.equal(g.state.playSeq,1);
 const restored=createGame(teams(),{state:g.snapshot()});assert.deepEqual(restored.state.playEvent,g.state.playEvent);
 const fail=createGame(teams(),{rng:()=>.999});fail.state.phase='playing';fail.state.ps[2].x=fail.state.ps[0].x+20;fail.state.ps[2].y=fail.state.ps[0].y;fail.setInput(1,{},['down']);fail.step(.01);assert.equal(fail.state.playEvent,null);
});
test('blocked attempts emit BLOCK once without a later false MISS; ordinary misses emit MISS',()=>{
 for(const blocked of [true,false]){const g=createGame(teams(),{rng:()=>0});g.state.phase='playing';const p=g.state.ps[0],d=g.state.ps[2];d.x=p.x+20;d.y=p.y;g.state.ball.owner=-1;g.state.ball.shot={from:{x:p.x,y:p.y},to:{x:815,y:265},t:0,d:.2,made:false,points:2,team:0,dunk:false,shooter:0};if(blocked){g.setInput(1,{},['down']);g.step(.01);assert.equal(g.state.playEvent.kind,'block');}for(let i=0;i<25;i++)g.step(.01);assert.equal(g.state.playEvent.kind,blocked?'block':'miss');assert.equal(g.state.playSeq,1);}
});
test('massive dunks retain airtime and emit DUNK even when fire replaces the small flash',()=>{
 const ts=teams();ts[0].players[0].startOnFire=true;const g=createGame(ts,{rng:()=>0});g.state.phase='playing';g.state.ps[0].x=750;g.state.ps[0].y=265;g.setInput(0,{},['down']);g.step(.01);assert.equal(g.state.ball.shot.d,.94);for(let i=0;i<95;i++)g.step(.01);assert.equal(g.state.scores[0],2);assert.equal(g.state.playEvent.kind,'dunk');assert.equal(g.state.playEvent.fire,true);assert(g.state.flash.includes('ON FIRE'));assert.equal(g.state.playSeq,1);
});
