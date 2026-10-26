# Plan GAUCHO — proyecto activo

## Verificado en esta iteración

- Lectura de AGENTS.md y del README/PLAN originales dentro del starter.
- API activa en `services/api`, dashboard activo en `src`; documentación raíz nueva.
- Compilación Next 16 con Webpack y chequeo TypeScript completados.
- Lint sin errores; quedan dos advertencias: exportación anónima de PostCSS y
  uso deliberado de imagen SVG del backend mediante `<img>`.
- 10 pruebas nuevas: contratos REST/WebSocket, movimiento GPS, watchdog en
  memoria y en segundo plano, parada enclavada/rearme, desconexión, límites de
  velocidad, escenarios de falla y rechazo del modo hardware.
- 4 pruebas del starter original pasan con su propio PYTHONPATH.
- Navegador conectado a Python: enlace activo, cámaras SVG, avance con W,
  velocidad 0.8 m/s y coordenadas actualizadas; parada enclavada muestra cero,
  deshabilita direcciones y ofrece rearme.

## Cambios

- ESLint excluye caches generados anidados; TypeScript analiza sólo la aplicación
  activa y tipos de Next, sin mezclar el starter.
- Watchdog Python independiente del tick de telemetría, con vencimiento de
  650 ms y revisión cada 50 ms. Un escenario activo impide reiniciar movimiento.
- Nuevos POST `/api/controls/emergency-stop` y `/api/controls/emergency-reset`.
  El estado incluye `emergency_stopped`, `watchdog_expired`, `sequence` y
  `physical_commands_enabled: false`.
- Teclado WASD/flechas, prioridad a última tecla presionada, liberación al perder
  foco/visibilidad y protección de campos editables. Renovación cada 200 ms.
- Telemetría distingue API Python de demo local y muestra hora y watchdog.
- Demo local incorpora parada enclavada, watchdog y detención al cambiar modo
  o conexión. Solicitudes HTTP tienen timeout de 2.5 segundos.
- `GAUCHO_MODE` distinto de `simulation` se rechaza. Sin GPIO, serial de mando,
  drivers, relés ni motores físicos; no se modificó firmware.

## Próximo trabajo

- Unificar el terreno/ganado del demo local con el modelo Python y pruebas
  automáticas del teclado con combinaciones, pérdida de foco y recuperación.
- Evolucionar el integrador del simulador a pasos temporales pequeños; actualmente
  el modelo Python avanza un segundo por tick y publica cada segundo.
- Fases B/C del plan original: diagnóstico Raspberry/ESP32 sin motores, sólo
  después de inventario físico. Alimentación y movimientos reales siguen pendientes
  de validación técnica; esta iteración no los habilita.

Las pruebas ASGI se bloquearon dentro del sandbox Windows y pasaron fuera de él.
La dependencia Starlette advierte sobre futura migración del TestClient de httpx
a httpx2; no afecta las pruebas actuales. Se preservaron los cambios previos del usuario.
