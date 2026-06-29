#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Apply OCP manifests in order
# Run from repo root: bash deploy/deploy.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NAMESPACE="pdb-dashboard"

echo "Deploying PDB Dashboard to namespace: ${NAMESPACE}"
echo ""

for f in 00-namespace 01-rbac 02-deployment; do
  echo "Applying ${f}.yaml..."
  oc apply -f "${SCRIPT_DIR}/${f}.yaml"
done

echo ""
echo "Waiting for rollout..."
oc rollout status deployment/pdb-dashboard -n "${NAMESPACE}" --timeout=120s || true

echo ""
ROUTE=$(oc get route pdb-dashboard -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
[[ -n "$ROUTE" ]] && echo "✔ Dashboard: https://${ROUTE}" || echo "Route not ready. Check: oc get route -n ${NAMESPACE}"
