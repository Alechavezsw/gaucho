# Conectar el dashboard al backend del kit (solo simulación)

El modo **kit** hace que este dashboard hable con el backend de `GAUCHO_Rover_Starter_v0.1`
(`/api/v1/status`, `/drive`, `/emergency-stop`, `/emergency-reset`). Es **simulación pura**:
el backend del kit rechaza `GAUCHO_MODE` distinto de `simulation` y no toca motores, GPIO ni relés.

Los tres modos del dashboard son excluyentes y se fijan al compilar:

| Modo | Cómo se activa | Datos |
|---|---|---|
| Demo local | sin variables | simulador del navegador (`src/lib/demo.ts`) |
| API Python propia | `NEXT_PUBLIC_API_URL` | `services/api` |
| **Kit** | `NEXT_PUBLIC_ROVER_MODE=kit` | backend del kit (este documento) |

## Arranque en Windows (PowerShell)

Terminal 1, backend del kit. Si el puerto 8000 lo usa `services/api`, usá otro (acá 8010):

```powershell
cd GAUCHO_Rover_Starter_v0.1\gaucho-rover\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
$env:GAUCHO_MODE='simulation'
.\.venv\Scripts\python.exe -m uvicorn rover.main:app --host 127.0.0.1 --port 8010
```

Terminal 2, desde la raíz del repo:

```powershell
$env:ROVER_API_TARGET='http://127.0.0.1:8010'
node scripts/dev-kit.mjs
```

Abrir <http://127.0.0.1:3000/dashboard>. Arriba debe decir **SIMULACIÓN · BACKEND DEL KIT**.
Sin `ROVER_API_TARGET` se usa `http://127.0.0.1:8000`. Argumentos extra pasan a `next dev`
(por ejemplo `--port 3002`).

## Cómo se conecta

- El navegador **solo habla con su propio origen**: `/api/rover/*` se reescribe en `next.config.ts`
  hacia `<ROVER_API_TARGET>/api/v1/*`. Nunca se llama al backend desde el navegador.
- `src/lib/kit.ts` traduce el contrato del kit a lo que ya usa el dashboard (`/api/controls/*`).
  Consulta `/status` cada 500 ms y mide la latencia real de esa consulta.
- Mantener una tecla o un botón renueva la orden cada 200–400 ms; el watchdog del backend
  la vence a los 700 ms. Soltar, perder el foco, cambiar de pestaña o perder el enlace detiene.
- **Parada enclavada**: bloquea todo movimiento (el backend responde 423) hasta pulsar
  *Rearmar simulador*. En el rover físico el rearme será solo físico.

## Reglas de seguridad que aplica

1. **Red privada obligatoria.** `next.config.ts` rechaza un `ROVER_API_TARGET` que no sea
   `localhost`, `127.x`, `10.x`, `172.16–31.x`, `192.168.x` o `*.local`, y rechaza el modo kit
   en Vercel (falla el build). El API de control nunca debe quedar en Internet.
2. **Dashboard solo local.** `dev-kit.mjs` escucha en `127.0.0.1`. No uses `next start` con
   `--hostname 0.0.0.0` en modo kit: expondría el proxy de control a toda la red.
3. **Nada falso.** Lo que el kit no tiene se muestra como **PENDIENTE** y no se inventa:
   cámaras (sin imagen ni video), visión artificial, misiones, modo autónomo, accesorios,
   voltaje, temperatura, inclinación, ambiente, obstáculos y satélites.
4. **Coordenadas ficticias.** El kit arranca en una coordenada de demostración. El dashboard
   toma el *desplazamiento* desde la primera lectura y lo dibuja alrededor de la base del
   potrero; el sol y el clima de la escena sí son reales.
5. Un watchdog de software **no** es una parada de emergencia física. Ver
   `GAUCHO_Rover_Starter_v0.1/gaucho-rover/AGENTS.md` y `docs/INVENTARIO-Y-SEGURIDAD.md`.

## Pruebas manuales

1. Mantener `W`: velocidad ≈ 0,8 m/s (58 % de potencia), el rover avanza en la escena. Soltar: se detiene.
2. `A` / `D` giran; la velocidad pedida se limita a 1,4 m/s (el kit simula 5 km/h al 100 %).
3. Enviar una orden suelta desde `http://127.0.0.1:8010/docs`: a los ~0,7 s aparece
   *Sin comandos recientes: detención por watchdog* en Alertas.
4. **PARADA ENCLAVADA · SIMULADA** en movimiento: frena, bloquea los controles y la escena
   muestra *PARADA DE EMERGENCIA ENCLAVADA*. *Rearmar simulador* la libera sin iniciar movimiento.
5. Detener el backend (Ctrl+C): *SIN CONEXIÓN* y *SIN ENLACE · ÚLTIMA LECTURA*, controles
   deshabilitados. Al volver, reconecta solo.
