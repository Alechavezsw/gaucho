"""Domain routers; simulation service owns state and persistence."""
from typing import Annotated
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from . import schemas as dto
from .camera_service import render_scene
from .simulator import Simulator


def get_simulator(request: Request) -> Simulator:
    return request.app.state.simulator


Sim = Annotated[Simulator, Depends(get_simulator)]
routers = {name: APIRouter(prefix='/api/' + name, tags=[name]) for name in
           ['rover', 'telemetry', 'cameras', 'detections', 'missions', 'alerts', 'controls', 'system']}


@routers['rover'].get('/status', response_model=dto.Snapshot)
async def status(sim: Sim):
    return sim.snapshot()


@routers['telemetry'].get('/current', response_model=dto.Telemetry)
async def telemetry(sim: Sim):
    return sim.telemetry


@routers['cameras'].get('', response_model=list[dto.Camera])
async def cameras(sim: Sim):
    return [dict(c, connected=sim.connected) for c in sim.cameras]


@routers['cameras'].get('/{camera_id}/snapshot', response_class=Response,
                        responses={200: {'content': {'image/svg+xml': {}}}})
async def snapshot(camera_id: str, sim: Sim):
    if camera_id not in [c['id'] for c in sim.cameras]:
        raise HTTPException(404, 'Cámara inexistente')
    return Response(render_scene(camera_id), media_type='image/svg+xml', headers={'Cache-Control': 'no-store'})


@routers['detections'].get('', response_model=list[dto.Detection])
async def detections(sim: Sim):
    return sim.detections


@routers['detections'].patch('/{detection_id}/review', response_model=dto.Detection)
async def review_detection(detection_id: str, sim: Sim):
    detection = next((d for d in sim.detections if d['id'] == detection_id), None)
    if not detection:
        raise HTTPException(404, 'Detección inexistente')
    detection['status'] = 'reviewed'
    return detection


@routers['missions'].get('', response_model=list[dto.Mission])
async def missions(sim: Sim):
    return sim.missions


@routers['missions'].post('', status_code=201, response_model=dto.Mission)
async def create_mission(body: dto.MissionInput, sim: Sim):
    return sim.create_mission(body.model_dump())


@routers['missions'].post('/{mission_id}/start', response_model=dto.Mission)
async def start_mission(mission_id: str, sim: Sim):
    if sim.emergency_stopped or sim.scenario:
        raise HTTPException(409, 'Simulador bloqueado por parada o escenario activo')
    if not sim.connected:
        raise HTTPException(409, 'Rover desconectado')
    if any(m['status'] == 'running' for m in sim.missions):
        raise HTTPException(409, 'Ya hay una misión activa')
    mission = next((m for m in sim.missions if m['id'] == mission_id), None)
    if not mission:
        raise HTTPException(404, 'Misión inexistente')
    sim.stop()
    sim.mode = 'autonomous'
    mission.update(status='running', progress=0.0, duration=0, waypoint_index=0)
    sim.repository.save(mission)
    return mission


@routers['alerts'].get('', response_model=list[dto.Alert])
async def alerts(sim: Sim):
    return sim.alerts


@routers['alerts'].patch('/{alert_id}/read', response_model=dto.Alert)
async def read_alert(alert_id: str, sim: Sim):
    alert = next((a for a in sim.alerts if a['id'] == alert_id), None)
    if not alert:
        raise HTTPException(404, 'Alerta inexistente')
    alert['read'] = True
    return alert


@routers['controls'].post('/movement')
async def movement(body: dto.Control, sim: Sim):
    if body.action != 'stop' and (not sim.connected or sim.mode != 'manual' or sim.emergency_stopped or sim.scenario):
        raise HTTPException(409, 'Conducción manual no disponible')
    sim.action = body.action
    sim.requested_speed = body.speed
    sim.last_command = time.monotonic()
    sim.watchdog_expired = False
    if body.action == 'stop':
        sim.stop()
    return {'simulated': True, 'action': sim.action}


@routers['controls'].post('/emergency-stop', response_model=dto.Snapshot)
async def emergency_stop(sim: Sim):
    sim.emergency_stopped = True
    sim.stop()
    return sim.snapshot()


@routers['controls'].post('/emergency-reset', response_model=dto.Snapshot)
async def emergency_reset(sim: Sim):
    sim.stop()
    sim.emergency_stopped = False
    return sim.snapshot()


@routers['controls'].post('/mode', response_model=dto.Snapshot)
async def mode(body: dto.Mode, sim: Sim):
    if not sim.connected:
        raise HTTPException(409, 'Rover desconectado')
    sim.stop()
    sim.mode = body.mode
    return sim.snapshot()


@routers['controls'].post('/accessory', response_model=dict[str, bool])
async def accessory(body: dto.Accessory, sim: Sim):
    if not sim.connected:
        raise HTTPException(409, 'Rover desconectado')
    sim.accessories[body.name] = body.enabled
    if body.name == 'horn':
        sim.horn_until = sim.tick_count + 2
    return sim.accessories


@routers['system'].get('/health', response_model=dto.Health)
async def health():
    return dto.Health()


@routers['system'].get('/hardware')
async def hardware(sim: Sim):
    return {'configured': sim.hardware.model_dump(), 'physical_commands_enabled': False}


@routers['system'].post('/connection', response_model=dto.Snapshot)
async def connection(body: dto.Connection, sim: Sim):
    sim.connected = body.connected
    sim.stop()
    sim.alert('connection', 'Enlace simulado ' + ('restablecido' if body.connected else 'perdido'),
              'info' if body.connected else 'critical')
    return sim.snapshot()


@routers['system'].post('/scenario')
async def scenario(body: dto.Scenario, sim: Sim):
    sim.trigger_scenario(body.category)
    return {'simulated': True, 'category': body.category}
