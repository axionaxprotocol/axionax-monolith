import { NextResponse } from 'next/server';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

/** Persisted JSON; override on VPS e.g. VISITOR_DATA_DIR=/var/lib/axionax-web */
function dataDir(): string {
  return process.env.VISITOR_DATA_DIR ?? path.join(process.cwd(), 'data');
}

function countFile(): string {
  return path.join(dataDir(), 'site-visitors.json');
}

interface VisitorStore {
  count: number;
  updatedAt: string;
}

function readStore(): VisitorStore {
  const file = countFile();
  try {
    if (!existsSync(file)) {
      return { count: 0, updatedAt: new Date(0).toISOString() };
    }
    const raw = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<VisitorStore>;
    const count =
      typeof parsed.count === 'number' && Number.isFinite(parsed.count)
        ? Math.max(0, Math.floor(parsed.count))
        : 0;
    return {
      count,
      updatedAt:
        typeof parsed.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return { count: 0, updatedAt: new Date(0).toISOString() };
  }
}

function writeStore(store: VisitorStore): void {
  mkdirSync(dataDir(), { recursive: true });
  writeFileSync(countFile(), JSON.stringify(store, null, 0), 'utf-8');
}

/** Register one visit (call once per browser session from client). */
export async function POST() {
  try {
    const prev = readStore();
    const count = prev.count + 1;
    const next: VisitorStore = {
      count,
      updatedAt: new Date().toISOString(),
    };
    writeStore(next);
    const res = NextResponse.json({ count: next.count });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error('visitors POST:', e);
    return NextResponse.json(
      { error: 'Could not record visit', count: readStore().count },
      { status: 500 }
    );
  }
}

/** Current total (no increment). */
export async function GET() {
  try {
    const { count } = readStore();
    const res = NextResponse.json({ count });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error('visitors GET:', e);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
