"use client";
import {useKit} from '@/lib/kit';
const tone=(status:string)=>status==='SIMULADO'?'#d1f879':status==='PENDIENTE'?'#e9bb7c':'#8a9b94';
export function KitModules(){
 const modules=useKit(s=>s.modules);
 return <div className="kit-modules" aria-label="Módulos del kit"><small>MÓDULOS DEL KIT</small>{modules.length?modules.map(m=><span key={m.name}><i style={{background:tone(m.status)}}/>{m.name}<b>{m.status}</b></span>):<span>Sin datos del backend</span>}</div>;
}
