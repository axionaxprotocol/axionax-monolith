/**
 * Faucet Service - Real Transaction Implementation
 *
 * Sends real AXX tokens on testnet
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { db } from '../db/index.js';
import { faucetClaims } from '../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

// ============================================
// Configuration
// ============================================

const config = {
  rpcUrl: process.env.RPC_URL || 'https://axionax.org/api/rpc/eu',
  chainId: parseInt(process.env.CHAIN_ID || '86137'),
  faucetPrivateKey: process.env.FAUCET_PRIVATE_KEY || '',
  // Faucet amount: 10,000 AXXt per day for validators to test staking
  faucetAmount: process.env.FAUCET_AMOUNT || '10000', // 10,000 AXXt per claim
  cooldownHours: parseInt(process.env.FAUCET_COOLDOWN_HOURS || '24'),
  dailyLimit: parseInt(process.env.FAUCET_DAILY_LIMIT || '100000'), // Max 100,000 AXXt per day total
  // Simulation mode: records claims without actual blockchain transactions
  // Set to false now that RPC nodes support full API
  simulationMode: process.env.FAUCET_SIMULATION_MODE === 'true', // Default to real mode
};

// Define Axionax Testnet chain
const axionaxTestnet = {
  id: config.chainId,
  name: 'Axionax Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'AXX',
    symbol: 'AXX',
  },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
  },
} as const;

// Create clients
const publicClient = createPublicClient({
  chain: axionaxTestnet,
  transport: http(config.rpcUrl),
});

let walletClient: ReturnType<typeof createWalletClient> | null = null;
let faucetAccount: ReturnType<typeof privateKeyToAccount> | null = null;

// Initialize wallet if private key is set
if (config.faucetPrivateKey && config.faucetPrivateKey.startsWith('0x')) {
  try {
    faucetAccount = privateKeyToAccount(config.faucetPrivateKey as `0x${string}`);
    walletClient = createWalletClient({
      account: faucetAccount,
      chain: axionaxTestnet,
      transport: http(config.rpcUrl),
    });
    console.log('✅ Faucet wallet initialized:', faucetAccount.address);
    if (config.simulationMode) {
      console.log(
        '⚠️  Faucet running in SIMULATION MODE - claims are recorded but no real transactions sent',
      );
    }
  } catch (error) {
    console.error('❌ Failed to initialize faucet wallet:', error);
  }
}

// ============================================
// Types
// ============================================

export interface FaucetInfo {
  address: string;
  balance: string;
  balanceFormatted: string;
  symbol: string;
  amountPerRequest: string;
  cooldownHours: number;
  isOperational: boolean;
}

export interface FaucetClaimResult {
  success: boolean;
  message: string;
  txHash?: string;
  amount?: string;
  blockNumber?: number;
  error?: string;
}

export interface ClaimHistory {
  address: string;
  claims: Array<{
    id: string;
    amount: string;
    txHash: string | null;
    claimedAt: Date;
  }>;
  totalClaimed: string;
  canClaimAgain: boolean;
  nextClaimAt: Date | null;
}

// ============================================
// Service Functions
// ============================================

/**
 * Get faucet wallet info and balance
 */
export async function getFaucetInfo(): Promise<FaucetInfo> {
  if (!faucetAccount) {
    return {
      address: '0x0000000000000000000000000000000000000000',
      balance: '0',
      balanceFormatted: '0',
      symbol: 'AXX',
      amountPerRequest: config.faucetAmount,
      cooldownHours: config.cooldownHours,
      isOperational: false,
    };
  }

  // In simulation mode, return a large simulated balance
  if (config.simulationMode) {
    return {
      address: faucetAccount.address,
      balance: parseEther('1000000').toString(), // 1M AXX simulated
      balanceFormatted: '1000000',
      symbol: 'AXX',
      amountPerRequest: config.faucetAmount,
      cooldownHours: config.cooldownHours,
      isOperational: true,
    };
  }

  try {
    const balance = await publicClient.getBalance({
      address: faucetAccount.address,
    });

    return {
      address: faucetAccount.address,
      balance: balance.toString(),
      balanceFormatted: formatEther(balance),
      symbol: 'AXX',
      amountPerRequest: config.faucetAmount,
      cooldownHours: config.cooldownHours,
      isOperational: true,
    };
  } catch (error) {
    console.error('Failed to get faucet balance:', error);
    return {
      address: faucetAccount.address,
      balance: '0',
      balanceFormatted: '0',
      symbol: 'AXX',
      amountPerRequest: config.faucetAmount,
      cooldownHours: config.cooldownHours,
      isOperational: false,
    };
  }
}

/**
 * Check if address can claim (cooldown check)
 */
export async function canClaim(
  address: string,
  ipAddress?: string,
): Promise<{
  canClaim: boolean;
  reason?: string;
  nextClaimAt?: Date;
}> {
  const cooldownTime = new Date(Date.now() - config.cooldownHours * 60 * 60 * 1000);

  // Check by address
  const recentClaim = await db
    .select()
    .from(faucetClaims)
    .where(
      and(
        eq(faucetClaims.address, address.toLowerCase()),
        gte(faucetClaims.claimedAt, cooldownTime),
      ),
    )
    .limit(1);

  if (recentClaim.length > 0) {
    const nextClaimAt = new Date(
      recentClaim[0].claimedAt.getTime() + config.cooldownHours * 60 * 60 * 1000,
    );
    return {
      canClaim: false,
      reason: `You can claim again in ${Math.ceil((nextClaimAt.getTime() - Date.now()) / (60 * 60 * 1000))} hours`,
      nextClaimAt,
    };
  }

  // Check by IP (if provided)
  if (ipAddress) {
    const recentIpClaim = await db
      .select()
      .from(faucetClaims)
      .where(and(eq(faucetClaims.ipAddress, ipAddress), gte(faucetClaims.claimedAt, cooldownTime)))
      .limit(1);

    if (recentIpClaim.length > 0) {
      const nextClaimAt = new Date(
        recentIpClaim[0].claimedAt.getTime() + config.cooldownHours * 60 * 60 * 1000,
      );
      return {
        canClaim: false,
        reason: `Your IP has already claimed. Try again in ${Math.ceil((nextClaimAt.getTime() - Date.now()) / (60 * 60 * 1000))} hours`,
        nextClaimAt,
      };
    }
  }

  return { canClaim: true };
}

/**
 * Claim tokens from faucet
 */
export async function claimTokens(
  recipientAddress: string,
  ipAddress?: string,
): Promise<FaucetClaimResult> {
  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
    return {
      success: false,
      message: 'Invalid wallet address format',
      error: 'INVALID_ADDRESS',
    };
  }

  // Check if faucet is operational
  if (!walletClient || !faucetAccount) {
    return {
      success: false,
      message: 'Faucet is not operational. Please contact admin.',
      error: 'FAUCET_NOT_CONFIGURED',
    };
  }

  // Check cooldown
  const cooldownCheck = await canClaim(recipientAddress, ipAddress);
  if (!cooldownCheck.canClaim) {
    return {
      success: false,
      message: cooldownCheck.reason || 'Cooldown period not expired',
      error: 'COOLDOWN_ACTIVE',
    };
  }

  // Check faucet balance
  const faucetInfo = await getFaucetInfo();
  const requiredAmount = parseEther(config.faucetAmount);

  if (BigInt(faucetInfo.balance) < requiredAmount) {
    return {
      success: false,
      message: 'Faucet is empty. Please try again later.',
      error: 'INSUFFICIENT_FUNDS',
    };
  }

  try {
    let txHash: Hash;
    let blockNumber: number = 0;

    if (config.simulationMode) {
      // Simulation mode: generate a mock transaction hash
      // Real tokens will be allocated when mainnet launches based on these claims
      const timestamp = Date.now();
      const randomPart = Math.random().toString(16).slice(2, 10);
      txHash =
        `0x${timestamp.toString(16)}${randomPart}${'0'.repeat(64 - timestamp.toString(16).length - randomPart.length)}` as Hash;
      blockNumber = Math.floor(timestamp / 1000);

      console.log(`📤 [SIMULATION] Faucet claim recorded: ${txHash} -> ${recipientAddress}`);
    } else {
      // Real transaction mode
      txHash = await walletClient.sendTransaction({
        account: walletClient.account!,
        chain: axionaxTestnet,
        to: recipientAddress as Address,
        value: requiredAmount,
      });

      console.log(`📤 Faucet TX sent: ${txHash} -> ${recipientAddress}`);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000, // 60 second timeout
      });
      blockNumber = Number(receipt.blockNumber);
    }

    // Record claim in database
    const claimId = `${txHash}-${Date.now()}`;
    await db.insert(faucetClaims).values({
      id: claimId,
      address: recipientAddress.toLowerCase(),
      amount: requiredAmount.toString(),
      transactionHash: txHash,
      ipAddress: ipAddress || null,
      claimedAt: new Date(),
    });

    console.log(
      `✅ Faucet claim successful: ${config.faucetAmount} AXX -> ${recipientAddress}${config.simulationMode ? ' [SIMULATION]' : ''}`,
    );

    return {
      success: true,
      message: config.simulationMode
        ? `Successfully recorded ${config.faucetAmount} AXX claim for ${recipientAddress}. Tokens will be allocated at mainnet launch.`
        : `Successfully sent ${config.faucetAmount} AXX to ${recipientAddress}`,
      txHash,
      amount: config.faucetAmount,
      blockNumber,
    };
  } catch (error) {
    console.error('❌ Faucet claim failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      message: 'Transaction failed. Please try again.',
      error: errorMessage,
    };
  }
}

/**
 * Get claim history for an address
 */
export async function getClaimHistory(address: string): Promise<ClaimHistory> {
  const claims = await db
    .select()
    .from(faucetClaims)
    .where(eq(faucetClaims.address, address.toLowerCase()))
    .orderBy(sql`${faucetClaims.claimedAt} DESC`)
    .limit(50);

  const totalClaimed = claims.reduce((sum, claim) => sum + BigInt(claim.amount), BigInt(0));

  const cooldownCheck = await canClaim(address);

  return {
    address,
    claims: claims.map((c) => ({
      id: c.id,
      amount: formatEther(BigInt(c.amount)),
      txHash: c.transactionHash,
      claimedAt: c.claimedAt,
    })),
    totalClaimed: formatEther(totalClaimed),
    canClaimAgain: cooldownCheck.canClaim,
    nextClaimAt: cooldownCheck.nextClaimAt || null,
  };
}

/**
 * Get faucet statistics
 */
export async function getFaucetStats(): Promise<{
  totalClaims: number;
  totalDistributed: string;
  uniqueAddresses: number;
  claimsToday: number;
  distributedToday: string;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalStats] = await db
    .select({
      count: sql<number>`count(*)`,
      total: sql<string>`COALESCE(sum(amount::numeric), 0)`,
      unique: sql<number>`count(distinct address)`,
    })
    .from(faucetClaims);

  const [todayStats] = await db
    .select({
      count: sql<number>`count(*)`,
      total: sql<string>`COALESCE(sum(amount::numeric), 0)`,
    })
    .from(faucetClaims)
    .where(gte(faucetClaims.claimedAt, today));

  return {
    totalClaims: totalStats?.count || 0,
    totalDistributed: formatEther(BigInt(totalStats?.total || '0')),
    uniqueAddresses: totalStats?.unique || 0,
    claimsToday: todayStats?.count || 0,
    distributedToday: formatEther(BigInt(todayStats?.total || '0')),
  };
}
