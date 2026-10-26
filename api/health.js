// GET /api/health -> what is switched on (never returns secrets)
const store = require('../lib/store');
module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  const s = store();
  res.end(JSON.stringify({ ok: true, ai: !!process.env.LLM_API_KEY, model: process.env.LLM_MODEL || 'anthropic/claude-sonnet-5', share: s.kind, sharePersistent: s.persistent }));
};
