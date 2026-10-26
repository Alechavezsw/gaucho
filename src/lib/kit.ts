import {create} from 'zustand';
import type {Alert,Snapshot} from './types';
import {fromMeters} from './world';
// Adapter for the GAUCHO Rover Starter backend (SIMULATION ONLY, never hardware).
// The browser only talks to this origin: /api/rover/* is rewritten by next.config.ts to <ROVER_API_TARGET>/api/v1/*.
export type KitModule={name:string;status:string};
export type KitEvent={kind:string;message:string;time:string};
export type KitStatus={name:string;mode:string;position:{lat:number;lon:number};heading:number;speed_kmh:number;battery_pct:number;drive:'forward'|'backward'|'left'|'right'|'stop';drive_power:number;estop_latched:boolean;watchdog_ok:boolean;link:string;gps_fix:boolean;modules:KitModule[];events:KitEvent[];uptime_s:number};
const BASE='/api/rover',TIMEOUT_MS=1500,POLL_MS=500,KIT_MAX_MS=5/3.6,M=111320;
export const useKit=create<{modules:KitModule[]}>(()=>({modules:[]}));
let anchor:{lat:number;lon:number}|null=null;
let trail:[number,number][]=[],lastEN:[number,number]|null=null,events:KitEvent[]=[],rtt=0;
let listener:((s:Snapshot)=>void)|null=null;
const read=new Set<string>();
async function kitFetch<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),TIMEOUT_MS);
 try{
  const r=await fetch(`${BASE}/${path}`,{method,cache:'no-store',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:ctl.signal});
  if(!r.ok){const d=await r.json().catch(()=>null) as {detail?:unknown}|null;throw new Error(typeof d?.detail==='string'?d.detail:r.status>=500?'Sin respuesta del backend del kit.':`API ${r.status}`);}
  return await r.json() as T;
 }finally{clearTimeout(timer);}
}
// The kit's coordinates are fictitious: only the displacement from the first reading is kept and replayed around the base.
function toSnapshot(st:KitStatus):Snapshot{
 anchor??={lat:st.position.lat,lon:st.position.lon};
 const e=(st.position.lon-anchor.lon)*M*Math.cos(anchor.lat*Math.PI/180),n=(st.position.lat-anchor.lat)*M,[lat,lon]=fromMeters(e,n);
 if(!lastEN||Math.hypot(e-lastEN[0],n-lastEN[1])>.25){trail=[...trail.slice(-249),[lat,lon]];lastEN=[e,n];}
 events=st.events;useKit.setState({modules:st.modules});
 const driving=st.drive==='forward'||st.drive==='backward';
 return {simulated:true,connected:true,mode:'manual',rover:st.name,starlink:'PENDIENTE',physical_commands_enabled:false,emergency_stopped:st.estop_latched,watchdog_expired:!st.watchdog_ok,sequence:st.uptime_s,
  status:st.estop_latched||st.drive==='stop'?'stopped':driving?'driving':'turning',
  telemetry:{timestamp:new Date().toISOString(),battery:st.battery_pct,voltage:NaN,speed:Math.abs(st.speed_kmh)/3.6,system_temperature:NaN,tilt:NaN,lat,lon,heading:st.heading,gps:st.gps_fix?'SIMULADO':'SIN FIX',satellites:NaN,latency:rtt,ambient_temperature:NaN,humidity:NaN,obstacle_distance:NaN},
  trail,pois:[],accessories:{}};
}
const hash=(s:string)=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7).toString(36);
function eventAlerts():Alert[]{
 return events.map(ev=>{const [h,m,s]=ev.time.split(':').map(Number),at=new Date();at.setHours(h||0,m||0,s||0,0);const id='k'+ev.time.replace(/:/g,'')+hash(ev.kind+ev.message);
  return {id,category:ev.kind.toLowerCase(),description:ev.message,severity:ev.kind==='EMERGENCIA'||ev.kind==='SEGURIDAD'?'warning':'info',timestamp:at.toISOString(),read:read.has(id)};});
}
async function post(path:string,body?:unknown){const st=await kitFetch<KitStatus>(path,'POST',body);listener?.(toSnapshot(st));return {ok:true};}
const pending=(what:string)=>new Error(`${what} PENDIENTE: el backend del kit todavía no lo implementa.`);
export async function kitRequest<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const b=(body||{}) as Record<string,unknown>;
 if(method==='GET'){
  if(path==='/api/alerts')return eventAlerts() as T;
  if(path==='/api/cameras'||path==='/api/detections'||path==='/api/missions')return [] as T;
  throw new Error('Recurso no disponible en el backend del kit');
 }
 if(path==='/api/controls/movement'){
  const direction=(['forward','backward','left','right','stop'] as const).find(d=>d===b.action);
  if(!direction)throw new Error('Acción de conducción inválida');
  const power=direction==='stop'?0:Math.max(0,Math.min(100,Math.round(Number(b.speed??.8)/KIT_MAX_MS*100)));
  return await post('drive',{direction,power}) as T;
 }
 if(path==='/api/controls/emergency-stop')return await post('emergency-stop') as T;
 if(path==='/api/controls/emergency-reset')return await post('emergency-reset') as T;
 if(path==='/api/controls/mode'){if(b.mode==='manual')return {ok:true} as T;throw pending('Modo autónomo');}
 if(path==='/api/controls/accessory')throw pending('Accesorios');
 if(method==='PATCH'){const id=/^\/api\/alerts\/([^/]+)\/read$/.exec(path)?.[1];if(id){read.add(id);return {ok:true} as T;}}
 if(path.startsWith('/api/missions'))throw pending('Misiones');
 throw new Error('Operación no disponible en el backend del kit');
}
export function startKit(emit:(snapshot:Snapshot|null,online:boolean)=>void){
 let stopped=false,timer:ReturnType<typeof setTimeout>,last:Snapshot|null=null;
 listener=s=>{last=s;emit(s,true);};
 const poll=async()=>{
  const t0=performance.now();
  try{const st=await kitFetch<KitStatus>('status');rtt=Math.round(performance.now()-t0);last=toSnapshot(st);emit(last,true);}
  catch{emit(last?{...last,connected:false}:null,false);}
  if(!stopped)timer=setTimeout(poll,POLL_MS);
 };
 void poll();
 return()=>{stopped=true;clearTimeout(timer);listener=null;};
}
