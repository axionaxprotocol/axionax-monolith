/**
 * Node Registration Service
 * จัดการการลงทะเบียนและติดตามสถานะของ nodes
 */

import { db } from '../db/index.js';
import {
  registeredNodes,
  nodeHealthChecks,
  nodeRewards,
  type RegisteredNode,
} from '../db/schema.js';
import { eq, desc, and, gte } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// ============================================
// Node Registration
// ============================================

export interface NodeRegistrationInput {
  nodeType: 'validator' | 'worker' | 'rpc';
  nodeName: string;
  operatorName: string;
  email: string;
  website?: string;
  walletAddress: string;
  serverIp: string;
  rpcPort?: number;
  p2pPort?: number;
  location?: string;
}

export async function registerNode(input: NodeRegistrationInput): Promise<RegisteredNode> {
  const id = randomUUID();
  const emailVerificationToken = randomUUID();

  const [node] = await db
    .insert(registeredNodes)
    .values({
      id,
      nodeType: input.nodeType,
      nodeName: input.nodeName,
      operatorName: input.operatorName,
      email: input.email,
      website: input.website || null,
      walletAddress: input.walletAddress.toLowerCase(),
      serverIp: input.serverIp,
      rpcPort: input.rpcPort || 8545,
      p2pPort: input.p2pPort || 30303,
      location: input.location || null,
      emailVerificationToken,
      status: 'pending',
    })
    .returning();

  // TODO: Send verification email
  console.log(`📧 Send verification email to ${input.email} with token: ${emailVerificationToken}`);

  return node;
}

export async function verifyEmail(token: string): Promise<boolean> {
  const result = await db
    .update(registeredNodes)
    .set({
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(registeredNodes.emailVerificationToken, token))
    .returning();

  return result.length > 0;
}

export async function getNodeById(id: string): Promise<RegisteredNode | null> {
  const [node] = await db.select().from(registeredNodes).where(eq(registeredNodes.id, id)).limit(1);

  return node || null;
}

export async function getNodeByWallet(walletAddress: string): Promise<RegisteredNode | null> {
  const [node] = await db
    .select()
    .from(registeredNodes)
    .where(eq(registeredNodes.walletAddress, walletAddress.toLowerCase()))
    .limit(1);

  return node || null;
}

export async function getAllNodes(
  nodeType?: 'validator' | 'worker' | 'rpc',
): Promise<RegisteredNode[]> {
  if (nodeType) {
    return db
      .select()
      .from(registeredNodes)
      .where(eq(registeredNodes.nodeType, nodeType))
      .orderBy(desc(registeredNodes.registeredAt));
  }

  return db.select().from(registeredNodes).orderBy(desc(registeredNodes.registeredAt));
}

export async function getActiveNodes(
  nodeType?: 'validator' | 'worker' | 'rpc',
): Promise<RegisteredNode[]> {
  const conditions = [eq(registeredNodes.status, 'active')];
  if (nodeType) {
    conditions.push(eq(registeredNodes.nodeType, nodeType));
  }

  return db
    .select()
    .from(registeredNodes)
    .where(and(...conditions))
    .orderBy(desc(registeredNodes.uptime));
}

export async function updateNodeStatus(
  id: string,
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'slashed',
): Promise<RegisteredNode | null> {
  const [node] = await db
    .update(registeredNodes)
    .set({
      status,
      updatedAt: new Date(),
      verifiedAt: status === 'active' ? new Date() : undefined,
    })
    .where(eq(registeredNodes.id, id))
    .returning();

  return node || null;
}

export async function updateNodeStake(
  id: string,
  stakeAmount: string,
  stakeTxHash: string,
): Promise<RegisteredNode | null> {
  const [node] = await db
    .update(registeredNodes)
    .set({
      stakeAmount,
      stakeTxHash,
      updatedAt: new Date(),
    })
    .where(eq(registeredNodes.id, id))
    .returning();

  return node || null;
}

// ============================================
// Health Checks
// ============================================

export async function recordHealthCheck(
  nodeId: string,
  healthData: {
    isOnline: boolean;
    latencyMs?: number;
    blockHeight?: number;
    peerCount?: number;
    syncStatus?: string;
    errorMessage?: string;
  },
): Promise<void> {
  const id = randomUUID();

  await db.insert(nodeHealthChecks).values({
    id,
    nodeId,
    isOnline: healthData.isOnline,
    latencyMs: healthData.latencyMs || null,
    blockHeight: healthData.blockHeight || null,
    peerCount: healthData.peerCount || null,
    syncStatus: healthData.syncStatus || null,
    errorMessage: healthData.errorMessage || null,
  });

  // Update node's lastSeenAt if online
  if (healthData.isOnline) {
    await db
      .update(registeredNodes)
      .set({ lastSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(registeredNodes.id, nodeId));
  }
}

export async function getNodeHealthHistory(
  nodeId: string,
  limit: number = 100,
): Promise<(typeof nodeHealthChecks.$inferSelect)[]> {
  return db
    .select()
    .from(nodeHealthChecks)
    .where(eq(nodeHealthChecks.nodeId, nodeId))
    .orderBy(desc(nodeHealthChecks.checkedAt))
    .limit(limit);
}

export async function calculateNodeUptime(nodeId: string, hours: number = 24): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const checks = await db
    .select()
    .from(nodeHealthChecks)
    .where(and(eq(nodeHealthChecks.nodeId, nodeId), gte(nodeHealthChecks.checkedAt, since)));

  if (checks.length === 0) return 0;

  const onlineCount = checks.filter((c) => c.isOnline).length;
  return (onlineCount / checks.length) * 100;
}

// ============================================
// Node Verification (Check connectivity)
// ============================================

export async function verifyNodeConnectivity(node: RegisteredNode): Promise<{
  isOnline: boolean;
  latencyMs: number;
  blockHeight?: number;
  peerCount?: number;
  error?: string;
}> {
  const rpcUrl = `http://${node.serverIp}:${node.rpcPort}`;
  const start = Date.now();

  try {
    // Check eth_blockNumber
    const blockResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const blockData = (await blockResponse.json()) as { result?: string };
    const latencyMs = Date.now() - start;
    const blockHeight = blockData.result ? parseInt(blockData.result, 16) : undefined;

    // Check net_peerCount
    let peerCount: number | undefined;
    try {
      const peerResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'net_peerCount',
          params: [],
          id: 2,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const peerData = (await peerResponse.json()) as { result?: string };
      peerCount = peerData.result ? parseInt(peerData.result, 16) : undefined;
    } catch {
      // Ignore peer count errors
    }

    return {
      isOnline: true,
      latencyMs,
      blockHeight,
      peerCount,
    };
  } catch (error) {
    return {
      isOnline: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// Statistics
// ============================================

export interface NodeStats {
  total: number;
  byType: {
    validator: number;
    worker: number;
    rpc: number;
  };
  byStatus: {
    pending: number;
    active: number;
    inactive: number;
    suspended: number;
    slashed: number;
  };
  totalStaked: string;
}

export async function getNodeStats(): Promise<NodeStats> {
  const nodes = await db.select().from(registeredNodes);

  const stats: NodeStats = {
    total: nodes.length,
    byType: { validator: 0, worker: 0, rpc: 0 },
    byStatus: { pending: 0, active: 0, inactive: 0, suspended: 0, slashed: 0 },
    totalStaked: '0',
  };

  let totalStaked = BigInt(0);

  for (const node of nodes) {
    stats.byType[node.nodeType]++;
    stats.byStatus[node.status]++;
    totalStaked += BigInt(node.stakeAmount || '0');
  }

  stats.totalStaked = totalStaked.toString();

  return stats;
}

export async function getLeaderboard(
  nodeType: 'validator' | 'worker' | 'rpc',
  limit: number = 20,
): Promise<RegisteredNode[]> {
  return db
    .select()
    .from(registeredNodes)
    .where(and(eq(registeredNodes.nodeType, nodeType), eq(registeredNodes.status, 'active')))
    .orderBy(desc(registeredNodes.uptime), desc(registeredNodes.blocksProduced))
    .limit(limit);
}

// ============================================
// Rewards
// ============================================

export async function recordNodeReward(
  nodeId: string,
  rewardType: string,
  amount: string,
  blockNumber?: number,
  txHash?: string,
): Promise<void> {
  const id = randomUUID();

  await db.insert(nodeRewards).values({
    id,
    nodeId,
    rewardType,
    amount,
    blockNumber: blockNumber || null,
    txHash: txHash || null,
  });

  // Update total rewards
  const [node] = await db.select().from(registeredNodes).where(eq(registeredNodes.id, nodeId));
  if (node) {
    const newTotal = (BigInt(node.totalRewards || '0') + BigInt(amount)).toString();
    await db
      .update(registeredNodes)
      .set({ totalRewards: newTotal, updatedAt: new Date() })
      .where(eq(registeredNodes.id, nodeId));
  }
}

export async function getNodeRewards(
  nodeId: string,
  limit: number = 50,
): Promise<(typeof nodeRewards.$inferSelect)[]> {
  return db
    .select()
    .from(nodeRewards)
    .where(eq(nodeRewards.nodeId, nodeId))
    .orderBy(desc(nodeRewards.createdAt))
    .limit(limit);
}
