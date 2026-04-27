import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Interface สำหรับ wallet state
interface WalletState {
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isConnected: boolean;

  // Actions
  setWalletData: (data: {
    address: string;
    balance: string;
    chainId: number;
  }) => void;
  disconnectWallet: () => void;
}

// Zustand store สำหรับ wallet state
// ใช้ persist middleware เพื่อบันทึก state ลง localStorage
export const useWalletStore = create<WalletState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        address: null,
        balance: null,
        chainId: null,
        isConnected: false,

        // Actions
        setWalletData: (data) =>
          set({
            address: data.address,
            balance: data.balance,
            chainId: data.chainId,
            isConnected: true,
          }),

        disconnectWallet: () =>
          set({
            address: null,
            balance: null,
            chainId: null,
            isConnected: false,
          }),
      }),
      {
        name: 'wallet-storage', // localStorage key
        // เลือกเฉพาะ fields ที่ต้องการ persist
        partialize: (state) => ({
          address: state.address,
          chainId: state.chainId,
        }),
      }
    ),
    {
      name: 'wallet-store', // ชื่อที่จะแสดงใน Redux DevTools
    }
  )
);
