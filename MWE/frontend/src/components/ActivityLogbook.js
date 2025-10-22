import React, { useState, useEffect, useCallback } from 'react';

const styles = {
  logbookCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: { xs: '16px', sm: '24px' },
    margin: '20px auto',
    maxWidth: '100%',
    fontFamily: 'sans-serif'
  },
  header: { marginTop: '0', marginBottom: { xs: '10px', sm: '20px' }, color: '#333', fontSize: { xs: '1.25rem', sm: '1.5rem' } },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: { xs: '0.875rem', sm: '1rem' } },
  th: {
    backgroundColor: '#f8f9fa',
    color: '#555',
    fontWeight: 600,
    textAlign: 'left',
    padding: { xs: '8px 10px', sm: '12px 15px' },
    borderBottom: '2px solid #dee2e6'
  },
  td: {
    padding: { xs: '8px 10px', sm: '12px 15px' },
    borderBottom: '1px solid #e9ecef',
    color: '#495057',
    verticalAlign: 'top'
  },
  taskItem: { paddingBottom: { xs: '2px', sm: '4px' } }
};

const ActivityLogbook = ({ username }) => {
  const [logs, setLogs] = useState([]);

  const fetchLogData = useCallback(async () => {
    if (!username) return;
    try {
      const response = await fetch(`http://127.0.0.1:5001/api/activity-logs/${username}`);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const data = await response.json();
      const userLogs = data.filter(log => log.username !== username);
      setLogs(userLogs);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  }, [username]);

  useEffect(() => {
    fetchLogData();
    const intervalId = setInterval(fetchLogData, 2000);
    return () => clearInterval(intervalId);
  }, [fetchLogData]);

  return (
    <div style={styles.logbookCard}>
      <h2 style={styles.header}>Activity Logbook - Users</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Username</th>
              <th style={styles.th}>Login Time</th>
              <th style={styles.th}>Logout Time</th>
              <th style={styles.th}>Tasks Done</th>
            </tr>
          </thead>
          <tbody>
            {logs && logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={styles.td}>{log.username}</td>
                  <td style={styles.td}>{log.loginTimeIST || '—'}</td>
                  <td style={styles.td}>
                    {log.logoutTimeIST || <em style={{ color: 'green' }}>Active Now</em>}
                  </td>
                  <td style={styles.td}>
                    {Array.isArray(log.tasksDone) && log.tasksDone.length > 0 ? (
                      log.tasksDone.map((task, index) => (
                        <div key={index} style={styles.taskItem}>{task}</div>
                      ))
                    ) : (
                      <em>No actions recorded</em>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ ...styles.td, textAlign: 'center' }}>
                  No activity recorded for users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityLogbook;