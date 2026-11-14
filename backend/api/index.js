const appModule = require('../dist/app.js');
const app = appModule.default || appModule;

module.exports = function handler(req, res) {
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-forwarded-path'];
  if (matchedPath && req.url && req.url.startsWith('/api/index')) {
    req.url = matchedPath;
  }
  return app(req, res);
};
