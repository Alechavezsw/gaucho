"""Validated REST and telemetry contracts. Units are SI unless stated otherwise."""
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class InputModel(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Waypoint(InputModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class MissionInput(InputModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default='', max_length=1000)
    waypoints: list[Waypoint] = Field(min_length=1, max_length=100)


class Mission(MissionInput):
    id: str
    status: Literal['pending', 'running', 'paused', 'completed']
    created_at: str
    duration: int
    progress: float
    waypoint_index: int = 0


class Control(InputModel):
    action: Literal['forward', 'backward', 'left', 'right', 'stop']
    speed: float = Field(default=1, ge=0, le=2)


class Mode(InputModel):
    mode: Literal['manual', 'autonomous']


class Accessory(InputModel):
    name: Literal['lights', 'spotlight', 'beacon', 'horn', 'ptz']
    enabled: bool


class Connection(InputModel):
    connected: bool


class Scenario(InputModel):
    category: Literal['battery', 'obstacle', 'tilt', 'sensor']


class Telemetry(BaseModel):
    timestamp: str
    battery: float
    voltage: float
    speed: float
    system_temperature: float
    tilt: float
    lat: float
    lon: float
    heading: float
    gps: str
    satellites: int
    latency: int
    ambient_temperature: float
    humidity: float
    obstacle_distance: float


class Poi(Waypoint):
    name: str


class Snapshot(BaseModel):
    simulated: Literal[True] = True
    connected: bool
    mode: Literal['manual', 'autonomous']
    rover: str
    starlink: str
    telemetry: Telemetry
    trail: list[tuple[float, float]]
    pois: list[Poi]
    accessories: dict[str, bool]


class Camera(BaseModel):
    id: str
    name: str
    connected: bool
    simulated: Literal[True] = True
    transport: Literal['svg-demo', 'webrtc']
    stream_url: str | None = None


class Detection(BaseModel):
    id: str
    category: str
    timestamp: str
    camera: str
    confidence: float = Field(ge=0, le=1)
    location: Waypoint | None
    image_url: str | None
    status: Literal['new', 'reviewed']
    simulated: Literal[True] = True
    bounding_box: tuple[float, float, float, float] | None = None


class Alert(BaseModel):
    id: str
    category: str
    description: str
    severity: Literal['info', 'warning', 'critical']
    timestamp: str
    read: bool
    simulated: Literal[True] = True


class Health(BaseModel):
    status: Literal['ok'] = 'ok'
    simulated: Literal[True] = True
    physical_commands_enabled: Literal[False] = False
