'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '—';
    if (num < 0.0001) return '< 0.0001';
    if (num < 1) return num.toFixed(4);
    if (num < 100) return num.toFixed(2);
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString();
  };

  return (
    <main style={styles.container}>
      {loading && !data ? (
        <div style={styles.loadingView}>
          <span style={styles.zorb}>◉</span>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      ) : error ? (
        <div style={styles.errorView}>
          <h1 style={styles.title}>Zorbs</h1>
          <p style={styles.error}>{error}</p>
          <button onClick={fetchData} style={styles.retryButton}>
            Retry
          </button>
        </div>
      ) : (
        <div style={styles.dataView}>
          <div style={styles.header}>
            <span style={styles.zorb}>◉</span>
            <h1 style={styles.titleSmall}>Zorbs</h1>
          </div>

          <div style={styles.metric}>
            <span style={styles.label}>Market Cap</span>
            <span style={styles.value}>
              {formatNumber(data.marketCap)}
              <span style={styles.unit}> ETH</span>
            </span>
          </div>

          <div style={styles.divider} />

          <div style={styles.row}>
            <div style={styles.smallMetric}>
              <span style={styles.smallLabel}>Floor</span>
              <span style={styles.smallValue}>
                {formatNumber(data.floorPrice)} ETH
              </span>
            </div>
            <div style={styles.smallMetric}>
              <span style={styles.smallLabel}>Supply</span>
              <span style={styles.smallValue}>
                {data.totalSupply?.toLocaleString() || '—'}
              </span>
            </div>
          </div>

          {data.timestamp && (
            <p style={styles.timestamp}>
              Updated {formatTime(data.timestamp)}
            </p>
          )}
        </div>
      )}
    </main>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#fafafa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-garamond), Georgia, serif',
    color: '#1a1a1a',
    padding: '2rem',
  },
  loadingView: {
    textAlign: 'center',
  },
  loadingText: {
    fontSize: '1.25rem',
    color: '#888',
    marginTop: '1rem',
  },
  errorView: {
    textAlign: 'center',
    maxWidth: '400px',
  },
  title: {
    fontSize: '4rem',
    fontWeight: '400',
    margin: '0 0 1rem 0',
    letterSpacing: '-0.02em',
  },
  retryButton: {
    fontFamily: 'var(--font-garamond), Georgia, serif',
    fontSize: '1.125rem',
    padding: '1rem 2rem',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  dataView: {
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginBottom: '3rem',
  },
  zorb: {
    fontSize: '2rem',
    background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  titleSmall: {
    fontSize: '1.5rem',
    fontWeight: '400',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  metric: {
    marginBottom: '2rem',
  },
  label: {
    display: 'block',
    fontSize: '1rem',
    color: '#888',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  value: {
    fontSize: '5rem',
    fontWeight: '500',
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
  unit: {
    fontSize: '2rem',
    fontWeight: '400',
    color: '#666',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '2rem 0',
  },
  row: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4rem',
  },
  smallMetric: {
    textAlign: 'center',
  },
  smallLabel: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#888',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  smallValue: {
    fontSize: '1.5rem',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: '0.875rem',
    color: '#aaa',
    marginTop: '2rem',
  },
  error: {
    color: '#c53030',
    fontSize: '1rem',
    marginBottom: '1rem',
  },
};
