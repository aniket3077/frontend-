import React from 'react';

const EnvDebug = () => {
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px' }}>
      <h3>Environment Debug Info</h3>
      <p><strong>VITE_API_BASE_URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'NOT SET'}</p>
      <p><strong>Mode:</strong> {import.meta.env.MODE}</p>
      <p><strong>Prod:</strong> {import.meta.env.PROD ? 'true' : 'false'}</p>
      <p><strong>All env vars:</strong></p>
      <pre>{JSON.stringify(import.meta.env, null, 2)}</pre>
    </div>
  );
};

export default EnvDebug;