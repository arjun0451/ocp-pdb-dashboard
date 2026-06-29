# =============================================================================
# Stage 1 — Build React frontend
# =============================================================================
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS frontend-builder

# Run as root to fix the directory permission (EACCES) error
USER 0

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json* ./

# Install standard dependencies, then explicitly force compatible ajv versions
RUN npm install --legacy-peer-deps && \
    npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --legacy-peer-deps

COPY frontend/ ./

# Build the React app for production
RUN npm run build

# =============================================================================
# Stage 2 — oc binary (copy from local, avoid any network download)
# Place the linux/amd64 oc binary at ./oc next to this Containerfile before building.
# =============================================================================
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS oc-provider

USER 0
COPY oc /usr/local/bin/oc
RUN chmod +x /usr/local/bin/oc && \
    /usr/local/bin/oc version --client

# =============================================================================
# Stage 3 — Backend runtime
# =============================================================================
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS runtime

# Non-root user required by OpenShift restricted SCC
USER 0
RUN mkdir -p /app/data && chown -R 1001:0 /app && chmod -R g=u /app

# Change WORKDIR to match the repository structure so server.js finds the frontend
WORKDIR /app/backend

# Install backend deps as root so node_modules owned correctly
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps && \
    chown -R 1001:0 /app && chmod -R g=u /app

# Copy backend source
COPY backend/ ./

# Copy React build output to the EXACT relative path server.js expects
COPY --from=frontend-builder /build/frontend/build /app/frontend/build

# Copy oc binary from oc-provider stage
COPY --from=oc-provider /usr/local/bin/oc /usr/local/bin/oc

# Fix final ownership
RUN chown -R 1001:0 /app && chmod -R g=u /app
USER 1001

# Data dir for SQLite — mount a PVC here in OCP
VOLUME ["/app/data"]

ENV NODE_ENV=production \
    PORT=3001 \
    REFRESH_SECONDS=30 \
    OC_BIN=/usr/local/bin/oc \
    DB_PATH=/app/data/pdb_history.db

EXPOSE 3001

# Point the health check to the now-functioning root path
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:3001/ || exit 1

CMD ["node", "server.js"]
