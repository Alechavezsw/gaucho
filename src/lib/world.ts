const RAD=Math.PI/180;
export const ORIGIN={lat:-32.33237,lon:-67.27167};
export const PX_PER_M=1.7;
const M_LAT=111320,M_LON=111320*Math.cos(ORIGIN.lat*RAD);
export const DEFAULT_ROUTE:[number,number][]=[[-32.332370,-67.271670],[-32.332370,-67.269670],[-32.331570,-67.269670],[-32.331570,-67.271670]];
export const toMeters=(lat:number,lon:number)=>({e:(lon-ORIGIN.lon)*M_LON,n:(lat-ORIGIN.lat)*M_LAT});
export const fromMeters=(e:number,n:number):[number,number]=>[ORIGIN.lat+n/M_LAT,ORIGIN.lon+e/M_LON];
export const toXY=(lat:number,lon:number):[number,number]=>{const m=toMeters(lat,lon);return [160+m.e*PX_PER_M,220-m.n*PX_PER_M];};
export const toLatLon=(x:number,y:number):[number,number]=>fromMeters((x-160)/PX_PER_M,(220-y)/PX_PER_M);
export const wrap180=(a:number)=>((a+540)%360+360)%360-180;
export const bearing=(de:number,dn:number)=>(Math.atan2(de,dn)/RAD+360)%360;
export const turnToward=(from:number,to:number,max:number)=>(from+Math.max(-max,Math.min(max,wrap180(to-from)))+360)%360;
export function mulberry32(seed:number){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export function sunPosition(date:Date,lat:number,lon:number){
 const n=date.getTime()/86400000+2440587.5-2451545;
 const L=(280.46+0.9856474*n)%360,g=((357.528+0.9856003*n)%360)*RAD;
 const lambda=(L+1.915*Math.sin(g)+0.02*Math.sin(2*g))*RAD,eps=(23.439-0.0000004*n)*RAD;
 const ra=Math.atan2(Math.cos(eps)*Math.sin(lambda),Math.cos(lambda)),dec=Math.asin(Math.sin(eps)*Math.sin(lambda));
 const gmst=((18.697374558+24.06570982441908*n)%24+24)%24;
 const ha=((gmst+lon/15)%24+24)%24*15*RAD-ra,phi=lat*RAD;
 const elevation=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(ha))/RAD;
 const azimuth=(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi))/RAD+180)%360;
 return {elevation,azimuth};
}
export const daylight=(elevation:number)=>Math.min(1,Math.max(0,(elevation+6)/16));

export type Environment={temp:number;humidity:number;windKmh:number;gustKmh:number;windDir:number;cloud:number;rain:number;code:number;live:boolean};
export const DEFAULT_ENV:Environment={temp:22,humidity:45,windKmh:10,gustKmh:16,windDir:180,cloud:20,rain:0,code:0,live:false};
let environment=DEFAULT_ENV;
export const setEnvironment=(e:Environment)=>{environment=e;};
export const getEnvironment=()=>environment;

export type Cow={id:string;e:number;n:number;heading:number;state:'graze'|'walk'|'flee';calf:boolean;coat:number;herd:number;off:[number,number]};
export const PADDOCK={e0:-58,e1:338,n0:-30,n1:92};
const FLEE_R=20,CALM_R=32,TICK_S=20;
const herds=[{e:75,n:76},{e:135,n:12},{e:265,n:38}];
export function initCattle():Cow[]{
 const rnd=mulberry32(1986);
 const layout=[[0,5,0],[1,3,1],[2,4,1]];
 return layout.flatMap(([herd,count,calves])=>Array.from({length:count+calves},(_,i)=>{
  const calf=i>=count;const off:[number,number]=[(rnd()-.5)*26,(rnd()-.5)*18];
  return {id:`c${herd}-${i}`,e:herds[herd].e+off[0],n:herds[herd].n+off[1],heading:rnd()*360,state:'graze' as const,calf,coat:calf?Math.floor(rnd()*3):[0,0,1,2,0,1][i%6],herd,off};
 }));
}
export function stepCattle(cows:Cow[],rover:{e:number;n:number;heading:number},rnd:()=>number){
 herds.forEach(h=>{h.e=Math.max(PADDOCK.e0+20,Math.min(PADDOCK.e1-20,h.e+(rnd()-.5)*4));h.n=Math.max(PADDOCK.n0+15,Math.min(PADDOCK.n1-15,h.n+(rnd()-.5)*3));});
 for(const c of cows){
  const de=c.e-rover.e,dn=c.n-rover.n,d=Math.max(Math.hypot(de,dn),.01);
  let speed=.02,target=c.heading+(rnd()-.5)*70,max=22;
  if(d<FLEE_R||(c.state==='flee'&&d<CALM_R)){
   const side=[Math.cos(rover.heading*RAD),-Math.sin(rover.heading*RAD)],s=Math.sign(de*side[0]+dn*side[1])||1;
   target=bearing(de/d*.6+side[0]*s*.8,dn/d*.6+side[1]*s*.8);max=70;speed=d<FLEE_R?.5:.22;c.state='flee';
  }else{
   const home={e:herds[c.herd].e+c.off[0],n:herds[c.herd].n+c.off[1]},gap=Math.hypot(home.e-c.e,home.n-c.n);
   if(gap>14||(c.state==='walk'&&gap>5)){target=bearing(home.e-c.e,home.n-c.n);speed=.2;c.state='walk';max=35;}else c.state='graze';
  }
  c.heading=turnToward(c.heading,target,max);
  c.e+=Math.sin(c.heading*RAD)*speed*TICK_S;c.n+=Math.cos(c.heading*RAD)*speed*TICK_S;
  for(const o of cows){if(o===c)continue;const ge=c.e-o.e,gn=c.n-o.n,g=Math.hypot(ge,gn);if(g<7&&g>0){const push=(7-g)*.4;c.e+=ge/g*push;c.n+=gn/g*push;}}
  const out=c.e<PADDOCK.e0||c.e>PADDOCK.e1||c.n<PADDOCK.n0||c.n>PADDOCK.n1;
  c.e=Math.max(PADDOCK.e0,Math.min(PADDOCK.e1,c.e));c.n=Math.max(PADDOCK.n0,Math.min(PADDOCK.n1,c.n));
  if(out)c.heading=bearing(150-c.e,40-c.n);
 }
}
