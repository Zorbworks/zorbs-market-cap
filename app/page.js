'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function Home() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [changes, setChanges] = useState({ hours7: null, days7: null, weeks7: null, days77: null, all: null });
  const [zorb, setZorb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('days7');
  const [darkMode, setDarkMode] = useState(true);

  const theme = darkMode ? {
    bg: '#0a0a0a',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.5)',
    textDim: 'rgba(255,255,255,0.3)',
    border: 'rgba(255,255,255,0.15)',
    card: 'rgba(255,255,255,0.05)',
    cardHover: 'rgba(255,255,255,0.1)',
    green: '#4ade80',
    red: '#f87171',
    chartLine: '#ffffff',
    chartFill: 'rgba(255,255,255,0.1)',
  } : {
    bg: '#fafafa',
    text: '#0a0a0a',
    textMuted: 'rgba(0,0,0,0.5)',
    textDim: 'rgba(0,0,0,0.3)',
    border: 'rgba(0,0,0,0.1)',
    card: 'rgba(0,0,0,0.03)',
    cardHover: 'rgba(0,0,0,0.08)',
    green: '#16a34a',
    red: '#dc2626',
    chartLine: '#0a0a0a',
    chartFill: 'rgba(0,0,0,0.05)',
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/floor?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch');
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/history?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const result = await response.json();
      if (response.ok) {
        setHistory(result.history || []);
        setChanges(result.changes || { hours7: null, days7: null, weeks7: null, days77: null, all: null });
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const fetchZorb = async () => {
    try {
      const response = await fetch(`/api/zorb?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const result = await response.json();
      if (response.ok) {
        setZorb(result);
      }
    } catch (err) {
      console.error('Failed to fetch Zorb:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHistory();
    fetchZorb();
    
    const dataInterval = setInterval(fetchData, 30000);
    const historyInterval = setInterval(fetchHistory, 60000);
    const zorbInterval = setInterval(fetchZorb, 60000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(historyInterval);
      clearInterval(zorbInterval);
    };
  }, []);

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '—';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(4);
    if (num < 100) return num.toFixed(2);
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const formatPercent = (num) => {
    if (num === null || num === undefined) return '—';
    const prefix = num >= 0 ? '+' : '';
    return `${prefix}${num.toFixed(2)}%`;
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getPeriodMs = (period) => {
    switch (period) {
      case 'hours7': return 7 * 3600000;        // 7 hours
      case 'days7': return 7 * 86400000;        // 7 days
      case 'weeks7': return 49 * 86400000;      // 7 weeks (49 days)
      case 'days77': return 77 * 86400000;      // 77 days
      case 'all': return 365 * 86400000;        // 1 year (effectively all data)
      default: return 7 * 86400000;
    }
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'hours7': return '7H';
      case 'days7': return '7D';
      case 'weeks7': return '7W';
      case 'days77': return '77D';
      case 'all': return 'ALL';
      default: return '7D';
    }
  };

  const filterHistoryByPeriod = () => {
    if (!history || history.length === 0) return [];
    
    // For 'all', return entire history
    if (selectedPeriod === 'all') {
      // Sample if too many points
      if (history.length > 200) {
        const sampled = [];
        const step = Math.floor(history.length / 200);
        for (let i = 0; i < history.length; i += step) {
          sampled.push(history[i]);
        }
        sampled.push(history[history.length - 1]);
        return sampled;
      }
      return history;
    }
    
    const now = Date.now();
    const periodMs = getPeriodMs(selectedPeriod);
    const cutoff = now - periodMs;
    
    const filtered = history.filter(point => {
      const ts = point.timestamp;
      return ts >= cutoff && ts <= now;
    });
    
    // Sample data for longer periods
    if (selectedPeriod === 'days77' && filtered.length > 150) {
      const sampled = [];
      const step = Math.floor(filtered.length / 150);
      for (let i = 0; i < filtered.length; i += step) {
        sampled.push(filtered[i]);
      }
      sampled.push(filtered[filtered.length - 1]);
      return sampled;
    }
    
    if (selectedPeriod === 'weeks7' && filtered.length > 100) {
      const sampled = [];
      const step = Math.floor(filtered.length / 100);
      for (let i = 0; i < filtered.length; i += step) {
        sampled.push(filtered[i]);
      }
      sampled.push(filtered[filtered.length - 1]);
      return sampled;
    }
    
    return filtered;
  };

  const chartData = filterHistoryByPeriod().map(point => ({
    time: point.timestamp,
    floor: point.floorPrice,
  }));

  const formatYAxis = (v) => {
    if (v < 0.001) return v.toExponential(1);
    if (v < 0.01) return v.toFixed(5);
    if (v < 1) return v.toFixed(4);
    return v.toFixed(2);
  };

  const getYDomain = (data) => {
    if (!data || data.length === 0) return [0, 1];
    const values = data.map(d => d.floor).filter(v => v != null);
    if (values.length === 0) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      const padding = min * 0.1 || 0.0001;
      return [min - padding, max + padding];
    }
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  };

  const styles = {
    container: {
      height: '100vh',
      width: '100vw',
      backgroundColor: theme.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
      color: theme.text,
      padding: '1.25rem',
      boxSizing: 'border-box',
      overflow: 'hidden',
      transition: 'background-color 0.3s ease, color 0.3s ease',
    },
    dashboard: {
      width: '100%',
      maxWidth: '640px',
      height: '100%',
      maxHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: '0.6rem',
      borderBottom: `1px solid ${theme.border}`,
      flexShrink: 0,
    },
    logo: {
      fontSize: '0.875rem',
      fontWeight: '400',
      letterSpacing: '0.15em',
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
    },
    modeToggle: {
      fontSize: '0.75rem',
      padding: '0.35rem 0.6rem',
      border: `1px solid ${theme.border}`,
      borderRadius: '4px',
      background: 'transparent',
      color: theme.textMuted,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
    },
    buyButton: {
      fontSize: '0.7rem',
      fontWeight: '400',
      letterSpacing: '0.1em',
      color: theme.text,
      textDecoration: 'none',
      padding: '0.35rem 0.6rem',
      border: `1px solid ${theme.border}`,
      borderRadius: '4px',
      background: theme.card,
      transition: 'all 0.2s ease',
    },
    mainStats: {
      padding: '1.5rem 0',
      flexShrink: 0,
    },
    primaryStat: {
      textAlign: 'center',
    },
    primaryValue: {
      fontSize: 'clamp(3.5rem, 15vw, 7rem)',
      fontWeight: '700',
      lineHeight: 1,
      letterSpacing: '-0.02em',
    },
    unit: {
      fontSize: 'clamp(1.25rem, 4vw, 2rem)',
      fontWeight: '700',
      marginLeft: '0.5rem',
      letterSpacing: '0.05em',
      opacity: 0.6,
    },
    secondaryStats: {
      display: 'flex',
      justifyContent: 'center',
      gap: '2rem',
      paddingBottom: '0.75rem',
      borderBottom: `1px solid ${theme.border}`,
      flexShrink: 0,
    },
    stat: {
      textAlign: 'center',
    },
    statLabel: {
      display: 'block',
      fontSize: '0.6rem',
      fontWeight: '400',
      letterSpacing: '0.15em',
      color: theme.textMuted,
      marginBottom: '0.2rem',
    },
    statValue: {
      fontSize: '1rem',
      fontWeight: '400',
      letterSpacing: '-0.01em',
    },
    changesRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '0.5rem',
      padding: '0.75rem 0',
      flexWrap: 'wrap',
      flexShrink: 0,
    },
    changeBox: {
      textAlign: 'center',
      padding: '0.4rem 0.6rem',
      background: theme.card,
      borderRadius: '6px',
      minWidth: '50px',
      border: `1px solid transparent`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      color: theme.text,
    },
    changeBoxActive: {
      border: `1px solid ${theme.border}`,
      background: theme.cardHover,
    },
    changeLabel: {
      display: 'block',
      fontSize: '0.6rem',
      fontWeight: '400',
      letterSpacing: '0.1em',
      color: theme.textMuted,
      marginBottom: '0.1rem',
    },
    changeValue: {
      fontSize: '0.85rem',
      fontWeight: '500',
    },
    chartContainer: {
      height: '50vh',
      padding: '0.6rem',
      background: theme.card,
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
    },
    chartLabel: {
      display: 'block',
      fontSize: '0.6rem',
      fontWeight: '400',
      letterSpacing: '0.1em',
      color: theme.textMuted,
      marginBottom: '0.4rem',
      flexShrink: 0,
    },
    chartWrapper: {
      flex: 1,
      minHeight: 0,
    },
    noChart: {
      height: '50vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: theme.card,
      borderRadius: '8px',
    },
    noChartText: {
      fontSize: '0.6rem',
      fontWeight: '400',
      letterSpacing: '0.1em',
      color: theme.textDim,
    },
    footerInfo: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '0.6rem',
      flexShrink: 0,
    },
    updated: {
      fontSize: '0.6rem',
      fontWeight: '500',
      letterSpacing: '0.1em',
      color: theme.textMuted,
    },
    zorbCredit: {
      fontSize: '0.6rem',
      fontWeight: '400',
      letterSpacing: '0.05em',
      color: theme.textDim,
    },
    buyerAddress: {
      color: theme.textMuted,
    },
    loading: {
      textAlign: 'center',
    },
    loadingText: {
      fontSize: '0.875rem',
      fontWeight: '400',
      letterSpacing: '0.2em',
      color: theme.textMuted,
    },
    errorView: {
      textAlign: 'center',
    },
    errorText: {
      fontSize: '0.875rem',
      fontWeight: '400',
      letterSpacing: '0.1em',
      marginBottom: '1.5rem',
    },
    retryButton: {
      fontFamily: 'inherit',
      fontSize: '0.75rem',
      fontWeight: '400',
      letterSpacing: '0.15em',
      padding: '0.75rem 1.5rem',
      border: `2px solid ${theme.text}`,
      borderRadius: '0',
      backgroundColor: 'transparent',
      color: theme.text,
      cursor: 'pointer',
    },
  };

  return (
    <main style={styles.container}>
      {loading && !data ? (
        <div style={styles.loading}>
          <p style={styles.loadingText}>LOADING</p>
        </div>
      ) : error ? (
        <div style={styles.errorView}>
          <p style={styles.errorText}>{error.toUpperCase()}</p>
          <button onClick={fetchData} style={styles.retryButton}>RETRY</button>
        </div>
      ) : (
        <div style={styles.dashboard}>
          {/* Header */}
          <header style={styles.header}>
            <span style={styles.logo}>ZORBS MARKET CAP</span>
            <div style={styles.headerRight}>
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                style={styles.modeToggle}
              >
                {darkMode ? '☀' : '☾'}
              </button>
              <a 
                href="https://opensea.io/collection/zorbs-eth" 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.buyButton}
              >
                BUY/SELL
              </a>
            </div>
          </header>

          {/* Main stats - just the number */}
          <div style={styles.mainStats}>
            <div style={styles.primaryStat}>
              <span style={styles.primaryValue}>
                {formatNumber(data.marketCap)}
                <span style={styles.unit}>ETH</span>
              </span>
            </div>
          </div>

          {/* Secondary stats */}
          <div style={styles.secondaryStats}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>FLOOR</span>
              <span style={styles.statValue}>{formatNumber(data.floorPrice)} ETH</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>SUPPLY</span>
              <span style={styles.statValue}>{data.totalSupply?.toLocaleString()}</span>
            </div>
          </div>

          {/* Change indicators */}
          <div style={styles.changesRow}>
            {['hours7', 'days7', 'weeks7', 'days77', 'all'].map(period => (
              <button 
                key={period}
                onClick={() => setSelectedPeriod(period)}
                style={{
                  ...styles.changeBox,
                  ...(selectedPeriod === period ? styles.changeBoxActive : {})
                }}
              >
                <span style={styles.changeLabel}>{getPeriodLabel(period)}</span>
                <span style={{
                  ...styles.changeValue,
                  color: changes[period] === null ? theme.textMuted : 
                         changes[period] >= 0 ? theme.green : theme.red
                }}>
                  {formatPercent(changes[period])}
                </span>
              </button>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 1 ? (
            <div style={styles.chartContainer}>
              <span style={styles.chartLabel}>FLOOR PRICE — {getPeriodLabel(selectedPeriod)}</span>
              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="floorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.chartLine} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={theme.chartLine} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(t) => {
                        if (selectedPeriod === 'hours7') {
                          return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                        }
                        return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                      stroke={theme.border}
                      tick={{ fill: theme.textMuted, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={40}
                    />
                    <YAxis 
                      tickFormatter={formatYAxis}
                      stroke={theme.border}
                      tick={{ fill: theme.textMuted, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                      domain={getYDomain(chartData)}
                      tickCount={5}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: theme.bg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 4,
                        fontSize: 12,
                        color: theme.text,
                      }}
                      labelFormatter={(t) => new Date(t).toLocaleString()}
                      formatter={(v) => [`${v.toFixed(5)} ETH`, 'Floor']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="floor" 
                      stroke={theme.chartLine} 
                      strokeWidth={2}
                      fill="url(#floorGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div style={styles.noChart}>
              <span style={styles.noChartText}>COLLECTING DATA — CHART AVAILABLE SOON</span>
            </div>
          )}

          {/* Footer */}
          <div style={styles.footerInfo}>
            <span style={styles.updated}>UPDATED {formatTime(data.timestamp)}</span>
            {zorb && (
              <span style={styles.zorbCredit}>
                LAST: {zorb.name}
                {zorb.buyerDisplay && <span style={styles.buyerAddress}> → {zorb.buyerDisplay}</span>}
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
