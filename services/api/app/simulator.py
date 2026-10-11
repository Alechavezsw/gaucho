"""Deterministic, hardware-free rover. One tick represents one second."""
import math
import time
import uuid
from datetime import datetime, timezone
from .config import HardwareConfig
from .repository import MissionRepository


def now():
    return datetime.now(timezone.utc).isoformat()


class Simulator:
    def __init__(self, repository: MissionRepository | None = None, hardware: HardwareConfig | None = None):
        self.repository = repository or MissionRepository(':memory:')
        self.hardware = hardware or HardwareConfig()
        self.connected = True
        self.mode = 'manual'
        self.action = 'stop'
        self.requested_speed = 0.0
        self.last_command = 0.0
        self.tick_count = 0
        self.scenario: str | None = None
        self.scenario_until = 0
        self.horn_until = 0
        self.accessories = dict.fromkeys(['lights', 'spotlight', 'beacon', 'horn', 'ptz'], False)
        self.telemetry = dict(timestamp=now(), battery=94.0, voltage=25.1, speed=0.0,
            system_temperature=46.0, tilt=2.0, lat=-31.537, lon=-68.695, heading=45.0,
            gps='3D FIX', satellites=14, latency=42, ambient_temperature=28.0,
            humidity=24.0, obstacle_distance=8.0)
        self.trail = [[-31.5374, -68.6954], [-31.5372, -68.6952], [-31.537, -68.695]]
        self.pois = [dict(name='Base / puesto', lat=-31.5374, lon=-68.6954),
                    dict(name='Represa norte', lat=-31.535, lon=-68.694),
                    dict(name='Corral 01', lat=-31.538, lon=-68.697)]
        names = ['Frontal', 'Trasera', 'Lateral izquierda', 'Lateral derecha']
        self.cameras = [dict(id=str(i), name=names[i] if i < 4 else f'Auxiliar {i-3}',
                            connected=True, simulated=True, transport='svg-demo', stream_url=None)
                        for i in range(self.hardware.camera_count)]
        self.missions = self.repository.load()
        if not self.missions:
            for i, name in enumerate(['Vigilancia de ganado', 'Inspección de represa', 'Recorrido de alambrados', 'Regreso a base']):
                target = self.pois[i % len(self.pois)]
                self.create_mission(dict(name=name, description='Recorrido demostrativo con GPS ficticio',
                    waypoints=[dict(lat=target['lat'], lon=target['lon'])]))
        for mission in self.missions:
            if mission['status'] == 'running':
                mission['status'] = 'paused'
                self.repository.save(mission)
        self.alerts: list[dict] = []
        self.detections: list[dict] = []
        self.event()

    def create_mission(self, body: dict) -> dict:
        mission = dict(id=str(uuid.uuid4()), **body, status='pending', created_at=now(),
                       duration=0, progress=0.0, waypoint_index=0)
        self.missions.append(mission)
        self.repository.save(mission)
        return mission

    def stop(self, pause_missions=True):
        self.action = 'stop'
        self.requested_speed = 0.0
        self.telemetry['speed'] = 0.0
        if pause_missions:
            for mission in self.missions:
                if mission['status'] == 'running':
                    mission['status'] = 'paused'
                    self.repository.save(mission)

    def alert(self, category, description, severity='info'):
        self.alerts.insert(0, dict(id=str(uuid.uuid4()), category=category, description=description,
            severity=severity, timestamp=now(), read=False, simulated=True))
        self.alerts = self.alerts[:100]

    def event(self):
        categories = ['Vaca detectada', 'Grupo de animales', 'Animal aislado', 'Obstáculo detectado',
                      'Persona detectada', 'Vehículo detectado', 'Represa identificada']
        category = categories[(self.tick_count // 10) % len(categories)]
        # Only bovine fixtures correspond to the visible synthetic silhouette.
        bovine = category in categories[:3]
        self.detections.insert(0, dict(id=str(uuid.uuid4()), category=category, timestamp=now(), camera='0',
            confidence=0.94, location=dict(lat=self.telemetry['lat'], lon=self.telemetry['lon']),
            image_url='/api/cameras/0/snapshot' if bovine else None,
            bounding_box=[0.23, 0.62, 0.12, 0.15] if bovine else None, status='new', simulated=True))
        self.detections = self.detections[:50]
        self.alert('detection', category)

    def trigger_scenario(self, category: str):
        self.scenario = category
        self.scenario_until = self.tick_count + 15
        text, severity = {
            'battery': ('Batería baja simulada: 18%', 'warning'),
            'obstacle': ('Obstáculo frontal simulado: 0,6 m', 'warning'),
            'tilt': ('Inclinación excesiva simulada: 24°', 'critical'),
            'sensor': ('Error simulado del sensor GPS', 'critical'),
        }[category]
        self.alert(category, text, severity)
        self.stop()

    def _mission_tick(self, mission: dict) -> float:
        t = self.telemetry
        index = mission['waypoint_index']
        target = mission['waypoints'][index]
        north = (target['lat'] - t['lat']) * 111320
        east = (target['lon'] - t['lon']) * 111320 * math.cos(math.radians(t['lat']))
        distance = math.hypot(north, east)
        speed = min(2.0, distance)
        if distance > 0:
            t['heading'] = math.degrees(math.atan2(east, north)) % 360
            t['lat'] += (target['lat'] - t['lat']) * speed / distance
            t['lon'] += (target['lon'] - t['lon']) * speed / distance
        mission['duration'] += 1
        if distance <= 2:
            mission['waypoint_index'] += 1
            if mission['waypoint_index'] == len(mission['waypoints']):
                mission['status'] = 'completed'
                self.alert('mission', 'Misión simulada finalizada: ' + mission['name'])
                speed = 0.0
        mission['progress'] = mission['waypoint_index'] / len(mission['waypoints']) * 100
        if mission['duration'] % 5 == 0 or mission['status'] == 'completed':
            self.repository.save(mission)
        return speed

    def tick(self):
        self.tick_count += 1
        if self.tick_count >= self.horn_until:
            self.accessories['horn'] = False
        if not self.connected:
            self.stop()
            return  # Last telemetry timestamp stays stale when simulated link is lost.
        t = self.telemetry
        if time.monotonic() - self.last_command > 1.5:
            self.action = 'stop'
        if self.tick_count >= self.scenario_until:
            self.scenario = None
        running = next((m for m in self.missions if m['status'] == 'running'), None)
        if running and self.mode == 'autonomous':
            speed = self._mission_tick(running)
        else:
            speed = self.requested_speed if self.action in ['forward', 'backward'] else 0.0
            if self.action in ['left', 'right']:
                t['heading'] = (t['heading'] + (8 if self.action == 'right' else -8)) % 360
            signed = speed * (-1 if self.action == 'backward' else 1)
            t['lat'] += signed * math.cos(math.radians(t['heading'])) / 111320
            t['lon'] += signed * math.sin(math.radians(t['heading'])) / (111320 * math.cos(math.radians(t['lat'])))
        point = [t['lat'], t['lon']]
        if point != self.trail[-1]:
            self.trail = [*self.trail[-499:], point]
        t.update(timestamp=now(), speed=speed, battery=max(0, t['battery'] - 0.002 - speed * 0.002),
                 system_temperature=46 + math.sin(self.tick_count / 12) * 2,
                 tilt=24.0 if self.scenario == 'tilt' else 2 + math.sin(self.tick_count / 8),
                 latency=42 + self.tick_count % 9,
                 obstacle_distance=0.6 if self.scenario == 'obstacle' else 8 + math.sin(self.tick_count / 9) * 2,
                 gps='SIN FIX' if self.scenario == 'sensor' else '3D FIX',
                 satellites=0 if self.scenario == 'sensor' else 14)
        if self.scenario == 'battery':
            t['battery'] = 18.0
        t['voltage'] = 22 + t['battery'] / 100 * 3.3
        if self.tick_count % 10 == 0:
            self.event()
        if t['battery'] < 20 and not any(a['category'] == 'battery' for a in self.alerts):
            self.alert('battery', 'Batería baja', 'warning')

    def snapshot(self):
        return dict(simulated=True, connected=self.connected, mode=self.mode, rover='GAUCHO · SJ-01',
                    starlink='SIMULADO', telemetry=self.telemetry, trail=self.trail, pois=self.pois,
                    accessories=self.accessories)
