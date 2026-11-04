"""Prepare BOTH frozen local environments. Does not mark or start an implementation."""
import argparse
import json
from pathlib import Path
import subprocess
import time

import experiment as ex


def run(argv, *, cwd=None, env=None):
    return subprocess.run(argv, cwd=cwd, env=env, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=300).stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dependencies", action="store_true")
    parser.add_argument("--databases", action="store_true")
    parser.add_argument("--browser", action="store_true")
    args = parser.parse_args()
    if not any(vars(args).values()):
        parser.error("Select --dependencies, --databases and/or --browser")
    registry = ex.read_json(ex.PRIVATE / "registry.json")
    ex.verify(registry)
    if any((ex.PRIVATE / arm / "start.json").exists() for arm in ex.ARM_NAMES):
        raise ValueError("Preparation is frozen once either measured run starts")
    path = ex.PRIVATE / "readiness.json"
    readiness = ex.read_json(path) if path.exists() else {"arms": {a: {} for a in ex.ARM_NAMES}}
    for arm in ex.ARM_NAMES:
        config = registry["arms"][arm]
        result = readiness["arms"][arm]
        root = Path(config["worktree"])
        env = ex.environment(config)
        checks = []
        try:
            if args.dependencies:
                run(ex.command(config, ["npm", "ci", "--no-audit", "--no-fund"]), cwd=root, env=env)
                result["dependencies"] = True
                checks.append("npm ci including baseline prepare")
                result["node"] = run([config["node"], "--version"]).strip()
                result["npm"] = run(ex.command(config, ["npm", "--version"]), cwd=root, env=env).strip()
            if args.browser:
                run(ex.command(config, ["node", "node_modules/@playwright/test/cli.js", "install", "chromium"]), cwd=root, env=env)
                # Launch, rather than treating a cache directory as readiness.
                probe = "const{chromium}=await import('@playwright/test');const b=await chromium.launch({headless:true});await b.close();"
                run(ex.command(config, ["node", "--input-type=module", "-e", probe]), cwd=root, env=env)
                result["browser"] = True
                checks.append("pinned Playwright Chromium install and headless launch")
            if args.databases:
                docker = registry["docker"]
                run([docker, "info", "--format", "{{.ServerVersion}}"])
                name = config["container"]
                exists = subprocess.run([docker, "container", "inspect", name], capture_output=True, text=True)
                if exists.returncode == 0:
                    info = json.loads(exists.stdout)[0]
                    if info["Config"].get("Labels", {}).get("mp4.experiment") != registry["experiment_id"]:
                        raise ValueError("Existing container is not owned by this experiment")
                    binds = info["HostConfig"]["PortBindings"].get("5432/tcp", [])
                    if binds != [{"HostIp": "127.0.0.1", "HostPort": str(config["database_port"])}]:
                        raise ValueError("Owned container port differs from registry")
                    run([docker, "start", name])
                else:
                    run([docker, "run", "--detach", "--name", name, "--label", "mp4.experiment=" + registry["experiment_id"],
                         "--publish", f"127.0.0.1:{config['database_port']}:5432", "--env", "POSTGRES_USER=debugclinic",
                         "--env", "POSTGRES_PASSWORD=debugclinic", "--env", "POSTGRES_DB=debugclinic_f01_test",
                         "--tmpfs", "/var/lib/postgresql/data", registry.get("postgres_image_id") or "postgres:17-alpine"])
                image_id = run([docker, "inspect", "--format", "{{.Image}}", name]).strip()
                if registry.get("postgres_image_id") and registry["postgres_image_id"] != image_id:
                    raise ValueError("Both conditions must use the same PostgreSQL image")
                registry["postgres_image_id"] = image_id
                (ex.PRIVATE / "registry.json").write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")
                for attempt in range(30):
                    ready = subprocess.run([docker, "exec", name, "pg_isready", "-U", "debugclinic", "-d", "debugclinic_f01_test"], capture_output=True)
                    if ready.returncode == 0:
                        break
                    time.sleep(0.5)
                else:
                    raise ValueError("Owned database not ready")
                # Apply baseline migrations without destroying existing data.
                # Containers are fresh or already contain this unstarted baseline.
                run(ex.command(config, ["npm", "run", "db:deploy"]), cwd=root, env=env)
                run(ex.command(config, ["npm", "run", "db:seed"]), cwd=root, env=env)
                result["database"] = True
                result["postgres_image_id"] = image_id
                checks.append("owned loopback ephemeral DB: baseline migration deploy and seed")
            result.pop("blocker", None)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            result["blocker"] = type(error).__name__ + ": selected setup step did not complete; inspect private setup log"
            if args.databases:
                result["database"] = False
            # Output stays private; no credentials/contents in committed evidence.
            details = getattr(error, "stdout", None) or str(error)
            if isinstance(details, bytes):
                details = details.decode("utf-8", errors="replace")
            (ex.PRIVATE / arm).mkdir(exist_ok=True)
            (ex.PRIVATE / arm / "setup-error.txt").write_text(details, encoding="utf-8")
        result["checks"] = sorted(set(result.get("checks", []) + checks))
        result["ready"] = all(result.get(k) is True for k in ("dependencies", "browser", "database"))
        result["checked_at"] = ex.now()
        path.write_text(json.dumps(readiness, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"arm": arm, "ready": result["ready"], "checks": checks, "blocker": result.get("blocker")}))
    return 0 if all(v["ready"] for v in readiness["arms"].values()) else 2


if __name__ == "__main__":
    raise SystemExit(main())
