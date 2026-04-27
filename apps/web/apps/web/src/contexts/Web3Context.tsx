'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  connectWallet,
  getCurrentAccount,
  getBalance,
  getCurrentChainId,
  AXIONAX_NETWORK,
} from '@/lib/web3';

interface Web3ContextType {
  account: string | null;
  balance: string;
  chainId: string | null;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

function normalizeChainId(chainId: number | string | null): string | null {
  if (chainId === null) return null;
  if (typeof chainId === 'string') {
    return chainId.startsWith('0x')
      ? chainId.toLowerCase()
      : `0x${Number(chainId).toString(16)}`;
  }
  return `0x${chainId.toString(16)}`;
}

export function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorrectNetwork = normalizeChainId(chainId) === AXIONAX_NETWORK.chainId;

  // Load account and balance
  const loadAccountData = useCallback(async (address: string) => {
    const bal = await getBalance(address);
    setBalance(bal.toString());
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await connectWallet();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await loadAccountData(accounts[0]);

        const currentChainId = await getCurrentChainId();
        setChainId(normalizeChainId(currentChainId));
      }
    } catch (err: unknown) {
      console.error('Connection error:', err);
      const error = err as Error;
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [loadAccountData]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance('0');
    setChainId(null);
    setError(null);
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      const currentAccount = await getCurrentAccount();
      if (currentAccount) {
        setAccount(currentAccount);
        await loadAccountData(currentAccount);

        const currentChainId = await getCurrentChainId();
        setChainId(normalizeChainId(currentChainId));
      }
    };

    void checkConnection();
  }, [loadAccountData]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { ethereum } = window as unknown as {
      ethereum?: {
        on?: (event: string, handler: (...args: unknown[]) => void) => void;
        removeListener?: (
          event: string,
          handler: (...args: unknown[]) => void
        ) => void;
      };
    };
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]): void => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        void loadAccountData(accounts[0]);
      }
    };

    const handleChainChanged = (newChainId: string): void => {
      setChainId(normalizeChainId(newChainId));
      // Reload balance when chain changes
      if (account) {
        void loadAccountData(account);
      }
    };

    ethereum.on?.(
      'accountsChanged',
      handleAccountsChanged as (...args: unknown[]) => void
    );
    ethereum.on?.(
      'chainChanged',
      handleChainChanged as (...args: unknown[]) => void
    );

    return () => {
      ethereum.removeListener?.(
        'accountsChanged',
        handleAccountsChanged as (...args: unknown[]) => void
      );
      ethereum.removeListener?.(
        'chainChanged',
        handleChainChanged as (...args: unknown[]) => void
      );
    };
  }, [account, disconnect, loadAccountData]);

  return (
    <Web3Context.Provider
      value={{
        account,
        balance,
        chainId,
        isConnecting,
        isCorrectNetwork,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3(): Web3ContextType {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
