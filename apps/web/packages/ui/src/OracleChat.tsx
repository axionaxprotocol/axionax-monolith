'use client';

import { askOracle, isOracleConfigured, OracleError } from '@axionax/sdk';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  /** Full text (assistant messages may stream visually from this). */
  content: string;
}

function newId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function useTypewriterReveal(
  messageId: string | null,
  fullText: string,
  active: boolean,
  charsPerTick = 2,
  tickMs = 18
): number {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!active || !messageId || !fullText) {
      return undefined;
    }
    setRevealed(0);
    let n = 0;
    const id = globalThis.setInterval(() => {
      n = Math.min(fullText.length, n + charsPerTick);
      setRevealed(n);
      if (n >= fullText.length) {
        globalThis.clearInterval(id);
      }
    }, tickMs);
    return (): void => {
      globalThis.clearInterval(id);
    };
  }, [active, messageId, fullText, charsPerTick, tickMs]);

  if (!active) return fullText.length;
  return Math.min(revealed, fullText.length);
}

export function OracleChat(): ReactElement | null {
  /** Avoid hydration mismatch: env reads can differ SSR vs browser. */
  const [clientMounted, setClientMounted] = useState(false);
  useEffect(() => {
    setClientMounted(true);
  }, []);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const streamActive = Boolean(streamingId && streamingText);
  const streamingRevealed = useTypewriterReveal(
    streamingId,
    streamingText,
    streamActive
  );

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, streamingRevealed, open, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!isOracleConfigured()) {
      setError(
        'Add NEXT_PUBLIC_GCP_PROJECT_ID, NEXT_PUBLIC_GCP_LOCATION, and NEXT_PUBLIC_ORACLE_APP_ID to apps/web/.env.local or apps/marketplace/.env.local (see .env.local.example), then restart dev.'
      );
      return;
    }

    setError(null);
    setInput('');
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setStreamingId(null);
    setStreamingText('');

    try {
      const answer = await askOracle(text);
      const id = newId();
      setStreamingId(id);
      setStreamingText(answer);
      setMessages((prev) => [
        ...prev,
        { id, role: 'assistant', content: answer },
      ]);
    } catch (e) {
      const msg =
        e instanceof OracleError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Oracle could not answer this request.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  useEffect(() => {
    if (!streamingId || !streamingText) return;
    if (streamingRevealed < streamingText.length) return;
    setStreamingId(null);
    setStreamingText('');
  }, [streamingId, streamingText, streamingRevealed]);

  const visibleAssistantTail =
    streamingId && streamingText
      ? streamingText.slice(0, streamingRevealed)
      : '';

  const oracleConfigured = clientMounted && isOracleConfigured();
  const showSetupBanner = clientMounted && !isOracleConfigured();

  if (!clientMounted) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-3 font-sans">
      {open && (
        <div
          className={`
            flex w-[min(100vw-2rem,22rem)] sm:w-[26rem] flex-col overflow-hidden rounded-2xl border border-cyan-400/40
            bg-[#070b12]/95 shadow-[0_0_40px_rgba(34,211,238,0.25),0_0_80px_rgba(168,85,247,0.12)]
            backdrop-blur-md
          `}
        >
          <header className="flex items-center justify-between gap-2 border-b border-cyan-500/25 bg-gradient-to-r from-cyan-950/80 to-fuchsia-950/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />
              </span>
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-cyan-100">
                  Axionax Oracle
                </h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-300/80">
                  Vertex AI Search
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-xs text-cyan-200/70 transition hover:bg-white/5 hover:text-cyan-100"
            >
              Close
            </button>
          </header>

          {showSetupBanner && (
            <div className="border-b border-amber-500/30 bg-amber-950/40 px-4 py-3 text-xs leading-relaxed text-amber-100/95">
              <p className="font-medium text-amber-200">Oracle env not set</p>
              <p className="mt-1 text-amber-100/80">
                In this app folder, copy{' '}
                <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">
                  .env.local.example
                </code>{' '}
                to{' '}
                <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">
                  .env.local
                </code>
                , fill GCP project, location (e.g. global), and Discovery Engine
                engine ID, then restart{' '}
                <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">
                  pnpm dev
                </code>
                .
              </p>
            </div>
          )}

          <div
            ref={listRef}
            className="max-h-[min(50vh,20rem)] space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 && !loading && oracleConfigured && (
              <p className="text-center text-xs leading-relaxed text-cyan-200/50">
                Ask about workers, escrow, or the Axionax marketplace. Responses
                come from your configured Discovery Engine app.
              </p>
            )}

            {messages.map((m) => {
              const isUser = m.role === 'user';
              const isStreamingThis =
                !isUser && streamingId === m.id && streamingText;
              const body = isStreamingThis ? visibleAssistantTail : m.content;
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={[
                      'max-w-[92%] rounded-xl px-3 py-2 text-sm leading-snug',
                      isUser
                        ? 'border border-amber-400/25 bg-amber-500/10 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.12)]'
                        : 'border border-cyan-400/20 bg-slate-900/80 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.08)]',
                    ].join(' ')}
                  >
                    {!isUser && (
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-fuchsia-300/90">
                        Oracle
                      </span>
                    )}
                    <p className="whitespace-pre-wrap break-words">{body}</p>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-xl border border-fuchsia-500/30 bg-slate-950/90 px-4 py-3 shadow-[0_0_24px_rgba(217,70,239,0.2)]">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                    <span className="absolute h-10 w-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
                    <span className="absolute h-6 w-6 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 opacity-80 blur-[6px]" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-cyan-100">
                      Consulting the mesh…
                    </p>
                    <p className="text-[10px] text-fuchsia-200/60">
                      Discovery Engine
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mx-4 mb-2 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100/90">
              {error}
            </div>
          )}

          <div className="border-t border-cyan-500/20 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(ev) => setInput(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    void send();
                  }
                }}
                placeholder={
                  oracleConfigured
                    ? 'Signal your query…'
                    : 'Configure .env.local first…'
                }
                disabled={loading || !oracleConfigured}
                className="min-w-0 flex-1 rounded-xl border border-cyan-500/30 bg-slate-950/80 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-600/50 outline-none ring-0 transition focus:border-fuchsia-400/60 focus:shadow-[0_0_16px_rgba(34,211,238,0.2)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim() || !oracleConfigured}
                className="shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          group relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-cyan-400/50
          bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950
          text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]
          transition hover:scale-[1.03] hover:border-fuchsia-400/60 hover:shadow-[0_0_36px_rgba(217,70,239,0.35)]
          ${open ? 'ring-2 ring-fuchsia-500/40' : ''}
        `}
        aria-expanded={open}
        aria-label={open ? 'Close Axionax Oracle' : 'Open Axionax Oracle'}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-fuchsia-500/10 opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
        <svg
          viewBox="0 0 24 24"
          className="relative h-7 w-7 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            d="M12 3c-1.2 3.2-4 5.5-7 6.3.5 4.5 3 8.2 7 11.7 4-3.5 6.5-7.2 7-11.7-3-.8-5.8-3.1-7-6.3Z"
          />
          <path strokeLinecap="round" d="M12 11v3" />
        </svg>
      </button>
    </div>
  );
}
