// Presentation coordinates only. World positions, collisions and shot outcomes
// remain owned by the authoritative 900×530 simulation.
export const RIM_HEIGHT=148;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function courtCamera(portrait=false){
 const width=portrait?600:1040,height=portrait?1040:640;
 function project(x,y,z=0){
  const u=portrait?y:x,v=portrait?900-x:y;
  const depth=portrait?(v-57)/786:(v-75)/380;
  const d=clamp(depth,-.1,1.1),scale=portrait?.80+.20*d:.86+.14*d;
  return {x:portrait?300+(u-265)*(.70+.30*d):520+(u-450)*(.82+.18*d)+(v-265)*.10,
   y:(portrait?230+(v-57)*.86:280+(v-75)*.64)-z*scale,scale,depth:v};
 }
 return {width,height,portrait,project,orientInput:(x,y)=>portrait?{x:-y,y:x}:{x,y}};
}
export function shotPosition(shot,releaseHeight=104){
 const t=clamp(shot.t/shot.d,0,1),start=releaseHeight;
 return {x:shot.from.x+(shot.to.x-shot.from.x)*t,y:shot.from.y+(shot.to.y-shot.from.y)*t,
  z:start+(RIM_HEIGHT-start)*t+Math.sin(t*Math.PI)*(shot.dunk?32:112)};
}
export function dunkLift(progress,reach){return Math.max(12,RIM_HEIGHT-reach+3)*Math.sin(Math.min(1,Math.max(0,progress)/.68)*Math.PI/2);}
