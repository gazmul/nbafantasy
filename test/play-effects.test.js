import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlayEffects} from '../public/play-effects.js';
import {courtCamera} from '../public/camera.js';
const state=(kind='dunk',id=1)=>({phase:'playing',time:100,playSeq:id,playEvent:{id,kind,side:0,x:815,y:265,time:100},flash:'',flashTimer:1});
test('major effects survive rebound text, deduplicate snapshots and ignore stale events',()=>{
 const fx=makePlayEffects(),m=state();fx.update(m,1000);assert.equal(fx.active.kind,'dunk');const serial=fx.active.serial;m.flash='REBOUND';m.time=99.8;fx.update(m,1200);assert.equal(fx.active.serial,serial);fx.update(m,2200);assert.equal(fx.active,null);fx.update(m,2300);assert.equal(fx.active,null);
 const stale=state('steal',2);stale.time=90;fx.update(stale,2400);assert.equal(fx.active,null);fx.update(state('block',3),2500);assert.equal(fx.active.kind,'block');
});
test('legacy fallback ignores failed defensive attempts and reduced motion has no camera punch',()=>{
 const fx=makePlayEffects({reducedMotion:true}),m={phase:'playing',flash:'REACH / BLOCK',flashTimer:1};fx.update(m,100);assert.equal(fx.active,null);m.flash='STOLEN!';fx.update(m,200);assert.equal(fx.active.kind,'steal');assert.deepEqual(fx.scenePunch(courtCamera(),220,{dunk:true,t:.5,d:1}),{zoom:1,x:0,y:0,focus:{x:520,y:320}});
 const calls=[],ctx=new Proxy({measureText:()=>({width:300})},{get:(o,k)=>o[k]||((...v)=>calls.push([k,...v])),set:(o,k,v)=>(o[k]=v,true)});fx.drawTypography(ctx,courtCamera(),350);assert.deepEqual(calls.find(c=>c[0]==='translate'),['translate',520,159]);assert.deepEqual(calls.find(c=>c[0]==='rotate'),['rotate',0]);
});
