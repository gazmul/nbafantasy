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
// A huge arcade launch followed by a controlled hammer-down to the real rim.
// Scale is cosmetic; neither sprite enlargement nor airtime changes hitboxes.
export function dunkMotion(progress,reach,reduced=false){
 const t=clamp(progress,0,1),contact=RIM_HEIGHT+3;
 if(reduced)return {lift:Math.max(12,contact-reach)*Math.sin(Math.min(1,t/.68)*Math.PI/2),scale:1,rotation:0};
 const scale=1+.42*Math.sin(Math.PI*Math.min(1,t/.82)),apex=RIM_HEIGHT+86;
 let hand;if(t<.38){const u=t/.38;hand=reach+(apex-reach)*(1-(1-u)**3);}else if(t<.78){const u=(t-.38)/.40;hand=apex+(contact-apex)*u*u*u;}else hand=contact;
 const wind=t<.78?Math.sin(Math.PI*t/.78):0;
 return {lift:Math.max(0,hand-reach*scale),scale,rotation:-.20*wind};
}
export function dunkLift(progress,reach){return dunkMotion(progress,reach).lift;}
