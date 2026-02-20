/**
 * Axionax SDK - Governance Types
 * 
 * Copy this file to: packages/sdk/src/types/governance.ts
 * For use in @axionax/sdk
 */

// =============================================================================
// Types / Data Types
// =============================================================================

/**
 * Proposal Type
 */
export type ProposalType = 'text' | 'parameter' | 'treasury' | 'upgrade';

/**
 * Proposal Status
 */
export type ProposalStatus = 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';

/**
 * Vote Option
 */
export type VoteOption = 'for' | 'against' | 'abstain';

/**
 * Proposal Information
 */
export interface Proposal {
    /** Proposal ID */
    id: number;
    /** Proposer */
    proposer: string;
    /** Title */
    title: string;
    /** Description */
    description: string;
    /** Type */
    proposalType: ProposalType;
    /** Additional data by type */
    typeData?: {
        // For parameter change
        paramKey?: string;
        paramValue?: string;
        // For treasury spend
        recipient?: string;
        amount?: bigint;
        // For upgrade
        version?: string;
    };
    /** Block when voting starts */
    startBlock: number;
    /** Block when voting ends */
    endBlock: number;
    /** Current status */
    status: ProposalStatus;
    /** Votes in favor */
    votesFor: bigint;
    /** Votes against */
    votesAgainst: bigint;
    /** Abstain votes */
    votesAbstain: bigint;
    /** Total votes */
    totalVotes: bigint;
    /** Proposer's stake at creation time */
    proposerStake: bigint;
}

/**
 * Vote Record
 */
export interface VoteRecord {
    /** Voter */
    voter: string;
    /** Proposal ID */
    proposalId: number;
    /** Vote option */
    vote: VoteOption;
    /** Vote weight (= stake) */
    weight: bigint;
    /** Block when voted */
    block: number;
}

/**
 * Governance System Statistics
 */
export interface GovernanceStats {
    /** Number of proposals currently open for voting */
    activeProposals: number;
    /** Total number of proposals */
    totalProposals: number;
    /** Voting period duration (blocks) */
    votingPeriodBlocks: number;
    /** Waiting period after vote passes (blocks) */
    executionDelayBlocks: number;
    /** Required quorum (basis points) */
    quorumBps: number;
    /** Pass threshold (basis points) */
    passThresholdBps: number;
    /** Minimum stake to create a proposal */
    minProposalStake: bigint;
}

/**
 * Governance System Configuration
 */
export interface GovernanceConfig {
    /** Minimum stake to create a proposal */
    minProposalStake: bigint;
    /** Voting period duration (blocks) */
    votingPeriodBlocks: number;
    /** Waiting period after vote passes (blocks) */
    executionDelayBlocks: number;
    /** Required quorum (basis points, 3000 = 30%) */
    quorumBps: number;
    /** Pass threshold (basis points, 5000 = 50%) */
    passThresholdBps: number;
}

/**
 * Data for creating a new Proposal
 */
export interface NewProposal {
    /** Title */
    title: string;
    /** Description */
    description: string;
    /** Type */
    type: ProposalType;
    /** For parameter change */
    paramKey?: string;
    paramValue?: string;
    /** For treasury spend */
    recipient?: string;
    amount?: bigint;
    /** For upgrade */
    version?: string;
}

// =============================================================================
// RPC Response Types
// =============================================================================

export interface ProposalResponse {
    id: number;
    proposer: string;
    title: string;
    description: string;
    proposal_type: string;
    start_block: number;
    end_block: number;
    status: string;
    votes_for: string;      // hex
    votes_against: string;  // hex
    votes_abstain: string;  // hex
    total_votes: string;    // hex
}

export interface GovernanceStatsResponse {
    active_proposals: number;
    total_proposals: number;
    voting_period_blocks: number;
    execution_delay_blocks: number;
    quorum_bps: number;
    pass_threshold_bps: number;
    min_proposal_stake: string; // hex
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert ProposalResponse from RPC to Proposal
 */
export function parseProposal(response: ProposalResponse): Proposal {
    const [proposalType, typeData] = parseProposalType(response.proposal_type);

    return {
        id: response.id,
        proposer: response.proposer,
        title: response.title,
        description: response.description,
        proposalType,
        typeData,
        startBlock: response.start_block,
        endBlock: response.end_block,
        status: response.status as ProposalStatus,
        votesFor: BigInt(response.votes_for),
        votesAgainst: BigInt(response.votes_against),
        votesAbstain: BigInt(response.votes_abstain),
        totalVotes: BigInt(response.total_votes),
        proposerStake: 0n, // Not in response
    };
}

/**
 * Convert proposal_type string to ProposalType and typeData
 */
function parseProposalType(typeStr: string): [ProposalType, Proposal['typeData']] {
    if (typeStr === 'text' || !typeStr) {
        return ['text', undefined];
    }

    if (typeStr.startsWith('parameter:')) {
        const [key, value] = typeStr.slice(10).split('=');
        return ['parameter', { paramKey: key, paramValue: value }];
    }

    if (typeStr.startsWith('treasury:')) {
        const parts = typeStr.slice(9).split(':');
        return ['treasury', { recipient: parts[0], amount: BigInt(parts[1] || '0') }];
    }

    if (typeStr.startsWith('upgrade:')) {
        return ['upgrade', { version: typeStr.slice(8) }];
    }

    return ['text', undefined];
}

/**
 * Convert GovernanceStatsResponse from RPC to GovernanceStats
 */
export function parseGovernanceStats(response: GovernanceStatsResponse): GovernanceStats {
    return {
        activeProposals: response.active_proposals,
        totalProposals: response.total_proposals,
        votingPeriodBlocks: response.voting_period_blocks,
        executionDelayBlocks: response.execution_delay_blocks,
        quorumBps: response.quorum_bps,
        passThresholdBps: response.pass_threshold_bps,
        minProposalStake: BigInt(response.min_proposal_stake),
    };
}

/**
 * Build proposal type string for RPC calls
 */
export function buildProposalTypeString(proposal: NewProposal): string {
    switch (proposal.type) {
        case 'text':
            return 'text';
        case 'parameter':
            return `parameter:${proposal.paramKey}=${proposal.paramValue}`;
        case 'treasury':
            return `treasury:${proposal.recipient}:${proposal.amount?.toString() || '0'}`;
        case 'upgrade':
            return `upgrade:${proposal.version}`;
        default:
            return 'text';
    }
}

/**
 * Calculate vote percentage
 */
export function calculateVotePercentage(
    votesFor: bigint,
    votesAgainst: bigint,
    votesAbstain: bigint
): { for: number; against: number; abstain: number } {
    const total = votesFor + votesAgainst + votesAbstain;

    if (total === 0n) {
        return { for: 0, against: 0, abstain: 0 };
    }

    return {
        for: Number((votesFor * 10000n) / total) / 100,
        against: Number((votesAgainst * 10000n) / total) / 100,
        abstain: Number((votesAbstain * 10000n) / total) / 100,
    };
}

/**
 * Check whether the proposal has reached quorum
 */
export function hasReachedQuorum(
    totalVotes: bigint,
    totalStaked: bigint,
    quorumBps: number
): boolean {
    const required = (totalStaked * BigInt(quorumBps)) / 10000n;
    return totalVotes >= required;
}

/**
 * Check whether the proposal has passed the threshold
 */
export function hasPassed(
    votesFor: bigint,
    votesAgainst: bigint,
    passThresholdBps: number
): boolean {
    const total = votesFor + votesAgainst;
    if (total === 0n) return false;

    const threshold = (total * BigInt(passThresholdBps)) / 10000n;
    return votesFor > threshold;
}

/**
 * Calculate remaining time from blocks
 */
export function blocksToTime(blocks: number, blockTimeSeconds = 2.5): string {
    const totalSeconds = blocks * blockTimeSeconds;

    if (totalSeconds < 60) {
        return `${Math.round(totalSeconds)} seconds`;
    }
    if (totalSeconds < 3600) {
        return `${Math.round(totalSeconds / 60)} minutes`;
    }
    if (totalSeconds < 86400) {
        return `${Math.round(totalSeconds / 3600)} hours`;
    }
    return `${Math.round(totalSeconds / 86400)} days`;
}

/**
 * Convert ProposalStatus to a human-readable label
 */
export function getStatusLabel(status: ProposalStatus): string {
    const labels: Record<ProposalStatus, string> = {
        active: 'Voting Open',
        passed: 'Passed',
        failed: 'Failed',
        executed: 'Executed',
        cancelled: 'Cancelled',
    };
    return labels[status];
}

/**
 * Convert ProposalType to a human-readable label
 */
export function getTypeLabel(type: ProposalType): string {
    const labels: Record<ProposalType, string> = {
        text: 'General Proposal',
        parameter: 'Parameter Change',
        treasury: 'Treasury Spend',
        upgrade: 'Protocol Upgrade',
    };
    return labels[type];
}
