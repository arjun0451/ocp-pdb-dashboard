'use strict';

/**
 * Mirrors shell script disruption math exactly.
 * minAvailable:  disruptionsAllowed = currentHealthy - minAvailable
 * maxUnavailable: disruptionsAllowed = maxUnavailable - (expectedPods - currentHealthy)
 * Negative → 0.
 */
function calcDisruptions(pdb) {
  const spec = pdb.spec || {};
  const status = pdb.status || {};

  const expected = status.expectedPods ?? 0;
  const healthy  = status.currentHealthy ?? 0;
  const minA     = spec.minAvailable;
  const maxU     = spec.maxUnavailable;

  let type, calc, formula;

  if (minA != null) {
    const minANum = typeof minA === 'string' ? parseInt(minA, 10) : minA;
    calc    = healthy - minANum;
    type    = 'minAvailable';
    formula = `disruptionsAllowed = currentHealthy(${healthy}) - minAvailable(${minANum}) = ${healthy - minANum}`;
  } else if (maxU != null) {
    const maxUNum = typeof maxU === 'string' ? parseInt(maxU, 10) : maxU;
    calc    = maxUNum - (expected - healthy);
    type    = 'maxUnavailable';
    formula = `disruptionsAllowed = maxUnavailable(${maxUNum}) - (expectedPods(${expected}) - currentHealthy(${healthy})) = ${maxUNum - (expected - healthy)}`;
  } else {
    calc    = 0;
    type    = 'none';
    formula = 'N/A (no minAvailable or maxUnavailable set)';
  }

  const disruptionsAllowed = Math.max(0, calc);
  const pct = expected === 0 ? 0 : Math.floor((disruptionsAllowed / expected) * 100 + 0.5);

  let status_color;
  if (disruptionsAllowed === 0)  status_color = 'BLOCKED';
  else if (pct === 100)          status_color = 'FULL_OUTAGE';
  else if (pct < 30)             status_color = 'LOW_HA';
  else                           status_color = 'SAFE';

  const sel = spec.selector?.matchLabels ?? {};
  const selector = Object.entries(sel).map(([k, v]) => `${k}=${v}`).join(',');

  return {
    namespace:           pdb.metadata.namespace,
    name:                pdb.metadata.name,
    type,
    minAvailable:        minA ?? null,
    maxUnavailable:      maxU ?? null,
    expectedPods:        expected,
    currentHealthy:      healthy,
    disruptionsAllowed,
    pct,
    status:              status_color,
    selector,
    formula,
  };
}

/**
 * Classify active vs inactive blocker after pod data attached.
 * active:   disruptionsAllowed=0 AND runningPods > 0
 * inactive: disruptionsAllowed=0 AND runningPods = 0
 */
function classifyBlocker(pdbResult) {
  if (pdbResult.status !== 'BLOCKED') return null;
  return pdbResult.runningPods > 0 ? 'ACTIVE' : 'INACTIVE';
}

module.exports = { calcDisruptions, classifyBlocker };
