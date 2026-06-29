import React from 'react';
import { Box, Grid, Paper, Typography, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const KPI = ({ label, value, color, sub, theme }) => (
  <Paper sx={{ p: 2.5, borderTop: `4px solid ${color}`, border: `1px solid ${theme.palette.divider}`, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Red Hat Mono"', letterSpacing: '0.05em' }}>
      {label}
    </Typography>
    <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2, mt: 0.5, flexGrow: 1 }}>
      {value ?? '—'}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{sub}</Typography>
  </Paper>
);

export default function SummaryPage({ summary, pdbs, loading }) {
  const theme = useTheme();

  if (loading && !summary) {
    return <Grid container spacing={2}>{[...Array(6)].map((_, i) => (
      <Grid item xs={6} md={4} lg={2} key={i}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
      </Grid>
    ))}</Grid>;
  }

  const s = summary || {};

  // Distinct PatternFly Colors for the Chart
  const pieData = [
    { name: 'Active Blockers',   value: s.activeBlockers  || 0, color: '#C9190B' }, // Red
    { name: 'Inactive Blockers', value: s.inactiveBlockers|| 0, color: '#8A3D85' }, // Purple
    { name: 'Low HA',            value: s.lowHa           || 0, color: '#F0AB00' }, // Orange
    { name: 'Safe',              value: s.safe            || 0, color: '#3E8635' }, // Green
    { name: 'Full Outage',       value: s.fullOutage      || 0, color: '#009596' }, // Cyan
  ].filter(d => d.value > 0);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, color: 'text.primary', fontFamily: '"Red Hat Display"' }}>
        Cluster PDB Overview
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
        <Grid item xs={6} md={2}><KPI theme={theme} label="TOTAL PDBs"       value={s.total}           color="#0066CC" sub="Across all namespaces" /></Grid>
        <Grid item xs={6} md={2}><KPI theme={theme} label="BLOCKED"          value={s.blocked}         color="#C9190B" sub="disruptionsAllowed=0" /></Grid>
        <Grid item xs={6} md={2}><KPI theme={theme} label="ACTIVE BLOCKERS"  value={s.activeBlockers}  color="#C9190B" sub="Running pods present" /></Grid>
        <Grid item xs={6} md={2}><KPI theme={theme} label="INACTIVE BLOCKERS"value={s.inactiveBlockers}color="#8A3D85" sub="No Running pods" /></Grid>
        <Grid item xs={6} md={2}><KPI theme={theme} label="LOW HA"           value={s.lowHa}           color="#F0AB00" sub="<30% disruptions" /></Grid>
        <Grid item xs={6} md={2}><KPI theme={theme} label="SAFE"             value={s.safe}            color="#3E8635" sub="≥30% disruptions" /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 320, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Red Hat Display"', fontWeight: 700 }}>
              STATUS DISTRIBUTION
            </Typography>
            {pieData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                <Typography sx={{ color: 'text.secondary' }}>No data</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={90} strokeWidth={0}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 4 }}
                    itemStyle={{ color: theme.palette.text.primary }}
                  />
                  <Legend formatter={v => <span style={{ color: theme.palette.text.primary, fontFamily: '"Red Hat Text"', fontSize: '0.85rem' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 320, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Red Hat Display"', fontWeight: 700 }}>
              ⚠ ACTIVE BLOCKERS — REQUIRE ATTENTION
            </Typography>
            <Box sx={{ mt: 2 }}>
              {(pdbs || []).filter(p => p.blockerType === 'ACTIVE').length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                  <Typography sx={{ color: '#3E8635', fontFamily: '"Red Hat Text"' }}>✔ No active blockers</Typography>
                </Box>
              ) : (
                (pdbs || []).filter(p => p.blockerType === 'ACTIVE').map((p, i) => (
                  <Box key={i} sx={{
                    p: 1.5, mb: 1.5, borderRadius: 1,
                    bgcolor: '#C9190B11', borderLeft: '3px solid #C9190B', borderRight: `1px solid ${theme.palette.divider}`, borderTop: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <Box>
                      <Typography sx={{ fontFamily: '"Red Hat Mono"', fontSize: '0.85rem', color: 'text.primary', fontWeight: 600 }}>{p.name}</Typography>
                      <Typography sx={{ fontFamily: '"Red Hat Mono"', fontSize: '0.75rem', color: 'text.secondary' }}>{p.namespace}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontFamily: '"Red Hat Text"', fontSize: '0.8rem', color: '#C9190B', fontWeight: 600 }}>{p.runningPods} running pod(s)</Typography>
                      <Typography sx={{ fontFamily: '"Red Hat Mono"', fontSize: '0.75rem', color: 'text.secondary' }}>{p.formula?.split('=')[0]?.trim()}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
