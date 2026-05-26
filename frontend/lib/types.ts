// ─── Core Types (matching backend Pydantic models exactly) ────────────────────

export type OpType = 'call' | 'return' | 'compare' | 'swap' | 'assign' | 'pivot' | 'merge' | 'visit';

export interface MemAccess {
  container: string;
  index: number;
  element_size: number;
  rw: 'r' | 'w';
}

export interface TraceStep {
  step_id: number;
  parent_id: number;
  depth: number;
  op: OpType;
  array_state: number[];
  vars: Record<string, string>;
  heap_delta: number;
  run_length: number;
  mem: MemAccess | null;
}

export interface CacheEvent {
  step_id: number;
  cache_line: number;
  hit: boolean;
  evicted: number | null;
}

export interface RunAlgorithmRequest {
  algo: string;
  input: number[];
  mode: 'trace' | 'cache';
}

export interface RunAlgorithmResponse {
  steps: TraceStep[];
  cache_events: CacheEvent[];
  truncated: boolean;
  wall_ms: number;
  step_count: number;
}

// ─── Complexity & Simulation ──────────────────────────────────────────────────

export interface DataPoint {
  n: number;
  time_ms: number;
}

export interface ComplexityResult {
  label: string;
  r_squared: number;
  coeffs: number[];
  all_fits: Record<string, number>;
}

export interface AnalyzeComplexityASTRequest {
  code: string;
  language: 'cpp' | 'python';
}

export interface AnalyzeComplexityASTResponse {
  estimated_complexity: string;
  recurrence: string;
  loop_depth: number;
  has_recursion: boolean;
  explanation: string;
}

export interface BenchmarkRequest {
  algorithm: string;
  claimed_complexity?: string;
  sizes?: number[];
}

export interface LieDetectorResult {
  claimed: string;
  measured: string;
  r_squared: number;
  verdict: 'MATCH' | 'WORSE_THAN_CLAIMED' | 'BETTER_THAN_CLAIMED' | 'UNVERIFIABLE';
  explanation: string;
}

export interface BenchmarkResponse {
  measured_complexity: string;
  data_points: DataPoint[];
  lie_detector: LieDetectorResult | null;
  llm_explanation: string;
}

export interface SimulateCacheRequest {
  memory_accesses: MemAccess[];
}

export interface SimulateCacheResponse {
  cache_events: CacheEvent[];
  hits: number;
  misses: number;
  hit_rate: number;
}

// ─── Comparison & Bug Injection ───────────────────────────────────────────────

export interface DiffSegment {
  kind: 'equal' | 'delete' | 'insert' | 'replace';
  a_start: number | null;
  a_end: number | null;
  b_start: number | null;
  b_end: number | null;
  op_a: string | null;
  op_b: string | null;
}

export interface DiffResult {
  first_divergence_a: number | null;
  first_divergence_b: number | null;
  segments: DiffSegment[];
  a_compressed_len: number;
  b_compressed_len: number;
}

export interface RunDiffRequest {
  algo_a: string;
  algo_b: string;
  input: number[];
}

export interface RunDiffResponse {
  trace_a: TraceStep[];
  trace_b: TraceStep[];
  diff: DiffResult;
}

export interface PropagationStep {
  step_id: number;
  op: string;
  correct_state: number[] | null;
  buggy_state: number[] | null;
}

export interface RunBugRequest {
  algo: string;
  bug_id: string;
  input: number[];
}

export interface RunBugResponse {
  algo: string;
  bug_id: string;
  correct_trace: TraceStep[];
  buggy_trace: TraceStep[];
  first_error_step: number;
  propagation_chain: PropagationStep[];
  diff: DiffResult;
  llm_explanation: string;
  buggy_crashed: boolean;
}

export interface RunWhatIfRequest {
  algo: string;
  input: number[];
  modification?: 'reverse' | 'sorted' | 'sorted_desc' | {
    type: string;
    index?: number;
    value?: number;
  };
  modified_input?: number[];
}

export interface RunWhatIfResponse {
  algo: string;
  base_step_count: number;
  modified_step_count: number;
  new_trace: TraceStep[];
  diff: DiffResult;
  llm_explanation: string;
}

// ─── Intelligent Search ───────────────────────────────────────────────────────

export interface SearchRequest {
  query: string;
}

export interface SearchResultItem {
  algo: string;
  score: number;
  action: 'auto_run' | 'show_options';
}

export interface SearchResponse {
  type: 'semantic' | 'autocomplete' | 'code';
  results: SearchResultItem[];
}

export interface DetectCodeRequest {
  code: string;
}

export interface DetectCodeResponse {
  is_code: boolean;
  algorithm: string;
  confidence: number;
}

export type ContextType = 'bug' | 'whatif' | 'diff' | 'general' | 'step' | 'complexity';

export interface ExplanationRequest {
  algo: string;
  context: string;
  context_type: ContextType;
}

// ─── Global ───────────────────────────────────────────────────────────────────

export interface HealthCheckResponse {
  status: 'ok';
  version: string;
}

// ─── Legacy Step Types (used by visualizer components) ────────────────────────
// These map the C++ engine's different output formats per algorithm type.
// The VisualizerRouter casts TraceStep to these as needed.

export type ArrayStep = {
  step_id: number
  op: 'compare' | 'swap' | 'sorted' | 'highlight' | 'set' | 'pivot' | 'done'
  indices: number[]
  array: number[]
  depth?: number
  pivot?: number
}

export type GraphStep = {
  step_id: number
  op: 'visit_node' | 'relax_edge' | 'finalize_node' | 'enqueue' | 'dequeue' | 'add_edge'
  node?: number
  from?: number
  to?: number
  weight?: number
  distance?: number
  queue?: number[]
}

export type RecursionStep = {
  step_id: number
  op: 'call' | 'return' | 'base_case'
  depth: number
  node_id: string
  params: number[]
  value?: number
  parent_id?: string
}

export type DPStep = {
  step_id: number
  op: 'fill_cell' | 'depend' | 'backtrack' | 'init'
  row: number
  col: number
  value?: number
  from_row?: number
  from_col?: number
  to_row?: number
  to_col?: number
}

export type HashStep = {
  step_id: number
  op: 'hash' | 'collision' | 'probe' | 'insert' | 'delete' | 'search'
  key: number | string
  bucket: number
  new_bucket?: number
  chain_pos?: number
}

export type StringStep = {
  step_id: number
  op: 'compare_char' | 'mismatch' | 'found' | 'shift' | 'hash_check'
  text_idx?: number
  pattern_idx?: number
  match?: boolean
  position?: number
  hash_value?: number
  shift?: number
}

export type ActivityStep = {
  step_id: number
  op: 'consider' | 'select' | 'reject' | 'sort'
  activity_id: number
  reason?: string
}

export type KnapsackStep = {
  step_id: number
  op: 'consider_item' | 'include' | 'exclude' | 'partial_include'
  item_id: number
  current_weight?: number
  current_value?: number
  fraction?: number
}

export type AnyStep =
  | TraceStep
  | ArrayStep
  | GraphStep
  | RecursionStep
  | DPStep
  | HashStep
  | StringStep
  | ActivityStep
  | KnapsackStep

// ─── Algorithm Registry Types ─────────────────────────────────────────────────

export type VisualizerType =
  | 'sorting'
  | 'graph'
  | 'recursion'
  | 'dp'
  | 'nqueens'
  | 'hash'
  | 'string'
  | 'huffman'
  | 'activity'
  | 'knapsack'

export type AlgorithmDef = {
  id: string
  name: string
  category: string
  timeComplexity: string
  spaceComplexity: string
  visualizer: VisualizerType
  description: string
  tags: string[]
  available?: boolean
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type PlaybackState = {
  isPlaying: boolean
  currentStep: number
  totalSteps: number
  speed: number
}

export type RunMode = 'trace' | 'benchmark' | 'cache'

export type Tab = 'visualizer' | 'complexity' | 'cache' | 'benchmark'

export type CompareTab = 'diff' | 'bug' | 'whatif'

// ─── Backward-compat response aliases ─────────────────────────────────────────

export type ComplexityPoint = DataPoint

export type ComplexityResponse = {
  fit: {
    label: string
    r_squared: number
    coeffs: number[]
    all_fits: Record<string, number>
  }
  data_points: DataPoint[]
}

export type CacheResponse = SimulateCacheResponse & {
  cache_lines?: number[][]
}

export type DiffResponse = RunDiffResponse & {
  divergence_index?: number
  differences?: DiffSegment[]
}

export type BugResponse = RunBugResponse

export type WhatIfResponse = RunWhatIfResponse

export type ExplanationRequestResponse = {
  request_id: string
}

// ─── Graph Data Types ─────────────────────────────────────────────────────────

export type GraphNode = {
  id: number
  x: number
  y: number
  label?: string
  distance?: number
  state?: 'unvisited' | 'current' | 'visited' | 'finalized'
}

export type GraphEdge = {
  from: number
  to: number
  weight?: number
  state?: 'normal' | 'relaxing' | 'selected' | 'rejected'
}

// ─── Recursion Tree Types ─────────────────────────────────────────────────────

export type TreeNode = {
  id: string
  label: string
  params: number[]
  value?: number
  depth: number
  state?: 'active' | 'returned' | 'base_case' | 'pending'
  parentId?: string
  children: string[]
  x?: number
  y?: number
}

// ─── Activity Types ───────────────────────────────────────────────────────────

export type Activity = {
  id: number
  name: string
  start: number
  end: number
  state?: 'normal' | 'considering' | 'selected' | 'rejected'
}

// ─── Knapsack Types ───────────────────────────────────────────────────────────

export type KnapsackItem = {
  id: number
  weight: number
  value: number
  ratio: number
  state?: 'normal' | 'considering' | 'included' | 'excluded' | 'partial'
  fraction?: number
}
