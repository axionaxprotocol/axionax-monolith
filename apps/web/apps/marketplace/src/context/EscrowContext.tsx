import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Escrow, escrowService } from '../services/EscrowService';

interface EscrowContextType {
  escrows: Escrow[];
  createEscrow: (
    resourceId: string,
    amount: number,
    duration: number
  ) => Promise<void>;
  releaseFunds: (escrowId: string) => Promise<void>;
  refundFunds: (escrowId: string) => Promise<void>;
  isLoading: boolean;
}

const EscrowContext = createContext<EscrowContextType | undefined>(undefined);

export function EscrowProvider({ children }: { children: ReactNode }) {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshEscrows = async () => {
    setIsLoading(true);
    try {
      const data = await escrowService.getEscrows();
      setEscrows(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshEscrows();
  }, []);

  const createEscrow = async (
    resourceId: string,
    amount: number,
    duration: number
  ) => {
    setIsLoading(true);
    try {
      await escrowService.createEscrow(resourceId, amount, duration);
      await refreshEscrows();
    } finally {
      setIsLoading(false);
    }
  };

  const releaseFunds = async (escrowId: string) => {
    setIsLoading(true);
    try {
      await escrowService.releaseFunds(escrowId);
      await refreshEscrows();
    } finally {
      setIsLoading(false);
    }
  };

  const refundFunds = async (escrowId: string) => {
    setIsLoading(true);
    try {
      await escrowService.refundFunds(escrowId);
      await refreshEscrows();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EscrowContext.Provider
      value={{ escrows, createEscrow, releaseFunds, refundFunds, isLoading }}
    >
      {children}
    </EscrowContext.Provider>
  );
}

export function useEscrow() {
  const context = useContext(EscrowContext);
  if (context === undefined) {
    throw new Error('useEscrow must be used within an EscrowProvider');
  }
  return context;
}
