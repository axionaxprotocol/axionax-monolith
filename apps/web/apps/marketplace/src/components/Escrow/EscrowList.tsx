import { useEscrow } from '../../context/EscrowContext';
import { EscrowStatusBadge } from './EscrowStatusBadge';

export function EscrowList() {
  const { escrows, releaseFunds, refundFunds, isLoading } = useEscrow();

  if (escrows.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No active escrows found. Start renting to see them here.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
        My Escrows
      </h3>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Resource
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Amount (AXX)
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Status
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {escrows.map((escrow) => (
              <tr key={escrow.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {escrow.id}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {escrow.resourceId}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {escrow.amount.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <EscrowStatusBadge status={escrow.status} />
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  {escrow.status === 'ACTIVE' && (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => releaseFunds(escrow.id)}
                        disabled={isLoading}
                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                      >
                        Release
                      </button>
                      <button
                        onClick={() => refundFunds(escrow.id)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Refund
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
