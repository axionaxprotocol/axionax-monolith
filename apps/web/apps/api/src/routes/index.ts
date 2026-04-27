/**
 * API Routes for Axionax Testnet Indexer
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import {
  startIndexer,
  stopIndexer,
  getIndexerStats,
  getTopAddresses,
} from '../services/indexer.js';
import {
  calculateActivityScore,
  calculateAllActivityScores,
  getEligibleAddresses,
  getAirdropStats,
} from '../services/calculator.js';
import {
  generateSnapshot,
  generateGenesisConfig,
  finalizeSnapshot,
  getSnapshot,
  getLatestSnapshot,
  getAllSnapshots,
  verifyProof,
} from '../services/snapshot.js';

// Note: Node service will be imported when fully implemented
// import { ... } from '../services/nodes.js';

import {
  getFaucetInfo,
  claimTokens,
  getClaimHistory,
  getFaucetStats,
  canClaim,
} from '../services/faucet.js';

import {
  getBlocks,
  getBlock,
  getTransactions,
  getTransaction,
  getNetworkStats,
  search,
} from '../services/explorer.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'https://axionax.org'],
    credentials: true,
  }),
);

// ============================================
// Health & Status Routes
// ============================================

app.get('/', (c) => {
  return c.json({
    name: 'Axionax Testnet Indexer API',
    version: '0.1.0',
    status: 'running',
    endpoints: {
      health: '/health',
      indexer: '/api/indexer/*',
      activity: '/api/activity/*',
      snapshot: '/api/snapshot/*',
    },
  });
});

app.get('/health', async (c) => {
  const stats = await getIndexerStats();
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    indexer: stats,
  });
});

// ============================================
// Indexer Routes
// ============================================

const indexerRouter = new Hono();

indexerRouter.get('/status', async (c) => {
  const stats = await getIndexerStats();
  return c.json(stats);
});

indexerRouter.post('/start', async (c) => {
  // Start indexer in background
  startIndexer().catch(console.error);
  return c.json({ message: 'Indexer starting...' });
});

indexerRouter.post('/stop', async (c) => {
  await stopIndexer();
  return c.json({ message: 'Indexer stopped' });
});

indexerRouter.get('/addresses', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const addresses = await getTopAddresses(limit);
  return c.json({ addresses });
});

app.route('/api/indexer', indexerRouter);

// ============================================
// Activity Routes
// ============================================

const activityRouter = new Hono();

// Schema for address validation
const addressSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

activityRouter.get('/score/:address', zValidator('param', addressSchema), async (c) => {
  const { address } = c.req.valid('param');
  const result = await calculateActivityScore(address);
  return c.json({
    address,
    ...result,
    airdropAmount: result.airdropAmount.toString(),
  });
});

activityRouter.post('/calculate-all', async (c) => {
  // Run calculation in background
  calculateAllActivityScores().catch(console.error);
  return c.json({ message: 'Activity calculation started...' });
});

activityRouter.get('/eligible', async (c) => {
  const tier = c.req.query('tier') ? parseInt(c.req.query('tier')!) : undefined;
  const eligible = await getEligibleAddresses(tier);
  return c.json({
    count: eligible.length,
    addresses: eligible,
  });
});

activityRouter.get('/stats', async (c) => {
  const stats = await getAirdropStats();
  return c.json(stats);
});

app.route('/api/activity', activityRouter);

// ============================================
// Snapshot Routes
// ============================================

const snapshotRouter = new Hono();

snapshotRouter.get('/', async (c) => {
  const snapshots = await getAllSnapshots();
  return c.json({ snapshots });
});

snapshotRouter.get('/latest', async (c) => {
  const snapshot = await getLatestSnapshot();
  if (!snapshot) {
    return c.json({ error: 'No snapshots found' }, 404);
  }
  return c.json(snapshot);
});

snapshotRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const snapshot = await getSnapshot(id);
  if (!snapshot) {
    return c.json({ error: 'Snapshot not found' }, 404);
  }
  return c.json(snapshot);
});

snapshotRouter.post('/generate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const blockNumber = body.blockNumber ? parseInt(body.blockNumber) : undefined;

  try {
    const snapshot = await generateSnapshot(blockNumber);
    return c.json(snapshot);
  } catch (error) {
    return c.json(
      {
        error: 'Failed to generate snapshot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

snapshotRouter.get('/:id/genesis', async (c) => {
  const id = c.req.param('id');

  try {
    const genesis = await generateGenesisConfig(id);
    return c.json(genesis);
  } catch (error) {
    return c.json(
      {
        error: 'Failed to generate genesis config',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

snapshotRouter.post('/:id/finalize', async (c) => {
  const id = c.req.param('id');

  try {
    await finalizeSnapshot(id);
    return c.json({ message: 'Snapshot finalized', id });
  } catch (error) {
    return c.json(
      {
        error: 'Failed to finalize snapshot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

// Verify proof endpoint
const verifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(),
  proof: z.array(z.string()),
  root: z.string(),
});

snapshotRouter.post('/verify', zValidator('json', verifySchema), async (c) => {
  const { address, amount, proof, root } = c.req.valid('json');
  const isValid = verifyProof(address, amount, proof, root);
  return c.json({ valid: isValid });
});

app.route('/api/snapshot', snapshotRouter);

// ============================================
// Node Registration Routes
// ============================================

const nodeRouter = new Hono();

// Node type validation schema
const nodeRegistrationSchema = z.object({
  nodeType: z.enum(['validator', 'worker', 'rpc']),
  nodeName: z.string().min(1).max(100),
  operatorName: z.string().min(1).max(100),
  email: z.string().email(),
  website: z.string().url().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  serverIp: z.string().ip(),
  rpcPort: z.number().int().min(1).max(65535).optional(),
  p2pPort: z.number().int().min(1).max(65535).optional(),
  location: z.string().optional(),
});

// Register a new node
nodeRouter.post('/register', zValidator('json', nodeRegistrationSchema), async (c) => {
  const data = c.req.valid('json');

  // TODO: Implement actual registration
  // For now, return mock success
  const nodeId = `node_${Date.now()}`;

  return c.json({
    success: true,
    message: 'Node registered successfully. Please check your email for verification.',
    nodeId,
    data: {
      ...data,
      status: 'pending',
      registeredAt: new Date().toISOString(),
    },
  });
});

// Verify email
nodeRouter.get('/verify/:token', async (c) => {
  const _token = c.req.param('token');

  // TODO: Implement actual verification
  return c.json({
    success: true,
    message: 'Email verified successfully',
  });
});

// Get all nodes
nodeRouter.get('/', async (c) => {
  const nodeType = c.req.query('type') as 'validator' | 'worker' | 'rpc' | undefined;
  const status = c.req.query('status');

  // TODO: Implement actual query
  // Return mock data for now
  return c.json({
    nodes: [],
    total: 0,
    filters: { nodeType, status },
  });
});

// Get node by ID
nodeRouter.get('/:id', async (c) => {
  const _id = c.req.param('id');

  // TODO: Implement actual query
  return c.json(
    {
      node: null,
      error: 'Node not found',
    },
    404,
  );
});

// Get node health
nodeRouter.get('/:id/health', async (c) => {
  const id = c.req.param('id');
  const _limit = parseInt(c.req.query('limit') || '100');

  // TODO: Implement actual query
  return c.json({
    nodeId: id,
    healthChecks: [],
    uptime24h: 0,
  });
});

// Get node rewards
nodeRouter.get('/:id/rewards', async (c) => {
  const id = c.req.param('id');
  const _limit = parseInt(c.req.query('limit') || '50');

  // TODO: Implement actual query
  return c.json({
    nodeId: id,
    rewards: [],
    totalRewards: '0',
  });
});

// Get node statistics
nodeRouter.get('/stats/overview', async (c) => {
  // TODO: Implement actual stats
  return c.json({
    total: 2,
    byType: { validator: 2, worker: 0, rpc: 0 },
    byStatus: { pending: 0, active: 2, inactive: 0, suspended: 0, slashed: 0 },
    totalStaked: '20000000000000000000000', // 20,000 AXX
  });
});

// Get leaderboard
nodeRouter.get('/leaderboard/:type', async (c) => {
  const nodeType = c.req.param('type') as 'validator' | 'worker' | 'rpc';
  const _limit = parseInt(c.req.query('limit') || '20');

  // Validate node type
  if (!['validator', 'worker', 'rpc'].includes(nodeType)) {
    return c.json({ error: 'Invalid node type' }, 400);
  }

  // TODO: Implement actual leaderboard
  return c.json({
    nodeType,
    leaderboard: [],
  });
});

// Update node stake (called after staking tx confirmed)
nodeRouter.post('/:id/stake', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  // TODO: Verify stake transaction on-chain
  return c.json({
    success: true,
    message: 'Stake recorded',
    nodeId: id,
    stakeAmount: body.amount,
    txHash: body.txHash,
  });
});

app.route('/api/nodes', nodeRouter);

// ============================================
// Faucet Routes
// ============================================

const faucetRouter = new Hono();

// Get faucet balance and info
faucetRouter.get('/balance', async (c) => {
  const info = await getFaucetInfo();
  return c.json({
    address: info.address,
    balance: info.balanceFormatted,
    symbol: info.symbol,
    amountPerRequest: info.amountPerRequest,
    cooldownHours: info.cooldownHours,
    isOperational: info.isOperational,
  });
});

// Request tokens from faucet
faucetRouter.post('/faucet', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { address } = body;

  // Get client IP
  const ipAddress =
    c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip') || 'unknown';

  const result = await claimTokens(address, ipAddress);

  if (!result.success) {
    return c.json(result, 400);
  }

  return c.json(result);
});

// Check if can claim
faucetRouter.get('/can-claim/:address', async (c) => {
  const address = c.req.param('address');
  const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip');

  const result = await canClaim(address, ipAddress);
  return c.json(result);
});

// Get faucet claim history for an address
faucetRouter.get('/history/:address', async (c) => {
  const address = c.req.param('address');
  const history = await getClaimHistory(address);
  return c.json(history);
});

// Get faucet statistics
faucetRouter.get('/stats', async (c) => {
  const stats = await getFaucetStats();
  return c.json(stats);
});

app.route('/api/faucet', faucetRouter);

// ============================================
// Explorer Routes (Real Blockchain Data)
// ============================================

const explorerRouter = new Hono();

// Get recent blocks
explorerRouter.get('/blocks', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '10');
  const blocks = await getBlocks(page, pageSize);
  return c.json(blocks);
});

// Get single block
explorerRouter.get('/blocks/:id', async (c) => {
  const id = c.req.param('id');
  const block = await getBlock(id);
  if (!block) {
    return c.json({ error: 'Block not found' }, 404);
  }
  return c.json(block);
});

// Get recent transactions
explorerRouter.get('/transactions', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const transactions = await getTransactions(page, pageSize);
  return c.json(transactions);
});

// Get single transaction
explorerRouter.get('/transactions/:hash', async (c) => {
  const hash = c.req.param('hash');
  const tx = await getTransaction(hash);
  if (!tx) {
    return c.json({ error: 'Transaction not found' }, 404);
  }
  return c.json(tx);
});

// Get network statistics
explorerRouter.get('/network', async (c) => {
  const stats = await getNetworkStats();
  return c.json(stats);
});

// Search (address, tx, block)
explorerRouter.get('/search', async (c) => {
  const query = c.req.query('q') || '';
  if (!query) {
    return c.json({ error: 'Query parameter "q" required' }, 400);
  }
  const result = await search(query);
  return c.json(result);
});

app.route('/api/explorer', explorerRouter);

// Mount blocks at /api/blocks for backward compatibility
app.get('/api/blocks', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '10');
  const blocks = await getBlocks(page, pageSize);
  return c.json(blocks);
});

// Also mount at root for direct access
app.get('/balance', async (c) => {
  const info = await getFaucetInfo();
  return c.json({
    address: info.address,
    balance: info.balanceFormatted,
    symbol: info.symbol,
  });
});

app.post('/faucet', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { address } = body;
  const ipAddress =
    c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip') || 'unknown';

  const result = await claimTokens(address, ipAddress);

  if (!result.success) {
    return c.json(result, 400);
  }

  return c.json(result);
});

// ============================================
// Error Handler
// ============================================

app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500,
  );
});

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default app;
