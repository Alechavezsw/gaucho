import {demoRequest} from './demo';
import {kitRequest} from './kit';
import {create} from 'zustand';
import type {Snapshot} from './types';
export const KIT = process.env.NEXT_PUBLIC_ROVER_MODE === 'kit';
export const DEMO = !process.env.NEXT_PUBLIC_API_URL && !KIT;
export const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
export const useRover = create<{snapshot:Snapshot|null;online:boolean;set:(snapshot:Snapshot|null,online:boolean)=>void}>((set)=>({snapshot:null,online:false,set:(snapshot,online)=>set({snapshot,online})}));
export async function request<T>(path:string,method='GET',body?:unknown):Promise<T>{
 if(KIT)return kitRequest<T>(path,method,body);
 if(DEMO)return demoRequest<T>(path,method,body);
 const response = await fetch(API+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok){ const error = await response.json(); throw new Error(error.detail || 'Error de API'); }
 return response.json();
}

