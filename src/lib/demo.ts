import type {Snapshot,Camera,Detection,Alert,Mission} from './types';
import {DEFAULT_ROUTE,ORIGIN,PADDOCK,bearing,daylight,fromMeters,getEnvironment,initCattle,mulberry32,stepCattle,sunPosition,toMeters,turnToward,wrap180} from './world';
const now=()=>new Date().toISOString();
export const demoSnapshot:Snapshot={simulated:true,connected:true,mode:'autonomous',rover:'GAUCHO · SJ-01',starlink:'Online',telemetry:{timestamp:now(),battery:94.2,voltage:25.1,speed:.8,system_temperature:46.2,tilt:2.1,lat:-32.331970,lon:-67.271270,heading:45,gps:'3D FIX',satellites:14,latency:42,ambient_temperature:27.4,humidity:36,obstacle_distance:12.8},trail:[[-32.332370,-67.271670],[-32.332170,-67.271470],[-32.331970,-67.271270]],pois:[{name:'Base / puesto',lat:-32.332370,lon:-67.271670},{name:'Represa norte',lat:-32.329970,lon:-67.270270},{name:'Corral 01',lat:-32.332970,lon:-67.273270}],accessories:{lights:true,spotlight:false,beacon:true,horn:false,ptz:false}};
const cameras:Camera[]=['Frontal','Trasera','Lateral izquierda','Panorámica'].map((name,i)=>({id:String(i),name,connected:true,simulated:true}));
const detections:Detection[]=['Rodeo identificado','Bovino junto al alambrado','Bebedero identificado','Grupo de 8 animales','Bovino en pastoreo'].map((category,i)=>({id:'d'+i,category,timestamp:new Date(Date.now()-i*55000).toISOString(),camera:String(i%4),confidence:.97-i*.015,location:{lat:-32.331970+i*.0001,lon:-67.271270},image_url:'/demo-camera.svg',status:'Registrado · demo',simulated:true}));
const alerts:Alert[]=['Recorrido de vigilancia iniciado','8 bovinos identificados en sector norte','Enlace de comunicación estable','Revisar bebedero del corral 01'].map((description,i)=>({id:'a'+i,category:i===3?'detection':'mission',description,severity:i===3?'warning':'info',timestamp:new Date(Date.now()-i*70000).toISOString(),read:false}));
const missions:Mission[]=['Vigilancia del sector norte','Inspección de bebederos','Recorrido de alambrados'].map((name,i)=>({id:'m'+i,name,description:['Supervisión del rodeo y recorrido del potrero norte.','Verificación del acceso a agua en dos puntos.','Inspección del perímetro este del establecimiento.'][i],status:i===0?'running':i===1?'completed':'pending',created_at:now(),duration:i===0?146:320,progress:i===0?37:i===1?100:0,waypoints:[{lat:-32.329970,lon:-67.270270},{lat:-32.331970,lon:-67.271270}]}));
const RAD=Math.PI/180,TICK_S=20,CAPACITY_WH=4800;
const rnd=mulberry32(20261025);const cows=initCattle();
let tick=0;let action='forward';let speed=.8;
let route:[number,number][]=DEFAULT_ROUTE.map(p=>[p[0],p[1]] as [number,number]);
let target=1;let customRoute=false;
const start=toMeters(route[0][0],route[0][1]);
const body={e:start.e,n:start.n,heading:90,vel:0};
let energy=CAPACITY_WH*.942,sysTemp=46.2,ambient=27.4,power=150,spike=0;const gpsErr={e:0,n:0};
const seen:Record<string,number>={},fired:Record<string,number>={};
demoSnapshot.telemetry.lat=route[0][0];demoSnapshot.telemetry.lon=route[0][1];demoSnapshot.telemetry.heading=90;demoSnapshot.trail=[route[0]];
function raise(key:string,category:string,description:string,severity:'info'|'warning',cooldown:number){
 if(tick-(fired[key]??-1e9)<cooldown)return;fired[key]=tick;
 alerts.unshift({id:'a-live-'+tick+'-'+key,category,description,severity,timestamp:now(),read:false});alerts.splice(30);}
export function advanceDemo(){
 tick++;const t=demoSnapshot.telemetry,env=getEnvironment(),acc=demoSnapshot.accessories;
 const day=daylight(sunPosition(new Date(),ORIGIN.lat,ORIGIN.lon).elevation);
 t.timestamp=now();
 const active=demoSnapshot.connected&&(demoSnapshot.mode==='autonomous'?missions.some(m=>m.status==='running'):action!=='stop');
 const rel=cows.map(c=>{const de=c.e-body.e,dn=c.n-body.n;return {c,d:Math.hypot(de,dn),b:wrap180(bearing(de,dn)-body.heading)};});
 const ahead=rel.filter(r=>Math.abs(r.b)<=22&&r.d<=20).reduce((m,r)=>Math.min(m,r.d-1.2),20);
 let status:NonNullable<Snapshot['status']>=active?'driving':'stopped';
 let desired=0,dir=1,pivot=0,remaining=0,goal={e:body.e,n:body.n};
 if(active){
  if(demoSnapshot.mode==='autonomous'){
   const g=toMeters(route[target][0],route[target][1]);goal=g;remaining=Math.hypot(g.e-body.e,g.n-body.n);
   const want=bearing(g.e-body.e,g.n-body.n),dh=wrap180(want-body.heading);
   if(Math.abs(dh)>25)pivot=Math.max(-90,Math.min(90,dh));else{body.heading=turnToward(body.heading,want,12);desired=speed;}
  }else if(action==='left'||action==='right')pivot=action==='left'?-20:20;
  else{desired=speed;dir=action==='backward'?-1:1;}
 }
 if(dir>0&&desired>0&&ahead<8){desired*=Math.max(0,(ahead-2)/6);status='yielding';if(ahead<6)raise('animal','mission','Animal en la trayectoria: velocidad reducida','warning',60);}
 if(pivot){body.heading=(body.heading+pivot+360)%360;body.vel=0;status='turning';}
 else if(!active)body.vel=0;
 else{body.vel+=(desired-body.vel)*.6;if(desired===0&&body.vel<.03)body.vel=0;}
 const move=body.vel*TICK_S;
 if(move>0){
  if(demoSnapshot.mode==='autonomous'){
   const k=Math.min(1,move/Math.max(remaining,.001));body.e+=(goal.e-body.e)*k;body.n+=(goal.n-body.n)*k;
   if(remaining<=move){body.vel*=.4;if(customRoute&&target===route.length-1){demoSnapshot.routeFinished=true;body.vel=0;action='stop';status='done';missions.filter(m=>m.status==='running').forEach(m=>{m.status='completed';m.progress=100;});raise('done','mission','Recorrido completado','info',30);}else target=(target+1)%route.length;}
  }else{body.e+=Math.sin(body.heading*RAD)*move*dir;body.n+=Math.cos(body.heading*RAD)*move*dir;}
  const out=body.e<PADDOCK.e0||body.e>PADDOCK.e1||body.n<PADDOCK.n0||body.n>PADDOCK.n1;
  if(out){body.e=Math.max(PADDOCK.e0,Math.min(PADDOCK.e1,body.e));body.n=Math.max(PADDOCK.n0,Math.min(PADDOCK.n1,body.n));body.vel=0;status='yielding';raise('fence','mission','Alambrado perimetral: maniobra detenida','warning',45);}
 }
 if(demoSnapshot.routeFinished&&!active)status='done';
 const load=body.vel/.8;
 t.speed=body.vel>0?Math.max(0,body.vel+(rnd()-.5)*.04):0;
 t.heading=(body.heading+(rnd()-.5)*1.6+360)%360;
 gpsErr.e=gpsErr.e*.7+(rnd()-.5)*.5;gpsErr.n=gpsErr.n*.7+(rnd()-.5)*.5;
 [t.lat,t.lon]=fromMeters(body.e+gpsErr.e,body.n+gpsErr.n);
 t.satellites=13+Math.round(1.5*Math.sin(tick/9)+(rnd()-.5)*1.2);t.gps=t.satellites>=9?'3D FIX':'2D FIX';
 power=62+88*load+(status==='turning'?60:0)+(acc.lights?18:0)+(acc.spotlight?60:0)+(acc.beacon?6:0)+(acc.ptz?14:0)+(acc.horn?25:0)+(rnd()-.5)*8;
 energy=Math.max(CAPACITY_WH*.05,energy-power*TICK_S/3600);
 t.battery=energy/CAPACITY_WH*100;t.power_w=power;t.runtime_h=energy/power;
 t.voltage=22.4+.03*t.battery-power/25*.03+(rnd()-.5)*.06;
 const sunLoad=day*(1-Math.min(1,env.cloud/100)*.7);
 ambient+=(env.temp+1.2*sunLoad-ambient)*.35;t.ambient_temperature=ambient+(rnd()-.5)*.2;
 t.humidity=Math.max(5,Math.min(100,env.humidity+(rnd()-.5)*.8));
 sysTemp+=(ambient+17+9*Math.min(1.5,load)+(acc.spotlight?4:0)+4*sunLoad-sysTemp)*.1;t.system_temperature=sysTemp+(rnd()-.5)*.2;
 t.tilt=Math.min(9,1.6+2.4*Math.abs(Math.sin(body.e/23)*Math.cos(body.n/17))+(body.vel>0?(rnd()-.5)*.6:0));
 if(spike>0)spike--;else if(rnd()<.02)spike=1+Math.floor(rnd()*2);
 t.latency=Math.round(41+5*Math.sin(tick/4)+(rnd()-.5)*8+(spike?70+rnd()*150:0));
 if(t.latency>150)raise('latency','connection',`Latencia alta en el enlace Starlink (${t.latency} ms)`,'warning',120);
 t.obstacle_distance=ahead>=20?20:Math.max(0,ahead+(rnd()-.5)*.1);
 if(t.battery<30)raise('battery','battery','Batería por debajo del 30%','warning',600);
 const inView=rel.filter(r=>Math.abs(r.b)<=32&&r.d<=45&&(day>.25||acc.lights||acc.spotlight||r.d<=18));
 const fresh=inView.filter(r=>tick-(seen[r.c.id]??-1e9)>=50);
 if(fresh.length){
  fresh.forEach(r=>seen[r.c.id]=tick);const near=fresh.reduce((a,b)=>a.d<b.d?a:b),group=inView.length>=3;
  const penalty=(1-day)*((acc.lights||acc.spotlight||acc.ptz)?.04:.12)+Math.min(.1,env.rain*.03);
  const [lat,lon]=fromMeters(near.c.e,near.c.n);
  detections.unshift({id:'d-live-'+tick,category:group?`Grupo de ${inView.length} animales`:near.c.calf?'Ternero identificado':'Bovino identificado',timestamp:now(),camera:'0',confidence:Math.max(.55,Math.min(.99,.985-near.d*.0045-penalty+(rnd()-.5)*.02)),location:{lat,lon},image_url:'/demo-camera.svg',status:'Registrado · demo',simulated:true});detections.splice(20);
  if(group)raise('herd','detection',`${inView.length} bovinos identificados cerca del recorrido`,'info',90);
 }
 if(body.vel>0){
  demoSnapshot.trail=[...demoSnapshot.trail.slice(-250),[t.lat,t.lon]];
  missions.filter(m=>m.status==='running').forEach(m=>{m.duration+=TICK_S;m.progress=customRoute?Math.min(99,100*target/route.length):(m.progress+.8)%100;});
 }
 stepCattle(cows,body,rnd);
 demoSnapshot.status=status;demoSnapshot.visible=inView.map(r=>r.c.id);
 demoSnapshot.cattle=cows.map(c=>{const [lat,lon]=fromMeters(c.e,c.n);return {id:c.id,lat,lon,heading:c.heading,state:c.state,calf:c.calf,coat:c.coat};});
 return structuredClone(demoSnapshot);}
export async function demoRequest<T>(path:string,method='GET',body?:unknown):Promise<T>{const b=(body||{}) as Record<string,unknown>;if(method==='GET'){const data:Record<string,unknown>={'/api/cameras':cameras,'/api/detections':detections,'/api/alerts':alerts,'/api/missions':missions};if(!(path in data))throw new Error('Recurso de demo no disponible');return structuredClone(data[path]) as T;}if(path==='/api/demo/route'){const points=b.points as [number,number][];if(!Array.isArray(points)||points.length<2||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new Error('Choisir au moins deux points');route=points.map(p=>[p[0],p[1]]);customRoute=true;target=0;demoSnapshot.plannedRoute=structuredClone(route);demoSnapshot.routeFinished=false;demoSnapshot.mode='autonomous';missions.filter(m=>m.status==='running').forEach(m=>m.status='paused');missions[0].status='running';missions[0].progress=0;missions[0].waypoints=route.map(([lat,lon])=>({lat,lon}));action='forward';}else if(path==='/api/demo/running'){if(b.running){if(demoSnapshot.routeFinished){target=0;demoSnapshot.routeFinished=false;}demoSnapshot.mode='autonomous';demoSnapshot.connected=true;missions[0].status='running';action='forward';}else{action='stop';demoSnapshot.telemetry.speed=0;missions.filter(m=>m.status==='running').forEach(m=>m.status='paused');}}else if(path==='/api/controls/movement'){action=String(b.action);speed=Number(b.speed??.8);if(action==='stop'){demoSnapshot.telemetry.speed=0;missions.filter(m=>m.status==='running').forEach(m=>m.status='paused');}}else if(path==='/api/controls/mode'){demoSnapshot.mode=b.mode as Snapshot['mode'];}else if(path==='/api/controls/accessory'){demoSnapshot.accessories[String(b.name)]=Boolean(b.enabled);}else if(path==='/api/system/connection'){demoSnapshot.connected=Boolean(b.connected);}else if(path.endsWith('/start')){missions.filter(m=>m.status==='running').forEach(m=>m.status='paused');const m=missions.find(m=>path.includes('/'+m.id+'/'));if(m){m.status='running';m.progress=0;demoSnapshot.mode='autonomous';action='forward';}}else if(path.endsWith('/read')){const a=alerts.find(a=>path.includes('/'+a.id+'/'));if(a)a.read=true;}else if(path==='/api/missions'){missions.push({id:'m'+Date.now(),name:String(b.name),description:String(b.description),waypoints:b.waypoints as Mission['waypoints'],status:'pending',progress:0,duration:0,created_at:now()});}return {ok:true} as T;}

