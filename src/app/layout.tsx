import './globals.css';
import 'leaflet/dist/leaflet.css';
import {Providers} from '@/components/providers';
export const metadata={title:'Gaucho · Tu campo, bajo control',description:'Centro de Operaciones Ganaderas · Simulador'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body><Providers>{children}</Providers></body></html>;}

