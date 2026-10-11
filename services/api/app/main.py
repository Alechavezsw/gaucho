import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .config import load_hardware
from .repository import MissionRepository
from .routes import routers
from .simulator import Simulator


def create_app(database_path: str | None = None) -> FastAPI:
    origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        repo = MissionRepository(database_path or os.getenv('DATABASE_PATH', 'data/gaucho.sqlite3'))
        app.state.simulator = Simulator(repo, load_hardware())

        async def run():
            while True:
                await asyncio.sleep(1)
                app.state.simulator.tick()

        task = asyncio.create_task(run())
        yield
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        app.state.simulator.stop()
        repo.close()

    app = FastAPI(title='GAUCHO CONTROL · Simulation API', version='0.1.0', lifespan=lifespan,
                  description='Local DEMO API. No physical actuation. Single worker; SI units and UTC timestamps.')
    app.add_middleware(CORSMiddleware, allow_origins=origins,
                       allow_methods=['GET', 'POST', 'PATCH'], allow_headers=['Content-Type'])
    for router in routers.values():
        app.include_router(router)

    @app.websocket('/ws/telemetry')
    async def websocket(ws: WebSocket):
        origin = ws.headers.get('origin')
        if origin and origin not in origins:
            await ws.close(code=1008)
            return
        await ws.accept()
        try:
            while True:
                await ws.send_json(app.state.simulator.snapshot())
                await asyncio.sleep(1)
        except (WebSocketDisconnect, RuntimeError, OSError):
            pass

    return app


app = create_app()
