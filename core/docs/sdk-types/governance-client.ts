/**
 * Axionax SDK - Governance Client
 * 
 * Copy this file to: packages/sdk/src/clients/governance.ts
 * For use in @axionax/sdk
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
} from './governance';

/**
 * Governance Client for RPC calls
 */
export class GovernanceClient {
    private rpcUrl: string;

    constructor(rpcUrl: string) {
        this.rpcUrl = rpcUrl;
    }

    /**
     * Call an RPC method
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
    // Query Methods / For fetching data
    // ===========================================================================

    /**
     * Get proposal information
     * @param proposalId Proposal ID
     * @returns Proposal or null if not found
     */
    async getProposal(proposalId: number): Promise<Proposal | null> {
        const result = await this.call<ProposalResponse | null>(
            'gov_getProposal',
            [proposalId]
        );
        return result ? parseProposal(result) : null;
    }

    /**
     * Get list of proposals currently open for voting
     * @returns List of proposals
     */
    async getActiveProposals(): Promise<Proposal[]> {
        const result = await this.call<ProposalResponse[]>(
            'gov_getActiveProposals',
            []
        );
        return result.map(parseProposal);
    }

    /**
     * Get governance system statistics and config
     * @returns Statistics
     */
    async getStats(): Promise<GovernanceStats> {
        const result = await this.call<GovernanceStatsResponse>('gov_getStats', []);
        return parseGovernanceStats(result);
    }

    /**
     * Check whether a user has already voted
     * @param proposalId Proposal ID
     * @param voter Voter address
     * @returns VoteOption or null if not yet voted
     */
    async getVote(proposalId: number, voter: string): Promise<VoteOption | null> {
        const result = await this.call<string | null>('gov_getVote', [
            proposalId,
            voter,
        ]);
        return result as VoteOption | null;
    }

    // ===========================================================================
    // Action Methods / For performing actions
    // ===========================================================================

    /**
     * Create a new proposal
     * @param proposer Proposer address
     * @param proposal Proposal data
     * @param signature Ed25519 signature over "createProposal"
     * @param publicKey Ed25519 public key used by the signature
     * @returns ID of the created proposal
     */
    async createProposal(
        proposer: string,
        proposal: NewProposal,
        signature: string,
        publicKey: string
    ): Promise<number> {
        const typeString = buildProposalTypeString(proposal);

        return await this.call<number>('gov_createProposal', [
            proposer,
            proposal.title,
            proposal.description,
            typeString,
            signature,
            publicKey,
        ]);
    }

    /**
     * Cast a vote
     * @param voter Voter address
     * @param proposalId Proposal ID
     * @param vote Vote option (for/against/abstain)
     * @param signature Ed25519 signature over "vote"
     * @param publicKey Ed25519 public key used by the signature
     */
    async vote(
        voter: string,
        proposalId: number,
        vote: VoteOption,
        signature: string,
        publicKey: string
    ): Promise<boolean> {
        return await this.call<boolean>('gov_vote', [
            voter,
            proposalId,
            vote,
            signature,
            publicKey,
        ]);
    }

    /**
     * Finalize proposal after voting period ends
     * @param proposalId Proposal ID
     * @returns Status ('passed' or 'failed')
     */
    async finalizeProposal(
        proposalId: number
    ): Promise<'passed' | 'failed'> {
        return await this.call<'passed' | 'failed'>('gov_finalizeProposal', [proposalId]);
    }

    /**
     * Execute a passed proposal
     * @param proposalId Proposal ID
     * @returns Execution data (hex)
     */
    async executeProposal(proposalId: number): Promise<string> {
        return await this.call<string>('gov_executeProposal', [proposalId]);
    }
}

// =============================================================================
// React Hooks (if using React)
// =============================================================================

/**
 * Example hook for React
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
    async (
      proposalId: number,
      voteOption: VoteOption,
      signature: string,
      publicKey: string
    ) => {
      if (!userAddress) throw new Error('No user address');
      await client.vote(userAddress, proposalId, voteOption, signature, publicKey);
      await refresh();
    },
    [client, userAddress, refresh]
  );

  const createProposal = useCallback(
    async (proposal: NewProposal, signature: string, publicKey: string) => {
      if (!userAddress) throw new Error('No user address');
      const id = await client.createProposal(userAddress, proposal, signature, publicKey);
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
