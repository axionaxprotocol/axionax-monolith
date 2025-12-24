/**
 * Axionax SDK - Staking Client
 * 
 * Copy this file to: packages/sdk/src/clients/staking.ts
 * สำหรับใช้ใน @axionax/sdk
 */

import {
    ValidatorInfo,
    StakingStats,
    ValidatorResponse,
    StakingStatsResponse,
    parseValidatorInfo,
    parseStakingStats,
    toHex,
} from '../types/staking';

/**
 * Staking Client สำหรับเรียก RPC
 */
export class StakingClient {
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
     * ดึงข้อมูล validator
     * @param address ที่อยู่ validator
     * @returns ข้อมูล validator หรือ null ถ้าไม่พบ
     */
    async getValidator(address: string): Promise<ValidatorInfo | null> {
        const result = await this.call<ValidatorResponse | null>(
            'staking_getValidator',
            [address]
        );
        return result ? parseValidatorInfo(result) : null;
    }

    /**
     * ดึงรายชื่อ validators ที่ active
     * @returns รายชื่อ validators
     */
    async getActiveValidators(): Promise<ValidatorInfo[]> {
        const result = await this.call<ValidatorResponse[]>(
            'staking_getActiveValidators',
            []
        );
        return result.map(parseValidatorInfo);
    }

    /**
     * ดึงจำนวน token ที่ stake ทั้งหมด
     * @returns จำนวน token (bigint)
     */
    async getTotalStaked(): Promise<bigint> {
        const result = await this.call<string>('staking_getTotalStaked', []);
        return BigInt(result);
    }

    /**
     * ดึงสถิติระบบ staking
     * @returns สถิติ
     */
    async getStats(): Promise<StakingStats> {
        const result = await this.call<StakingStatsResponse>('staking_getStats', []);
        return parseStakingStats(result);
    }

    // ===========================================================================
    // Action Methods / สำหรับทำ action
    // ===========================================================================

    /**
     * Stake tokens เพื่อเป็น validator
     * @param address ที่อยู่
     * @param amount จำนวน token
     */
    async stake(address: string, amount: bigint): Promise<boolean> {
        return await this.call<boolean>('staking_stake', [address, toHex(amount)]);
    }

    /**
     * เริ่มถอน stake (ต้องรอ lock period)
     * @param address ที่อยู่
     * @param amount จำนวน token
     */
    async unstake(address: string, amount: bigint): Promise<boolean> {
        return await this.call<boolean>('staking_unstake', [address, toHex(amount)]);
    }

    /**
     * Delegate tokens ให้ validator
     * @param delegator ผู้ delegate
     * @param validator validator ที่รับ
     * @param amount จำนวน token
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
     * รับ staking rewards
     * @param address ที่อยู่
     * @returns จำนวน rewards ที่ได้รับ
     */
    async claimRewards(address: string): Promise<bigint> {
        const result = await this.call<string>('staking_claimRewards', [address]);
        return BigInt(result);
    }
}

// =============================================================================
// React Hooks (ถ้าใช้ React)
// =============================================================================

/**
 * ตัวอย่าง hook สำหรับ React
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
