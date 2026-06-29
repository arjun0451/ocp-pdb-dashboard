# PDB Dashboard — OpenShift Operations Tool

Web dashboard replicating all `pdb_blocker_check.sh` logic plus historical trends, node drain simulation, and live WebSocket refresh.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  OpenShift Cluster                              │
│                                                 │
│  ┌────────────────────────────────────────┐     │
│  │  pdb-dashboard (Namespace)             │     │
│  │                                        │     │
│  │  [Deployment: pdb-dashboard]           │     │
│  │    ├── React UI  (served by Express)   │     │
│  │    ├── Express API  :3001              │     │
│  │    ├── WebSocket    :3001/ws           │     │
│  │    └── node-cron → oc calls → SQLite  │     │
│  │                                        │     │
│  │  [ServiceAccount: pdb-dashboard]       │     │
│  │    └── ClusterRoleBinding              │     │
│  │         → read: pods, nodes, PDBs     │     │
│  │                                        │     │
│  │  [PVC: pdb-dashboard-data] (1Gi)       │     │
│  │    └── /app/data/pdb_history.db        │     │
│  │                                        │     │
│  │  [Route] → HTTPS edge termination      │     │
│  └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

## Quick Start

### Option A — BuildConfig (in-cluster build from Git)

```bash
# 1. Apply all manifests
bash deploy/deploy.sh

# 2. Edit 03-buildconfig.yaml → set your Git URI
# 3. Trigger build
oc start-build pdb-dashboard -n pdb-dashboard --follow
```

### Option B — Podman build + push (disconnected / Mac → amd64)

```bash
# 1. Create namespace + RBAC first
oc apply -f deploy/00-namespace.yaml
oc apply -f deploy/01-rbac.yaml

# 2. Expose internal registry (once per cluster)
oc patch configs.imageregistry.operator.openshift.io/cluster \
  --patch '{"spec":{"defaultRoute":true}}' --type=merge

# 3. Build and push
./build-push.sh

# 4. Update image in deploy/02-deployment.yaml then apply
oc apply -f deploy/02-deployment.yaml
```

## Directory Structure

```
pdb-dashboard/
├── backend/
│   ├── calculations/pdb.js      # disruption math (mirrors shell script)
│   ├── services/
│   │   ├── oc.js               # oc CLI wrapper
│   │   ├── pdbService.js       # orchestration
│   │   └── db.js               # SQLite history
│   ├── routes/api.js           # REST endpoints
│   └── server.js               # Express + WebSocket + cron
├── frontend/src/
│   ├── App.js                  # theme, nav, WS client
│   ├── pages/
│   │   ├── SummaryPage.js      # KPI cards + pie chart
│   │   ├── PDBTable.js         # filterable sortable table
│   │   ├── NodeDrain.js        # drain simulator
│   │   └── HistoryPage.js      # trend chart
│   └── services/api.js
├── deploy/
│   ├── 00-namespace.yaml       # Namespace
│   ├── 01-rbac.yaml            # SA + ClusterRole + Binding
│   ├── 02-deployment.yaml      # Deployment + Service + Route + PVC
│   ├── 03-buildconfig.yaml     # BuildConfig + ImageStream
│   └── deploy.sh               # one-shot apply script
├── Containerfile               # multi-stage UBI9 Node 22 build
└── build-push.sh               # local build + OCP registry push
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pdbs` | All PDBs with disruption calc. Query: `namespace`, `pdb`, `blockedOnly`, `includeSystem`, `status` |
| GET | `/api/pdbs/:ns/:name` | Single PDB detail |
| GET | `/api/summary` | Cluster-wide counts |
| GET | `/api/nodes` | Node list with roles/status |
| GET | `/api/nodes/:node/drain-analysis` | Full drain verdict for node |
| GET | `/api/namespaces` | Unique namespaces |
| GET | `/api/export/csv` | CSV export |
| GET | `/api/history` | Snapshot history |
| GET | `/api/history/:ns/:name` | PDB trend |
| POST| `/api/refresh` | Invalidate cache |
| GET | `/api/me` | Current oc user |
| WS  | `/ws` | Live push on each refresh cycle |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP listen port |
| `REFRESH_SECONDS` | `30` | Auto-refresh interval |
| `OC_BIN` | `/usr/local/bin/oc` | oc binary path |
| `DB_PATH` | `/app/data/pdb_history.db` | SQLite path |
| `CACHE_TTL_MS` | `30000` | API cache TTL |

## RBAC — What permissions are needed

The `pdb-dashboard-reader` ClusterRole grants **read-only** access to:
- `pods`, `nodes`, `namespaces` (core API)
- `poddisruptionbudgets`, `poddisruptionbudgets/status` (policy API)
- `projects` (OpenShift project API)

No write permissions granted. Safe for production clusters.

## Air-gapped / Disconnected Notes

- Replace `registry.access.redhat.com/ubi9/nodejs-22` in `Containerfile` with your mirror
- `oc` binary download in Containerfile needs internal mirror or pre-bake into base image
- BuildConfig `git.uri` → internal Gitea/GitLab URL
- `build-push.sh` works with `--tls-verify=false` for self-signed internal registries

## Disruption Calculation (mirrors shell script exactly)

```
minAvailable:   disruptionsAllowed = currentHealthy - minAvailable
maxUnavailable: disruptionsAllowed = maxUnavailable - (expectedPods - currentHealthy)
negative result → 0
```

Status thresholds:
- `BLOCKED`     — disruptionsAllowed = 0
- `LOW_HA`      — disruptionsAllowed > 0 AND pct < 30%
- `SAFE`        — pct >= 30%
- `FULL_OUTAGE` — pct = 100%

Active blocker: BLOCKED + runningPods > 0
Inactive blocker: BLOCKED + runningPods = 0 (paper blocker, eviction succeeds)
