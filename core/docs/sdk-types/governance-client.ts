/**
 * Axionax SDK - Governance Client
 * 
 * Copy this file to: packages/sdk/src/clients/governance.ts
 * สำหรับใช้ใน @axionax/sdk
 */

import {
    Proposal,
    GovernanceStats,
    VoteOption,
    NewProposal,
    ProposalResponse,
    GovernanceStatsResponse,
    parseProposal,
    parseGovernanceStats,
    buildProposalTypeString,
} from '../types/governance';
import { toHex } from '../types/staking';

/**
 * Governance Client สำหรับเรียก RPC
 */
export class GovernanceClient {
    private rpcUrl: string;

    constructor(rpcUrl: string) {
        this.rpcUrl = rpcUrl;
    }

    /**
     * เรียก RPC method
     */
    private async call<T>(method: string, params: unknown[] = []): Promise<T> {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id: Date.now(),
            }),
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(`RPC Error: ${data.error.message}`);
        }
        return data.result;
    }

    // ===========================================================================
    // Query Methods / สำหรับดึงข้อมูล
    // ===========================================================================

    /**
     * ดึงข้อมูล proposal
     * @param proposalId ID ของ proposal
     * @returns proposal หรือ null ถ้าไม่พบ
     */
    async getProposal(proposalId: number): Promise<Proposal | null> {
        const result = await this.call<ProposalResponse | null>(
            'gov_getProposal',
            [proposalId]
        );
        return result ? parseProposal(result) : null;
    }

    /**
     * ดึงรายการ proposals ที่กำลังเปิด vote
     * @returns รายการ proposals
     */
    async getActiveProposals(): Promise<Proposal[]> {
        const result = await this.call<ProposalResponse[]>(
            'gov_getActiveProposals',
            []
        );
        return result.map(parseProposal);
    }

    /**
     * ดึงสถิติและ config ของระบบ governance
     * @returns สถิติ
     */
    async getStats(): Promise<GovernanceStats> {
        const result = await this.call<GovernanceStatsResponse>('gov_getStats', []);
        return parseGovernanceStats(result);
    }

    /**
     * ตรวจสอบว่าผู้ใช้ vote แล้วหรือยัง
     * @param proposalId ID ของ proposal
     * @param voter ที่อยู่ผู้ vote
     * @returns VoteOption หรือ null ถ้ายังไม่ได้ vote
     */
    async getVote(proposalId: number, voter: string): Promise<VoteOption | null> {
        const result = await this.call<string | null>('gov_getVote', [
            proposalId,
            voter,
        ]);
        return result as VoteOption | null;
    }

    // ===========================================================================
    // Action Methods / สำหรับทำ action
    // ===========================================================================

    /**
     * สร้าง proposal ใหม่
     * @param proposer ที่อยู่ผู้เสนอ
     * @param proposerStake stake ของผู้เสนอ
     * @param proposal ข้อมูล proposal
     * @returns ID ของ proposal ที่สร้าง
     */
    async createProposal(
        proposer: string,
        proposerStake: bigint,
        proposal: NewProposal
    ): Promise<number> {
        const typeString = buildProposalTypeString(proposal);

        return await this.call<number>('gov_createProposal', [
            proposer,
            toHex(proposerStake),
            proposal.title,
            proposal.description,
            typeString,
        ]);
    }

    /**
     * ลงคะแนนเสียง
     * @param voter ที่อยู่ผู้ vote
     * @param proposalId ID ของ proposal
     * @param vote ตัวเลือก (for/against/abstain)
     * @param voteWeight น้ำหนักเสียง (= stake)
     */
    async vote(
        voter: string,
        proposalId: number,
        vote: VoteOption,
        voteWeight: bigint
    ): Promise<boolean> {
        return await this.call<boolean>('gov_vote', [
            voter,
            proposalId,
            vote,
            toHex(voteWeight),
        ]);
    }

    /**
     * สรุปผล proposal หลังหมดเวลา vote
     * @param proposalId ID ของ proposal
     * @param totalStaked จำนวน stake ทั้งหมดในระบบ
     * @returns สถานะ ('passed' หรือ 'failed')
     */
    async finalizeProposal(
        proposalId: number,
        totalStaked: bigint
    ): Promise<'passed' | 'failed'> {
        return await this.call<'passed' | 'failed'>('gov_finalizeProposal', [
            proposalId,
            toHex(totalStaked),
        ]);
    }

    /**
     * Execute proposal ที่ผ่านแล้ว
     * @param proposalId ID ของ proposal
     * @returns execution data (hex)
     */
    async executeProposal(proposalId: number): Promise<string> {
        return await this.call<string>('gov_executeProposal', [proposalId]);
    }
}

// =============================================================================
// React Hooks (ถ้าใช้ React)
// =============================================================================

/**
 * ตัวอย่าง hook สำหรับ React
 *
 * import { useGovernance } from '@axionax/sdk';
 *
 * function GovernancePage() {
 *   const { proposals, stats, loading, vote, createProposal } = useGovernance();
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <h1>Active Proposals: {stats.activeProposals}</h1>
 *       {proposals.map(p => (
 *         <ProposalCard
 *           key={p.id}
 *           proposal={p}
 *           onVote={(v) => vote(p.id, v)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 */

// Example hook implementation (uncomment when using React):
/*
import { useState, useEffect, useCallback } from 'react';

export function useGovernance(rpcUrl: string, userAddress?: string) {
  const [client] = useState(() => new GovernanceClient(rpcUrl));
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [userVotes, setUserVotes] = useState<Map<number, VoteOption>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [p, s] = await Promise.all([
        client.getActiveProposals(),
        client.getStats(),
      ]);
      setProposals(p);
      setStats(s);

      // Load user votes
      if (userAddress) {
        const votes = new Map<number, VoteOption>();
        for (const proposal of p) {
          const vote = await client.getVote(proposal.id, userAddress);
          if (vote) votes.set(proposal.id, vote);
        }
        setUserVotes(votes);
      }

      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [client, userAddress]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  const vote = useCallback(
    async (proposalId: number, voteOption: VoteOption, weight: bigint) => {
      if (!userAddress) throw new Error('No user address');
      await client.vote(userAddress, proposalId, voteOption, weight);
      await refresh();
    },
    [client, userAddress, refresh]
  );

  const createProposal = useCallback(
    async (proposal: NewProposal, stake: bigint) => {
      if (!userAddress) throw new Error('No user address');
      const id = await client.createProposal(userAddress, stake, proposal);
      await refresh();
      return id;
    },
    [client, userAddress, refresh]
  );

  return {
    proposals,
    stats,
    userVotes,
    loading,
    error,
    refresh,
    vote,
    createProposal,
  };
}
*/
