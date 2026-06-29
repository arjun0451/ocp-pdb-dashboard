#!/usr/bin/env bash
# =============================================================================
# build.sh — Build PDB Dashboard container image with Podman
#
# Usage:
#   ./build.sh [--tag=<image:tag>] [--platform=<platform>]
#
# Defaults:
#   tag      : pdb-dashboard:latest
#   platform : linux/amd64
#
# Pre-requisite:
#   ./oc  (linux/amd64 binary) must exist in the same directory as Containerfile
#
# After build, tag and push manually:
#   podman tag pdb-dashboard:latest <your-quay>/pdb-dashboard:<tag>
#   podman push <your-quay>/pdb-dashboard:<tag>
# =============================================================================
set -euo pipefail

TAG="pdb-dashboard:latest"
PLATFORM="linux/amd64"

for arg in "$@"; do
  case "$arg" in
    --tag=*)      TAG="${arg#--tag=}" ;;
    --platform=*) PLATFORM="${arg#--platform=}" ;;
    --help)
      echo "Usage: $0 [--tag=<image:tag>] [--platform=linux/amd64]"
      echo ""
      echo "Examples:"
      echo "  ./build.sh"
      echo "  ./build.sh --tag=pdb-dashboard:v1.2"
      echo "  ./build.sh --tag=quay.psa.example.com/ops/pdb-dashboard:v1.2"
      exit 0 ;;
    *)
      echo "Unknown arg: $arg  (run with --help)" >&2; exit 1 ;;
  esac
done

# Must be run from repo root (where Containerfile lives)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Pre-flight: oc binary present
if [[ ! -f "./oc" ]]; then
  echo "ERROR: ./oc not found. Place the linux/amd64 oc binary next to Containerfile."
  exit 1
fi

echo "Building image  : ${TAG}"
echo "Platform        : ${PLATFORM}"
echo "oc binary       : $(file ./oc | cut -d: -f2 | xargs)"
echo ""

podman build \
  --platform "${PLATFORM}" \
  --file Containerfile \
  --tag "${TAG}" \
  .

echo ""
echo "✔ Build complete: ${TAG}"
echo ""
echo "Tag and push when ready:"
echo "  podman tag ${TAG} <your-quay-host>/<org>/pdb-dashboard:<version>"
echo "  podman push <your-quay-host>/<org>/pdb-dashboard:<version>"
