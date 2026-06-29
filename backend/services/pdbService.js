'use strict';
const { getAllPDBs, getPodsForSelector, getPodsOnNode, getNodes } = require('./oc');
const { calcDisruptions, classifyBlocker } = require('../calculations/pdb');
const db = require('./db');

const SYSTEM_NS_RE = /^openshift(-|$)|^kube(-|$)|^default$|^openshift$/;

// Helper: split a large array into smaller chunks
function chunkArray(array, size) {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

async function fetchAllPDBData({ includeSystem = false } = {}) {
  const raw = await getAllPDBs();
  const items = raw.filter(p =>
    includeSystem ? true : !SYSTEM_NS_RE.test(p.metadata.namespace)
  );

  const results = [];
  
  // THROTTLE: Only spawn 5 concurrent `oc` shell processes at a time
  const CONCURRENCY_LIMIT = 5;
  const chunks = chunkArray(items, CONCURRENCY_LIMIT);

  for (const chunk of chunks) {
    // Process one batch of 5
    const chunkResults = await Promise.all(chunk.map(async pdb => {
      const calc = calcDisruptions(pdb);
      let pods = [];
      if (calc.selector) {
        pods = await getPodsForSelector(calc.namespace, calc.selector);
      }
      const runningPods    = pods.filter(p => p.phase === 'Running').length;
      const nonRunningPods = pods.filter(p => p.phase !== 'Running').length;

      const result = { ...calc, pods, runningPods, nonRunningPods };
      result.blockerType = classifyBlocker(result);
      return result;
    }));
    
    // Append batch results to main array
    results.push(...chunkResults);
  }

  return results;
}

async function drainAnalysis(nodeName, { includeSystem = false } = {}) {
  const [podsOnNode, allPDBs] = await Promise.all([
    getPodsOnNode(nodeName),
    fetchAllPDBData({ includeSystem }),
  ]);

  const affectedNs = new Set(podsOnNode.map(p => p.namespace));
  const affectedPDBs = allPDBs.filter(p => affectedNs.has(p.namespace));

  const activeBlockers   = affectedPDBs.filter(p => p.blockerType === 'ACTIVE');
  const inactiveBlockers = affectedPDBs.filter(p => p.blockerType === 'INACTIVE');

  let verdict;
  if (activeBlockers.length === 0 && affectedPDBs.filter(p => p.status === 'BLOCKED').length === 0) {
    verdict = 'CLEAR_TO_DRAIN';
  } else if (activeBlockers.length === 0 && inactiveBlockers.length > 0) {
    verdict = 'CLEAR_TO_DRAIN';
  } else {
    verdict = 'DRAIN_BLOCKED';
  }

  return {
    node:             nodeName,
    verdict,
    activeBlockers:   activeBlockers.length,
    inactiveBlockers: inactiveBlockers.length,
    affectedNamespaces: [...affectedNs],
    podsOnNode:       podsOnNode.length,
    pdbs:             affectedPDBs,
    blockers:         affectedPDBs.filter(p => p.status === 'BLOCKED'),
  };
}

async function getSummary(pdbs) {
  const summary = {
    total:           pdbs.length,
    blocked:         pdbs.filter(p => p.status === 'BLOCKED').length,
    activeBlockers:  pdbs.filter(p => p.blockerType === 'ACTIVE').length,
    inactiveBlockers:pdbs.filter(p => p.blockerType === 'INACTIVE').length,
    lowHa:           pdbs.filter(p => p.status === 'LOW_HA').length,
    safe:            pdbs.filter(p => p.status === 'SAFE').length,
    fullOutage:      pdbs.filter(p => p.status === 'FULL_OUTAGE').length,
    timestamp:       new Date().toISOString(),
  };
  return summary;
}

async function snapshotToDB(pdbs) {
  try {
    const summary = await getSummary(pdbs);
    db.saveSnapshot(summary, pdbs);
  } catch (e) {
    console.error('DB snapshot failed:', e.message);
  }
}

module.exports = { fetchAllPDBData, drainAnalysis, getSummary, snapshotToDB };
