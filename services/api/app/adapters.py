"""Boundaries for future validated integrations. There is no actuator implementation."""
from typing import Protocol
from .schemas import Camera, Detection, Telemetry, Waypoint


class SensorAdapter(Protocol):
    async def read(self) -> Telemetry: ...


class GPSAdapter(Protocol):
    async def position(self) -> Waypoint | None: ...


class ConnectivityAdapter(Protocol):
    async def connected(self) -> bool: ...


class VisionAdapter(Protocol):
    async def detections(self) -> list[Detection]: ...


class CameraAdapter(Protocol):
    async def streams(self) -> list[Camera]: ...


class ESP32TelemetryAdapter(Protocol):
    async def read_frame(self) -> bytes: ...


# A future serial command transport needs authorization, limits, sequence numbers,
# acknowledgments and an independent MCU watchdog before it may be implemented.
