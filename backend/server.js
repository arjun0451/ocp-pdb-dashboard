'use strict';

require('express-async-errors');
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const http      = require('http');
const path      = require('path');
const { WebSocketServer } = require('ws');
const cron      = require('node-cron');

const { router: apiRouter, invalidateCache } = require('./routes/api');
const { fetchAllPDBData, getSummary, snapshotToDB } = require('./services/pdbService');

const PORT       = parseInt(process.env.PORT || '3001', 10);
const REFRESH_S  = parseInt(process.env.REFRESH_SECONDS || '30', 10);
const STATIC_DIR = path.join(__dirname, '../frontend/build');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());

// API
app.use('/api', apiRouter);

// Serve React build in production
const fs = require('fs');
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get('*', (req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
}

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const server = http.createServer(app);

// WebSocket — push summary to all clients on refresh
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', ws => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const c of clients) {
    if (c.readyState === 1) c.send(msg);
  }
}

// Background refresh cycle
async function refreshCycle() {
  try {
    invalidateCache();
    const pdbs    = await fetchAllPDBData();
    const summary = await getSummary(pdbs);
    await snapshotToDB(pdbs);
    broadcast({ type: 'REFRESH', summary, ts: new Date().toISOString() });
    console.log(`[${new Date().toISOString()}] Refresh done — ${pdbs.length} PDBs`);
  } catch (e) {
    console.error('Refresh error:', e.message);
    broadcast({ type: 'ERROR', message: e.message });
  }
}

// Run on schedule
const cronExpr = `*/${REFRESH_S} * * * * *`;
cron.schedule(cronExpr, refreshCycle);

server.listen(PORT, () => {
  console.log(`PDB Dashboard backend listening on :${PORT}`);
  console.log(`Auto-refresh every ${REFRESH_S}s`);
  // Initial fetch
  refreshCycle().catch(console.error);
});
