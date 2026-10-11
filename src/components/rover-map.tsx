"use client";
import {useEffect,useRef} from 'react';
import L from 'leaflet';
import type {Snapshot} from '@/lib/types';
export default function RoverMap({snapshot,waypoints,center,onAdd}:{snapshot:Snapshot;waypoints:[number,number][];center:number;onAdd:(p:[number,number])=>void}){
 const container=useRef<HTMLDivElement>(null);const mapRef=useRef<L.Map|null>(null);const layersRef=useRef<L.LayerGroup|null>(null);const addRef=useRef(onAdd);const positionRef=useRef<[number,number]>([snapshot.telemetry.lat,snapshot.telemetry.lon]);
 useEffect(()=>{addRef.current=onAdd;positionRef.current=[snapshot.telemetry.lat,snapshot.telemetry.lon];},[onAdd,snapshot]);
 useEffect(()=>{if(!container.current)return;const map=L.map(container.current).setView(positionRef.current,16);mapRef.current=map;L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);layersRef.current=L.layerGroup().addTo(map);map.on('click',(e:L.LeafletMouseEvent)=>addRef.current([e.latlng.lat,e.latlng.lng]));const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(container.current);return()=>{observer.disconnect();map.remove();mapRef.current=null;layersRef.current=null;};},[]);
 useEffect(()=>{const layers=layersRef.current;if(!layers)return;layers.clearLayers();const t=snapshot.telemetry;const icon=L.divIcon({className:'rover-marker',html:`<span style="transform:rotate(${t.heading}deg)">▲</span>`,iconSize:[30,30]});L.marker([t.lat,t.lon],{icon}).bindPopup('GAUCHO · posición simulada').addTo(layers);L.polyline(snapshot.trail,{color:'#d1f879'}).addTo(layers);for(const p of snapshot.pois)L.circleMarker([p.lat,p.lon],{radius:6,color:'#efb65b',fillOpacity:.8}).bindPopup(p.name+' · ficticio').addTo(layers);waypoints.forEach((p,i)=>L.circleMarker(p,{radius:6,color:'#efb65b'}).bindPopup('Waypoint '+(i+1)).addTo(layers));L.polyline(waypoints,{color:'#efb65b',dashArray:'6 6'}).addTo(layers);},[snapshot,waypoints]);
 useEffect(()=>{mapRef.current?.setView(positionRef.current,mapRef.current.getZoom());},[center]);
 return <div ref={container} className="map" aria-label="Mapa de operaciones de Gaucho"/>;
}
