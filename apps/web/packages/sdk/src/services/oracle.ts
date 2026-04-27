/**
 * Axionax Oracle — Vertex AI Search (Discovery Engine) Answer API client.
 * @see https://cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1/projects.locations.collections.engines.servingConfigs/answer
 */

const DISCOVERY_ENGINE_HOST = 'https://discoveryengine.googleapis.com/v1';
const DEFAULT_SERVING_CONFIG = 'default_serving_config';
const DEFAULT_TIMEOUT_MS = 45_000;

export class OracleError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONFIG' | 'NETWORK' | 'HTTP' | 'PARSE' | 'UNKNOWN',
    public readonly status?: number,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'OracleError';
  }
}

export interface OracleServiceConfig {
  projectId: string;
  location: string;
  /** Discovery Engine engine / app resource id (engines/{engineId} segment). */
  appId: string;
  /** Serving config id (default: default_serving_config). */
  servingConfigId?: string;
  /** Optional OAuth2 access token (server-side) or proxy bearer. */
  accessToken?: string;
  timeoutMs?: number;
}

function readEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  const { env } = import.meta as ImportMeta & {
    readonly env?: Readonly<Record<string, string | undefined>>;
  };
  const v = env?.[key];
  if (v) return v;
  return undefined;
}

function loadConfigFromEnv(): Partial<OracleServiceConfig> {
  return {
    projectId: readEnv('NEXT_PUBLIC_GCP_PROJECT_ID'),
    location: readEnv('NEXT_PUBLIC_GCP_LOCATION'),
    appId: readEnv('NEXT_PUBLIC_ORACLE_APP_ID'),
    /** Server-side only (not exposed by Vite to the browser). */
    accessToken: readEnv('ORACLE_ACCESS_TOKEN'),
  };
}

/** Treats template / example values as “not configured” for UI and API guards. */
function isPlaceholderOracleValue(projectId: string, appId: string): boolean {
  const p = projectId.trim().toLowerCase();
  const a = appId.trim().toLowerCase();
  if (!p || !a) return true;
  if (p === 'your-gcp-project-id' || a === 'your-discovery-engine-engine-id')
    return true;
  if (/^(placeholder|example|changeme|todo|xxx)$/.test(p)) return true;
  if (/^(placeholder|example|changeme|todo|xxx)$/.test(a)) return true;
  if (p.includes('your-gcp') || a.includes('your-discovery')) return true;
  return false;
}

type OracleEnvState = 'missing' | 'placeholder' | 'ready';

function oracleConfigState(
  projectId: string,
  location: string,
  appId: string
): OracleEnvState {
  const p = projectId.trim();
  const l = location.trim();
  const a = appId.trim();
  if (!p || !l || !a) return 'missing';
  if (isPlaceholderOracleValue(p, a)) return 'placeholder';
  return 'ready';
}

function getOracleEnvState(): OracleEnvState {
  const c = loadConfigFromEnv();
  return oracleConfigState(
    (c.projectId ?? '').trim(),
    (c.location ?? '').trim(),
    (c.appId ?? '').trim()
  );
}

/**
 * Returns true when the three public env vars are set to non-placeholder values.
 * Use this in the UI to show setup hints before calling {@link askOracle}.
 */
export function isOracleConfigured(): boolean {
  return getOracleEnvState() === 'ready';
}

function buildAnswerEndpoint(config: OracleServiceConfig): string {
  const serving =
    config.servingConfigId?.trim() || DEFAULT_SERVING_CONFIG;
  const path = [
    'projects',
    encodeURIComponent(config.projectId),
    'locations',
    encodeURIComponent(config.location),
    'collections',
    'default_collection',
    'engines',
    encodeURIComponent(config.appId),
    'servingConfigs',
    encodeURIComponent(serving),
  ].join('/');
  return `${DISCOVERY_ENGINE_HOST}/${path}:answer`;
}

function extractAnswerText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    throw new OracleError('Empty or invalid response from Oracle.', 'PARSE');
  }
  const root = payload as Record<string, unknown>;
  const answer = root.answer as Record<string, unknown> | undefined;
  if (!answer) {
    const err = root.error as Record<string, unknown> | undefined;
    if (err?.message) {
      throw new OracleError(String(err.message), 'HTTP', undefined, String(err.status ?? ''));
    }
    throw new OracleError('Response did not include an answer object.', 'PARSE');
  }
  const text = answer.answerText;
  if (typeof text === 'string' && text.trim()) {
    return text.trim();
  }
  const snippet = answer.snippet;
  if (typeof snippet === 'string' && snippet.trim()) {
    return snippet.trim();
  }
  const steps = answer.steps;
  if (Array.isArray(steps)) {
    const parts: string[] = [];
    for (const step of steps) {
      if (!step || typeof step !== 'object') continue;
      const s = step as Record<string, unknown>;
      const obs = s.observation;
      if (typeof obs === 'string' && obs.trim()) parts.push(obs.trim());
      const st = s.state;
      if (typeof st === 'string' && st.trim()) parts.push(st.trim());
    }
    if (parts.length) return parts.join('\n\n');
  }
  throw new OracleError('Could not read answer text from Oracle response.', 'PARSE');
}

function mergeConfig(
  explicit?: Partial<OracleServiceConfig>
): OracleServiceConfig {
  const fromEnv = loadConfigFromEnv();
  const merged: OracleServiceConfig = {
    projectId: (explicit?.projectId ?? fromEnv.projectId ?? '').trim(),
    location: (explicit?.location ?? fromEnv.location ?? '').trim(),
    appId: (explicit?.appId ?? fromEnv.appId ?? '').trim(),
    servingConfigId: explicit?.servingConfigId ?? fromEnv.servingConfigId,
    accessToken: explicit?.accessToken ?? fromEnv.accessToken,
    timeoutMs: explicit?.timeoutMs ?? fromEnv.timeoutMs,
  };
  const state = oracleConfigState(
    merged.projectId,
    merged.location,
    merged.appId
  );
  if (state === 'missing') {
    throw new OracleError(
      'Oracle is not configured. Set NEXT_PUBLIC_GCP_PROJECT_ID, NEXT_PUBLIC_GCP_LOCATION, and NEXT_PUBLIC_ORACLE_APP_ID.',
      'CONFIG'
    );
  }
  if (state === 'placeholder') {
    throw new OracleError(
      'Oracle env still uses placeholder values. Replace NEXT_PUBLIC_GCP_PROJECT_ID and NEXT_PUBLIC_ORACLE_APP_ID in apps/web/.env.local (or apps/marketplace/.env.local) with your real GCP project and Discovery Engine engine ID, then restart dev.',
      'CONFIG'
    );
  }
  return merged;
}

export class OracleService {
  constructor(private readonly explicit?: Partial<OracleServiceConfig>) {}

  private resolveConfig(): OracleServiceConfig {
    return mergeConfig(this.explicit);
  }

  /**
   * Sends a natural-language query to Vertex AI Search (Discovery Engine Answer API).
   */
  async askOracle(query: string): Promise<string> {
    const trimmed = query?.trim();
    if (!trimmed) {
      throw new OracleError('Query must not be empty.', 'CONFIG');
    }

    const config = this.resolveConfig();
    const url = buildAnswerEndpoint(config);
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.accessToken) {
      headers.Authorization = `Bearer ${config.accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: { text: trimmed },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      globalThis.clearTimeout(timeout);
      const name = e instanceof Error ? e.name : '';
      const msg = e instanceof Error ? e.message : String(e);
      if (name === 'AbortError') {
        throw new OracleError(
          'Oracle request timed out. Check your network or increase NEXT_PUBLIC_ORACLE_TIMEOUT_MS.',
          'NETWORK',
          undefined,
          msg
        );
      }
      throw new OracleError(
        'Unable to reach Oracle (network or CORS). For browser apps, call Discovery Engine through your backend or enable a secure proxy.',
        'NETWORK',
        undefined,
        msg
      );
    } finally {
      globalThis.clearTimeout(timeout);
    }

    let bodyText: string;
    try {
      bodyText = await response.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new OracleError('Oracle response could not be read.', 'NETWORK', response.status, msg);
    }

    if (!response.ok) {
      let message = `Oracle API error (${response.status})`;
      try {
        const errJson = JSON.parse(bodyText) as { error?: { message?: string; status?: string } };
        if (errJson.error?.message) {
          message = errJson.error.message;
        }
      } catch {
        if (bodyText) message = `${message}: ${bodyText.slice(0, 200)}`;
      }
      throw new OracleError(message, 'HTTP', response.status, bodyText.slice(0, 500));
    }

    let json: unknown;
    try {
      json = JSON.parse(bodyText) as unknown;
    } catch {
      throw new OracleError('Oracle returned non-JSON data.', 'PARSE', response.status, bodyText.slice(0, 200));
    }

    try {
      return extractAnswerText(json);
    } catch (e) {
      if (e instanceof OracleError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new OracleError('Failed to parse Oracle answer.', 'PARSE', response.status, msg);
    }
  }
}

const defaultOracle = new OracleService();

/**
 * Convenience wrapper using env-based {@link OracleService} defaults.
 */
export async function askOracle(query: string): Promise<string> {
  return defaultOracle.askOracle(query);
}

export const oracleService = defaultOracle;
