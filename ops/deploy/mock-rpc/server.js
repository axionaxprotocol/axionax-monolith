const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

const PORT = process.env.PORT || 8545;
const WS_PORT = process.env.WS_PORT || 8546;
const CHAIN_ID = process.env.CHAIN_ID || '86137';
const NETWORK = process.env.NETWORK || 'axionax-testnet';
const BLOCK_TIME = parseInt(process.env.BLOCK_TIME || '5000'); // 5 seconds

app.use(express.json({ strict: false, type: 'application/json' }));

// =============================================================================
// Mock Blockchain State
// =============================================================================

let blockNumber = 1000;
let accounts = {};
let transactions = {};
let blockCache = {};
let logs = [];
let pendingTransactions = [];
let contracts = {};

// Validators and Workers (Axionax-specific)
let validators = [];
let workers = {};
let jobs = {};

// Network stats
let networkStats = {
  totalTransactions: 0,
  totalBlocks: blockNumber,
  activeValidators: 5,
  activeWorkers: 0,
  tps: 0,
  lastTpsUpdate: Date.now()
};

// =============================================================================
// Helper Functions
// =============================================================================

function generateAddress() {
  return '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateHash() {
  return '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

function toHex(num) {
  return '0x' + num.toString(16);
}

function fromHex(hex) {
  return parseInt(hex, 16);
}

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// =============================================================================
// Initialization
// =============================================================================

function initMockState() {
  // Create mock accounts with balances
  const knownAddresses = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000003',
  ];
  
  knownAddresses.forEach((addr, i) => {
    accounts[addr.toLowerCase()] = {
      balance: toHex(BigInt('50000000000000000000000')), // 50,000 AXX
      nonce: 0,
      code: null
    };
  });
  
  // Generate additional random accounts
  for (let i = 0; i < 10; i++) {
    const addr = generateAddress();
    accounts[addr.toLowerCase()] = {
      balance: toHex(BigInt(Math.floor(Math.random() * 1000)) * BigInt('1000000000000000000')),
      nonce: 0,
      code: null
    };
  }
  
  // Initialize validators
  validators = [
    { address: knownAddresses[0], name: 'Validator-EU-01', stake: '50000000000000000000000', active: true },
    { address: knownAddresses[1], name: 'Validator-US-01', stake: '50000000000000000000000', active: true },
    { address: knownAddresses[2], name: 'Validator-AS-01', stake: '50000000000000000000000', active: true },
  ];
  
  console.log(`[Init] Created ${Object.keys(accounts).length} accounts`);
  console.log(`[Init] Initialized ${validators.length} validators`);
}

// Generate a mock block
function generateBlock(num) {
  if (blockCache[num]) return blockCache[num];
  
  const parentNum = num - 1;
  const parentHash = parentNum >= 0 ? (blockCache[parentNum]?.hash || generateHash()) : '0x' + '0'.repeat(64);
  
  const block = {
    number: toHex(num),
    hash: generateHash(),
    parentHash: parentHash,
    nonce: '0x0000000000000000',
    sha3Uncles: '0x' + '0'.repeat(64),
    logsBloom: '0x' + '0'.repeat(512),
    transactionsRoot: generateHash(),
    stateRoot: generateHash(),
    receiptsRoot: generateHash(),
    miner: validators[num % validators.length]?.address || generateAddress(),
    difficulty: '0x1',
    totalDifficulty: toHex(num),
    extraData: '0x617869616e617820706f7063', // "axionax popc"
    size: toHex(500 + Math.floor(Math.random() * 500)),
    gasLimit: '0x1c9c380', // 30M
    gasUsed: toHex(21000 * Math.floor(Math.random() * 10)),
    timestamp: toHex(Math.floor(Date.now() / 1000) - (blockNumber - num) * 5),
    transactions: [],
    uncles: []
  };
  
  blockCache[num] = block;
  return block;
}

initMockState();

// =============================================================================
// Block Production Simulation
// =============================================================================

setInterval(() => {
  blockNumber++;
  const block = generateBlock(blockNumber);
  networkStats.totalBlocks = blockNumber;
  
  // Process pending transactions
  const txsToInclude = pendingTransactions.splice(0, 10);
  txsToInclude.forEach(tx => {
    tx.blockHash = block.hash;
    tx.blockNumber = block.number;
    tx.transactionIndex = toHex(block.transactions.length);
    block.transactions.push(tx.hash);
    transactions[tx.hash].blockHash = block.hash;
    transactions[tx.hash].blockNumber = block.number;
  });
  
  // Broadcast to WebSocket subscribers
  broadcastNewHead(block);
}, BLOCK_TIME);

// =============================================================================
// Health Check
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    network: NETWORK,
    chainId: CHAIN_ID,
    blockNumber: blockNumber,
    accounts: Object.keys(accounts).length,
    validators: validators.length,
    workers: Object.keys(workers).length,
    pendingTx: pendingTransactions.length,
    timestamp: Date.now()
  });
});

// =============================================================================
// JSON-RPC Handler
// =============================================================================

app.post('/', (req, res) => {
  const { jsonrpc, method, params = [], id } = req.body;

  if (jsonrpc !== '2.0') {
    return res.json(jsonRpcError(id, -32600, 'Invalid Request'));
  }

  console.log(`[RPC] ${method}`, JSON.stringify(params).slice(0, 100));

  try {
    const result = handleRpcMethod(method, params, id);
    return res.json(result);
  } catch (error) {
    console.error(`[RPC Error] ${method}:`, error.message);
    return res.json(jsonRpcError(id, -32603, error.message));
  }
});

function handleRpcMethod(method, params, id) {
  switch (method) {
    // =========================================================================
    // Network Methods
    // =========================================================================
    case 'net_version':
      return jsonRpcResponse(id, CHAIN_ID);

    case 'net_listening':
      return jsonRpcResponse(id, true);

    case 'net_peerCount':
      return jsonRpcResponse(id, toHex(validators.length + Object.keys(workers).length));

    case 'eth_protocolVersion':
      return jsonRpcResponse(id, '0x41'); // Version 65

    case 'eth_syncing':
      return jsonRpcResponse(id, false); // Always synced

    case 'eth_chainId':
      return jsonRpcResponse(id, toHex(parseInt(CHAIN_ID)));

    case 'eth_mining':
      return jsonRpcResponse(id, true);

    case 'eth_hashrate':
      return jsonRpcResponse(id, '0x0');

    // =========================================================================
    // Block Methods
    // =========================================================================
    case 'eth_blockNumber':
      return jsonRpcResponse(id, toHex(blockNumber));

    case 'eth_getBlockByNumber': {
      const [blockParam, fullTx] = params;
      let num = blockNumber;
      
      if (blockParam === 'latest' || blockParam === 'pending') {
        num = blockNumber;
      } else if (blockParam === 'earliest') {
        num = 0;
      } else {
        num = fromHex(blockParam);
      }
      
      const block = generateBlock(num);
      if (fullTx && block.transactions.length > 0) {
        block.transactions = block.transactions.map(hash => transactions[hash]).filter(Boolean);
      }
      return jsonRpcResponse(id, block);
    }

    case 'eth_getBlockByHash': {
      const [hash, fullTx] = params;
      // Find block by hash or return mock
      const block = Object.values(blockCache).find(b => b.hash === hash) || generateBlock(blockNumber);
      return jsonRpcResponse(id, { ...block, hash });
    }

    case 'eth_getBlockTransactionCountByNumber': {
      const [blockParam] = params;
      const num = blockParam === 'latest' ? blockNumber : fromHex(blockParam);
      const block = blockCache[num];
      return jsonRpcResponse(id, toHex(block?.transactions?.length || 0));
    }

    case 'eth_getBlockTransactionCountByHash': {
      const [hash] = params;
      const block = Object.values(blockCache).find(b => b.hash === hash);
      return jsonRpcResponse(id, toHex(block?.transactions?.length || 0));
    }

    // =========================================================================
    // Account Methods
    // =========================================================================
    case 'eth_accounts':
      return jsonRpcResponse(id, Object.keys(accounts).slice(0, 10));

    case 'eth_getBalance': {
      const [address, block] = params;
      const acc = accounts[address.toLowerCase()];
      return jsonRpcResponse(id, acc?.balance || '0x0');
    }

    case 'eth_getTransactionCount': {
      const [address, block] = params;
      const acc = accounts[address.toLowerCase()];
      return jsonRpcResponse(id, toHex(acc?.nonce || 0));
    }

    case 'eth_getCode': {
      const [address, block] = params;
      const acc = accounts[address.toLowerCase()];
      return jsonRpcResponse(id, acc?.code || '0x');
    }

    case 'eth_getStorageAt': {
      const [address, position, block] = params;
      // Return empty storage
      return jsonRpcResponse(id, '0x' + '0'.repeat(64));
    }

    // =========================================================================
    // Gas Methods
    // =========================================================================
    case 'eth_gasPrice':
      return jsonRpcResponse(id, '0x3b9aca00'); // 1 Gwei

    case 'eth_maxPriorityFeePerGas':
      return jsonRpcResponse(id, '0x3b9aca00'); // 1 Gwei

    case 'eth_feeHistory': {
      const [blockCount, newestBlock, rewardPercentiles] = params;
      const count = Math.min(fromHex(blockCount), 10);
      return jsonRpcResponse(id, {
        baseFeePerGas: Array(count + 1).fill('0x3b9aca00'),
        gasUsedRatio: Array(count).fill(0.5),
        oldestBlock: toHex(Math.max(0, blockNumber - count)),
        reward: rewardPercentiles ? Array(count).fill(rewardPercentiles.map(() => '0x3b9aca00')) : undefined
      });
    }

    case 'eth_estimateGas': {
      const [txObj] = params;
      // Base gas + data gas
      let gas = 21000;
      if (txObj.data && txObj.data !== '0x') {
        gas += (txObj.data.length - 2) / 2 * 16; // 16 gas per byte
      }
      if (!txObj.to) {
        gas += 32000; // Contract creation
      }
      return jsonRpcResponse(id, toHex(Math.ceil(gas * 1.2))); // 20% buffer
    }

    // =========================================================================
    // Transaction Methods
    // =========================================================================
    case 'eth_sendRawTransaction': {
      const [signedTx] = params;
      const txHash = generateHash();
      
      const tx = {
        hash: txHash,
        nonce: toHex(Math.floor(Math.random() * 1000)),
        blockHash: null,
        blockNumber: null,
        transactionIndex: null,
        from: generateAddress(),
        to: params.to || generateAddress(),
        value: '0x0',
        gas: '0x5208',
        gasPrice: '0x3b9aca00',
        input: signedTx.slice(0, 100),
        v: '0x1b',
        r: generateHash(),
        s: generateHash(),
        type: '0x0'
      };
      
      transactions[txHash] = tx;
      pendingTransactions.push(tx);
      networkStats.totalTransactions++;
      
      return jsonRpcResponse(id, txHash);
    }

    case 'eth_getTransactionByHash': {
      const [txHash] = params;
      return jsonRpcResponse(id, transactions[txHash] || null);
    }

    case 'eth_getTransactionReceipt': {
      const [txHash] = params;
      const tx = transactions[txHash];
      
      if (!tx || !tx.blockHash) {
        return jsonRpcResponse(id, null);
      }
      
      return jsonRpcResponse(id, {
        transactionHash: txHash,
        transactionIndex: tx.transactionIndex || '0x0',
        blockHash: tx.blockHash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to,
        cumulativeGasUsed: '0x5208',
        gasUsed: '0x5208',
        contractAddress: tx.to ? null : generateAddress(),
        logs: [],
        logsBloom: '0x' + '0'.repeat(512),
        status: '0x1',
        effectiveGasPrice: tx.gasPrice,
        type: tx.type || '0x0'
      });
    }

    case 'eth_getTransactionByBlockNumberAndIndex': {
      const [blockParam, index] = params;
      const num = blockParam === 'latest' ? blockNumber : fromHex(blockParam);
      const block = blockCache[num];
      const txHash = block?.transactions?.[fromHex(index)];
      return jsonRpcResponse(id, txHash ? transactions[txHash] : null);
    }

    case 'eth_pendingTransactions':
      return jsonRpcResponse(id, pendingTransactions);

    // =========================================================================
    // Call & Logs
    // =========================================================================
    case 'eth_call': {
      const [txObj, block] = params;
      // Return empty for unknown contracts, or mock response
      if (txObj.data?.startsWith('0x70a08231')) {
        // balanceOf(address) - return mock balance
        return jsonRpcResponse(id, '0x' + '0'.repeat(56) + 'de0b6b3a7640000'); // 1 token
      }
      return jsonRpcResponse(id, '0x');
    }

    case 'eth_getLogs': {
      const [filter] = params;
      // Return empty logs for now, or filtered logs
      const filteredLogs = logs.filter(log => {
        if (filter.address && log.address.toLowerCase() !== filter.address.toLowerCase()) return false;
        if (filter.fromBlock && fromHex(log.blockNumber) < fromHex(filter.fromBlock)) return false;
        if (filter.toBlock && filter.toBlock !== 'latest' && fromHex(log.blockNumber) > fromHex(filter.toBlock)) return false;
        return true;
      });
      return jsonRpcResponse(id, filteredLogs);
    }

    case 'eth_newFilter': {
      const filterId = generateHash().slice(0, 18);
      return jsonRpcResponse(id, filterId);
    }

    case 'eth_newBlockFilter': {
      const filterId = generateHash().slice(0, 18);
      return jsonRpcResponse(id, filterId);
    }

    case 'eth_newPendingTransactionFilter': {
      const filterId = generateHash().slice(0, 18);
      return jsonRpcResponse(id, filterId);
    }

    case 'eth_getFilterChanges': {
      const [filterId] = params;
      return jsonRpcResponse(id, []);
    }

    case 'eth_uninstallFilter': {
      return jsonRpcResponse(id, true);
    }

    // =========================================================================
    // Axionax-Specific Methods
    // =========================================================================
    case 'axn_getValidatorSet':
      return jsonRpcResponse(id, validators);

    case 'axn_getValidatorInfo': {
      const [address] = params;
      const validator = validators.find(v => v.address.toLowerCase() === address?.toLowerCase());
      return jsonRpcResponse(id, validator || null);
    }

    case 'axn_getNetworkStats':
      return jsonRpcResponse(id, {
        blockNumber: blockNumber,
        totalTransactions: networkStats.totalTransactions,
        activeValidators: validators.filter(v => v.active).length,
        activeWorkers: Object.keys(workers).length,
        pendingJobs: Object.values(jobs).filter(j => j.status === 'pending').length,
        completedJobs: Object.values(jobs).filter(j => j.status === 'completed').length,
        tps: networkStats.tps,
        chainId: CHAIN_ID,
        network: NETWORK
      });

    case 'axn_getWorkerStats': {
      const [address] = params;
      if (address) {
        return jsonRpcResponse(id, workers[address.toLowerCase()] || null);
      }
      return jsonRpcResponse(id, {
        total: Object.keys(workers).length,
        active: Object.values(workers).filter(w => w.status === 'active').length,
        workers: Object.values(workers)
      });
    }

    case 'axn_registerWorker': {
      const [specs] = params;
      const address = specs.address || generateAddress();
      workers[address.toLowerCase()] = {
        address: address,
        status: 'active',
        specs: specs,
        registeredAt: Date.now(),
        jobsCompleted: 0,
        reputation: 100
      };
      return jsonRpcResponse(id, { success: true, address });
    }

    case 'axn_getJobStatus': {
      const [jobId] = params;
      return jsonRpcResponse(id, jobs[jobId] || null);
    }

    case 'axn_submitJob': {
      const [jobSpec] = params;
      const jobId = generateHash();
      jobs[jobId] = {
        id: jobId,
        type: jobSpec.type || 'compute',
        status: 'pending',
        reward: jobSpec.reward || '0x0',
        submitter: jobSpec.from || generateAddress(),
        worker: null,
        createdAt: Date.now(),
        completedAt: null,
        result: null
      };
      return jsonRpcResponse(id, { jobId, status: 'pending' });
    }

    // =========================================================================
    // Web3 Methods
    // =========================================================================
    case 'web3_clientVersion':
      return jsonRpcResponse(id, 'Axionax/v1.9.0/mock-rpc');

    case 'web3_sha3': {
      const [data] = params;
      // Simple mock - in production use proper keccak256
      return jsonRpcResponse(id, generateHash());
    }

    // =========================================================================
    // Unsupported
    // =========================================================================
    default:
      console.log(`[RPC] Unsupported: ${method}`);
      return jsonRpcError(id, -32601, `Method ${method} not found`);
  }
}

// =============================================================================
// WebSocket Server
// =============================================================================

const server = http.createServer(app);
const wss = new WebSocket.Server({ port: WS_PORT });

const subscriptions = new Map();

function broadcastNewHead(block) {
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      const subs = subscriptions.get(ws) || [];
      subs.filter(s => s.type === 'newHeads').forEach(sub => {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_subscription',
          params: {
            subscription: sub.id,
            result: {
              number: block.number,
              hash: block.hash,
              parentHash: block.parentHash,
              timestamp: block.timestamp,
              miner: block.miner,
              gasLimit: block.gasLimit,
              gasUsed: block.gasUsed
            }
          }
        }));
      });
    }
  });
}

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected');
  subscriptions.set(ws, []);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[WebSocket]', data.method);

      if (data.method === 'eth_subscribe') {
        const subId = '0x' + Math.random().toString(16).substr(2, 16);
        const subs = subscriptions.get(ws) || [];
        subs.push({ id: subId, type: data.params[0] });
        subscriptions.set(ws, subs);
        ws.send(JSON.stringify(jsonRpcResponse(data.id, subId)));
      } else if (data.method === 'eth_unsubscribe') {
        const subs = subscriptions.get(ws) || [];
        const filtered = subs.filter(s => s.id !== data.params[0]);
        subscriptions.set(ws, filtered);
        ws.send(JSON.stringify(jsonRpcResponse(data.id, true)));
      } else {
        const result = handleRpcMethod(data.method, data.params || [], data.id);
        ws.send(JSON.stringify(result));
      }
    } catch (error) {
      console.error('[WebSocket Error]:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
    subscriptions.delete(ws);
  });
});

// =============================================================================
// Server Start
// =============================================================================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Axionax Mock RPC Server v1.9.0                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Network:        ${NETWORK.padEnd(44)}║
║  Chain ID:       ${CHAIN_ID.padEnd(44)}║
║  Block Time:     ${(BLOCK_TIME / 1000 + 's').padEnd(44)}║
╠═══════════════════════════════════════════════════════════════╣
║  HTTP RPC:       http://0.0.0.0:${PORT.toString().padEnd(32)}║
║  WebSocket:      ws://0.0.0.0:${WS_PORT.toString().padEnd(34)}║
║  Health:         http://0.0.0.0:${PORT}/health${' '.repeat(24)}║
╠═══════════════════════════════════════════════════════════════╣
║  Methods:        40+ (ETH + Axionax)                          ║
║  Validators:     ${validators.length.toString().padEnd(44)}║
║  Accounts:       ${Object.keys(accounts).length.toString().padEnd(44)}║
╠═══════════════════════════════════════════════════════════════╣
║  Status: ✅ READY                                              ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[Shutdown] Graceful shutdown...');
  wss.close();
  server.close(() => process.exit(0));
});

module.exports = { app, handleRpcMethod };
