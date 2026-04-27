/**
 * Wallet Generation Utilities
 * สร้าง wallet ใหม่และ import จาก mnemonic/private key
 * ใช้ ethers.js v6 สำหรับ cryptographic operations
 */

import { ethers } from 'ethers';

export interface GeneratedWallet {
  address: string;
  privateKey: string;
  mnemonic: string;
  path: string;
}

export interface ImportedWallet {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

/**
 * สร้าง wallet ใหม่พร้อม mnemonic phrase (12 words)
 */
export function generateNewWallet(): GeneratedWallet {
  const wallet = ethers.Wallet.createRandom();

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || '',
    path: "m/44'/60'/0'/0/0",
  };
}

/**
 * Import wallet จาก mnemonic phrase
 */
export function importFromMnemonic(
  mnemonic: string,
  index: number = 0
): ImportedWallet {
  // Validate mnemonic
  if (!ethers.Mnemonic.isValidMnemonic(mnemonic.trim())) {
    throw new Error('Invalid mnemonic phrase. Please check and try again.');
  }

  const path = `m/44'/60'/0'/0/${index}`;
  const wallet = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(mnemonic.trim()),
    path
  );

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: mnemonic.trim(),
  };
}

/**
 * Import wallet จาก private key
 */
export function importFromPrivateKey(privateKey: string): ImportedWallet {
  // Add 0x prefix if missing
  let pk = privateKey.trim();
  if (!pk.startsWith('0x')) {
    pk = '0x' + pk;
  }

  // Validate private key length (32 bytes = 64 hex chars + 0x)
  if (pk.length !== 66) {
    throw new Error('Invalid private key length. Expected 64 hex characters.');
  }

  try {
    const wallet = new ethers.Wallet(pk);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  } catch {
    throw new Error('Invalid private key format. Please check and try again.');
  }
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Encrypt wallet with password (สร้าง keystore JSON)
 */
export async function encryptWallet(
  privateKey: string,
  password: string
): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.encrypt(password);
}

/**
 * Decrypt wallet from keystore JSON
 */
export async function decryptWallet(
  keystoreJson: string,
  password: string
): Promise<ImportedWallet> {
  try {
    const wallet = await ethers.Wallet.fromEncryptedJson(
      keystoreJson,
      password
    );
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  } catch {
    throw new Error('Invalid password or corrupted keystore file.');
  }
}

/**
 * Generate multiple wallets from one mnemonic
 */
export function generateWalletBatch(
  mnemonic: string,
  count: number = 5
): ImportedWallet[] {
  if (!ethers.Mnemonic.isValidMnemonic(mnemonic.trim())) {
    throw new Error('Invalid mnemonic phrase');
  }

  const wallets: ImportedWallet[] = [];
  for (let i = 0; i < count; i++) {
    wallets.push(importFromMnemonic(mnemonic, i));
  }
  return wallets;
}

/**
 * Sign message with wallet
 */
export async function signMessage(
  privateKey: string,
  message: string
): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signMessage(message);
}

/**
 * Verify signed message
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}
