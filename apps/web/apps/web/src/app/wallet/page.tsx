'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  generateNewWallet,
  importFromMnemonic,
  importFromPrivateKey,
  type GeneratedWallet,
  type ImportedWallet,
} from '@/lib/wallet-generator';
import { getBalance, AXIONAX_NETWORK_CONFIG } from '@/lib/web3';

type TabType = 'create' | 'import-mnemonic' | 'import-key';

interface StoredWallet {
  address: string;
  name: string;
  createdAt: number;
}

const formatAddress = (addr: string) =>
  `${addr.slice(0, 8)}...${addr.slice(-6)}`;

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [wallet, setWallet] = useState<GeneratedWallet | ImportedWallet | null>(
    null
  );
  const [storedWallets, setStoredWallets] = useState<StoredWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');

  // Form states
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [walletName, setWalletName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'backup' | 'confirm' | 'done'>(
    'form'
  );
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  // Load stored wallets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('axionax_wallets');
    if (saved) {
      try {
        const wallets = JSON.parse(saved) as StoredWallet[];
        setStoredWallets(wallets);
        if (wallets.length > 0 && !selectedWallet) {
          setSelectedWallet(wallets[0].address);
        }
      } catch {
        // Invalid data, reset
        localStorage.removeItem('axionax_wallets');
      }
    }
  }, [selectedWallet]);

  // Load balance for selected wallet
  useEffect(() => {
    async function loadBalance() {
      if (selectedWallet) {
        try {
          const bal = await getBalance(selectedWallet);
          setBalance(bal.toString());
        } catch {
          setBalance('0');
        }
      }
    }
    loadBalance();
    const interval = setInterval(loadBalance, 15000);
    return () => clearInterval(interval);
  }, [selectedWallet]);

  const handleCreateWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate slight delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newWallet = generateNewWallet();
      setWallet(newWallet);
      setStep('backup');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportMnemonic = async () => {
    setLoading(true);
    setError(null);

    try {
      const imported = importFromMnemonic(mnemonic);
      setWallet(imported);
      setStep('done');
      saveWallet(imported.address);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPrivateKey = async () => {
    setLoading(true);
    setError(null);

    try {
      const imported = importFromPrivateKey(privateKey);
      setWallet(imported);
      setStep('done');
      saveWallet(imported.address);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveWallet = (address: string) => {
    const newWallet: StoredWallet = {
      address,
      name: walletName || `Wallet ${storedWallets.length + 1}`,
      createdAt: Date.now(),
    };

    const updated = [
      ...storedWallets.filter((w) => w.address !== address),
      newWallet,
    ];
    setStoredWallets(updated);
    setSelectedWallet(address);
    localStorage.setItem('axionax_wallets', JSON.stringify(updated));
  };

  const handleConfirmBackup = () => {
    if (wallet && backupConfirmed) {
      saveWallet(wallet.address);
      setStep('done');
    }
  };

  const deleteWallet = (address: string) => {
    const updated = storedWallets.filter((w) => w.address !== address);
    setStoredWallets(updated);
    localStorage.setItem('axionax_wallets', JSON.stringify(updated));
    if (selectedWallet === address) {
      setSelectedWallet(updated[0]?.address || null);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const resetForm = () => {
    setWallet(null);
    setMnemonic('');
    setPrivateKey('');
    setWalletName('');
    setError(null);
    setStep('form');
    setBackupConfirmed(false);
    setShowPrivateKey(false);
  };

  return (
    <div className="min-h-screen">
      <main className="container-custom py-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-content mb-4">
            Wallet Manager
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Create or import a wallet to join Axionax Testnet
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: My Wallets */}
          <div className="lg:col-span-1">
            <div className="card-panel p-6">
              <h2 className="text-lg font-semibold text-content mb-6 flex items-center gap-2">
                📋 My Wallets
                <span className="text-xs bg-tech-cyan/10 text-tech-cyan px-2 py-0.5 rounded-full border border-tech-cyan/20">
                  {storedWallets.length}
                </span>
              </h2>

              {storedWallets.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <div className="text-4xl mb-3 opacity-50">🔐</div>
                  <p className="text-sm font-medium">No wallet yet</p>
                  <p className="text-xs mt-1 opacity-70">
                    Create or import a new wallet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {storedWallets.map((w) => (
                    <div
                      key={w.address}
                      onClick={() => setSelectedWallet(w.address)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedWallet === w.address
                          ? 'bg-tech-cyan/10 border-tech-cyan/30'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div
                            className={`font-medium text-sm ${selectedWallet === w.address ? 'text-tech-cyan' : 'text-content'}`}
                          >
                            {w.name}
                          </div>
                          <div className="font-mono text-xs text-muted mt-0.5">
                            {formatAddress(w.address)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this wallet?'))
                              deleteWallet(w.address);
                          }}
                          className="text-muted hover:text-tech-error p-1.5 rounded-md hover:bg-white/5 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Wallet Info */}
              {selectedWallet && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">
                    Balance
                  </div>
                  <div className="text-2xl font-bold text-content font-mono">
                    {balance}{' '}
                    <span className="text-tech-cyan text-lg">AXX</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <Link
                      href={`/faucet?address=${selectedWallet}`}
                      className="block w-full text-center py-2.5 px-4 bg-tech-cyan/10 hover:bg-tech-cyan/20 border border-tech-cyan/30 text-tech-cyan rounded-lg text-sm font-medium transition-colors"
                    >
                      Get Testnet Tokens
                    </Link>
                    <button
                      onClick={() => copyToClipboard(selectedWallet, 'address')}
                      className="w-full py-2.5 px-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 text-content rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {copied === 'address' ? '✅ Copied!' : '📋 Copy Address'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Create/Import */}
          <div className="lg:col-span-2">
            <div className="card-panel">
              {/* Tabs */}
              <div className="flex border-b border-white/10 bg-white/[0.02]">
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('create');
                  }}
                  className={`flex-1 py-4 px-4 text-sm font-medium transition-all ${
                    activeTab === 'create'
                      ? 'text-tech-cyan border-b-2 border-tech-cyan bg-tech-cyan/5'
                      : 'text-muted hover:text-content hover:bg-white/[0.02]'
                  }`}
                >
                  Create New
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('import-mnemonic');
                  }}
                  className={`flex-1 py-4 px-4 text-sm font-medium transition-all ${
                    activeTab === 'import-mnemonic'
                      ? 'text-tech-cyan border-b-2 border-tech-cyan bg-tech-cyan/5'
                      : 'text-muted hover:text-content hover:bg-white/[0.02]'
                  }`}
                >
                  Import Phrase
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('import-key');
                  }}
                  className={`flex-1 py-4 px-4 text-sm font-medium transition-all ${
                    activeTab === 'import-key'
                      ? 'text-tech-cyan border-b-2 border-tech-cyan bg-tech-cyan/5'
                      : 'text-muted hover:text-content hover:bg-white/[0.02]'
                  }`}
                >
                  Import Private Key
                </button>
              </div>

              <div className="p-6 sm:p-8">
                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                {/* CREATE TAB */}
                {activeTab === 'create' && (
                  <>
                    {step === 'form' && (
                      <div className="space-y-6">
                        <div className="text-center py-8">
                          <div className="text-6xl mb-4">🆕</div>
                          <h3 className="text-xl font-semibold text-white mb-2">
                            Create New Wallet
                          </h3>
                          <p className="text-dark-400 max-w-md mx-auto">
                            A new wallet will be created with a 12-word recovery
                            phrase. Please store this phrase securely.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm text-muted mb-2">
                            Wallet name (optional)
                          </label>
                          <input
                            type="text"
                            value={walletName}
                            onChange={(e) => setWalletName(e.target.value)}
                            placeholder="My Testnet Wallet"
                            className="w-full bg-black-hole/50 border border-white/10 rounded-lg px-4 py-3 text-content placeholder-muted focus:border-tech-cyan focus:ring-1 focus:ring-tech-cyan/20 focus:outline-none transition-all"
                          />
                        </div>

                        <button
                          onClick={handleCreateWallet}
                          disabled={loading}
                          className="w-full py-3.5 bg-tech-cyan/20 hover:bg-tech-cyan/30 text-tech-cyan font-semibold rounded-lg border border-tech-cyan/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                              Creating...
                            </>
                          ) : (
                            <>Create Wallet</>
                          )}
                        </button>
                      </div>
                    )}

                    {step === 'backup' && wallet && 'mnemonic' in wallet && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📝</div>
                          <h3 className="text-xl font-semibold text-white">
                            Back Up Recovery Phrase
                          </h3>
                          <p className="text-dark-400 text-sm mt-1">
                            Write down or copy these words and store them safely
                          </p>
                        </div>

                        {/* Mnemonic Display */}
                        <div className="bg-dark-800/50 border border-amber-500/30 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-amber-400 text-sm font-medium">
                              Keep these words safe!
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  wallet.mnemonic || '',
                                  'mnemonic'
                                )
                              }
                              className="text-xs bg-dark-700 hover:bg-dark-600 px-3 py-1 rounded text-white"
                            >
                              {copied === 'mnemonic' ? '✅ Copied!' : '📋 Copy'}
                            </button>
                          </div>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                            {wallet.mnemonic?.split(' ').map((word, i) => (
                              <div
                                key={i}
                                className="bg-dark-900 rounded-lg px-3 py-2 text-center"
                              >
                                <span className="text-dark-500 text-xs mr-1">
                                  {i + 1}.
                                </span>
                                <span className="text-white font-mono">
                                  {word}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Address Preview */}
                        <div className="bg-dark-800/50 rounded-xl p-4">
                          <div className="text-sm text-dark-400 mb-1">
                            Wallet Address
                          </div>
                          <div className="font-mono text-white break-all">
                            {wallet.address}
                          </div>
                        </div>

                        {/* Confirmation */}
                        <label className="flex items-start gap-3 p-4 bg-dark-800/50 rounded-xl cursor-pointer">
                          <input
                            type="checkbox"
                            checked={backupConfirmed}
                            onChange={(e) =>
                              setBackupConfirmed(e.target.checked)
                            }
                            className="mt-1 w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                          />
                          <span className="text-sm text-dark-300">
                            I have saved my recovery phrase and understand that
                            if lost, I cannot recover this wallet
                          </span>
                        </label>

                        <div className="flex gap-3">
                          <button
                            onClick={resetForm}
                            className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-xl transition-colors"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleConfirmBackup}
                            disabled={!backupConfirmed}
                            className="flex-1 py-3 bg-primary-500 hover:bg-amber-600 disabled:bg-dark-700 disabled:text-dark-500 text-white font-semibold rounded-xl transition-colors"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 'done' && wallet && (
                      <WalletSuccess
                        wallet={wallet}
                        onReset={resetForm}
                        showPrivateKey={showPrivateKey}
                        setShowPrivateKey={setShowPrivateKey}
                        copyToClipboard={copyToClipboard}
                        copied={copied}
                      />
                    )}
                  </>
                )}

                {/* IMPORT MNEMONIC TAB */}
                {activeTab === 'import-mnemonic' && (
                  <>
                    {step === 'form' && (
                      <div className="space-y-6">
                        <div className="text-center py-4">
                          <div className="text-4xl mb-2">📝</div>
                          <h3 className="text-lg font-semibold text-white">
                            Import from Recovery Phrase
                          </h3>
                          <p className="text-dark-400 text-sm">
                            Enter your 12 or 24 word recovery phrase
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm text-muted mb-2">
                            Recovery Phrase (Mnemonic)
                          </label>
                          <textarea
                            value={mnemonic}
                            onChange={(e) =>
                              setMnemonic(e.target.value.toLowerCase())
                            }
                            placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
                            rows={4}
                            className="w-full bg-black-hole/50 border border-white/10 rounded-lg px-4 py-3 text-content placeholder-muted focus:border-tech-cyan focus:ring-1 focus:ring-tech-cyan/20 focus:outline-none font-mono"
                          />
                          <p className="text-xs text-muted mt-1 opacity-70">
                            Separate each word with a space
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm text-muted mb-2">
                            Wallet name (optional)
                          </label>
                          <input
                            type="text"
                            value={walletName}
                            onChange={(e) => setWalletName(e.target.value)}
                            placeholder="My Imported Wallet"
                            className="w-full bg-black-hole/50 border border-white/10 rounded-lg px-4 py-3 text-content placeholder-muted focus:border-tech-cyan focus:ring-1 focus:ring-tech-cyan/20 focus:outline-none"
                          />
                        </div>

                        <button
                          onClick={handleImportMnemonic}
                          disabled={loading || !mnemonic.trim()}
                          className="w-full py-3.5 bg-tech-cyan/20 hover:bg-tech-cyan/30 text-tech-cyan font-semibold rounded-lg border border-tech-cyan/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                              Importing...
                            </>
                          ) : (
                            <>Import Wallet</>
                          )}
                        </button>
                      </div>
                    )}

                    {step === 'done' && wallet && (
                      <WalletSuccess
                        wallet={wallet}
                        onReset={resetForm}
                        showPrivateKey={showPrivateKey}
                        setShowPrivateKey={setShowPrivateKey}
                        copyToClipboard={copyToClipboard}
                        copied={copied}
                      />
                    )}
                  </>
                )}

                {/* IMPORT PRIVATE KEY TAB */}
                {activeTab === 'import-key' && (
                  <>
                    {step === 'form' && (
                      <div className="space-y-6">
                        <div className="text-center py-4">
                          <div className="text-4xl mb-2">🔑</div>
                          <h3 className="text-lg font-semibold text-white">
                            Import from Private Key
                          </h3>
                          <p className="text-dark-400 text-sm">
                            Enter your private key (64 hex characters)
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm text-muted mb-2">
                            Private Key
                          </label>
                          <input
                            type="password"
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            placeholder="0x... or 64 hex characters"
                            className="w-full bg-black-hole/50 border border-white/10 rounded-lg px-4 py-3 text-content placeholder-muted focus:border-tech-cyan focus:ring-1 focus:ring-tech-cyan/20 focus:outline-none font-mono"
                          />
                          <p className="text-xs text-muted mt-1 opacity-70">
                            ⚠️ อย่าแชร์ private key กับใคร
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm text-muted mb-2">
                            Wallet name (optional)
                          </label>
                          <input
                            type="text"
                            value={walletName}
                            onChange={(e) => setWalletName(e.target.value)}
                            placeholder="My Imported Wallet"
                            className="w-full bg-black-hole/50 border border-white/10 rounded-lg px-4 py-3 text-content placeholder-muted focus:border-tech-cyan focus:ring-1 focus:ring-tech-cyan/20 focus:outline-none"
                          />
                        </div>

                        <button
                          onClick={handleImportPrivateKey}
                          disabled={loading || !privateKey.trim()}
                          className="w-full py-3.5 bg-tech-cyan/20 hover:bg-tech-cyan/30 text-tech-cyan font-semibold rounded-lg border border-tech-cyan/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                              Importing...
                            </>
                          ) : (
                            <>Import Wallet</>
                          )}
                        </button>
                      </div>
                    )}

                    {step === 'done' && wallet && (
                      <WalletSuccess
                        wallet={wallet}
                        onReset={resetForm}
                        showPrivateKey={showPrivateKey}
                        setShowPrivateKey={setShowPrivateKey}
                        copyToClipboard={copyToClipboard}
                        copied={copied}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="mt-8 bg-black-hole/50 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-content mb-4">
              Get Started with Testnet
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-tech-cyan/10 rounded-full flex items-center justify-center text-tech-cyan font-bold shrink-0 border border-tech-cyan/20">
                  1
                </div>
                <div>
                  <div className="font-medium text-content">Create Wallet</div>
                  <div className="text-sm text-muted">
                    Create or import your wallet
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-tech-cyan/10 rounded-full flex items-center justify-center text-tech-cyan font-bold shrink-0 border border-tech-cyan/20">
                  2
                </div>
                <div>
                  <div className="font-medium text-content">
                    Get Testnet Tokens
                  </div>
                  <div className="text-sm text-muted">
                    Go to Faucet to get free AXX
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-tech-cyan/10 rounded-full flex items-center justify-center text-tech-cyan font-bold shrink-0 border border-tech-cyan/20">
                  3
                </div>
                <div>
                  <div className="font-medium text-content">Get started!</div>
                  <div className="text-sm text-muted">
                    Try transactions and earn activity score
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="mt-6 bg-black-hole/50 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-content mb-4">
              🌐 Network Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted">Network Name</div>
                <div className="text-content font-medium">
                  {AXIONAX_NETWORK_CONFIG.chainName}
                </div>
              </div>
              <div>
                <div className="text-muted">Chain ID</div>
                <div className="text-content font-medium">
                  {AXIONAX_NETWORK_CONFIG.chainIdDecimal}
                </div>
              </div>
              <div>
                <div className="text-muted">Currency</div>
                <div className="text-content font-medium">
                  {AXIONAX_NETWORK_CONFIG.nativeCurrency.symbol}
                </div>
              </div>
              <div>
                <div className="text-muted">RPC URL</div>
                <div
                  className="text-tech-cyan font-medium text-xs truncate cursor-pointer hover:underline"
                  title={AXIONAX_NETWORK_CONFIG.rpcUrls[0]}
                >
                  {AXIONAX_NETWORK_CONFIG.rpcUrls[0].replace('https://', '')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Success Component
function WalletSuccess({
  wallet,
  onReset,
  showPrivateKey,
  setShowPrivateKey,
  copyToClipboard,
  copied,
}: {
  wallet: GeneratedWallet | ImportedWallet;
  onReset: () => void;
  showPrivateKey: boolean;
  setShowPrivateKey: (show: boolean) => void;
  copyToClipboard: (text: string, label: string) => void;
  copied: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h3 className="text-2xl font-bold text-content">Wallet ready!</h3>
        <p className="text-muted mt-2">Your wallet has been saved</p>
      </div>

      {/* Address */}
      <div className="bg-black-hole/50 rounded-lg p-4 border border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted">Address</span>
          <button
            onClick={() => copyToClipboard(wallet.address, 'address')}
            className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded text-content transition-colors"
          >
            {copied === 'address' ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
        <div className="font-mono text-content break-all text-sm bg-black-hole rounded p-2 border border-white/5">
          {wallet.address}
        </div>
      </div>

      {/* Private Key */}
      <div className="bg-tech-warning/5 border border-tech-warning/20 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-tech-warning font-medium">
            🔐 Private Key
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="text-xs bg-black-hole/50 hover:bg-black-hole px-3 py-1 rounded text-content border border-white/5 transition-colors"
            >
              {showPrivateKey ? '🙈 Hide' : '👁️ Show'}
            </button>
            {showPrivateKey && (
              <button
                onClick={() => copyToClipboard(wallet.privateKey, 'privateKey')}
                className="text-xs bg-black-hole/50 hover:bg-black-hole px-3 py-1 rounded text-content border border-white/5 transition-colors"
              >
                {copied === 'privateKey' ? '✅ Copied!' : '📋 Copy'}
              </button>
            )}
          </div>
        </div>
        <div className="font-mono text-content break-all text-sm bg-black-hole rounded p-2 border border-white/5">
          {showPrivateKey
            ? wallet.privateKey
            : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
        </div>
        <p className="text-xs text-tech-warning/80 mt-2">
          Never share your private key. Anyone with this key can access your
          wallet.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-content rounded-lg transition-colors border border-white/10"
        >
          Add New Wallet
        </button>
        <Link
          href={`/faucet?address=${wallet.address}`}
          className="flex-1 py-3 bg-tech-cyan/20 hover:bg-tech-cyan/30 text-tech-cyan text-center font-semibold rounded-lg transition-colors border border-tech-cyan/30"
        >
          Get Testnet Tokens
        </Link>
      </div>
    </div>
  );
}
