'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function Home() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [changes, setChanges] = useState({ hour: null, day: null, week: null, month: null, year: null });
  const [zorb, setZorb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // hour, day, week, month, year

  const fetchData = async () => {
    try {
      const response = await fetch('/api/floor');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch');
      }

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
      const response = await fetch('/api/history');
      const result = await response.json();

      if (response.ok) {
        setHistory(result.history || []);
        setChanges(result.changes || { hour: null, day: null, week: null, month: null, year: null });
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const fetchZorb = async () => {
    try {
      const response = await fetch('/api/zorb');
      const result = await response.json();

      if (response.ok && result.imageUrl) {
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

  const formatChartTime = (timestamp) => {
    if (selectedPeriod === 'hour') {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else if (selectedPeriod === 'day') {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getPeriodMs = (period) => {
    switch (period) {
      case 'hour': return 3600000;
      case 'day': return 86400000;
      case 'week': return 604800000;
      case 'month': return 2592000000;
      case 'year': return 31536000000;
      default: return 2592000000;
    }
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'hour': return '1H';
      case 'day': return '24H';
      case 'week': return '7D';
      case 'month': return '30D';
      case 'year': return '1Y';
      default: return '30D';
    }
  };

  const filterHistoryByPeriod = () => {
    if (!history || history.length === 0) return [];
    
    const now = Date.now();
    const periodMs = getPeriodMs(selectedPeriod);
    const cutoff = now - periodMs;
    
    const filtered = history.filter(point => {
      const ts = point.timestamp;
      return ts >= cutoff && ts <= now;
    });
    
    // For longer periods, sample the data to avoid too many points
    if (selectedPeriod === 'year' && filtered.length > 365) {
      // Sample roughly one point per day
      const sampled = [];
      const step = Math.floor(filtered.length / 365);
      for (let i = 0; i < filtered.length; i += step) {
        sampled.push(filtered[i]);
      }
      sampled.push(filtered[filtered.length - 1]); // Always include latest
      return sampled;
    }
    
    if (selectedPeriod === 'month' && filtered.length > 120) {
      const sampled = [];
      const step = Math.floor(filtered.length / 120);
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

  return (
    <main style={styles.container}>
      {/* Zorb background - prefer gradient since it's buyer's wallet-derived colors */}
      {zorb?.gradientColors ? (
        <div style={styles.zorbContainer}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${zorb.gradientColors.c1}, ${zorb.gradientColors.c2} 25%, ${zorb.gradientColors.c3} 50%, ${zorb.gradientColors.c4} 75%, ${zorb.gradientColors.c5})`,
            opacity: 0.95,
          }} />
        </div>
      ) : zorb?.imageUrl ? (
        <div style={styles.zorbContainer}>
          <img 
            src={zorb.imageUrl} 
            alt={zorb.name}
            style={styles.zorbImage}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      ) : null}
      
      <div style={styles.overlay} />

      {loading && !data ? (
        <div style={styles.loading}>
          <p style={styles.loadingText}>LOADING</p>
        </div>
      ) : error ? (
        <div style={styles.errorView}>
          <p style={styles.errorText}>{error.toUpperCase()}</p>
          <button onClick={fetchData} style={styles.retryButton}>
            RETRY
          </button>
        </div>
      ) : (
        <div style={styles.dashboard}>
          {/* Header */}
          <header style={styles.header}>
            <span style={styles.logo}>ZORBS</span>
            <a 
              href="https://opensea.io/collection/zorbs-eth" 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.buyButton}
            >
              BUY/SELL
            </a>
          </header>

          {/* Main stats row */}
          <div style={styles.mainStats}>
            <div style={styles.primaryStat}>
              <span style={styles.statLabel}>MARKET CAP</span>
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

          {/* Change indicators - clickable to change chart period */}
          <div style={styles.changesRow}>
            <button 
              onClick={() => setSelectedPeriod('hour')}
              style={{
                ...styles.changeBox,
                ...(selectedPeriod === 'hour' ? styles.changeBoxActive : {})
              }}
            >
              <span style={styles.changeLabel}>1H</span>
              <span style={{
                ...styles.changeValue,
                color: changes.hour === null ? 'rgba(255,255,255,0.5)' : 
                       changes.hour >= 0 ? '#4ade80' : '#f87171'
              }}>
                {formatPercent(changes.hour)}
              </span>
            </button>
            <button 
              onClick={() => setSelectedPeriod('day')}
              style={{
                ...styles.changeBox,
                ...(selectedPeriod === 'day' ? styles.changeBoxActive : {})
              }}
            >
              <span style={styles.changeLabel}>24H</span>
              <span style={{
                ...styles.changeValue,
                color: changes.day === null ? 'rgba(255,255,255,0.5)' : 
                       changes.day >= 0 ? '#4ade80' : '#f87171'
              }}>
                {formatPercent(changes.day)}
              </span>
            </button>
            <button 
              onClick={() => setSelectedPeriod('week')}
              style={{
                ...styles.changeBox,
                ...(selectedPeriod === 'week' ? styles.changeBoxActive : {})
              }}
            >
              <span style={styles.changeLabel}>7D</span>
              <span style={{
                ...styles.changeValue,
                color: changes.week === null ? 'rgba(255,255,255,0.5)' : 
                       changes.week >= 0 ? '#4ade80' : '#f87171'
              }}>
                {formatPercent(changes.week)}
              </span>
            </button>
            <button 
              onClick={() => setSelectedPeriod('month')}
              style={{
                ...styles.changeBox,
                ...(selectedPeriod === 'month' ? styles.changeBoxActive : {})
              }}
            >
              <span style={styles.changeLabel}>30D</span>
              <span style={{
                ...styles.changeValue,
                color: changes.month === null ? 'rgba(255,255,255,0.5)' : 
                       changes.month >= 0 ? '#4ade80' : '#f87171'
              }}>
                {formatPercent(changes.month)}
              </span>
            </button>
            <button 
              onClick={() => setSelectedPeriod('year')}
              style={{
                ...styles.changeBox,
                ...(selectedPeriod === 'year' ? styles.changeBoxActive : {})
              }}
            >
              <span style={styles.changeLabel}>1Y</span>
              <span style={{
                ...styles.changeValue,
                color: changes.year === null ? 'rgba(255,255,255,0.5)' : 
                       changes.year >= 0 ? '#4ade80' : '#f87171'
              }}>
                {formatPercent(changes.year)}
              </span>
            </button>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div style={styles.chartContainer}>
              <span style={styles.chartLabel}>FLOOR PRICE — {getPeriodLabel(selectedPeriod)}</span>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="floorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={formatChartTime}
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={([dataMin, dataMax]) => {
                      if (dataMin === dataMax) {
                        // If all values are the same, create some padding
                        const padding = dataMin * 0.1 || 0.0001;
                        return [dataMin - padding, dataMax + padding];
                      }
                      const padding = (dataMax - dataMin) * 0.1;
                      return [dataMin - padding, dataMax + padding];
                    }}
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                    tickFormatter={(v) => {
                      if (v < 0.001) return v.toExponential(1);
                      if (v < 0.01) return v.toFixed(5);
                      if (v < 1) return v.toFixed(4);
                      return v.toFixed(2);
                    }}
                    tickCount={5}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                    labelFormatter={(t) => new Date(t).toLocaleString()}
                    formatter={(v) => [`${v.toFixed(4)} ETH`, 'Floor']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="floor" 
                    stroke="#fff" 
                    strokeWidth={2}
                    fill="url(#floorGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length <= 1 && (
            <div style={styles.noChart}>
              <span style={styles.noChartText}>
                COLLECTING DATA — CHART AVAILABLE SOON
              </span>
            </div>
          )}

          {/* Footer info */}
          <div style={styles.footerInfo}>
            <span style={styles.updated}>UPDATED {formatTime(data.timestamp)}</span>
            {zorb && (
              <span style={styles.zorbCredit}>
                {zorb.isRecentTransfer ? 'LAST TRANSFER: ' : ''}{zorb.name}
                {zorb.buyerDisplay && <span style={styles.buyerAddress}> → {zorb.buyerDisplay}</span>}
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    minWidth: '100vw',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
    color: '#fff',
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  zorbContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '150vmax',
    height: '150vmax',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  zorbImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    opacity: 0.95,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%)',
    pointerEvents: 'none',
  },
  loading: {
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
  },
  loadingText: {
    fontSize: '0.875rem',
    fontWeight: '400',
    letterSpacing: '0.2em',
    color: '#fff',
  },
  errorView: {
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
  },
  errorText: {
    fontSize: '0.875rem',
    fontWeight: '400',
    letterSpacing: '0.1em',
    color: '#fff',
    marginBottom: '2rem',
  },
  retryButton: {
    fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
    fontSize: '0.75rem',
    fontWeight: '400',
    letterSpacing: '0.15em',
    padding: '1rem 2rem',
    border: '2px solid #fff',
    borderRadius: '0',
    backgroundColor: 'transparent',
    color: '#fff',
    cursor: 'pointer',
  },
  dashboard: {
    width: '100%',
    maxWidth: '600px',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
  },
  logo: {
    fontSize: '0.875rem',
    fontWeight: '400',
    letterSpacing: '0.2em',
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  updated: {
    fontSize: '0.625rem',
    fontWeight: '500',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.5)',
  },
  buyButton: {
    fontSize: '0.75rem',
    fontWeight: '400',
    letterSpacing: '0.1em',
    color: '#fff',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    border: '1px solid rgba(255,255,255,0.5)',
    borderRadius: '4px',
    background: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease',
  },
  mainStats: {
    marginBottom: '2rem',
  },
  primaryStat: {
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    fontSize: '0.625rem',
    fontWeight: '400',
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '0.5rem',
  },
  primaryValue: {
    fontSize: 'clamp(3rem, 12vw, 6rem)',
    fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
    fontWeight: '700',
    lineHeight: 1,
    letterSpacing: '-0.02em',
    textShadow: '0 4px 30px rgba(0,0,0,0.5)',
  },
  unit: {
    fontSize: 'clamp(1rem, 3vw, 1.5rem)',
    fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
    fontWeight: '700',
    marginLeft: '0.5rem',
    letterSpacing: '0.05em',
    opacity: 0.7,
  },
  secondaryStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '3rem',
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: '400',
    letterSpacing: '-0.01em',
    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  changesRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  changeBox: {
    textAlign: 'center',
    padding: '0.75rem 1rem',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    minWidth: '60px',
    backdropFilter: 'blur(10px)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  changeBoxActive: {
    border: '1px solid rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.1)',
  },
  changeLabel: {
    display: 'block',
    fontSize: '0.625rem',
    fontWeight: '400',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.25rem',
  },
  changeValue: {
    fontSize: '1rem',
    fontWeight: '400',
    letterSpacing: '-0.01em',
  },
  chartContainer: {
    marginBottom: '1rem',
    padding: '1rem',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)',
  },
  chartLabel: {
    display: 'block',
    fontSize: '0.625rem',
    fontWeight: '400',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '1rem',
  },
  noChart: {
    padding: '3rem',
    textAlign: 'center',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    marginBottom: '1rem',
    backdropFilter: 'blur(10px)',
  },
  noChartText: {
    fontSize: '0.625rem',
    fontWeight: '400',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.4)',
  },
  footerInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1rem',
  },
  zorbCredit: {
    fontSize: '0.625rem',
    fontWeight: '400',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
  },
  buyerAddress: {
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'none',
  },
};
