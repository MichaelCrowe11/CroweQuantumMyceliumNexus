# CroweQuantumMyceliumNexus

Compose, Kubernetes and Helm manifests, an OpenAPI spec and unbuilt Rust, Python and React stubs from a September 2025 sketch of a service that would join mycology sensor data to quantum computing code.

## Status

`archived`

Seven commits between 2025-09-09 and 2025-09-11 (git log). Development stopped on 2025-09-11. The only later activity is a Dependabot pull request from 2026-05-02, left open. Nothing in the repo builds or runs from a real command tried today (see below). The code is kept for reference.

## Install and first run

Not maintained. No supported install path.

What was tried today, and how each stopped:

```
$ cargo check --offline --manifest-path integration/mycelium-ei-integration/Cargo.toml
error: failed to get `mycelium-runtime` as a dependency of package `mycelium-ei-integration v0.1.0`
  Unable to update /private/tmp/readme-makeover/mycelium-ei-lang/runtime
```

The Rust crate depends on `../../../mycelium-ei-lang/{compiler,runtime,stdlib}` and on `../quantum-core` and `../quantum-compute`. None of those directories exist in this repo. `ml-models/` and `tests/` depend on that same crate, so they cannot build either. `ml-models/Cargo.toml` also needs `tch` (PyTorch bindings), which the estate disk rule does not allow installing, and lists binaries at `src/bin/` that are not in the repo.

```
$ uv venv /tmp/readme-makeover/cqmn-venv --python 3.12
$ uv pip install --python /tmp/readme-makeover/cqmn-venv/bin/python ./sdk/python
FileNotFoundError: [Errno 2] No such file or directory: 'README.md'
```

`sdk/python/setup.py` opens a `README.md` beside it that does not exist, so the package cannot build. Its `install_requires` also lists `qiskit`, which was not going to be installed under the disk rule.

```
$ curl -sS -o /dev/null -w '%{http_code}' https://nexus.crowelogic.com/
000
```

The host named as `DOMAIN` in the committed compose env file and in the old README did not answer.

Not tried, and why:

- `frontend/`: no lockfile, no `src/index.tsx`, no `tsconfig.json`. `react-scripts` cannot start without an entry file, and the estate rule is to install only from a lockfile.
- `sdk/javascript/`: no lockfile. Not installed.
- `docker compose -f docker-compose.*.yml up`: Docker Compose is not on this machine, and the four compose files build from directories that are not in the repo (`./MyceliumEI`, `./mycelium`, `./quantum`, `./integration/quantum-core`, `./integration/data-pipeline`, `./crowe-sense`, which is an empty submodule pointer).
- The 18 PowerShell scripts under `scripts/`: Windows only, and `pwsh` is not on this machine. The three scripts the old README told you to run (`generate-secrets.ps1`, `health-check.ps1`, `run-tests.ps1`) are not in the repo.
- The `.myc` files under `examples/`: written for the Mycelium-EI language, whose toolchain lives in a different repo.

One thing that did parse today, with Ruby's YAML library: `api/openapi.yaml` is OpenAPI 3.0.3 with 8 paths (`/compute/hybrid`, `/compute/status/{computationId}`, `/networks`, `/networks/{networkId}/simulate`, `/quantum/circuits`, `/quantum/execute`, `/metrics`, `/health`). No server implements them here.

## What runs today

Nothing is maintained. For reference, the repo holds:

- Four Docker Compose files (6, 11, 15 and 10 services), a Helm chart with staging and production values, and three Kubernetes manifests.
- `api/openapi.yaml`, the spec above.
- Rust sources: an integration crate (5 files), an ML crate (2 files), two quantum circuit files with no `Cargo.toml`, and a test crate with two benches.
- Python: `integration/orchestrator.py`, `integration/crowe_sense_weather.py`, and a client SDK under `sdk/python/`.
- TypeScript: one SDK file and seven React components with no entry point.
- Prometheus and Grafana config under `monitoring/`, and 18 PowerShell deploy scripts.
- No test was run. The Rust test crate cannot compile.

## Limits

- Two env files besides `.env.example` are committed. The compose stack's env file holds generated passwords and signing keys (database, cache, queue, Grafana, JWT, encryption). Treat every value in it as public and rotate before any reuse. `.env.gcp` names a Google Cloud project, registry and service account. `.gitignore` excludes neither.
- No ecological, agricultural or environmental result exists in this repo. Nothing here has monitored a fungus, a sensor, or a site.
- No quantum computation exists in this repo. The "quantum" crates and circuit files were never compiled, and no job output is committed.
- The old README's EPA compliance badge, "7-Year Data Retention", "System Status: Active" table, TLS, RBAC and audit claims described intent. None is backed by running code here.
- The old README linked to `docs/architecture.md`, `docs/api.md`, `docs/compliance.md`, `docs/quantum.md`, `CONTRIBUTING.md` and `LICENSE`. None exist. `docs/` has two files: `DNS_CONFIGURATION.md` and `QUICKSTART.md`.
- `frontend/src/components/Auth/` and `frontend/src/types/auth.ts` sketch a login flow. There is no backend for it in this repo.
- Not a product. Not for deployment as is.

## License and contact

No license file. The old README pointed at a `LICENSE` that was never added and called the project proprietary; `sdk/javascript/package.json` says MIT for that one folder. Treat the repo as all rights reserved.

Contact: michael@crowelogic.com
