export type Telemetry = { timestamp:string; battery:number; voltage:number; speed:number; system_temperature:number; tilt:number; lat:number; lon:number; heading:number; gps:string; satellites:number; latency:number; ambient_temperature:number; humidity:number; obstacle_distance:number };
export type Snapshot = { plannedRoute?:[number,number][]; routeFinished?:boolean; simulated:boolean; connected:boolean; mode:'manual'|'autonomous'; rover:string; starlink:string; telemetry:Telemetry; trail:[number,number][]; pois:{name:string;lat:number;lon:number}[]; accessories:Record<string,boolean> };
export type Camera = { id:string; name:string; connected:boolean; simulated:boolean };
export type Detection = { id:string;category:string;timestamp:string;camera:string;confidence:number;location:{lat:number;lon:number};image_url:string;status:string;simulated:boolean };
export type Alert = { id:string;category:string;description:string;severity:string;timestamp:string;read:boolean };
export type Mission = { id:string;name:string;description:string;status:string;created_at:string;duration:number;progress:number;waypoints:{lat:number;lon:number}[] };
