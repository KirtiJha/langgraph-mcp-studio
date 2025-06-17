import React from "react";

const EnvironmentDebugger: React.FC = () => {
  // Test all possible ways to detect development mode
  const tests = {
    'process.env.NODE_ENV': (() => {
      try {
        return process.env.NODE_ENV;
      } catch (e) {
        return `Error: ${e}`;
      }
    })(),
    '__DEV__ global': (() => {
      try {
        return typeof __DEV__ !== 'undefined' ? __DEV__ : 'undefined';
      } catch (e) {
        return `Error: ${e}`;
      }
    })(),
    'window.location.hostname': (() => {
      try {
        return window.location.hostname;
      } catch (e) {
        return `Error: ${e}`;
      }
    })(),
    'FORCE_DEV_MODE': (() => {
      try {
        return localStorage.getItem('FORCE_DEV_MODE') || 'not set';
      } catch (e) {
        return `Error: ${e}`;
      }
    })(),
    'import.meta.env.DEV': (() => {
      try {
        // @ts-ignore
        return import.meta.env?.DEV;
      } catch (e) {
        return `Error: ${e}`;
      }
    })(),
    'import.meta.env.MODE': (() => {
      try {
        // @ts-ignore
        return import.meta.env?.MODE;
      } catch (e) {
        return `Error: ${e}`;
      }
    })(),
  };

  const toggleDevMode = () => {
    const current = localStorage.getItem('FORCE_DEV_MODE');
    const newValue = current === 'true' ? 'false' : 'true';
    localStorage.setItem('FORCE_DEV_MODE', newValue);
    window.location.reload(); // Reload to apply changes
  };

  console.log('🔍 Environment Debug Results:', tests);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50">
      <h3 className="font-bold text-yellow-400 mb-2">Environment Debug:</h3>
      {Object.entries(tests).map(([key, value]) => (
        <div key={key} className="mb-1">
          <strong className="text-blue-300">{key}:</strong>{' '}
          <span className="text-green-300">{String(value)}</span>
        </div>
      ))}
      <button
        onClick={toggleDevMode}
        className="mt-3 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold transition-colors"
      >
        Toggle FORCE_DEV_MODE
      </button>
    </div>
  );
};

export default EnvironmentDebugger;
