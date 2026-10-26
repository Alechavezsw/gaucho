import { defineConfig } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([{ignores:["**/.next/**","**/.venv/**","GAUCHO_Rover_Starter_v0.1/**","next-env.d.ts"]},...next,...ts]);
