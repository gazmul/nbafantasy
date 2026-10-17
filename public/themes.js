// Saved colour directions. Only Midnight Arena is active; themed games can
// select another preset later without changing simulation or room data.
export const THEMES=Object.freeze({
 midnight:Object.freeze({name:'Midnight Arena',background:'#101827',panel:'#202b3b',court:'#cdb58f',courtLight:'#ddc9a8',courtDark:'#b89d77',home:'#467bff',away:'#f4ebdd',ink:'#253449',lines:'#fff5e4',accent:'#93b0ff',fire:'#ffb65c',homeLabel:'COBALT',awayLabel:'IVORY',homeRGB:[70,123,255],awayRGB:[244,235,221]}),
 concrete:Object.freeze({name:'Concrete Club',background:'#f2efe8',panel:'#e4e2da',court:'#b9bbb6',home:'#185746',away:'#cc623b',ink:'#24282b',accent:'#cc623b'}),
 coastal:Object.freeze({name:'Coastal Heat',background:'#143d43',panel:'#1d5058',court:'#e6d6b9',home:'#246bce',away:'#f4863e',ink:'#143d43',accent:'#fff5e3'}),
 arcade:Object.freeze({name:'Original Arcade',background:'#160d28',panel:'#24143a',court:'#efbf75',home:'#22d7ff',away:'#ff6651',ink:'#231038',accent:'#ffe55b'})
});
export const THEME=THEMES.midnight;
export const sideLabel=side=>side?THEME.awayLabel:THEME.homeLabel;
export function recolourKitPixel(r,g,b,side){
 // Cyan is the original kit pigment. Skin, hair, white wristbands and gold
 // piping are excluded. Preserve the source shading in both replacement kits.
 if(!(g>r*1.25&&b>r*1.2&&Math.abs(g-b)<100))return [r,g,b];
 const shade=Math.max(.18,Math.min(1.12,Math.max(g,b)/210));
 return (side?THEME.awayRGB:THEME.homeRGB).map(c=>Math.min(255,Math.round(c*shade)));
}
