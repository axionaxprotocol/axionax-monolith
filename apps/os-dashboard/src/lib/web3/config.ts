import { defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Define Custom Local Blockchain
export const axionaxLocal = defineChain({
  id: 1337,
  name: "Axionax Local",
  network: "axionax-local",
  nativeCurrency: {
    decimals: 18,
    name: "Axionax",
    symbol: "AXIO",
  },
  rpcUrls: {
    default: { http: ["http://localhost:8545"] },
    public: { http: ["http://localhost:8545"] },
  },
});

// DEV ONLY: Default burner account (Hardhat/Anvil Account #0)
// NEVER USE THIS ON MAINNET/TESTNET
export const DEV_BURNER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
export const burnerAccount = privateKeyToAccount(DEV_BURNER_KEY);

