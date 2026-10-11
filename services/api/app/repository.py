"""Local mission history; simulation events and telemetry are bounded in memory."""
import json
import sqlite3
from pathlib import Path


class MissionRepository:
    def __init__(self, path: str):
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, body TEXT NOT NULL)")
        self.db.commit()

    def load(self) -> list[dict]:
        return [json.loads(row[0]) for row in self.db.execute("SELECT body FROM missions ORDER BY rowid")]

    def save(self, mission: dict) -> None:
        self.db.execute("INSERT OR REPLACE INTO missions VALUES (?, ?)", (mission["id"], json.dumps(mission)))
        self.db.commit()

    def close(self) -> None:
        self.db.close()
