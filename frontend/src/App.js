import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Box, AppBar, Toolbar, Typography, Chip, IconButton,
         Drawer, List, ListItem, ListItemIcon, ListItemText,
         Tooltip } from '@mui/material';
import DashboardIcon    from '@mui/icons-material/Dashboard';
import TableViewIcon    from '@mui/icons-material/TableView';
import StorageIcon      from '@mui/icons-material/Storage';
import TimelineIcon     from '@mui/icons-material/Timeline';
import RefreshIcon      from '@mui/icons-material/Refresh';
import PersonIcon       from '@mui/icons-material/Person';
import DownloadIcon     from '@mui/icons-material/Download';
import Brightness4Icon  from '@mui/icons-material/Brightness4';
import Brightness7Icon  from '@mui/icons-material/Brightness7';

import SummaryPage  from './pages/SummaryPage';
import PDBTable     from './pages/PDBTable';
import NodeDrain    from './pages/NodeDrain';
import HistoryPage  from './pages/HistoryPage';
import api          from './services/api';

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary:    { main: '#EE0000' }, 
    background: { 
      default: mode === 'dark' ? '#0f1214' : '#f0f4f7', 
      paper:   mode === 'dark' ? '#1b1d21' : '#ffffff' 
    },
    text: { 
      primary:   mode === 'dark' ? '#e0e0e0' : '#151515', 
      secondary: mode === 'dark' ? '#b8bbbe' : '#6a6e73' 
    },
    divider: mode === 'dark' ? '#3c3f42' : '#d2d2d2',
  },
  typography: {
    fontFamily: '"Red Hat Text", "Overpass", sans-serif',
    h6: { fontFamily: '"Red Hat Display", sans-serif', fontWeight: 700 },
  },
  components: {
    MuiPaper:     { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip:      { styleOverrides: { root: { fontFamily: '"Red Hat Mono", monospace', fontWeight: 600 } } },
  },
});

const NAV = [
  { id: 'summary',  label: 'Overview',     icon: <DashboardIcon /> },
  { id: 'pdbs',     label: 'PDB Table',    icon: <TableViewIcon /> },
  { id: 'drain',    label: 'Node Drain',   icon: <StorageIcon /> },
  { id: 'history',  label: 'History',      icon: <TimelineIcon /> },
];

export default function App() {
  const [mode,     setMode]     = useState('dark');
  const [page,     setPage]     = useState('summary');
  const [pdbs,     setPdbs]     = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [user,     setUser]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [lastTs,   setLastTs]   = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting');

  const theme = useMemo(() => getTheme(mode), [mode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pdbRes, sumRes, meRes] = await Promise.all([
        api.get('/api/pdbs'),
        api.get('/api/summary'),
        api.get('/api/me'),
      ]);
      setPdbs(pdbRes.data.data);
      setSummary(sumRes.data);
      setUser(meRes.data.user);
      setLastTs(new Date().toISOString());
    } catch (e) {
      console.error('Load failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onopen    = () => setWsStatus('connected');
    ws.onclose   = () => setWsStatus('disconnected');
    ws.onerror   = () => setWsStatus('error');
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'REFRESH') {
          setSummary(msg.summary);
          setLastTs(msg.ts);
          load();
        }
      } catch {}
    };
    return () => ws.close();
  }, [load]);

  const WsChip = () => (
    <Chip
      size="small"
      label={wsStatus === 'connected' ? 'LIVE' : wsStatus.toUpperCase()}
      sx={{
        bgcolor: wsStatus === 'connected' ? '#3E863522' : '#C9190B22',
        color:   wsStatus === 'connected' ? '#3E8635'   : '#C9190B',
        border:  `1px solid ${wsStatus === 'connected' ? '#3E863544' : '#C9190B44'}`,
        fontSize: '0.65rem',
      }}
    />
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: 220, flexShrink: 0,
            '& .MuiDrawer-paper': { width: 220, bgcolor: 'background.paper', borderRight: `1px solid ${theme.palette.divider}`, pt: 1 },
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, mb: 1 }}>
            <Typography variant="h6" sx={{ color: '#EE0000', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
              PDB DASHBOARD
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>OpenShift Operations</Typography>
          </Box>
          <List dense>
            {NAV.map(n => (
              <ListItem
                key={n.id} onClick={() => setPage(n.id)}
                sx={{
                  cursor: 'pointer', borderRadius: 1, mx: 1, mb: 0.5,
                  bgcolor: page === n.id ? '#EE000011' : 'transparent',
                  borderLeft: page === n.id ? '3px solid #EE0000' : '3px solid transparent',
                  '&:hover': { bgcolor: '#EE00000A' },
                }}
              >
                <ListItemIcon sx={{ color: page === n.id ? '#EE0000' : 'text.secondary', minWidth: 36 }}>
                  {n.icon}
                </ListItemIcon>
                <ListItemText
                  primary={n.label}
                  primaryTypographyProps={{
                    fontSize: '0.85rem', fontWeight: page === n.id ? 700 : 400,
                    color: page === n.id ? 'text.primary' : 'text.secondary',
                  }}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ mt: 'auto', p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <WsChip />
            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Red Hat Mono"', fontSize: '0.75rem' }}>
                  {user}
                </Typography>
              </Box>
            )}
          </Box>
        </Drawer>

        {/* Main */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Toolbar variant="dense" sx={{ gap: 1 }}>
              <Typography sx={{ flex: 1, color: 'text.secondary', fontFamily: '"Red Hat Mono"', fontSize: '0.8rem' }}>
                {lastTs ? `Last refresh: ${new Date(lastTs).toLocaleTimeString()}` : 'Loading...'}
              </Typography>
              
              <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}>
                <IconButton size="small" onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')} sx={{ color: 'text.secondary' }}>
                  {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Export CSV">
                <IconButton size="small" onClick={() => window.open('/api/export/csv', '_blank')} sx={{ color: 'text.secondary' }}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={load} sx={{ color: 'text.secondary' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
            {page === 'summary' && <SummaryPage summary={summary} pdbs={pdbs} loading={loading} />}
            {page === 'pdbs'    && <PDBTable    pdbs={pdbs} loading={loading} />}
            {page === 'drain'   && <NodeDrain />}
            {page === 'history' && <HistoryPage />}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
