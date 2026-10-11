"""Deployment and unverified hardware inventory, independent of the UI."""
import json
import os
from pathlib import Path

from pydantic import BaseModel, ConfigDict


class HardwareConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: str = "unverified"
    camera_count: int = 4
    computer: str | None = None
    microcontroller: str | None = None
    motor_model: str | None = None
    motor_voltage: float | None = None
    motor_controller: str | None = None
    sensors: dict[str, str | None] = {}


def load_hardware() -> HardwareConfig:
    path = os.getenv("HARDWARE_CONFIG")
    config = HardwareConfig.model_validate(json.loads(Path(path).read_text())) if path else HardwareConfig()
    if not 1 <= config.camera_count <= 8:
        raise ValueError("camera_count must be between 1 and 8")
    return config
