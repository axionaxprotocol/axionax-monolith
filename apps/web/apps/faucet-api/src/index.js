/**
 * Axionax Testnet Faucet API
 *
 * Distributes testnet AXX tokens to users
 * - Rate limiting: 1 request per 24 hours per address
 * - Redis for cooldown tracking
 * - Native AXX distribution
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ethers } from 'ethers';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import 'dotenv/config';

// ============================================
// Configuration
// ============================================

const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  rpcUrl: process.env.RPC_URL || 'https://axionax.org/rpc/',
  chainId: parseInt(process.env.CHAIN_ID || '86137', 10),
  faucetPrivateKey: process.env.FAUCET_PRIVATE_KEY,
  faucetAmount: process.env.FAUCET_AMOUNT || '10', // 10 AXX
  cooldownHours: parseInt(process.env.COOLDOWN_HOURS || '24', 10),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigins: process.env.CORS_ORIGINS || 'https://axionax.org,http://localhost:3000',
};

// ============================================
// Initialize Services
// ============================================

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// CORS
const corsOptions = {
  origin: config.corsOrigins.split(',').map((s) => s.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined'));

// Redis client
let redis = null;
try {
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
  });
  redis.on('error', (err) => console.error('Redis error:', err.message));
  redis.on('connect', () => console.log('Redis connected'));
} catch (err) {
  console.warn('Redis not available, using in-memory cooldown tracking');
}

// In-memory fallback for cooldown tracking
const memoryStore = new Map();

// Ethers provider and wallet
const provider = new ethers.JsonRpcProvider(config.rpcUrl, {
  chainId: config.chainId,
  name: 'axionax-testnet',
});

let wallet = null;
if (config.faucetPrivateKey) {
  wallet = new ethers.Wallet(config.faucetPrivateKey, provider);
  console.log(`Faucet wallet: ${wallet.address}`);
} else {
  console.warn('FAUCET_PRIVATE_KEY not set - faucet will be read-only');
}

// Rate limiter (IP-based)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { ok: false, error: 'Too many requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// Helper Functions
// ============================================

async function getCooldownKey(address) {
  return `faucet:cooldown:${address.toLowerCase()}`;
}

async function checkCooldown(address) {
  const key = await getCooldownKey(address);

  if (redis) {
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      const hoursLeft = Math.ceil(ttl / 3600);
      return { onCooldown: true, hoursLeft };
    }
    return { onCooldown: false };
  }

  // Fallback to memory
  const expiry = memoryStore.get(key);
  if (expiry && Date.now() < expiry) {
    const hoursLeft = Math.ceil((expiry - Date.now()) / 3600000);
    return { onCooldown: true, hoursLeft };
  }
  return { onCooldown: false };
}

async function setCooldown(address) {
  const key = await getCooldownKey(address);
  const ttlSeconds = config.cooldownHours * 3600;

  if (redis) {
    await redis.setex(key, ttlSeconds, '1');
  } else {
    memoryStore.set(key, Date.now() + ttlSeconds * 1000);
  }
}

// ============================================
// Routes
// ============================================

// Health check
app.get('/health', async (_req, res) => {
  try {
    const [blockNumber, network, balance] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork(),
      wallet ? provider.getBalance(wallet.address) : null,
    ]);

    res.json({
      ok: true,
      blockNumber,
      chainId: Number(network.chainId),
      faucetAddress: wallet?.address || null,
      faucetBalance: balance ? ethers.formatEther(balance) : null,
      cooldownHours: config.cooldownHours,
      faucetAmount: config.faucetAmount,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Request tokens
app.get('/request', limiter, async (req, res) => {
  try {
    const address = req.query.address?.toString().trim();

    // Validate address
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ ok: false, error: 'Invalid address' });
    }

    // Check if wallet is configured
    if (!wallet) {
      return res.status(503).json({ ok: false, error: 'Faucet not configured' });
    }

    // Check cooldown
    const cooldown = await checkCooldown(address);
    if (cooldown.onCooldown) {
      return res.status(429).json({
        ok: false,
        error: `Please wait ${cooldown.hoursLeft} hours before requesting again`,
        cooldownHours: cooldown.hoursLeft,
      });
    }

    // Check faucet balance
    const faucetBalance = await provider.getBalance(wallet.address);
    const amount = ethers.parseEther(config.faucetAmount);

    if (faucetBalance < amount) {
      return res.status(503).json({ ok: false, error: 'Faucet is empty, please try later' });
    }

    // Send transaction
    console.log(`Sending ${config.faucetAmount} AXX to ${address}`);
    const tx = await wallet.sendTransaction({
      to: address,
      value: amount,
    });

    const receipt = await tx.wait();

    // Set cooldown
    await setCooldown(address);

    res.json({
      ok: true,
      hash: tx.hash,
      blockNumber: receipt.blockNumber,
      amount: config.faucetAmount,
      symbol: 'AXX',
      to: address,
      message: `Successfully sent ${config.faucetAmount} AXX!`,
    });
  } catch (e) {
    console.error('Faucet error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST version for frontend
app.post('/request', limiter, async (req, res) => {
  req.query.address = req.body.address;
  return app._router.handle(req, res, () => {});
});

// Stats endpoint
app.get('/stats', async (_req, res) => {
  try {
    const balance = wallet ? await provider.getBalance(wallet.address) : null;
    const blockNumber = await provider.getBlockNumber();

    res.json({
      ok: true,
      faucetAddress: wallet?.address || null,
      balance: balance ? ethers.formatEther(balance) : null,
      blockNumber,
      chainId: config.chainId,
      faucetAmount: config.faucetAmount,
      cooldownHours: config.cooldownHours,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================
// Start Server
// ============================================

app.listen(config.port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════╗
║         Axionax Testnet Faucet API             ║
╠════════════════════════════════════════════════╣
║  Port:        ${String(config.port).padEnd(32)}║
║  RPC:         ${config.rpcUrl.slice(0, 30).padEnd(32)}║
║  Chain ID:    ${String(config.chainId).padEnd(32)}║
║  Amount:      ${(config.faucetAmount + ' AXX').padEnd(32)}║
║  Cooldown:    ${(config.cooldownHours + ' hours').padEnd(32)}║
╚════════════════════════════════════════════════╝
  `);
});

export default app;
