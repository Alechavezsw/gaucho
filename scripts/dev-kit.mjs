// Starts the dashboard against the GAUCHO Rover Starter backend (simulation only).
// Binds to 127.0.0.1: the proxy to the rover API must not be reachable from other machines.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const next=createRequire(import.meta.url).resolve('next/dist/bin/next');
const child=spawn(process.execPath,[next,'dev','--hostname','127.0.0.1',...process.argv.slice(2)],{cwd:root,stdio:'inherit',env:{...process.env,NEXT_PUBLIC_ROVER_MODE:'kit',ROVER_API_TARGET:process.env.ROVER_API_TARGET??'http://127.0.0.1:8000'}});
child.on('exit',code=>process.exit(code??0));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
