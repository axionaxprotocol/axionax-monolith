import React from 'react';

export const metadata = {
  title: 'Pitch Deck | Axionax Protocol',
  description:
    'Axionax Protocol - 2026 Master Pitch Deck. The Decentralized Operating System for the Next Civilization.',
};

export default function PitchPage(): React.JSX.Element {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 h-[calc(100vh-112px)] relative">
      <iframe
        src="/embed/pitch-deck.html"
        title="Axionax Protocol - 2026 Master Pitch Deck"
        className="w-full h-full border-0 absolute inset-0"
      />
    </div>
  );
}
