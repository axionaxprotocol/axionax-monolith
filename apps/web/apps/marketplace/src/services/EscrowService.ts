export interface Escrow {
  id: string;
  resourceId: string;
  amount: number;
  duration: number; // hours
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REFUNDED';
  createdAt: number;
}

export interface IEscrowService {
  createEscrow(
    resourceId: string,
    amount: number,
    duration: number
  ): Promise<Escrow>;
  getEscrows(): Promise<Escrow[]>;
  releaseFunds(escrowId: string): Promise<void>;
  refundFunds(escrowId: string): Promise<void>;
}

class MockEscrowService implements IEscrowService {
  private escrows: Escrow[] = [];

  async createEscrow(
    resourceId: string,
    amount: number,
    duration: number
  ): Promise<Escrow> {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay
    const newEscrow: Escrow = {
      id: `escrow-${Date.now()}`,
      resourceId,
      amount,
      duration,
      status: 'ACTIVE', // Auto-activate for mock simplicity
      createdAt: Date.now(),
    };
    this.escrows.push(newEscrow);
    return newEscrow;
  }

  async getEscrows(): Promise<Escrow[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [...this.escrows];
  }

  async releaseFunds(escrowId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const escrow = this.escrows.find((e) => e.id === escrowId);
    if (escrow) {
      escrow.status = 'COMPLETED';
    }
  }

  async refundFunds(escrowId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const escrow = this.escrows.find((e) => e.id === escrowId);
    if (escrow) {
      escrow.status = 'REFUNDED';
    }
  }
}

export const escrowService = new MockEscrowService();
