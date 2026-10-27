import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE_FILE = os.path.join(ROOT, ".agents", "queue", "pending_job.json")
LOCAL_PROJECTS = os.path.join(ROOT, "workspace", "portal_fabrica", "backend", "data", "local_projetos.json")

# Modo de checagem imediata ou loop
is_loop = "--once" not in sys.argv

while True:
    if os.path.exists(QUEUE_FILE):
        try:
            with open(QUEUE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"JOB_DETECTED:{json.dumps(data, ensure_ascii=False)}")
            sys.exit(0)
        except Exception:
            pass

    if os.path.exists(LOCAL_PROJECTS):
        try:
            with open(LOCAL_PROJECTS, "r", encoding="utf-8") as f:
                projects = json.load(f)
            for p in projects:
                if str(p.get("status", "")).lower() in ("aguardando_agente", "processando"):
                    print(f"JOB_DETECTED:{json.dumps(p, ensure_ascii=False)}")
                    sys.exit(0)
        except Exception:
            pass

    if not is_loop:
        print("NO_JOB")
        sys.exit(0)

    time.sleep(2)
