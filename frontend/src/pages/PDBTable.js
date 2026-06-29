import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, Switch, FormControlLabel, Collapse, IconButton,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon   from '@mui/icons-material/KeyboardArrowUp';

const STATUS_META = {
  BLOCKED:     { color: '#C9190B', bg: '#C9190B15', label: 'BLOCKED'     },
  LOW_HA:      { color: '#F0AB00', bg: '#F0AB0015', label: 'LOW-HA'      },
  SAFE:        { color: '#3E8635', bg: '#3E863515', label: 'SAFE'        },
  FULL_OUTAGE: { color: '#009596', bg: '#00959615', label: 'FULL-OUTAGE' },
};

const BLOCKER_META = {
  ACTIVE:   { color: '#C9190B', label: 'ACTIVE'   },
  INACTIVE: { color: '#8A3D85', label: 'INACTIVE' },
};

function StatusChip({ status }) {
  const m = STATUS_META[status] || { color: '#8a8d90', bg: '#8a8d9015', label: status };
  return (
    <Chip size="small" label={m.label}
      sx={{ bgcolor: m.bg, color: m.color, border: `1px solid ${m.color}44`,
            fontFamily: '"Red Hat Mono", monospace', fontSize: '0.65rem', fontWeight: 600 }} />
  );
}

function PodTable({ pods, theme }) {
  if (!pods?.length) return <Typography sx={{ color: 'text.secondary', fontFamily: '"Red Hat Text"', fontSize: '0.85rem', p: 1 }}>No pods matched</Typography>;
  return (
    <Table size="small" sx={{ '& td, & th': { fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', py: 0.5, borderColor: theme.palette.divider } }}>
      <TableHead>
        <TableRow>
          {['Pod Name', 'Node', 'Phase'].map(h => (
            <TableCell key={h} sx={{ color: 'text.secondary', fontWeight: 700 }}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {pods.map((p, i) => (
          <TableRow key={i}>
            <TableCell sx={{ color: 'text.primary' }}>{p.name}</TableCell>
            <TableCell sx={{ color: 'text.secondary' }}>{p.node || '—'}</TableCell>
            <TableCell>
              <span style={{ color: p.phase === 'Running' ? '#3E8635' : p.phase === 'Pending' ? '#F0AB00' : '#C9190B', fontWeight: 600 }}>
                {p.phase}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PDBRow({ row, theme }) {
  const [open, setOpen] = useState(false);
  const m = STATUS_META[row.status] || {};
  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          borderLeft: `3px solid ${m.color || theme.palette.divider}`,
          '&:hover': { bgcolor: '#0066CC08' },
          bgcolor: open ? '#0066CC05' : 'transparent',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <TableCell sx={{ py: 0.5, borderColor: theme.palette.divider }}>
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider, fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{row.namespace}</TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider, fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', color: 'text.primary', fontWeight: 600 }}>{row.name}</TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider, fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{row.type}</TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider, fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', textAlign: 'center' }}>{row.expectedPods}</TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider, fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', textAlign: 'center', color: '#3E8635' }}>{row.currentHealthy}</TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider, fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', textAlign: 'center', color: row.disruptionsAllowed === 0 ? '#C9190B' : 'text.primary', fontWeight: row.disruptionsAllowed === 0 ? 700 : 400 }}>
          {row.disruptionsAllowed}
        </TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider }}><StatusChip status={row.status} /></TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider, fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', color: '#3E8635' }}>{row.runningPods}</TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider, fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', color: row.nonRunningPods > 0 ? '#F0AB00' : 'text.secondary' }}>{row.nonRunningPods}</TableCell>
        <TableCell sx={{ borderColor: theme.palette.divider }}>
          {row.blockerType && (
            <Chip size="small" label={BLOCKER_META[row.blockerType]?.label}
              sx={{ bgcolor: `${BLOCKER_META[row.blockerType]?.color}15`,
                    color: BLOCKER_META[row.blockerType]?.color,
                    fontFamily: '"Red Hat Mono", monospace', fontSize: '0.65rem', fontWeight: 600 }} />
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={11} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: theme.palette.background.default, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
                SELECTOR: <span style={{ color: '#0066CC' }}>{row.selector || '<none>'}</span>
              </Typography>
              <Typography sx={{ fontFamily: '"Red Hat Mono", monospace', fontSize: '0.75rem', color: 'text.secondary', mb: 1.5 }}>
                FORMULA: <span style={{ color: '#0066CC' }}>{row.formula}</span>
              </Typography>
              <PodTable pods={row.pods} theme={theme} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function PDBTable({ pdbs, loading }) {
  const [search,      setSearch]      = useState('');
  const [filterNS,    setFilterNS]    = useState('');
  const [filterStatus,setFilterStatus]= useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [orderBy,     setOrderBy]     = useState('status');
  const [order,       setOrder]       = useState('asc');
  
  const theme = useTheme();
  const namespaces = useMemo(() => [...new Set((pdbs||[]).map(p => p.namespace))].sort(), [pdbs]);

  const sorted = useMemo(() => {
    let rows = (pdbs || [])
      .filter(p => !search     || p.name.includes(search) || p.namespace.includes(search))
      .filter(p => !filterNS   || p.namespace === filterNS)
      .filter(p => !filterStatus|| p.status === filterStatus)
      .filter(p => !blockedOnly || (p.status === 'BLOCKED' && p.runningPods > 0));

    rows.sort((a, b) => {
      const STATUS_ORDER = { BLOCKED: 0, LOW_HA: 1, FULL_OUTAGE: 2, SAFE: 3 };
      if (orderBy === 'status') {
        const diff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
        return order === 'asc' ? diff : -diff;
      }
      const av = a[orderBy] ?? '', bv = b[orderBy] ?? '';
      return order === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
    return rows;
  }, [pdbs, search, filterNS, filterStatus, blockedOnly, orderBy, order]);

  const toggleSort = col => {
    if (orderBy === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setOrderBy(col); setOrder('asc'); }
  };

  const SH = ({ col, label }) => (
    <TableSortLabel
      active={orderBy === col}
      direction={orderBy === col ? order : 'asc'}
      onClick={() => toggleSort(col)}
      sx={{ color: 'text.secondary !important', '&.Mui-active': { color: '#0066CC !important' },
            fontFamily: '"Red Hat Display", sans-serif', fontSize: '0.75rem', fontWeight: 700 }}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontFamily: '"Red Hat Display"' }}>
        PDB Inventory
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search name / namespace…"
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ width: 260, '& input': { fontFamily: '"Red Hat Text", sans-serif', fontSize: '0.85rem' } }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ fontFamily: '"Red Hat Text", sans-serif', fontSize: '0.85rem' }}>Namespace</InputLabel>
          <Select value={filterNS} label="Namespace" onChange={e => setFilterNS(e.target.value)}
            sx={{ fontFamily: '"Red Hat Text", sans-serif', fontSize: '0.85rem' }}>
            <MenuItem value="">All</MenuItem>
            {namespaces.map(n => <MenuItem key={n} value={n} sx={{ fontFamily: '"Red Hat Text", sans-serif', fontSize: '0.85rem' }}>{n}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontFamily: '"Red Hat Text", sans-serif', fontSize: '0.85rem' }}>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}
            sx={{ fontFamily: '"Red Hat Text", sans-serif', fontSize: '0.85rem' }}>
            <MenuItem value="">All</MenuItem>
            {['BLOCKED','LOW_HA','SAFE','FULL_OUTAGE'].map(s => (
              <MenuItem key={s} value={s} sx={{ fontFamily: '"Red Hat Text", sans-serif', fontSize: '0.85rem' }}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch size="small" checked={blockedOnly} onChange={e => setBlockedOnly(e.target.checked)} color="error" />}
          label={<Typography sx={{ fontFamily: '"Red Hat Text", sans-serif', fontSize: '0.85rem', color: 'text.secondary' }}>Active blockers only</Typography>}
        />
        <Typography sx={{ ml: 'auto', fontFamily: '"Red Hat Mono", monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
          {sorted.length} / {(pdbs||[]).length} PDBs
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 280px)', bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} sx={{ color: '#0066CC' }} />
          </Box>
        )}
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: theme.palette.mode === 'dark' ? '#151515' : '#f5f5f5', borderBottom: `1px solid ${theme.palette.divider}` } }}>
              <TableCell width={40} />
              <TableCell><SH col="namespace"          label="NAMESPACE"    /></TableCell>
              <TableCell><SH col="name"               label="PDB NAME"     /></TableCell>
              <TableCell><SH col="type"               label="TYPE"         /></TableCell>
              <TableCell align="center"><SH col="expectedPods"   label="EXPECTED"  /></TableCell>
              <TableCell align="center"><SH col="currentHealthy" label="HEALTHY"   /></TableCell>
              <TableCell align="center"><SH col="disruptionsAllowed" label="DISRUPTIONS" /></TableCell>
              <TableCell><SH col="status"             label="STATUS"       /></TableCell>
              <TableCell><SH col="runningPods"        label="RUNNING"      /></TableCell>
              <TableCell><SH col="nonRunningPods"     label="NOT-RUN"      /></TableCell>
              <TableCell sx={{ color: 'text.secondary', fontFamily: '"Red Hat Display", sans-serif', fontSize: '0.75rem', fontWeight: 700 }}>BLOCKER</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((row) => <PDBRow key={`${row.namespace}/${row.name}`} row={row} theme={theme} />)}
            {!loading && sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary', fontFamily: '"Red Hat Text", sans-serif', borderColor: theme.palette.divider }}>
                  No PDBs match filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
