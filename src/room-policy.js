import league from './league.json' with {type:'json'};
import {normalise} from './engine.js';

export const catalog=league;
export const cleanName=n=>String(n||'').trim().slice(0,30);
export function teamFor(id){return league.teams.find(t=>t.id===id);}
export function buildTeam(teamId,submission,mode){
 const source=teamFor(teamId);if(!source)throw Error('Choose a team from this league.');
 if(!submission||submission.eligible!==true)throw Error('Confirm that both selected roster players are eligible.');
 if(!Array.isArray(submission.selected)||submission.selected.length!==2||new Set(submission.selected).size!==2)throw Error('Select two different players from your roster.');
 const stats={};for(const p of source.players){if(submission.selected.includes(p.id)){
  const x=mode==='test'?{gp:0,pts:0,reb:0,ast:0,three:0,stl:0,blk:0}:submission.stats?.[p.id];
  if(!x)throw Error('Enter this week’s statistics for both selected players.');
  for(const k of ['gp','pts','reb','ast','three','stl','blk'])if(!Number.isInteger(x[k])||x[k]<0||x[k]>(k==='gp'?7:500))throw Error('Use valid whole numbers for weekly totals and games played.');
  if(x.gp===0&&['pts','reb','ast','three','stl','blk'].some(k=>x[k]!==0))throw Error('A player with no games must have zero weekly totals.');
  if(x.three*3>x.pts)throw Error('Threes made cannot account for more than the player’s total points.');
  stats[p.id]=x;
 }}
 if(Object.keys(stats).length!==2)throw Error('Both selected players must belong to your fantasy roster.');
 if(mode==='week'&&(submission.final!==true||typeof submission.score!=='number'||!Number.isFinite(submission.score)||submission.score< -10000||submission.score>100000))throw Error('Enter and confirm the final fantasy score.');
 const t=normalise({name:source.name,score:mode==='test'?0:submission.score,confirmed:true,players:source.players.map(p=>({id:p.id,name:p.name,h:p.heightCm,w:p.weightKg,injured:false,selected:submission.selected.includes(p.id),...(stats[p.id]||{gp:0,pts:0,reb:0,ast:0,three:0,stl:0,blk:0})}))});
 // Identity and measurements always come from the verified catalogue.
 t.players.forEach((p,i)=>p.id=source.players[i].id);return t;
}

export function publicOwner(o,online=false){if(!o)return null;return {name:o.name,teamId:o.teamId,ready:!!o.ready,online,selected:o.submission?.selected||[],team:o.team||null};}
