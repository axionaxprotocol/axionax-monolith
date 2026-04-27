'use client';

import React, { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import {
  formatAddress,
  isMetaMaskInstalled,
  addAXXToken,
  AXIONAX_NETWORK_CONFIG,
} from '@/lib/web3';
import Button from '@/components/ui/Button';

export default function ConnectButton(): React.JSX.Element {
  const {
    account,
    balance,
    isConnecting,
    isCorrectNetwork,
    connect,
    disconnect,
  } = useWeb3();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingToken, setIsAddingToken] = useState(false);

  const handleConnect = async (): Promise<void> => {
    if (!isMetaMaskInstalled()) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    await connect();
  };

  const handleAddToken = async (tokenAddress: string): Promise<void> => {
    if (!isMetaMaskInstalled()) {
      alert('Please install MetaMask to continue');
      return;
    }

    setIsAddingToken(true);
    try {
      const wasAdded = await addAXXToken(tokenAddress);
      if (wasAdded) {
        alert('AXX Token added to MetaMask successfully.');
      } else {
        alert('User declined to add token');
      }
    } catch (error) {
      console.error('Error adding token:', error);
      alert('Failed to add token: ' + (error as Error).message);
    } finally {
      setIsAddingToken(false);
    }
  };

  if (isConnecting) {
    return (
      <Button variant="primary" size="sm" disabled>
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Connecting...
      </Button>
    );
  }

  if (!account) {
    return (
      <Button variant="primary" size="sm" onClick={() => void handleConnect()}>
        {!isMetaMaskInstalled() ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.5 12c0-5.8-4.7-10.5-10.5-10.5S1.5 6.2 1.5 12 6.2 22.5 12 22.5 22.5 17.8 22.5 12zm-2.5 0c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8z" />
            </svg>
            Install MetaMask
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
            Connect Wallet
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-dark-800 border transition-all duration-300
          ${
            isCorrectNetwork
              ? 'border-amber-500/30 hover:border-amber-500/50'
              : 'border-amber-500/30 hover:border-amber-500/50'
          }
        `}
      >
        {/* Network Status Indicator */}
        <span
          className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`}
        />

        {/* Balance */}
        <span className="text-sm font-medium text-dark-200">{balance} AXX</span>

        {/* Address */}
        <span className="text-sm text-dark-400 font-mono">
          {formatAddress(account)}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-dark-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 animate-fade-in">
          <div className="p-4 border-b border-dark-700">
            <div className="text-xs text-dark-500 mb-1">Connected Account</div>
            <div className="text-sm font-mono text-dark-200 break-all">
              {account}
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Network</span>
              <span
                className={`text-sm font-medium ${isCorrectNetwork ? 'text-green-400' : 'text-amber-400'}`}
              >
                {isCorrectNetwork
                  ? AXIONAX_NETWORK_CONFIG.chainName
                  : 'Wrong Network'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Balance</span>
              <span className="text-sm font-medium text-dark-200">
                {balance} AXX
              </span>
            </div>

            {!isCorrectNetwork && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="text-xs text-amber-400">
                  ⚠️ Please switch to {AXIONAX_NETWORK_CONFIG.chainName} (Chain
                  ID: {AXIONAX_NETWORK_CONFIG.chainIdDecimal})
                </div>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-dark-700 space-y-1">
            <button
              onClick={() =>
                void handleAddToken(
                  '0x0000000000000000000000000000000000001000'
                )
              }
              disabled={isAddingToken}
              className="w-full px-3 py-2 text-sm text-amber-400 hover:bg-dark-700 rounded-lg transition-colors text-left flex items-center gap-2 disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {isAddingToken ? 'Adding...' : 'Add AXX Token'}
            </button>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-700 rounded-lg transition-colors text-left flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
