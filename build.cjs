const fs = require('fs');
const path = require('path');

const origRealpath = fs.realpathSync;
fs.realpathSync = function(p, opts) {
  try {
    return origRealpath(p, opts);
  } catch (e) {
    return path.resolve(p);
  }
};
fs.realpathSync.native = fs.realpathSync;

const origLstat = fs.lstatSync;
fs.lstatSync = function(p, opts) {
  try {
    return origLstat(p, opts);
  } catch (e) {
    if (p === 'C:\\' || p === 'C:/' || p === 'C:') {
      return { isDirectory: () => true, isSymbolicLink: () => false, isFile: () => false };
    }
    throw e;
  }
};

import('vite').then(({ build }) => {
  return build();
}).then(() => {
  console.log('Build completed successfully!');
}).catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
