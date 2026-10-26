import type {NextConfig} from 'next';

// Kit mode (NEXT_PUBLIC_ROVER_MODE=kit) proxies /api/rover/* to the GAUCHO Rover Starter backend, which is SIMULATION ONLY.
// Control APIs must never be reachable from the Internet, so this fails closed: private targets only, never on Vercel.
const kit=process.env.NEXT_PUBLIC_ROVER_MODE==='kit';
const target=(process.env.ROVER_API_TARGET??'http://127.0.0.1:8000').replace(/\/+$/,'');
const PRIVATE_HOST=/^(localhost|\[::1\]|127(\.\d{1,3}){3}|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|[a-z0-9-]+\.local)$/i;

function kitTarget(){
 if(process.env.VERCEL)throw new Error('El modo kit controla un backend de rover y no puede desplegarse en Vercel. Usá node scripts/dev-kit.mjs en una red local controlada.');
 let url:URL;
 try{url=new URL(target);}catch{throw new Error(`ROVER_API_TARGET no es una URL válida: ${target}`);}
 if(url.protocol!=='http:'&&url.protocol!=='https:')throw new Error('ROVER_API_TARGET debe ser http(s).');
 if(!PRIVATE_HOST.test(url.hostname))throw new Error(`ROVER_API_TARGET (${url.hostname}) no es una dirección privada. El API de control solo puede apuntar a localhost o a la LAN.`);
 return url.origin;
}

const nextConfig:NextConfig={
 async rewrites(){
  if(!kit)return [];
  return [{source:'/api/rover/:path*',destination:`${kitTarget()}/api/v1/:path*`}];
 },
};
export default nextConfig;
