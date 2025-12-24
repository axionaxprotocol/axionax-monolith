/**
 * Axionax SDK - Governance Types
 * 
 * Copy this file to: packages/sdk/src/types/governance.ts
 * สำหรับใช้ใน @axionax/sdk
 */

// =============================================================================
// Types / ประเภทข้อมูล
// =============================================================================

/**
 * ประเภทของ Proposal
 */
export type ProposalType = 'text' | 'parameter' | 'treasury' | 'upgrade';

/**
 * สถานะของ Proposal
 */
export type ProposalStatus = 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';

/**
 * ตัวเลือกการ Vote
 */
export type VoteOption = 'for' | 'against' | 'abstain';

/**
 * ข้อมูล Proposal
 */
export interface Proposal {
    /** ID ของ proposal */
    id: number;
    /** ผู้เสนอ */
    proposer: string;
    /** หัวข้อ */
    title: string;
    /** รายละเอียด */
    description: string;
    /** ประเภท */
    proposalType: ProposalType;
    /** ข้อมูลเพิ่มเติมตามประเภท */
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
    /** block ที่เริ่ม vote */
    startBlock: number;
    /** block ที่หมดเวลา vote */
    endBlock: number;
    /** สถานะปัจจุบัน */
    status: ProposalStatus;
    /** คะแนน เห็นด้วย */
    votesFor: bigint;
    /** คะแนน ไม่เห็นด้วย */
    votesAgainst: bigint;
    /** คะแนน งดออกเสียง */
    votesAbstain: bigint;
    /** คะแนนทั้งหมด */
    totalVotes: bigint;
    /** stake ของผู้เสนอ ณ เวลาที่สร้าง */
    proposerStake: bigint;
}

/**
 * ข้อมูลการ Vote
 */
export interface VoteRecord {
    /** ผู้ vote */
    voter: string;
    /** proposal ID */
    proposalId: number;
    /** ตัวเลือก */
    vote: VoteOption;
    /** น้ำหนักเสียง (= stake) */
    weight: bigint;
    /** block ที่ vote */
    block: number;
}

/**
 * สถิติระบบ Governance
 */
export interface GovernanceStats {
    /** จำนวน proposals ที่กำลังเปิด vote */
    activeProposals: number;
    /** จำนวน proposals ทั้งหมด */
    totalProposals: number;
    /** ระยะเวลา vote (blocks) */
    votingPeriodBlocks: number;
    /** ระยะเวลารอหลัง vote ผ่าน (blocks) */
    executionDelayBlocks: number;
    /** quorum ที่ต้องการ (basis points) */
    quorumBps: number;
    /** threshold ที่ต้องผ่าน (basis points) */
    passThresholdBps: number;
    /** stake ขั้นต่ำเพื่อสร้าง proposal */
    minProposalStake: bigint;
}

/**
 * Config ของระบบ Governance
 */
export interface GovernanceConfig {
    /** stake ขั้นต่ำเพื่อสร้าง proposal */
    minProposalStake: bigint;
    /** ระยะเวลา vote (blocks) */
    votingPeriodBlocks: number;
    /** ระยะเวลารอหลัง vote ผ่าน (blocks) */
    executionDelayBlocks: number;
    /** quorum ที่ต้องการ (basis points, 3000 = 30%) */
    quorumBps: number;
    /** threshold ที่ต้องผ่าน (basis points, 5000 = 50%) */
    passThresholdBps: number;
}

/**
 * ข้อมูลสำหรับสร้าง Proposal ใหม่
 */
export interface NewProposal {
    /** หัวข้อ */
    title: string;
    /** รายละเอียด */
    description: string;
    /** ประเภท */
    type: ProposalType;
    /** สำหรับ parameter change */
    paramKey?: string;
    paramValue?: string;
    /** สำหรับ treasury spend */
    recipient?: string;
    amount?: bigint;
    /** สำหรับ upgrade */
    version?: string;
}

// =============================================================================
// RPC Response Types / ประเภทการตอบกลับจาก RPC
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
// Helper Functions / ฟังก์ชันช่วย
// =============================================================================

/**
 * แปลง ProposalResponse จาก RPC เป็น Proposal
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
 * แปลง proposal_type string เป็น ProposalType และ typeData
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
 * แปลง GovernanceStatsResponse จาก RPC เป็น GovernanceStats
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
 * สร้าง proposal type string สำหรับส่ง RPC
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
 * คำนวณเปอร์เซ็นต์ vote
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
 * ตรวจสอบว่า proposal ผ่าน quorum หรือไม่
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
 * ตรวจสอบว่า proposal ผ่าน threshold หรือไม่
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
 * คำนวณเวลาที่เหลือจาก blocks
 */
export function blocksToTime(blocks: number, blockTimeSeconds = 2.5): string {
    const totalSeconds = blocks * blockTimeSeconds;

    if (totalSeconds < 60) {
        return `${Math.round(totalSeconds)} วินาที`;
    }
    if (totalSeconds < 3600) {
        return `${Math.round(totalSeconds / 60)} นาที`;
    }
    if (totalSeconds < 86400) {
        return `${Math.round(totalSeconds / 3600)} ชั่วโมง`;
    }
    return `${Math.round(totalSeconds / 86400)} วัน`;
}

/**
 * แปลง ProposalStatus เป็นภาษาไทย
 */
export function getStatusLabel(status: ProposalStatus): string {
    const labels: Record<ProposalStatus, string> = {
        active: 'กำลังเปิด Vote',
        passed: 'ผ่าน',
        failed: 'ไม่ผ่าน',
        executed: 'ดำเนินการแล้ว',
        cancelled: 'ยกเลิก',
    };
    return labels[status];
}

/**
 * แปลง ProposalType เป็นภาษาไทย
 */
export function getTypeLabel(type: ProposalType): string {
    const labels: Record<ProposalType, string> = {
        text: 'ข้อเสนอทั่วไป',
        parameter: 'เปลี่ยน Parameter',
        treasury: 'เบิก Treasury',
        upgrade: 'อัพเกรด Protocol',
    };
    return labels[type];
}
