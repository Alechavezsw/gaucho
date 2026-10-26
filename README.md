# GAUCHO — simulación en Windows

El proyecto activo usa `src/` (Next.js) y `services/api/` (FastAPI).
`GAUCHO_Rover_Starter_v0.1/gaucho-rover/` conserva el prototipo original con
su README, plan y endpoints `/api/v1/*`; no es el dashboard ejecutado desde esta raíz.
Los motores físicos siguen deshabilitados. No hay implementación de actuadores.

## Arranque con Python conectado

Desde esta carpeta, en PowerShell (Node >=20.9 y Python >=3.11):

```powershell
py -m venv services/api/.venv
.\services\api\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt
.\services\api\.venv\Scripts\python.exe -m pytest -q
$env:GAUCHO_MODE='simulation'
.\services\api\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000
```

Si ya existe `.venv`, omitir su creación. Si `py` no está instalado pero `python`
sí, usar `python -m venv ...`. No hace falta activar el entorno ni cambiar la
política de ejecución de PowerShell.

En una segunda terminal, también desde la raíz:

```powershell
npm ci
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8000'
npm run dev
```

Abrir <http://127.0.0.1:3000/dashboard>. Debe mostrar **ENLACE ACTIVO** y
**Origen: API Python · simulada**. API: <http://127.0.0.1:8000/docs>.
Salud: <http://127.0.0.1:8000/api/system/health>, con
`physical_commands_enabled: false`.

Sin `NEXT_PUBLIC_API_URL`, se usa la demo local del navegador, con terreno y
ganado; no se prueba Python. La vista 3D pertenece a esa demo local. La API
Python ofrece mapa GPS, misiones, cámaras SVG sintéticas y telemetría propia.
La variable pública se fija al compilar: cambiarla requiere reiniciar desarrollo
o volver a compilar producción.

## Prueba manual

1. Elegir Manual y hacer clic en un área no editable de la página. Mantener W
   o flecha arriba: cambia la posición y aparece velocidad. Soltar: se detiene.
2. A/D o izquierda/derecha giran; S o abajo retroceden. Con W y D presionadas,
   manda la última tecla; al soltar D vuelve W. Soltar ambas detiene.
3. Espacio o Escape detienen. Cambiar de pestaña, perder foco o enfocar un campo
   editable también libera el control. Los atajos no escriben órdenes desde formularios.
4. Pulsar **PARADA ENCLAVADA · SIMULADA**: velocidad cero y controles bloqueados.
   **Rearmar simulador** desbloquea sin iniciar movimiento.
5. En Configuración, simular pérdida de enlace: controles deshabilitados y hora
   de telemetría congelada. Restablecer no debe reanudar movimiento.
6. Detener Python con Ctrl+C: el dashboard pierde conexión. Reiniciarlo: reconecta
   automáticamente. Para probar watchdog independientemente del teclado, enviar
   una sola orden desde `/docs`: queda detenida sin renovaciones.

El watchdog Python vence a los 650 ms y se revisa cada 50 ms (aproximadamente
700 ms, sujeto al planificador del sistema operativo). La UI renueva cada 200 ms;
la telemetría se publica cada segundo. La demo local revisa su watchdog al avanzar
cada segundo y puede pausarse en segundo plano: no tiene garantías de tiempo real.
La parada es exclusivamente simulada.

## Verificación de compilación

```powershell
npm run lint
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8000'
npm run build
npm run start
```

Se usa Webpack explícitamente: Turbopack falló al iniciar el proceso de PostCSS
en el entorno Windows de verificación. TypeScript permanece habilitado.
El servidor escucha sólo en loopback. Si se cambia el puerto web, configurar
`CORS_ORIGINS` en Python con ese origen exacto antes de arrancarlo.

Resultados y continuidad: [docs/PLAN.md](docs/PLAN.md).
