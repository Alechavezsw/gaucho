import time

import pytest
from fastapi.testclient import TestClient
from app.main import create_app


@pytest.fixture
def client():
    with TestClient(create_app(':memory:')) as client:
        yield client


def drive(client, action='forward'):
    return client.post('/api/controls/movement', json={'action': action, 'speed': 1})


def test_contract_and_websocket(client):
    assert client.get('/api/system/health').json()['physical_commands_enabled'] is False
    for path in ['rover/status', 'telemetry/current', 'cameras', 'detections', 'missions', 'alerts']:
        assert client.get('/api/' + path).status_code == 200
    with client.websocket_connect('/ws/telemetry') as ws:
        data = ws.receive_json()
        assert data['simulated'] and not data['physical_commands_enabled']
        assert 'timestamp' in data['telemetry']


def test_movement_and_watchdog(client):
    sim = client.app.state.simulator
    before = dict(sim.telemetry)
    assert drive(client).status_code == 200
    sim.tick()
    assert sim.telemetry['speed'] == 1
    assert sim.telemetry['lat'] != before['lat']
    sim.last_command = time.monotonic() - .7
    sim.check_watchdog()
    assert sim.telemetry['speed'] == 0
    assert sim.watchdog_expired and sim.action == 'stop'


def test_watchdog_background_loop(client):
    drive(client)
    time.sleep(.8)
    data = client.get('/api/rover/status').json()
    assert data['watchdog_expired']
    assert data['telemetry']['speed'] == 0


def test_estop_blocks_manual_and_mission_until_reset(client):
    drive(client)
    result = client.post('/api/controls/emergency-stop').json()
    assert result['emergency_stopped'] and result['telemetry']['speed'] == 0
    assert drive(client).status_code == 409
    mission = client.get('/api/missions').json()[0]
    assert client.post(f"/api/missions/{mission['id']}/start").status_code == 409
    assert drive(client, 'stop').status_code == 200
    client.post('/api/controls/emergency-reset')
    assert drive(client).status_code == 200


def test_disconnect_stops_and_keeps_timestamp_stale(client):
    drive(client)
    client.post('/api/system/connection', json={'connected': False})
    sim = client.app.state.simulator
    stamp = sim.telemetry['timestamp']
    sim.tick()
    assert sim.telemetry['timestamp'] == stamp
    assert sim.telemetry['speed'] == 0
    assert drive(client).status_code == 409
    client.post('/api/system/connection', json={'connected': True})
    assert sim.action == 'stop'


@pytest.mark.parametrize('speed', [-1, 3, 'NaN'])
def test_invalid_speed(client, speed):
    assert client.post('/api/controls/movement', json={'action': 'forward', 'speed': speed}).status_code == 422


def test_scenario_blocks_restart(client):
    client.post('/api/system/scenario', json={'category': 'obstacle'})
    assert drive(client).status_code == 409


def test_physical_mode_rejected(monkeypatch):
    monkeypatch.setenv('GAUCHO_MODE', 'hardware')
    with pytest.raises(ValueError, match='motores físicos deshabilitados'):
        create_app(':memory:')
