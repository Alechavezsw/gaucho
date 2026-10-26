"use client";
import {useState,useEffect} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import type {Snapshot,Cattle} from '@/lib/types';
import {Navigation,Play,Pause,Lightbulb,Volume2,Camera,Radio,Moon,Sun,Clock,Pencil,X,Undo2} from 'lucide-react';
import {useEnvironment} from '@/lib/weather';
import {KIT} from '@/lib/api';
import {DEFAULT_ROUTE,ORIGIN,PX_PER_M,mulberry32,sunPosition,toLatLon,toXY,wrap180} from '@/lib/world';
const RAD=Math.PI/180;
const TRACK=DEFAULT_ROUTE.map(p=>toXY(p[0],p[1]));
const TRACK_PTS=TRACK.map(p=>p.join(',')).join(' ');
const FENCE={x0:45,y0:50,x1:750,y1:285};
const FENCE_D=`M${FENCE.x0} ${FENCE.y0}H${FENCE.x1}V${FENCE.y1}H${FENCE.x0}Z`;
const MILL={x:588,y:90};const TANK={x:556,y:108};const HOUSE={x:112,y:240};
const COATS=[{body:'#25231f',hi:'#3a372f',face:'#2c2a25',muzzle:'#5a4a44',mark:''},{body:'#8a4a2b',hi:'#a35d3a',face:'#ece4d2',muzzle:'#d9a79a',mark:'#ece4d2'},{body:'#6c3a27',hi:'#85503a',face:'#5a2f20',muzzle:'#8c6256',mark:''}];
const smooth=(k:number)=>{const c=Math.min(1,Math.max(0,k));return c*c*(3-2*c);};
const compass=(deg:number)=>['N','NE','E','SE','S','SO','O','NO'][Math.round(((deg%360)+360)%360/45)%8];
function segDist(px:number,py:number,a:number[],b:number[]){const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(px-a[0]-u*dx,py-a[1]-u*dy);}
const nearTrack=(x:number,y:number)=>TRACK.some((p,i)=>segDist(x,y,p,TRACK[(i+1)%TRACK.length])<22);
const HERDS=[[75,76],[135,12],[265,38]].map(([e,n])=>toXY(ORIGIN.lat+n/111320,ORIGIN.lon+e/94007));
const SCRUB=(()=>{const r=mulberry32(77),out:{x:number;y:number;r:number;tree:boolean}[]=[];for(let tries=0;out.length<34&&tries<800;tries++){const tree=out.length<6,rad=tree?11+r()*6:3.5+r()*4.5,x=60+r()*680,y=62+r()*210;
 if(nearTrack(x,y)||Math.hypot(x-MILL.x,y-MILL.y)<50||Math.hypot(x-160,y-220)<45||HERDS.some(h=>Math.hypot(x-h[0],y-h[1])<34)||out.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+rad+10))continue;out.push({x,y,r:rad,tree});}return out;})();
const RAIN=(()=>{const r=mulberry32(5);return Array.from({length:130},()=>[r()*900-50,r()*330,9+r()*8] as const);})();
const rainPath=(slant:number)=>{const seg=(dy:number)=>RAIN.map(([x,y,l])=>`M${x.toFixed(0)} ${(y+dy).toFixed(0)}l${(l*slant).toFixed(1)} ${l.toFixed(1)}`).join('');return seg(0)+seg(-330);};
function offsetLine(pts:number[][],d:number){return pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [p[0]-dy/l*d,p[1]+dx/l*d].join(',');}).join(' ');}
let groundCache:string|null=null;
function makeGround(){
 if(groundCache)return groundCache;
 const W=1200,H=495,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');if(!g)return null;
 const r=mulberry32(7);
 const grid=(gw:number,gh:number)=>{const v=Float32Array.from({length:(gw+1)*(gh+1)},()=>r());return(u:number,w:number)=>{const x=u*gw,y=w*gh,i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),a=v[j*(gw+1)+i],b=v[j*(gw+1)+i+1],d=v[(j+1)*(gw+1)+i],e=v[(j+1)*(gw+1)+i+1];return a+(b-a)*sx+(d-a)*sy+(a-b-d+e)*sx*sy;};};
 const ramp=[[76,84,52],[112,108,64],[152,136,84],[134,104,70]];
 const color=(n:number)=>{const s=Math.min(2.999,Math.max(0,n*3)),i=Math.floor(s),k=s-i;return ramp[i].map((v,j)=>v+(ramp[i+1][j]-v)*k);};
 const n1=grid(5,2),n2=grid(14,6),n3=grid(38,16),n4=grid(90,38),img=g.createImageData(W,H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/W,v=y/H,n=Math.min(1,Math.max(0,(.5*n1(u,v)+.28*n2(u,v)+.16*n3(u,v)+.06*n4(u,v)-.5)*1.7+.5)),col=color(n),grain=(r()-.5)*14,k=(y*W+x)*4;img.data[k]=col[0]+grain;img.data[k+1]=col[1]+grain;img.data[k+2]=col[2]+grain;img.data[k+3]=255;}
 g.putImageData(img,0,0);
 g.save();g.scale(1.5,1.5);g.lineCap='round';g.lineJoin='round';
 const wash=()=>{g.beginPath();g.moveTo(690,40);g.bezierCurveTo(640,110,735,150,690,215);g.bezierCurveTo(655,255,610,262,640,335);};
 wash();g.strokeStyle='rgba(176,158,112,.5)';g.lineWidth=26;g.stroke();wash();g.strokeStyle='rgba(206,192,150,.55)';g.lineWidth=12;g.stroke();
 g.restore();
 g.lineCap='round';
 for(let i=0;i<2600;i++){const x=r()*W,y=r()*H,l=4+r()*7,a=-1.9+r()*.6;g.strokeStyle=r()<.55?'rgba(52,62,34,.35)':'rgba(196,178,112,.30)';g.lineWidth=1+r();g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l*.3,y+Math.sin(a)*l);g.stroke();}
 for(let i=0;i<200;i++){const x=r()*W,y=r()*H,s=.8+r()*1.8;g.fillStyle=r()<.35?'rgba(190,180,158,.32)':'rgba(70,58,44,.4)';g.beginPath();g.ellipse(x,y,s*1.3,s,r()*3,0,6.3);g.fill();}
 groundCache=c.toDataURL('image/jpeg',.85);return groundCache;
}
function useGround(){const [url,setUrl]=useState<string|null>(null);useEffect(()=>{const id=requestAnimationFrame(()=>setUrl(makeGround()));return()=>cancelAnimationFrame(id);},[]);return url;}
function useUnwrapped(h:number){const [prev,setPrev]=useState(h),[acc,setAcc]=useState(h);if(prev!==h){setPrev(h);setAcc(acc+wrap180(h-acc));}return acc;}
type Shadow={dx:number;dy:number;op:number};
const glide:CSSProperties={transition:'transform 1s linear'};
function Frame({x,y,h,children}:{x:number;y:number;h:number;children:ReactNode}){return <g style={{...glide,transform:`translate(${x}px,${y}px)`}}><g style={{...glide,transform:`rotate(${h}deg)`}}>{children}</g></g>;}
function CowIcon({cow,shadow}:{cow:Cattle;shadow:Shadow}){
 const [x,y]=toXY(cow.lat,cow.lon),h=useUnwrapped(cow.heading),s=cow.calf?.62:1,k=COATS[cow.coat%COATS.length],moving=cow.state!=='graze';
 const spin:CSSProperties={...glide,transform:`rotate(${h}deg) scale(${s})`};
 return <g style={{...glide,transform:`translate(${x}px,${y}px)`}}>
  <g style={{transform:`translate(${shadow.dx*3}px,${shadow.dy*3}px)`}}><g style={spin}><ellipse cy="1" rx="6.2" ry="14" fill="#000" opacity={shadow.op}/></g></g>
  <g style={spin}><g className={moving?'cow-walk':''}>
   <path d="M0 -12C5.6 -12 6.2 -4 5.4 4C4.8 10 3.2 13 0 13C-3.2 13 -4.8 10 -5.4 4C-6.2 -4 -5.6 -12 0 -12Z" fill={k.body}/>
   {k.mark&&<path d="M0 -9V10" stroke={k.mark} strokeWidth="2.2" strokeLinecap="round" opacity=".85"/>}
   <path d="M-3 -6C-2 0 -2.4 6 -2.2 9M3 -6C2 0 2.4 6 2.2 9" stroke={k.hi} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".7"/>
   <path d="M0 12.6Q1.6 16 .6 19.5" stroke={k.body} strokeWidth="1.1" fill="none" strokeLinecap="round"/><circle cx=".6" cy="19.8" r="1" fill={k.hi}/>
   <g className={moving?'':'cow-head'}><ellipse cy="-11.5" rx="3.6" ry="3.2" fill={k.body}/><ellipse cx="-3.6" cy="-14.6" rx="2.1" ry="1" fill={k.body} transform="rotate(-25 -3.6 -14.6)"/><ellipse cx="3.6" cy="-14.6" rx="2.1" ry="1" fill={k.body} transform="rotate(25 3.6 -14.6)"/><ellipse cy="-16" rx="2.7" ry="3.6" fill={k.face}/><ellipse cy="-18.7" rx="1.8" ry="1.2" fill={k.muzzle}/></g>
  </g></g>
 </g>;
}
export function RoverSimulation({snapshot,onToggle,onAccessory,onRoute}:{snapshot:Snapshot;onToggle:()=>void;onAccessory:(name:string)=>void;onRoute:(points:[number,number][])=>Promise<void>}){
 const [light,setLight]=useState<'auto'|'day'|'night'>('auto'),[drawing,setDrawing]=useState(false),[points,setPoints]=useState<[number,number][]>([]),[submitting,setSubmitting]=useState(false);
 const env=useEnvironment(),ground=useGround();
 const t=snapshot.telemetry,when=new Date(t.timestamp),acc=snapshot.accessories;
 const sun=light==='auto'?sunPosition(when,ORIGIN.lat,ORIGIN.lon):light==='day'?{elevation:48,azimuth:70}:{elevation:-30,azimuth:0};
 const night=smooth((4-sun.elevation)/14),dusk=Math.max(0,1-Math.abs(sun.elevation-1)/7);
 const overcast=Math.min(1,env.cloud/100*.8+(env.rain>.05?.25:0));
 const len=Math.min(3,1/Math.tan(Math.max(sun.elevation,6)*RAD));
 const shadow:Shadow={dx:-Math.sin(sun.azimuth*RAD)*len,dy:Math.cos(sun.azimuth*RAD)*len,op:Math.min(1,Math.max(0,sun.elevation)/10)*(1-.75*overcast)*.42};
 const wind={dx:Math.sin((env.windDir+180)*RAD),dy:-Math.cos((env.windDir+180)*RAD),mps:env.windKmh/3.6};
 const st=snapshot.routeFinished?'done':snapshot.status??(t.speed>0?'driving':'stopped');
 const active=snapshot.connected&&st!=='stopped'&&st!=='done';
 const [x,y]=toXY(t.lat,t.lon),heading=useUnwrapped(t.heading);
 const trail=snapshot.trail.map(p=>toXY(p[0],p[1])),plan=(drawing?points:snapshot.plannedRoute||[]).map(p=>toXY(p[0],p[1]));
 const visible=(snapshot.visible||[]).map(id=>snapshot.cattle?.find(c=>c.id===id)).filter((c):c is Cattle=>Boolean(c));
 const phase=sun.elevation>4?'DÍA':sun.elevation>-4?(when.getHours()<12?'AMANECER':'ATARDECER'):'NOCHE';
 const clock=when.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false});
 const fog=env.code===45||env.code===48,raining=env.rain>.05;
 const mill=Math.min(8,Math.max(.5,24/Math.max(env.windKmh,1))),cloudSec=Math.min(600,Math.max(40,1400/Math.max(1,wind.mps*1.5*PX_PER_M)));
 const mode={auto:{label:'Hora real',Icon:Clock},night:{label:'Noche',Icon:Moon},day:{label:'Día',Icon:Sun}}[light],ModeIcon=mode.Icon;
 const kicker=!snapshot.connected?'SIN ENLACE · ÚLTIMA LECTURA':snapshot.emergency_stopped?'PARADA DE EMERGENCIA ENCLAVADA':st==='done'?'RECORRIDO COMPLETADO':st==='turning'?'GIRANDO EN EL LUGAR':st==='yielding'?'REDUCIENDO · OBSTÁCULO':st==='driving'?'RECORRIENDO EL CAMPO':'ROVER DETENIDO';
 const beam=.25+.75*night;
 return <section className={'panel rover-simulation '+(night>.55?'terrain-night':'')} id="simulation"><div className="panel-heading"><h2><Navigation size={17}/>Gaucho en terreno</h2><div className="terrain-tools"><button aria-pressed={light!=='auto'} title="Cambiar la iluminación de la escena" onClick={()=>setLight(light==='auto'?'night':light==='night'?'day':'auto')}><ModeIcon size={14}/> {mode.label}</button>{!KIT&&<button aria-pressed={drawing} onClick={()=>setDrawing(!drawing)}><Pencil size={14}/>{drawing?'Terminar edición':'Dibujar recorrido'}</button>}<span className="badge green">{KIT?'SIMULACIÓN · TIEMPO REAL':'SIMULACIÓN · 20×'}</span></div></div>
 <div className="simulation-body"><svg className={drawing?'drawing-route':''} onClick={e=>{if(!drawing)return;const svg=e.currentTarget,matrix=svg.getScreenCTM();if(!matrix)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const local=p.matrixTransform(matrix.inverse());if(local.x<30||local.x>770||local.y<40||local.y>285)return;setPoints(ps=>[...ps,toLatLon(local.x,local.y)]);}} viewBox="0 0 800 330" role="img" aria-label={`Rover ${active?'en movimiento':'detenido'}, rumbo ${Math.round(t.heading)} grados`}>
  <defs>
   <radialGradient id="sim-scrub"><stop offset="0" stopColor="#707c47"/><stop offset=".7" stopColor="#4b5933"/><stop offset="1" stopColor="#34412a"/></radialGradient>
   <radialGradient id="sim-tree"><stop offset="0" stopColor="#72904f"/><stop offset=".65" stopColor="#4a6435"/><stop offset="1" stopColor="#2c4223"/></radialGradient>
   <radialGradient id="sim-cloud"><stop offset="0" stopColor="#0a1018" stopOpacity=".9"/><stop offset="1" stopColor="#0a1018" stopOpacity="0"/></radialGradient>
   <radialGradient id="sim-glow"><stop offset="0" stopColor="#ffd070" stopOpacity=".95"/><stop offset="1" stopColor="#ffd070" stopOpacity="0"/></radialGradient>
   <radialGradient id="sim-water"><stop offset="0" stopColor="#5b8f98"/><stop offset="1" stopColor="#2f5961"/></radialGradient>
   <linearGradient id="sim-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#fff6c4" stopOpacity=".9"/><stop offset="1" stopColor="#fff6c4" stopOpacity="0"/></linearGradient>
   <linearGradient id="sim-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3c5873"/><stop offset="1" stopColor="#15212e"/></linearGradient>
  </defs>
  <rect width="800" height="330" fill="#6f6c43"/>
  {ground&&<image href={ground} width="800" height="330" preserveAspectRatio="none"/>}
  <g fill="none" strokeLinejoin="round"><polygon points={TRACK_PTS} stroke="#4d3d29" strokeOpacity=".35" strokeWidth="23"/><polygon points={TRACK_PTS} stroke="#b39a74" strokeOpacity=".82" strokeWidth="18"/><polygon points={TRACK_PTS} stroke="#7a7346" strokeOpacity=".75" strokeWidth="5" strokeDasharray="16 3"/></g>
  <g fill="none"><path d={FENCE_D} stroke="#000" strokeOpacity={shadow.op*.8} strokeWidth="3" strokeDasharray="2 22" transform={`translate(${shadow.dx*4} ${shadow.dy*4})`}/><path d={FENCE_D} stroke="#d4d8c8" strokeOpacity=".3" strokeWidth=".8"/><path d={FENCE_D} stroke="#46382a" strokeWidth="3.4" strokeDasharray="2 22"/></g>
  {[[FENCE.x0,FENCE.y0],[FENCE.x1,FENCE.y0],[FENCE.x1,FENCE.y1],[FENCE.x0,FENCE.y1]].map(([px,py])=><rect key={px+'-'+py} x={px-2.5} y={py-2.5} width="5" height="5" fill="#46382a"/>)}
  <g transform={`translate(${HOUSE.x} ${HOUSE.y})`}><rect x="-19" y="-12" width="38" height="24" fill="#000" opacity={shadow.op} transform={`translate(${shadow.dx*7} ${shadow.dy*7})`}/><rect x="-18" y="-11" width="36" height="22" fill="#7a5744"/><rect x="-18" y="-11" width="18" height="22" fill="#6a4a3a"/><path d="M0 -11V11" stroke="#523a2e" strokeWidth="1"/><rect x="6" y="-4" width="5" height="8" fill="#2c3a36"/></g>
  <g transform="translate(160 220)"><rect x="-15" y="-15" width="30" height="30" rx="3" fill="#2c3832" opacity=".6" stroke="#8a9a8e" strokeOpacity=".4"/><path d="M-3-8L3-1H0L3 8L-3 1H0Z" fill="#d1f879" opacity=".5"/></g>
  {SCRUB.map((s,i)=><g key={i} transform={`translate(${s.x} ${s.y})`}><ellipse rx={s.r*1.05} ry={s.r*.9} fill="#000" opacity={shadow.op} transform={`translate(${shadow.dx*(s.tree?14:5)} ${shadow.dy*(s.tree?14:5)})`}/><circle r={s.r} fill={s.tree?'url(#sim-tree)':'url(#sim-scrub)'}/>{s.tree&&<><circle cx={-s.r*.3} cy={-s.r*.25} r={s.r*.5} fill="#8aa862" opacity=".3"/><circle cx={s.r*.35} cy={s.r*.2} r={s.r*.35} fill="#1f3319" opacity=".35"/></>}</g>)}
  <g transform={`translate(${TANK.x} ${TANK.y})`}><circle r="17" fill="#000" opacity={shadow.op} transform={`translate(${shadow.dx*2} ${shadow.dy*2})`}/><circle r="17" fill="#8c9490"/><circle r="14.5" fill="url(#sim-water)"/><circle r="14.5" fill="none" stroke="#a9d0d4" strokeOpacity=".5" className="tank-ripple"/></g>
  <g transform={`translate(${MILL.x} ${MILL.y})`}><line x2={shadow.dx*20} y2={shadow.dy*20} stroke="#000" strokeWidth="2.4" opacity={shadow.op} strokeLinecap="round"/><rect x="-5" y="-5" width="10" height="10" fill="none" stroke="#7c848a" strokeWidth="1.2"/><path d="M-5-5L5 5M5-5L-5 5" stroke="#7c848a" strokeWidth=".8"/>
   <g transform="translate(0 -9)"><path d={`M0 0L${wind.dx*22} ${wind.dy*22}`} stroke="#9aa3a8" strokeWidth="1.4"/><g className="windmill-rotor" style={{animationDuration:mill+'s',animationPlayState:env.windKmh<3?'paused':'running'}}>{Array.from({length:12},(_,i)=><rect key={i} x="-1.1" y="-12" width="2.2" height="8" fill="#d2d8d5" transform={`rotate(${i*30})`}/>)}<circle r="12.6" fill="none" stroke="#9aa3a8" strokeWidth=".6"/></g><circle r="2" fill="#5e676c"/></g></g>
  <g fill="none" stroke="#6a7a3b" strokeOpacity=".6" strokeLinecap="round"><path d="M95 120l-1-5m2 5l1-5M300 245l-1-5m2 5l1-5M520 190l-1-5m2 5l1-5M690 240l-1-5m2 5l1-5"/></g>
  {env.cloud>12&&<g className="cloud-shadows" opacity={Math.min(.5,.06+env.cloud/100*.36)} style={{'--dx':`${wind.dx*700}px`,'--dy':`${wind.dy*700}px`,animationDuration:cloudSec+'s'} as CSSProperties}><ellipse cx="330" cy="150" rx="230" ry="75" fill="url(#sim-cloud)"/><ellipse cx="560" cy="210" rx="160" ry="55" fill="url(#sim-cloud)"/><ellipse cx="190" cy="230" rx="130" ry="50" fill="url(#sim-cloud)"/></g>}
  {raining&&<rect width="800" height="330" fill="#0b130d" opacity={Math.min(.3,.06+env.rain*.08)}/>}
  <polyline points={offsetLine(trail.slice(-140),2.6)} fill="none" stroke="#4a3b27" strokeOpacity=".4" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  <polyline points={offsetLine(trail.slice(-140),-2.6)} fill="none" stroke="#4a3b27" strokeOpacity=".4" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  {snapshot.cattle?.map(c=><CowIcon key={c.id} cow={c} shadow={shadow}/>)}
  {active&&st!=='turning'&&!raining&&trail.slice(-6,-1).map((p,i,a)=>{const k=a.length-i;return <circle key={i} cx={p[0]+wind.dx*k*2.2} cy={p[1]+wind.dy*k*2.2} r={2.5+k*1.7} fill="#cdb98f" opacity={Math.max(0,.3-k*.05)}/>;})}
  <Frame x={x+shadow.dx*6} y={y+shadow.dy*6} h={heading}><rect x="-12" y="-14" width="24" height="28" rx="4" fill="#000" opacity={shadow.op}/></Frame>
  <Frame x={x} y={y} h={heading}>
   {[-1,1].flatMap(sx=>[-9,9].map(sy=><g key={sx+'-'+sy}><path d={`M${sx*8} ${sy}H${sx*11}`} stroke="#3d4642" strokeWidth="2"/><rect x={sx*11.5-3.2} y={sy-5.5} width="6.4" height="11" rx="2" fill="#0b0e0d"/><path className={active?'wheel-tread rolling':'wheel-tread'} d={`M${sx*11.5-2} ${sy-3}h4m-4 3h4m-4 3h4`} stroke="#8b9a86" strokeWidth=".8"/></g>))}
   <rect x="-8.5" y="-14" width="17" height="28" rx="4.5" fill="#27312d" stroke="#43514a" strokeWidth=".8"/><rect x="-8.5" y="-14" width="17" height="3.4" rx="1.7" fill="#d1f879"/><path d="M-8.5-9V12M8.5-9V12" stroke="#d1f879" strokeOpacity=".5" strokeWidth=".8"/>
   <rect x="-6.4" y="-8" width="12.8" height="16" rx="1.6" fill="url(#sim-panel)" stroke="#52708a" strokeWidth=".5"/><path d="M-6.4-2.7H6.4M-6.4 2.7H6.4M0-8V8" stroke="#6b8aa6" strokeOpacity=".5" strokeWidth=".4"/>
   <circle cy="5.5" r="2.8" fill="#e8ece9" stroke="#98a39d" strokeWidth=".5"/><circle cy="5.5" r="1" fill="#b9c2bd"/>
   <circle cy="-4.5" r="2" fill={acc.ptz?'#a3e6f8':'#6e7b76'} stroke="#1c2220" strokeWidth=".6"/>
   <rect x="-7" y="-14.7" width="3.2" height="1.6" rx=".6" fill={acc.lights?'#fffbd0':'#6b7168'}/><rect x="3.8" y="-14.7" width="3.2" height="1.6" rx=".6" fill={acc.lights?'#fffbd0':'#6b7168'}/>
   {acc.beacon&&<circle cy="1" r="1.8" fill="#ffb347"/>}
  </Frame>
  <rect width="800" height="330" fill="#071225" opacity={night*.74}/><rect width="800" height="330" fill="#ff8f3d" opacity={dusk*.16}/><rect width="800" height="330" fill="#2a323a" opacity={overcast*.2*(1-night)}/>
  {raining&&<g opacity={Math.min(.75,.25+env.rain/4*.5)}><path className="rain" style={{animationDuration:(.7-Math.min(.25,env.rain*.05))+'s'}} d={rainPath(Math.max(-.6,Math.min(.6,wind.dx*Math.min(1,wind.mps/10))))} stroke="#cfe0ec" strokeWidth=".9" strokeLinecap="round" fill="none"/></g>}
  {fog&&<rect width="800" height="330" fill="#cfd6d2" opacity=".3"/>}
  <polygon points={TRACK_PTS} fill="none" stroke="#d1f879" strokeOpacity={plan.length||drawing?0:.35} strokeWidth="1.4" strokeDasharray="7 9"/>
  <polyline points={trail.map(p=>p.join(',')).join(' ')} fill="none" stroke="#d1f879" strokeWidth="1.6" strokeOpacity=".5"/>
  <polyline points={plan.map(p=>p.join(',')).join(' ')} fill="none" stroke="#f6c875" strokeWidth="2.4" strokeDasharray="6 6"/>
  {plan.map((p,i)=><g key={i}><circle cx={p[0]} cy={p[1]} r="9" fill="#e8c06e" stroke="#13221a" strokeWidth="2"/><text x={p[0]} y={p[1]+3} textAnchor="middle" fontSize="9" fill="#152017" fontWeight="700">{i+1}</text></g>)}
  <Frame x={x} y={y} h={heading}>
   <path d="M0-12L-40-64A76 76 0 0 1 40-64Z" fill="#a0e6ff" fillOpacity=".05" stroke="#a0e6ff" strokeOpacity=".3" strokeWidth=".8" strokeDasharray="3 4"/>
   {acc.lights&&<g className="rover-lights" opacity={beam}><path d="M-6-14L-30-84H-2Z" fill="url(#sim-beam)"/><path d="M6-14L30-84H2Z" fill="url(#sim-beam)"/></g>}
   {acc.spotlight&&<path className="rover-spotlight" d="M0-14L-10-150H10Z" fill="url(#sim-beam)" opacity={.3+.7*night}/>}
   {acc.ptz&&<g className="ptz-sweep"><path d="M0-4L-34-62Q0-76 34-62Z" fill="#88d6ec" opacity=".2"/><path d="M0-4V-70" stroke="#88d6ec" strokeWidth=".8" strokeDasharray="3 4"/></g>}
   {acc.beacon&&<g className="rover-beacon"><circle cy="1" r="15" fill="url(#sim-glow)" opacity={.3+.6*night}/></g>}
   {acc.horn&&<g className="horn-waves" fill="none" stroke="#ffd378" strokeWidth="1.6"><circle r="24"/><circle r="34"/><circle r="44"/></g>}
  </Frame>
  {visible.map(c=>{const [cx,cy]=toXY(c.lat,c.lon),d=Math.hypot(cx-x,cy-y)/PX_PER_M,s=c.calf?10:15;return <g key={c.id} style={{...glide,transform:`translate(${cx}px,${cy}px)`}}><path d={`M${-s} ${-s+5}V${-s}H${-s+5}M${s-5} ${-s}H${s}V${-s+5}M${s} ${s-5}V${s}H${s-5}M${-s+5} ${s}H${-s}V${s-5}`} fill="none" stroke="#7fe3ff" strokeWidth="1.3"/><text y={-s-4} textAnchor="middle" fontSize="7.5" fill="#9eeaff" fontWeight="700">{c.calf?'TERNERO':'BOVINO'} · {d.toFixed(0)} m</text></g>;})}
  <g fontSize="10" fill="#e7efd6" fillOpacity=".8"><text x="48" y="28" letterSpacing="2" fillOpacity=".65">POTRERO NORTE / VISTA DE SIMULACIÓN</text><text x="160" y="258" textAnchor="middle">BASE</text><text x={MILL.x-20} y="66" textAnchor="middle">MOLINO Y BEBEDERO</text></g>
  <g style={{...glide,transform:`translate(${x}px,${y}px)`}}><text y="36" textAnchor="middle" fill="#e3f4c3" fontSize="9.5" fontWeight="700">GAUCHO SJ–01</text></g>
  <g fontSize="9" fill="#e7efd6" fillOpacity=".75" textAnchor="end" letterSpacing=".6"><text x="770" y="28">{clock} · {light==='auto'?phase:phase+' (forzado)'} · {env.live?`${Math.round(env.temp)} °C · VIENTO ${compass(env.windDir)} ${Math.round(env.windKmh)} km/h${raining?` · LLUVIA ${env.rain.toFixed(1)} mm/h`:''}${fog?' · NIEBLA':''}`:'CLIMA SIN DATOS'}</text></g>
 </svg>
 <div className="simulation-info"><span className="hero-kicker"><i className="dot"/>{kicker}</span><strong>{t.speed.toFixed(1)} <small>m/s</small></strong><p>{KIT?'Control manual contra el backend del kit, solo simulación. Mantené presionado para mover.':snapshot.mode==='autonomous'?'Recorre un circuito de demostración por el potrero.':'Usá W A S D o los controles de conducción.'}</p><div className="simulation-stats"><span>Rumbo <b>{Math.round(t.heading)}°</b></span><span>Batería <b>{t.battery.toFixed(1)}%</b></span>{!KIT&&<span>Consumo <b>{Math.round(t.power_w??0)} W</b></span>}</div>{!KIT&&<button className="hero-link" onClick={onToggle}>{active?<Pause size={15}/>:<Play size={15}/>} {active?'Pausar recorrido':'Iniciar recorrido'}</button>}<small>{KIT?'Tiempo real · posición y movimiento simulados por el backend del kit (coordenadas ficticias) · sol y clima reales':'Tiempo acelerado 20× · posición y movimiento simulados · sol y clima reales'}</small></div></div>
 {drawing&&<div className="route-editor"><span><strong>{points.length} puntos</strong> · Tocá el terreno para trazar la ruta</span><button disabled={!points.length} onClick={()=>setPoints(p=>p.slice(0,-1))}><Undo2 size={14}/>Deshacer</button><button disabled={!points.length} onClick={()=>setPoints([])}><X size={14}/>Limpiar</button><button className="hero-link" disabled={points.length<2||submitting||!snapshot.connected} onClick={async()=>{setSubmitting(true);try{await onRoute(points);setDrawing(false);}finally{setSubmitting(false);}}}><Play size={14}/>{submitting?'Preparando…':'Seguir recorrido'}</button></div>}
 <div className="terrain-accessories"><div className="terrain-accessory-title"><strong>Accesorios del rover</strong><small>{KIT?'PENDIENTE · el kit no tiene hardware de accesorios':'Activá un botón para ver su efecto en terreno'}</small></div><div className="terrain-accessory-buttons">{[['lights','Luces',Lightbulb],['spotlight','Buscahuellas',Lightbulb],['beacon','Baliza',Radio],['horn','Bocina',Volume2],['ptz','Cámara PTZ',Camera]].map(([name,label,Icon])=>{const I=Icon as typeof Lightbulb;const on=Boolean(acc[String(name)]);return <button type="button" key={String(name)} aria-pressed={on} disabled={!snapshot.connected||KIT} className={'terrain-accessory '+(on?'enabled':'')} onClick={()=>onAccessory(String(name))}><I size={18}/><span>{String(label)}</span><b>{KIT?'PEND.':on?'ON':'OFF'}</b></button>;})}</div></div></section>;
}
