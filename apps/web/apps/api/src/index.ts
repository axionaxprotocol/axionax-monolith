/**
 * Axionax Testnet Indexer API
 *
 * Main entry point for the backend API service.
 * Provides endpoints for:
 * - Blockchain indexing
 * - Activity scoring
 * - Genesis snapshot generation
 */

import { serve } from '@hono/node-server';
import app from './routes/index.js';
import { checkDatabaseConnection } from './db/index.js';

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  console.log('🚀 Starting Axionax Testnet Indexer API...');
  console.log('');

  // Check database connection
  console.log('📦 Checking database connection...');
  const dbOk = await checkDatabaseConnection();

  if (!dbOk) {
    console.error('❌ Failed to connect to database');
    console.error('   Please ensure PostgreSQL is running and DATABASE_URL is set correctly');
    process.exit(1);
  }
  console.log('✅ Database connected');

  // Start server
  console.log('');
  console.log(`🌐 Starting server on http://${HOST}:${PORT}`);

  serve({
    fetch: app.fetch,
    port: PORT,
    hostname: HOST,
  });

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Axionax Testnet Indexer API v0.1.0              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Server:    http://${HOST}:${PORT}                          ║`);
  console.log('║  Health:    /health                                       ║');
  console.log('║  API Docs:  /                                             ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                               ║');
  console.log('║    - GET  /api/indexer/status                             ║');
  console.log('║    - POST /api/indexer/start                              ║');
  console.log('║    - POST /api/indexer/stop                               ║');
  console.log('║    - GET  /api/activity/score/:address                    ║');
  console.log('║    - POST /api/activity/calculate-all                     ║');
  console.log('║    - GET  /api/activity/eligible                          ║');
  console.log('║    - GET  /api/snapshot/                                  ║');
  console.log('║    - POST /api/snapshot/generate                          ║');
  console.log('║    - GET  /api/snapshot/:id/genesis                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\\n👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n👋 Shutting down...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
