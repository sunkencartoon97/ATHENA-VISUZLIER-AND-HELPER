import type {
  HealthCheckResponse, RunAlgorithmRequest, RunAlgorithmResponse,
  AnalyzeComplexityASTRequest, AnalyzeComplexityASTResponse,
  BenchmarkRequest, BenchmarkResponse,
  SimulateCacheRequest, SimulateCacheResponse,
  RunDiffRequest, RunDiffResponse,
  RunBugRequest, RunBugResponse,
  RunWhatIfRequest, RunWhatIfResponse,
  SearchRequest, SearchResponse,
  DetectCodeRequest, DetectCodeResponse,
  ExplanationRequest, ComplexityResponse, CacheResponse,
  RunMode,
} from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchAthena<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
  } catch {
    throw new Error('Backend Offline');
  }

  if (!response.ok) {
    if (response.status === 503) {
      throw new ApiError(503, "C++ engine not compiled. Run: cd engine/build && cmake .. && make");
    }
    const errorBody = await response.json().catch(() => ({}));
    // FastAPI 422 returns detail as an array of validation errors
    let detail = errorBody.message || errorBody.detail || response.statusText || 'Internal server error';
    if (Array.isArray(detail)) {
      detail = detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join('; ');
    } else if (typeof detail === 'object') {
      detail = JSON.stringify(detail);
    }
    throw new ApiError(response.status, String(detail));
  }

  return response.json();
}

// ─── Global ───────────────────────────────────────────────────────────────────

export const healthCheck = () => fetchAthena<HealthCheckResponse>('/health');

export const getAlgos = () => fetchAthena<string[]>('/algos');

// ─── Segment 1: Core Algorithm Execution ──────────────────────────────────────

export const runAlgorithm = (
  algo: string,
  input: number[],
  mode: RunMode = 'trace'
): Promise<RunAlgorithmResponse> =>
  fetchAthena<RunAlgorithmResponse>('/run-algorithm', {
    method: 'POST',
    body: JSON.stringify({ algo, input, mode } as RunAlgorithmRequest),
  });

// ─── Segment 2: Analysis ─────────────────────────────────────────────────────

export const analyzeComplexity = (
  algo: string,
  sizes: number[] = [10, 25, 50, 100, 200, 500]
): Promise<ComplexityResponse> =>
  fetchAthena<ComplexityResponse>('/analyze-complexity', {
    method: 'POST',
    body: JSON.stringify({ algo, sizes }),
  });

export const analyzeComplexityAST = (body: AnalyzeComplexityASTRequest) =>
  fetchAthena<AnalyzeComplexityASTResponse>('/analyze-complexity', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const benchmark = (
  algorithm: string,
  claimed_complexity?: string,
  sizes?: number[]
): Promise<BenchmarkResponse> =>
  fetchAthena<BenchmarkResponse>('/benchmark', {
    method: 'POST',
    body: JSON.stringify({ algorithm, claimed_complexity, sizes } as BenchmarkRequest),
  });

export const simulateCache = (body: SimulateCacheRequest): Promise<CacheResponse> =>
  fetchAthena<CacheResponse>('/simulate-cache', {
    method: 'POST',
    body: JSON.stringify(body),
  });

// ─── Segment 3: Comparison ───────────────────────────────────────────────────

export const runDiff = (
  algo_a: string,
  algo_b: string,
  input: number[]
): Promise<RunDiffResponse> =>
  fetchAthena<RunDiffResponse>('/run-diff', {
    method: 'POST',
    body: JSON.stringify({ algo_a, algo_b, input } as RunDiffRequest),
  });

export const runBug = (
  algo: string,
  bug_id: string,
  input: number[]
): Promise<RunBugResponse> =>
  fetchAthena<RunBugResponse>('/run-bug', {
    method: 'POST',
    body: JSON.stringify({ algo, bug_id, input } as RunBugRequest),
  });

export const runWhatIf = (
  algo: string,
  input: number[],
  modification?: RunWhatIfRequest['modification'],
  modified_input?: number[]
): Promise<RunWhatIfResponse> =>
  fetchAthena<RunWhatIfResponse>('/run-whatif', {
    method: 'POST',
    body: JSON.stringify({ algo, input, modification, modified_input } as RunWhatIfRequest),
  });

// ─── Segment 4: Search ───────────────────────────────────────────────────────

export const searchAlgorithms = (query: string): Promise<SearchResponse> =>
  fetchAthena<SearchResponse>('/search', {
    method: 'POST',
    body: JSON.stringify({ query } as SearchRequest),
  });

export const detectCode = (code: string): Promise<DetectCodeResponse> =>
  fetchAthena<DetectCodeResponse>('/detect-code', {
    method: 'POST',
    body: JSON.stringify({ code } as DetectCodeRequest),
  });

export const requestExplanation = (
  algo: string,
  context: string,
  context_type: string = 'general'
): Promise<{ request_id: string }> =>
  fetchAthena<{ request_id: string }>('/request-explanation', {
    method: 'POST',
    body: JSON.stringify({ algo, context, context_type } as ExplanationRequest),
  });

// ─── SSE Streaming ────────────────────────────────────────────────────────────

export const createExplainStream = (
  request_id: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): (() => void) => {
  const es = new EventSource(`${API_URL}/explain-stream/${request_id}`);

  es.onmessage = (event) => {
    const data = event.data;

    // Terminate sentinel (raw, not JSON-wrapped)
    if (data === '[DONE]') {
      es.close();
      onDone();
      return;
    }

    // Parse JSON wrapper: backend sends data: {"token": "..."}
    let token: string;
    try {
      const payload = JSON.parse(data);
      token = payload.token ?? data;
    } catch {
      token = data;
    }

    // [DONE] may also arrive JSON-wrapped
    if (token === '[DONE]') {
      es.close();
      onDone();
      return;
    }

    // Ollama offline sentinel — show clean error, don't stream the message
    if (token.includes('[Ollama not running') || token.includes('Ollama not running')) {
      es.close();
      onDone(); // switch to done state cleanly, no error banner
      return;
    }

    onToken(token);
  };

  es.onerror = () => {
    es.close();
    onError(new Error('SSE connection failed'));
  };

  return () => es.close();
};
