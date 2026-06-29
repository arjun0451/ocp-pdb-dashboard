import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Autocomplete,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import api from '../services/api';

const STATUS_META = {
  BLOCKED:     { color: '#C9190B' },
  LOW_HA:      { color: '#F0AB00' },
  SAFE:        { color: '#3E8635' },
  FULL_OUTAGE: { color: '#009596' },
};

export default function NodeDrain() {
  const [nodes,    setNodes]    = useState([]);
  const [selected, setSelected] = useState('');
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const theme = useTheme();

  useEffect(() => {
    api.get('/api/nodes').then(r => setNodes(r.data.data || [])).catch(() => {});
  }, []);

  const analyze = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await api.get(`/api/nodes/${encodeURIComponent(selected)}/drain-analysis`);
      setResult(r.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const verdictColor = result?.verdict === 'CLEAR_TO_DRAIN' ? '#3E8635' : '#C9190B';
  const verdictLabel = result?.verdict === 'CLEAR_TO_DRAIN' ? '✔  CLEAR TO DRAIN' : '✘  DRAIN BLOCKED';

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontFamily: '"Red Hat Display"' }}>
        Node Drain Simulator
      </Typography>

      <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Autocomplete
            options={nodes.map(n => n.name)}
            value={selected}
            onChange={(_, v) => setSelected(v || '')}
            freeSolo
            sx={{ width: 480 }}
            renderInput={params => (
              <TextField {...params} size="small" label="Select or type node name"
                sx={{ '& input': { fontFamily: '"Red Hat Mono", monospace', fontSize: '0.85rem' } }} />
            )}
          />
          <Button
            variant="contained" startIcon={loading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
            onClick={analyze} disabled={!selected || loading}
            sx={{ bgcolor: '#0066CC', color: '#fff', fontWeight: 700, fontFamily: '"Red Hat Text"', '&:hover': { bgcolor: '#004080' } }}
          >
            ANALYZE
          </Button>
        </Box>

        {nodes.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {nodes.map(n => (
              <Chip key={n.name} size="small" label={`${n.name} [${n.roles}]`}
                onClick={() => setSelected(n.name)}
                sx={{
                  fontFamily: '"Red Hat Mono", monospace', fontSize: '0.7rem', cursor: 'pointer',
                  bgcolor: n.name === selected ? '#0066CC22' : theme.palette.background.default,
                  color: n.name === selected ? '#0066CC' : 'text.secondary',
                  border: `1px solid ${n.name === selected ? '#0066CC' : theme.palette.divider}`,
                }}
              />
            ))}
          </Box>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, fontFamily: '"Red Hat Text"', fontSize: '0.85rem' }}>{error}</Alert>}

      {result && (
        <>
          <Paper sx={{ p: 2.5, mb: 2, bgcolor: `${verdictColor}11`, border: `1px solid ${verdictColor}44` }}>
            <Typography sx={{ fontFamily: '"Red Hat Display"', fontSize: '1.2rem', fontWeight: 700, color: verdictColor, mb: 0.5 }}>
              {verdictLabel}
            </Typography>
            <Typography sx={{ fontFamily: '"Red Hat Mono"', fontSize: '0.8rem', color: 'text.secondary' }}>
              Node: {result.node}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, mt: 1.5, flexWrap: 'wrap' }}>
              {[
                { label: 'Pods on node',       value: result.podsOnNode,        color: '#0066CC' },
                { label: 'Affected namespaces', value: result.affectedNamespaces?.length, color: 'text.secondary' },
                { label: 'Affected PDBs',       value: result.pdbs?.length,      color: '#F0AB00' },
                { label: 'Active blockers',     value: result.activeBlockers,    color: '#C9190B' },
                { label: 'Inactive blockers',   value: result.inactiveBlockers,  color: '#8A3D85' },
              ].map(s => (
                <Box key={s.label} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontFamily: '"Red Hat Mono"', fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</Typography>
                  <Typography sx={{ fontFamily: '"Red Hat Text"', fontSize: '0.75rem', color: 'text.secondary' }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {result.pdbs?.length > 0 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: theme.palette.mode === 'dark' ? '#151515' : '#f5f5f5', fontFamily: '"Red Hat Display"', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700 } }}>
                    <TableCell>NAMESPACE</TableCell>
                    <TableCell>PDB NAME</TableCell>
                    <TableCell>STATUS</TableCell>
                    <TableCell align="center">DISRUPTIONS</TableCell>
                    <TableCell align="center">RUNNING PODS</TableCell>
                    <TableCell>BLOCKER</TableCell>
                    <TableCell>IMPACT</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.pdbs.map((p, i) => {
                    const c = STATUS_META[p.status]?.color || '#8a8d90';
                    const isBlocker = p.blockerType === 'ACTIVE';
                    return (
                      <TableRow key={i} sx={{ bgcolor: isBlocker ? '#C9190B0A' : 'transparent' }}>
                        <TableCell sx={{ fontFamily: '"Red Hat Mono"', fontSize: '0.75rem', color: 'text.secondary', borderColor: theme.palette.divider }}>{p.namespace}</TableCell>
                        <TableCell sx={{ fontFamily: '"Red Hat Mono"', fontSize: '0.75rem', color: 'text.primary', fontWeight: 600, borderColor: theme.palette.divider }}>{p.name}</TableCell>
                        <TableCell sx={{ borderColor: theme.palette.divider }}>
                          <Chip size="small" label={p.status}
                            sx={{ bgcolor: `${c}15`, color: c, fontFamily: '"Red Hat Mono"', fontSize: '0.65rem', fontWeight: 600 }} />
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: '"Red Hat Mono"', fontSize: '0.75rem', color: p.disruptionsAllowed === 0 ? '#C9190B' : '#3E8635', fontWeight: 700, borderColor: theme.palette.divider }}>
                          {p.disruptionsAllowed}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: '"Red Hat Mono"', fontSize: '0.75rem', color: '#3E8635', borderColor: theme.palette.divider }}>{p.runningPods}</TableCell>
                        <TableCell sx={{ borderColor: theme.palette.divider }}>
                          {p.blockerType && (
                            <Chip size="small" label={p.blockerType}
                              sx={{ bgcolor: `${p.blockerType === 'ACTIVE' ? '#C9190B' : '#8A3D85'}15`,
                                    color: p.blockerType === 'ACTIVE' ? '#C9190B' : '#8A3D85',
                                    fontFamily: '"Red Hat Mono"', fontSize: '0.65rem', fontWeight: 600 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontFamily: '"Red Hat Text"', fontSize: '0.75rem', color: isBlocker ? '#C9190B' : 'text.secondary', fontWeight: isBlocker ? 600 : 400, borderColor: theme.palette.divider }}>
                          {isBlocker ? '⚠ Will block drain' : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}
