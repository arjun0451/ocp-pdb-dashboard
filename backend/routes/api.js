'use strict';

const router   = require('express').Router();
const { fetchAllPDBData, drainAnalysis, getSummary } = require('../services/pdbService');
const { getNodes, whoami } = require('../services/oc');
const { getHistory, getPDBTrend } = require('../services/db');

// In-memory cache — TTL 30s
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '30000', 10);

async function getPDBsCached(includeSystem) {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) return _cache;
  _cache = await fetchAllPDBData({ includeSystem: includeSystem === 'true' });
  _cacheTs = now;
  return _cache;
}

function invalidateCache() {
  _cache = null;
  _cacheTs = 0;
}

// GET /api/pdbs
router.get('/pdbs', async (req, res) => {
  const pdbs = await getPDBsCached(req.query.includeSystem);
  let result = pdbs;

  if (req.query.namespace)   result = result.filter(p => p.namespace === req.query.namespace);
  if (req.query.pdb)         result = result.filter(p => p.name.includes(req.query.pdb));
  if (req.query.blockedOnly === 'true') result = result.filter(p => p.status === 'BLOCKED' && p.runningPods > 0);
  if (req.query.status)      result = result.filter(p => p.status === req.query.status);

  res.json({ data: result, count: result.length, cacheAge: Date.now() - _cacheTs });
});

// GET /api/pdbs/:namespace/:name
router.get('/pdbs/:namespace/:name', async (req, res) => {
  const pdbs = await getPDBsCached(req.query.includeSystem);
  const pdb  = pdbs.find(p => p.namespace === req.params.namespace && p.name === req.params.name);
  if (!pdb) return res.status(404).json({ error: 'PDB not found' });
  res.json(pdb);
});

// GET /api/summary
router.get('/summary', async (req, res) => {
  const pdbs    = await getPDBsCached(req.query.includeSystem);
  const summary = await getSummary(pdbs);
  res.json(summary);
});

// GET /api/nodes
router.get('/nodes', async (req, res) => {
  const nodes = await getNodes();
  res.json({ data: nodes });
});

// GET /api/nodes/:node/drain-analysis
router.get('/nodes/:node/drain-analysis', async (req, res) => {
  invalidateCache();
  const analysis = await drainAnalysis(req.params.node, {
    includeSystem: req.query.includeSystem === 'true',
  });
  res.json(analysis);
});

// GET /api/namespaces
router.get('/namespaces', async (req, res) => {
  const pdbs = await getPDBsCached(req.query.includeSystem);
  const ns   = [...new Set(pdbs.map(p => p.namespace))].sort();
  res.json({ data: ns });
});

// GET /api/export/csv
router.get('/export/csv', async (req, res) => {
  const pdbs = await getPDBsCached(req.query.includeSystem);
  const cols = ['namespace','name','type','minAvailable','maxUnavailable',
                 'expectedPods','currentHealthy','disruptionsAllowed','pct','status',
                 'runningPods','nonRunningPods','blockerType','selector','formula'];
  const lines = [cols.join(',')];
  for (const p of pdbs) {
    lines.push(cols.map(c => {
      const v = p[c] ?? '';
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
    }).join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pdb-report.csv"');
  res.send(lines.join('\n'));
});

// GET /api/history
router.get('/history', async (req, res) => {
  const h = getHistory(parseInt(req.query.limit || '100', 10));
  res.json({ data: h });
});

// GET /api/history/:namespace/:name
router.get('/history/:namespace/:name', async (req, res) => {
  const h = getPDBTrend(req.params.namespace, req.params.name,
              parseInt(req.query.limit || '50', 10));
  res.json({ data: h });
});

// GET /api/refresh
router.post('/refresh', async (req, res) => {
  invalidateCache();
  res.json({ ok: true, message: 'Cache invalidated' });
});

// GET /api/me
router.get('/me', async (req, res) => {
  const user = await whoami();
  res.json({ user });
});

module.exports = { router, invalidateCache };
