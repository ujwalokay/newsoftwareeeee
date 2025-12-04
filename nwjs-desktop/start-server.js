const path = require('path');
const { spawn, fork } = require('child_process');

process.env.DESKTOP = '1';
process.env.NWJS = '1';
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';

const nw = global.nw || {};
if (nw.App) {
  process.env.NWJS_USER_DATA = nw.App.dataPath;
}

console.log('[NW.js] Starting Airavoto Gaming POS in desktop mode...');
console.log('[NW.js] User data path:', process.env.NWJS_USER_DATA || process.cwd());

const serverPath = path.join(__dirname, 'server', 'dist', 'index.js');

const startServer = () => {
  try {
    require(serverPath);
    console.log('[NW.js] Server module loaded successfully');
  } catch (error) {
    console.error('[NW.js] Failed to start server:', error);
  }
};

startServer();
