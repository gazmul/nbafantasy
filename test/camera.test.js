import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {courtCamera,RIM_HEIGHT,shotPosition,dunkLift,dunkMotion} from '../public/camera.js';
import {configureAthletes,athleteReach} from '../public/athletes.js';
import {FEATURED} from '../public/featured.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
test('perspective preserves screen-relative controls and raises baskets vertically in both orientations',()=>{
 for(const portrait of [false,true]){
  const c=courtCamera(portrait),p={x:450,y:265},q=c.project(p.x,p.y),right=c.orientInput(1,0),up=c.orientInput(0,-1),r=c.project(p.x+right.x,p.y+right.y),u=c.project(p.x+up.x,p.y+up.y);
  assert(r.x>q.x);assert(u.y<q.y);
  for(const x of [85,815]){const ground=c.project(x,265),rim=c.project(x,265,RIM_HEIGHT);near(ground.x,rim.x);near(ground.y-rim.y,RIM_HEIGHT*ground.scale);assert(rim.y-96*rim.scale>0,'Backboard shot clock stays inside the camera');}
  const far=portrait?c.project(815,265):c.project(450,75),front=portrait?c.project(85,265):c.project(450,455);assert(front.scale>far.scale,'Near players have visible depth scaling');
 }
});
test('shot arcs start at release height and finish at the elevated rim, with no state mutation',()=>{
 for(const x of [85,815])for(const portrait of [false,true]){
  const c=courtCamera(portrait),shot={from:{x:450,y:240},to:{x,y:265},t:0,d:1.2},before=JSON.stringify(shot),start=shotPosition(shot,125);near(start.z,125);assert.equal(JSON.stringify(shot),before);
  const mid=shotPosition({...shot,t:.6},125);assert(mid.z>RIM_HEIGHT+70);
  const end=shotPosition({...shot,t:1.2},125),actual=c.project(end.x,end.y,end.z),rim=c.project(x,265,RIM_HEIGHT);near(actual.x,rim.x);near(actual.y,rim.y);
 }
});
test('all36 athletes reach rim height during a dunk and every court corner retains headroom',async()=>{
 configureAthletes(JSON.parse(await readFile(new URL('../public/league.json',import.meta.url),'utf8')));
 for(const player of FEATURED){const p={name:player.name},reach=athleteReach(p),lift=dunkLift(.8,reach);assert(lift>0);assert(reach*dunkMotion(.8,reach).scale+lift>=RIM_HEIGHT&&reach*dunkMotion(.8,reach).scale+lift<RIM_HEIGHT+14,player.name);near(dunkLift(0,reach),0);
  for(const portrait of [false,true]){const c=courtCamera(portrait);for(const x of [48,852])for(const y of [69,461]){const head=c.project(x,y,reach+lift),feet=c.project(x,y);assert(head.y>0&&feet.y+35<c.height,`${player.name} needs vertical headroom`);assert(head.x-60>0&&head.x+60<c.width,`${player.name} needs side clearance`);}}
 }
});

test('giant dunk apex clears both baskets in both orientations and reduced motion stays steady',()=>{for(const portrait of [false,true])for(const x of [85,815])for(const reach of [100,130]){const c=courtCamera(portrait),motion=dunkMotion(.38,reach),hand=reach*motion.scale+motion.lift;assert(motion.scale>1.4);assert(hand>RIM_HEIGHT+80);assert(c.project(x,265,hand).y>20);const calm=dunkMotion(.38,reach,true);assert.equal(calm.scale,1);assert.equal(calm.rotation,0);}});
