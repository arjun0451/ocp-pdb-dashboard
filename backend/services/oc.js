'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const OC_BIN  = process.env.OC_BIN || 'oc';
const TIMEOUT  = parseInt(process.env.OC_TIMEOUT_MS || '30000', 10);

async function oc(...args) {
  try {
    const { stdout } = await execFileAsync(OC_BIN, args, {
      timeout: TIMEOUT,
      maxBuffer: 50 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (err) {
    const msg = err.stderr || err.message || String(err);
    throw new Error(`oc ${args.join(' ')}: ${msg}`);
  }
}

async function ocJson(...args) {
  const raw = await oc(...args, '-o', 'json');
  return JSON.parse(raw);
}

async function whoami() {
  try {
    return await oc('whoami');
  } catch {
    return 'unknown';
  }
}

async function getAllPDBs() {
  const data = await ocJson('get', 'pdb', '-A');
  return data.items || [];
}

async function getPodsForSelector(namespace, selector) {
  if (!selector) return [];
  try {
    const data = await ocJson('get', 'pods', '-n', namespace, `--selector=${selector}`);
    return (data.items || []).map(p => ({
      name:   p.metadata.name,
      node:   p.spec.nodeName || '',
      phase:  p.status.phase  || 'Unknown',
    }));
  } catch {
    return [];
  }
}

async function getPodsOnNode(nodeName) {
  try {
    const data = await ocJson('get', 'pods', '-A', `--field-selector=spec.nodeName=${nodeName}`);
    return (data.items || []).map(p => ({
      namespace: p.metadata.namespace,
      name:      p.metadata.name,
      node:      p.spec.nodeName,
      phase:     p.status.phase || 'Unknown',
    }));
  } catch {
    return [];
  }
}

async function getNodes() {
  try {
    const data = await ocJson('get', 'nodes');
    return (data.items || []).map(n => ({
      name:   n.metadata.name,
      status: (n.status?.conditions || []).find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
      roles:  Object.keys(n.metadata.labels || {})
                .filter(l => l.startsWith('node-role.kubernetes.io/'))
                .map(l => l.replace('node-role.kubernetes.io/', ''))
                .join(','),
    }));
  } catch {
    return [];
  }
}

module.exports = { oc, ocJson, whoami, getAllPDBs, getPodsForSelector, getPodsOnNode, getNodes };
