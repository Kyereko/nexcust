// Vercel Function: delegates every request to the compiled Nest application (see src/serverless.ts).
module.exports = require('../dist/serverless.js').default;
