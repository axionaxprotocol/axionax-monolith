import React from 'react';

export const metadata = {
  title: 'Pitch Deck | Axionax Protocol',
  description:
    'Axionax Protocol - 2026 Master Pitch Deck. The Decentralized Operating System for the Next Civilization.',
};

export default function PitchPage(): React.JSX.Element {
  return (
    <div className="min-h-[calc(100vh-8rem)] w-full -mx-4 sm:-mx-6 lg:-mx-8">
      <iframe
        src="/embed/pitch-deck.html"
        title="Axionax Protocol - 2026 Master Pitch Deck"
        className="w-full min-h-[calc(100vh-8rem)] border-0 block"
        style={{ minHeight: 'calc(100vh - 8rem)' }}
      />
    </div>
  );
}
