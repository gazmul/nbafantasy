import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTeam,catalog} from '../src/room-policy.js';
import {createGame} from '../src/engine.js';

const submission=players=>({eligible:true,selected:players.map(p=>p.id)});

test('every two-player combination of each expanded four-player roster preserves catalogue identity and measurements',()=>{
 for(const source of catalog.teams){
  const available=source.players.slice(0,4);
  for(let a=0;a<available.length;a++)for(let b=a+1;b<available.length;b++){
   const pair=[available[a],available[b]];
   const built=buildTeam(source.id,submission(pair),'test');
   const selected=built.players.filter(p=>p.selected);
   assert.deepEqual(selected.map(p=>({id:p.id,name:p.name,h:p.h,w:p.w})),pair.map(p=>({id:p.id,name:p.name,h:p.heightCm,w:p.weightKg})),source.name);
   const state=createGame([built,built],{practice:true}).snapshot();
   assert.equal(state.ps.length,4,'Two players per side remain on court');
   assert.deepEqual(state.ps.filter(p=>p.team===0).map(p=>p.name),pair.map(p=>p.name.slice(0,30)));
  }
 }
});

test('expanded selection still rejects invalid counts, duplicate players, unavailable players and foreign roster IDs',()=>{
 for(let i=0;i<catalog.teams.length;i++){
  const source=catalog.teams[i],roster=source.players,foreign=catalog.teams[(i+1)%catalog.teams.length].players;
  for(const pair of [[],[roster[2]],[roster[0],roster[2],roster[3]],[roster[2],roster[2]],[roster[2],roster[4]],[roster[2],foreign[2]]]){
   assert.throws(()=>buildTeam(source.id,submission(pair),'test'),Error,source.name);
  }
 }
});
