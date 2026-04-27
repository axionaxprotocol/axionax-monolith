'use client';

import { OracleChat } from '@axionax/ui/OracleChat';
import type { ReactElement } from 'react';

/**
 * Floating Oracle widget. Client-only component; mounted from root layout
 * so it stays outside ExplorerLayout flex/stacking contexts.
 */
export function OracleChatMount(): ReactElement | null {
  return <OracleChat />;
}
