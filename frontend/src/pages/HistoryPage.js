import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    api.get('/api/history?limit=200')
      .then(r => setHistory((r.data.data || []).reverse()))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = history.map(h => ({
    ts:       new Date(h.ts).toLocaleTimeString(),
    Blocked:  h.blocked,
    Active:   h.active_bl,
    Inactive: h.inactive_bl,
    LowHA:    h.low_ha,
    Safe:     h.safe,
    Total:    h.total,
  }));

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontFamily: '"Red Hat Display"' }}>
        Historical Trends
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: '#0066CC' }} />
        </Box>
      ) : history.length === 0 ? (
        <Paper sx={{ p: 4, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ color: 'text.secondary', fontFamily: '"Red Hat Text"', textAlign: 'center' }}>
            No history yet — snapshots auto-save every refresh cycle
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Red Hat Display"', fontWeight: 700, letterSpacing: '0.05em' }}>
            PDB STATUS OVER TIME — {history.length} snapshots
          </Typography>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="ts" tick={{ fill: theme.palette.text.secondary, fontFamily: '"Red Hat Mono", monospace', fontSize: 11 }} />
              <YAxis tick={{ fill: theme.palette.text.secondary, fontFamily: '"Red Hat Mono", monospace', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, fontFamily: '"Red Hat Mono", monospace', fontSize: 12 }}
                labelStyle={{ color: theme.palette.text.primary }}
              />
              <Legend formatter={v => <span style={{ color: theme.palette.text.primary, fontFamily: '"Red Hat Text"', fontSize: 12 }}>{v}</span>} />
              
              {/* PatternFly Chart Mappings */}
              <Line type="monotone" dataKey="Blocked"  stroke="#C9190B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Active"   stroke="#C9190B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Inactive" stroke="#8A3D85" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="LowHA"    stroke="#F0AB00" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Safe"     stroke="#3E8635" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Total"    stroke="#0066CC" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}
