/**
 * Axionax SDK - Staking Client
 * 
 * Copy this file to: packages/sdk/src/clients/staking.ts
 * For use in @axionax/sdk
 */

import {
    ValidatorInfo,
    StakingStats,
    ValidatorResponse,
    StakingStatsResponse,
    parseValidatorInfo,
    parseStakingStats,
    toHex,
} from './staking';

/**
 * Staking Client for RPC calls
 */
export class StakingClient {
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
     * Get validator information
     * @param address Validator address
     * @returns Validator info or null if not found
     */
    async getValidator(address: string): Promise<ValidatorInfo | null> {
        const result = await this.call<ValidatorResponse | null>(
            'staking_getValidator',
            [address]
        );
        return result ? parseValidatorInfo(result) : null;
    }

    /**
     * Get list of active validators
     * @returns List of validators
     */
    async getActiveValidators(): Promise<ValidatorInfo[]> {
        const result = await this.call<ValidatorResponse[]>(
            'staking_getActiveValidators',
            []
        );
        return result.map(parseValidatorInfo);
    }

    /**
     * Get total staked tokens
     * @returns Token amount (bigint)
     */
    async getTotalStaked(): Promise<bigint> {
        const result = await this.call<string>('staking_getTotalStaked', []);
        return BigInt(result);
    }

    /**
     * Get staking system statistics
     * @returns Statistics
     */
    async getStats(): Promise<StakingStats> {
        const result = await this.call<StakingStatsResponse>('staking_getStats', []);
        return parseStakingStats(result);
    }

    // ===========================================================================
    // Action Methods / For performing actions
    // ===========================================================================

    /**
     * Stake tokens to become a validator
     * @param address Address
     * @param amount Token amount
     */
    async stake(address: string, amount: bigint): Promise<boolean> {
        return await this.call<boolean>('staking_stake', [address, toHex(amount)]);
    }

    /**
     * Begin unstaking (must wait for lock period)
     * @param address Address
     * @param amount Token amount
     */
    async unstake(address: string, amount: bigint): Promise<boolean> {
        return await this.call<boolean>('staking_unstake', [address, toHex(amount)]);
    }

    /**
     * Delegate tokens to a validator
     * @param delegator Delegator address
     * @param validator Receiving validator
     * @param amount Token amount
     */
    async delegate(
        delegator: string,
        validator: string,
        amount: bigint
    ): Promise<boolean> {
        return await this.call<boolean>('staking_delegate', [
            delegator,
            validator,
            toHex(amount),
        ]);
    }

    /**
     * Claim staking rewards
     * @param address Address
     * @returns Amount of rewards received
     */
    async claimRewards(address: string): Promise<bigint> {
        const result = await this.call<string>('staking_claimRewards', [address]);
        return BigInt(result);
    }
}

// =============================================================================
// React Hooks (if using React)
// =============================================================================

/**
 * Example hook for React
 *
 * import { useStaking } from '@axionax/sdk';
 *
 * function StakingPage() {
 *   const { validators, stats, loading, stake, delegate } = useStaking();
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <h1>Total Staked: {formatAXX(stats.totalStaked)}</h1>
 *       {validators.map(v => (
 *         <ValidatorCard key={v.address} validator={v} onDelegate={delegate} />
 *       ))}
 *     </div>
 *   );
 * }
 */

// Example hook implementation (uncomment when using React):
/*
import { useState, useEffect, useCallback } from 'react';

export function useStaking(rpcUrl: string) {
  const [client] = useState(() => new StakingClient(rpcUrl));
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [v, s] = await Promise.all([
        client.getActiveValidators(),
        client.getStats(),
      ]);
      setValidators(v);
      setStats(s);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  const stake = useCallback(
    async (address: string, amount: bigint) => {
      await client.stake(address, amount);
      await refresh();
    },
    [client, refresh]
  );

  const delegate = useCallback(
    async (delegator: string, validator: string, amount: bigint) => {
      await client.delegate(delegator, validator, amount);
      await refresh();
    },
    [client, refresh]
  );

  return { validators, stats, loading, error, refresh, stake, delegate };
}
*/
