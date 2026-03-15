/**
 * @axionax/sdk
 * 
 * TypeScript SDK for Axionax Protocol.
 * Provides client, types, and utilities for building dApps on Axionax.
 */

// ============================================
// Types
// ============================================
export type {
    // From types.ts
    ClientConfig,
    AxionaxClient,
    EscrowTransaction,
    Job,
    Worker,
    Wallet,
    TransactionRequest,
    TransactionResponse,
    TransactionReceipt,

    // Re-exported from blockchain-utils
    NetworkConfig,
    TokenInfo,
    TokenBalance,
    TransactionInfo,
    TransactionType,
    AddressInfo,
    BlockInfo,
    ValidatorInfo,
    StakingPosition,
    Proposal,
    ProposalStatus,
} from './types.js';

// ============================================
// Enums
// ============================================
export { EscrowStatus, JobStatus } from './types.js';

// ============================================
// Configuration
// ============================================
export {
    AXIONAX_TESTNET_CONFIG,
    AXIONAX_MAINNET_CONFIG,
    DEFAULT_CONFIG,
    CONTRACTS,
} from './config.js';

// ============================================
// Services
// ============================================
export {
  EscrowService,
  escrowService,
  type EscrowServiceResult,
} from './services/escrow.js';

// ============================================
// Client
// ============================================
export { createClient, AxionaxClientImpl } from './client.js';

// ============================================
// Re-exports from blockchain-utils
// ============================================
export {
    // Constants
    CHAIN_IDS,
    RPC_URLS,
    EXPLORER_URLS,
    AXX_TOKEN,
    AXXT_TOKEN,
    STAKING_CONSTANTS,
    GOVERNANCE_CONSTANTS,

    // Helpers
    formatAddress,
    formatUnits,
    parseUnits,
    formatAXX,
    formatGwei,
    isValidAddress,
    isValidTxHash,
    truncateHash,
    timeAgo,
    formatTimestamp,
    formatDuration,
    getErrorMessage,
    chainIdToHex,
    hexToChainId,
    sleep,
    retry,

    // Chains
    axionaxTestnet,
    axionaxMainnet,
    getChainById,
    isAxionaxChain,
    isTestnet,
    isMainnet,
    getMetaMaskNetworkParams,

    // Wallet utilities
    getProvider,
    isMetaMaskInstalled,
    isWalletAvailable,
    connectWallet,
    getAccounts,
    getCurrentAccount,
    getChainId,
    switchChain,
    addChain,
    connectToAxionax,
    getBalance,
    getTransactionCount,
    addToken,
    onAccountsChanged,
    onChainChanged,
} from '@axionax/blockchain-utils';

// ============================================
// Convenience exports
// ============================================

// For backward compatibility with Technology.tsx
export const axionax = {
    createClient: async () => {
        const { createClient } = await import('./client.js');
        return createClient();
    },
};

// Wallet class for backward compatibility
export { Wallet as WalletType } from './types.js';
