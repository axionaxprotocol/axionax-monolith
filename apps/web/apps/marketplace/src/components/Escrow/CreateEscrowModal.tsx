import React, { useState } from 'react';
import { useEscrow } from '../../context/EscrowContext';

interface CreateEscrowModalProps {
  resourceId: string;
  resourceName: string;
  pricePerHour: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateEscrowModal({
  resourceId,
  resourceName,
  pricePerHour,
  isOpen,
  onClose,
}: CreateEscrowModalProps) {
  const { createEscrow, isLoading } = useEscrow();
  const [duration, setDuration] = useState(1);

  if (!isOpen) return null;

  const totalAmount = pricePerHour * duration;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEscrow(resourceId, totalAmount, duration);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Rent {resourceName}</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Duration (Hours)
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between text-sm">
              <span>Price per hour:</span>
              <span>{pricePerHour} AXX</span>
            </div>
            <div className="flex justify-between font-bold mt-2 text-lg">
              <span>Total:</span>
              <span>{totalAmount.toFixed(2)} AXX</span>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Confirm & Pay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
