#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <sstream>
#include <algorithm>
#include <cmath>
#include <queue>
#include <stack>
#include <climits>
#include <functional>
#include <chrono>

// ─── nlohmann/json (single header — place in engine/include/json.hpp) ───────
#include "json.hpp"
using json = nlohmann::json;

// ─── Global step counter ─────────────────────────────────────────────────────
static int g_step_id = 0;
static int g_step_budget = 50000;
static bool g_truncated = false;
static std::string g_mode = "trace";

// ─── Core emit function ───────────────────────────────────────────────────────
// Every algorithm calls ONLY this function to output a step.
// Returns false when step budget exceeded (algorithm must stop).
bool emit(
    int parent_id,
    int depth,
    const std::string& op,
    const std::vector<int>& array_state,
    const std::vector<int>& indices,
    const std::map<std::string, std::string>& vars,
    int heap_delta = 0,
    int run_length = 1,
    // optional mem access
    const std::string& mem_container = "",
    int mem_index = -1,
    int mem_elem_size = 4,
    const std::string& mem_rw = "r"
) {
    if (g_mode == "benchmark") return true;

    if (g_step_id >= g_step_budget) {
        if (!g_truncated) {
            g_truncated = true;
            std::cerr << "TRUNCATED:" << g_step_id << std::endl;
        }
        return false;
    }

    json step;
    step["step_id"]    = g_step_id++;
    step["parent_id"]  = parent_id;
    step["depth"]      = depth;
    step["op"]         = op;
    step["array_state"]= array_state;   // Python backend reads this
    step["array"]      = array_state;   // Frontend SortingVisualizer reads this
    step["indices"]    = indices;        // Frontend reads this
    step["vars"]       = vars;
    step["heap_delta"] = heap_delta;
    step["run_length"] = run_length;

    if (!mem_container.empty() && mem_index >= 0) {
        step["mem"]["container"]   = mem_container;
        step["mem"]["index"]       = mem_index;
        step["mem"]["element_size"]= mem_elem_size;
        step["mem"]["rw"]          = mem_rw;
    }

    std::cout << step.dump() << "\n";
    return true;
}

// ─── Graph emit (for graph algorithms) ───────────────────────────────────────
bool emit_graph(
    int parent_id,
    int depth,
    const std::string& op,
    const std::map<std::string, std::string>& vars,
    int node = -1,
    int from_node = -1,
    int to_node = -1,
    double weight = 0,
    double distance = -1,
    const std::vector<int>& queue_state = {}
) {
    if (g_mode == "benchmark") return true;

    if (g_step_id >= g_step_budget) {
        if (!g_truncated) {
            g_truncated = true;
            std::cerr << "TRUNCATED:" << g_step_id << std::endl;
        }
        return false;
    }

    json step;
    step["step_id"]    = g_step_id++;
    step["parent_id"]  = parent_id;
    step["depth"]      = depth;
    step["op"]         = op;
    step["array_state"]= std::vector<int>{};
    step["array"]      = std::vector<int>{};
    step["indices"]    = std::vector<int>{};
    step["vars"]       = vars;
    step["heap_delta"] = 0;
    step["run_length"] = 1;

    if (node >= 0)      step["node"]     = node;
    if (from_node >= 0) step["from"]     = from_node;
    if (to_node >= 0)   step["to"]       = to_node;
    if (distance >= 0)  step["distance"] = distance;
    if (!queue_state.empty()) step["queue"] = queue_state;
    step["weight"] = weight;

    std::cout << step.dump() << "\n";
    return true;
}

// ─── Recursion emit (for recursive/DP algorithms) ────────────────────────────
bool emit_recursion(
    int step_id_for_parent,
    int depth,
    const std::string& op,
    const std::string& node_id,
    const std::vector<int>& params,
    int value = INT_MIN,
    const std::string& parent_node_id = ""
) {
    if (g_mode == "benchmark") return true;

    if (g_step_id >= g_step_budget) {
        if (!g_truncated) {
            g_truncated = true;
            std::cerr << "TRUNCATED:" << g_step_id << std::endl;
        }
        return false;
    }

    json step;
    step["step_id"]    = g_step_id++;
    step["parent_id"]  = step_id_for_parent;
    step["depth"]      = depth;
    step["op"]         = op;
    step["array_state"]= std::vector<int>{};
    step["array"]      = std::vector<int>{};
    step["indices"]    = std::vector<int>{};
    step["vars"]       = json::object();
    step["heap_delta"] = 0;
    step["run_length"] = 1;
    step["node_id"]    = node_id;
    step["params"]     = params;
    if (value != INT_MIN) step["value"] = value;
    if (!parent_node_id.empty()) step["parent_id_str"] = parent_node_id;

    std::cout << step.dump() << "\n";
    return true;
}

// Forward declarations — one function per algorithm
// Core 7 (Segment 1)
void run_quicksort(std::vector<int> arr);
void run_mergesort(std::vector<int> arr);
void run_bubblesort(std::vector<int> arr);
void run_binary_search(std::vector<int> arr);
void run_linear_search(std::vector<int> arr);
void run_bfs(std::vector<int> input);
void run_dfs(std::vector<int> input);
// Extended algorithms
void run_insertion_sort(std::vector<int> arr);
void run_selection_sort(std::vector<int> arr);
void run_counting_sort(std::vector<int> arr);
void run_radix_sort(std::vector<int> arr);
void run_bucket_sort(std::vector<int> arr);
void run_randomized_quicksort(std::vector<int> arr);
void run_heapsort(std::vector<int> arr);
void run_exponential_search(std::vector<int> arr);
void run_bellman_ford(std::vector<int> input);
void run_floyd_warshall(std::vector<int> input);
void run_kruskal(std::vector<int> input);
void run_prim(std::vector<int> input);
void run_topological(std::vector<int> input);
void run_hamilton_path(std::vector<int> input);
void run_graph_coloring(std::vector<int> input);
void run_kosaraju(std::vector<int> input);
void run_dijkstra(std::vector<int> input);
void run_fibonacci(std::vector<int> input);
void run_hanoi(std::vector<int> input);
void run_subset_sum(std::vector<int> input);
void run_nqueens(std::vector<int> input);
void run_knapsack01(std::vector<int> input);
void run_lcs(std::vector<int> input);
void run_matrix_chain(std::vector<int> input);
void run_lis(std::vector<int> input);
void run_fibonacci_dp(std::vector<int> input);
void run_hash_chaining(std::vector<int> input);
void run_linear_probing(std::vector<int> input);
void run_quadratic_probing(std::vector<int> input);
void run_double_hashing(std::vector<int> input);
void run_naive_match(std::vector<int> input);
void run_kmp(std::vector<int> input);
void run_rabin_karp(std::vector<int> input);
void run_activity_selection(std::vector<int> input);
void run_job_sequencing(std::vector<int> input);
void run_huffman(std::vector<int> input);
void run_fractional_knapsack(std::vector<int> input);

// ─── Main dispatch ─────────────────────────────────────────────────────────────
int main() {
    json input_json;
    std::cin >> input_json;

    std::string algo = input_json["algo"];
    std::vector<int> input_data = input_json["input"].get<std::vector<int>>();
    g_mode = input_json.value("mode", "trace");

    // Dispatch table — ALL 44 algorithms
    static const std::map<std::string, std::function<void(std::vector<int>)>> dispatch = {
        // --- Core 7 (Segment 1) ---
        {"quicksort",          run_quicksort},
        {"mergesort",          run_mergesort},
        {"bubblesort",         run_bubblesort},
        {"binarysearch",       run_binary_search},
        {"linearsearch",       run_linear_search},
        {"bfs",                run_bfs},
        {"dfs",                run_dfs},

        // --- Extended algorithms ---
        {"insertionsort",      run_insertion_sort},
        {"selectionsort",      run_selection_sort},
        {"countingsort",       run_counting_sort},
        {"radixsort",          run_radix_sort},
        {"bucketsort",         run_bucket_sort},
        {"randomizedquicksort",run_randomized_quicksort},
        {"heapsort",           run_heapsort},
        {"exponentialsearch",  run_exponential_search},
        {"bellmanford",        run_bellman_ford},
        {"floydwarshall",      run_floyd_warshall},
        {"kruskal",            run_kruskal},
        {"prim",               run_prim},
        {"topological",        run_topological},
        {"hamiltonpath",       run_hamilton_path},
        {"graphcoloring",      run_graph_coloring},
        {"kosaraju",           run_kosaraju},
        {"dijkstra",           run_dijkstra},
        {"fibonacci",          run_fibonacci},
        {"hanoi",              run_hanoi},
        {"subsetsum",          run_subset_sum},
        {"nqueens",            run_nqueens},
        {"knapsack01",         run_knapsack01},
        {"lcs",                run_lcs},
        {"matrixchain",        run_matrix_chain},
        {"lis",                run_lis},
        {"fibonaccidp",        run_fibonacci_dp},
        {"chaining",           run_hash_chaining},
        {"linearprobing",      run_linear_probing},
        {"quadraticprobing",   run_quadratic_probing},
        {"doublehashing",      run_double_hashing},
        {"naivematch",         run_naive_match},
        {"kmp",                run_kmp},
        {"rabinkarp",          run_rabin_karp},
        {"activityselection",  run_activity_selection},
        {"jobsequencing",      run_job_sequencing},
        {"huffman",            run_huffman},
        {"fractionalknapsack", run_fractional_knapsack},
    };

    auto it = dispatch.find(algo);
    if (it == dispatch.end()) {
        std::cerr << "UNKNOWN_ALGO:" << algo << std::endl;
        return 1;
    }

    if (g_mode == "benchmark") {
        int repeats = std::max(1, 10000 / std::max(1, (int)input_data.size()));
        auto t0 = std::chrono::high_resolution_clock::now();
        for (int r = 0; r < repeats; r++) {
            auto arr_copy = input_data;
            it->second(arr_copy);
        }
        auto t1 = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(t1 - t0).count() / repeats;
        
        json out;
        out["wall_ms"] = ms;
        out["n"] = input_data.size();
        std::cout << out.dump() << "\n";
        return 0;
    }

    it->second(input_data);
    return 0;
}

void run_insertion_sort(std::vector<int> arr) {
    int n = arr.size();
    if (n <= 1) return;

    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        int parent = g_step_id;

        // Emit "highlight" to show we picked up this element
        if (!emit(parent, 0, "highlight", arr, {i},
                  {{"key", std::to_string(key)}, {"i", std::to_string(i)}}))
            return;

        while (j >= 0 && arr[j] > key) {
            // Compare arr[j] with key
            if (!emit(parent, 1, "compare", arr, {j, j+1},
                      {{"arr[j]", std::to_string(arr[j])},
                       {"key",    std::to_string(key)},
                       {"j",      std::to_string(j)}}))
                return;

            // Shift arr[j] to the right
            arr[j+1] = arr[j];
            if (!emit(parent, 1, "assign", arr, {j+1},
                      {{"shifted_from", std::to_string(j)},
                       {"value",        std::to_string(arr[j+1])},
                       {"j",            std::to_string(j)}}))
                return;
            j--;
        }

        // Place key in sorted position
        arr[j+1] = key;
        if (!emit(parent, 0, "assign", arr, {j+1},
                  {{"inserted_key", std::to_string(key)},
                   {"at_position",  std::to_string(j+1)},
                   {"i",            std::to_string(i)}}))
            return;

        // Mark 0..i as sorted so far
        std::vector<int> sorted_so_far;
        for (int k = 0; k <= i; k++) sorted_so_far.push_back(k);
        if (!emit(parent, 0, "sorted", arr, sorted_so_far,
                  {{"pass", std::to_string(i)}}))
            return;
    }

    // Final done
    std::vector<int> all_idx(n);
    std::iota(all_idx.begin(), all_idx.end(), 0);
    emit(0, 0, "done", arr, all_idx, {{"sorted", "true"}});
}

void run_selection_sort(std::vector<int> arr) {
    int n = arr.size();
    if (n <= 1) return;

    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        int parent = g_step_id;

        if (!emit(parent, 0, "highlight", arr, {i},
                  {{"i", std::to_string(i)}, {"scanning_from", std::to_string(i)}}))
            return;

        for (int j = i + 1; j < n; j++) {
            // Compare arr[j] with current minimum
            if (!emit(parent, 1, "compare", arr, {j, min_idx},
                      {{"arr[j]",   std::to_string(arr[j])},
                       {"min_val",  std::to_string(arr[min_idx])},
                       {"j",        std::to_string(j)},
                       {"min_idx",  std::to_string(min_idx)}}))
                return;

            if (arr[j] < arr[min_idx]) {
                min_idx = j;
                if (!emit(parent, 1, "assign", arr, {min_idx},
                          {{"new_min", std::to_string(arr[min_idx])},
                           {"min_idx", std::to_string(min_idx)}}))
                    return;
            }
        }

        // Swap if minimum is not already in place
        if (min_idx != i) {
            std::swap(arr[i], arr[min_idx]);
            if (!emit(parent, 0, "swap", arr, {i, min_idx},
                      {{"swapped_positions", std::to_string(i) + " <-> " + std::to_string(min_idx)},
                       {"value", std::to_string(arr[i])}}))
                return;
        }

        if (!emit(parent, 0, "sorted", arr, {i},
                  {{"pass", std::to_string(i)}, {"placed", std::to_string(arr[i])}}))
            return;
    }

    std::vector<int> all_idx(n);
    std::iota(all_idx.begin(), all_idx.end(), 0);
    emit(0, 0, "done", arr, all_idx, {{"sorted", "true"}});
}

void run_counting_sort(std::vector<int> arr) {
    int n = arr.size();
    if (n <= 1) return;

    // Find range
    int max_val = *std::max_element(arr.begin(), arr.end());
    int min_val = *std::min_element(arr.begin(), arr.end());
    // Normalize every value into the zero-based count range.
    int offset = -min_val;
    int k = max_val - min_val + 1;

    std::vector<int> count(k, 0);
    std::vector<int> output(n, 0);

    // Phase 1: Count
    for (int i = 0; i < n; i++) {
        int val = arr[i] + offset;
        count[val]++;
        if (!emit(0, 0, "compare", arr, {i},
                  {{"reading",   std::to_string(arr[i])},
                   {"count_bucket", std::to_string(val)},
                   {"count_val", std::to_string(count[val])},
                   {"phase",     "counting"}}))
            return;
    }

    // Phase 2: Prefix sums
    for (int i = 1; i < k; i++) {
        count[i] += count[i-1];
        if (!emit(0, 0, "assign", arr, {},
                  {{"prefix_sum_idx", std::to_string(i)},
                   {"prefix_val",     std::to_string(count[i])},
                   {"phase",          "prefix_sum"}}))
            return;
    }

    // Phase 3: Place into output (stable, right to left)
    for (int i = n - 1; i >= 0; i--) {
        int val = arr[i] + offset;
        int pos = count[val] - 1;
        output[pos] = arr[i];
        count[val]--;
        if (!emit(0, 0, "assign", output, {pos},
                  {{"placing",   std::to_string(arr[i])},
                   {"at_output", std::to_string(pos)},
                   {"from_input", std::to_string(i)},
                   {"phase",     "placing"}}))
            return;
    }

    emit(0, 0, "done", output, {}, {{"k_range", std::to_string(k)}});
}

static void counting_sort_by_digit(std::vector<int>& arr, int exp) {
    int n = arr.size();
    std::vector<int> output(n);
    std::vector<int> count(10, 0);

    // Count digits
    for (int i = 0; i < n; i++) {
        int digit = (arr[i] / exp) % 10;
        count[digit]++;
        emit(0, 1, "compare", arr, {i},
             {{"digit",       std::to_string(digit)},
              {"exp",         std::to_string(exp)},
              {"element",     std::to_string(arr[i])},
              {"phase",       "count_digit"}});
    }

    // Prefix sum
    for (int i = 1; i < 10; i++) count[i] += count[i-1];

    // Build output (stable, right to left)
    for (int i = n - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        int pos = count[digit] - 1;
        output[pos] = arr[i];
        count[digit]--;
        emit(0, 1, "assign", output, {pos},
             {{"placing",    std::to_string(arr[i])},
              {"at",         std::to_string(pos)},
              {"digit",      std::to_string(digit)},
              {"phase",      "place"}});
    }
    arr = output;
}

void run_radix_sort(std::vector<int> arr) {
    int n = arr.size();
    if (n <= 1) return;

    // Handle negatives: split, sort separately, merge
    int max_val = *std::max_element(arr.begin(), arr.end());
    if (max_val <= 0) max_val = 1;

    for (int exp = 1; max_val / exp > 0; exp *= 10) {
        counting_sort_by_digit(arr, exp);

        if (!emit(0, 0, "sorted", arr, {},
                  {{"digit_place", std::to_string(exp)},
                   {"after_pass",  "array after digit " + std::to_string(exp)}}))
            return;
    }

    std::vector<int> all_idx(n);
    std::iota(all_idx.begin(), all_idx.end(), 0);
    emit(0, 0, "done", arr, all_idx, {{"sorted", "true"}});
}

void run_bucket_sort(std::vector<int> arr) {
    int n = arr.size();
    if (n <= 1) return;

    int max_val = *std::max_element(arr.begin(), arr.end());
    int min_val = *std::min_element(arr.begin(), arr.end());
    int range   = max_val - min_val + 1;
    int num_buckets = std::max(1, (int)std::sqrt(n));
    float bucket_size = (float)range / num_buckets;

    std::vector<std::vector<int>> buckets(num_buckets);

    // Phase 1: Distribute into buckets
    for (int i = 0; i < n; i++) {
        int bucket_idx = (int)((arr[i] - min_val) / bucket_size);
        if (bucket_idx >= num_buckets) bucket_idx = num_buckets - 1;
        buckets[bucket_idx].push_back(arr[i]);

        if (!emit(0, 0, "assign", arr, {i},
                  {{"element",    std::to_string(arr[i])},
                   {"bucket",     std::to_string(bucket_idx)},
                   {"phase",      "distribute"}}))
            return;
    }

    // Phase 2: Sort each bucket and collect
    std::vector<int> result;
    for (int b = 0; b < num_buckets; b++) {
        std::sort(buckets[b].begin(), buckets[b].end());
        for (int val : buckets[b]) {
            result.push_back(val);
            if (!emit(0, 1, "assign", result, {(int)result.size()-1},
                      {{"bucket",   std::to_string(b)},
                       {"val",      std::to_string(val)},
                       {"phase",    "collect"}}))
                return;
        }
    }

    std::vector<int> all_idx(n);
    std::iota(all_idx.begin(), all_idx.end(), 0);
    emit(0, 0, "done", result, all_idx, {{"buckets_used", std::to_string(num_buckets)}});
}

static int g_rand_seed = 42;
static int rand_range(int lo, int hi) {
    g_rand_seed = g_rand_seed * 1664525 + 1013904223;
    return lo + ((unsigned)g_rand_seed % (hi - lo + 1));
}

static void rqs_partition_and_recurse(
    std::vector<int>& arr, int lo, int hi, int depth, int parent_id
) {
    if (lo >= hi) return;

    // Random pivot selection — this is what distinguishes from regular quicksort
    int rand_idx = rand_range(lo, hi);
    std::swap(arr[rand_idx], arr[hi]);
    if (!emit(parent_id, depth, "pivot", arr, {rand_idx, hi},
              {{"random_pivot_original", std::to_string(rand_idx)},
               {"pivot_value",          std::to_string(arr[hi])},
               {"selection",            "random"}}))
        return;

    // Standard Lomuto partition
    int pivot = arr[hi];
    int i = lo - 1;

    for (int j = lo; j < hi; j++) {
        if (!emit(parent_id, depth+1, "compare", arr, {j, hi},
                  {{"arr[j]", std::to_string(arr[j])},
                   {"pivot",  std::to_string(pivot)},
                   {"j",      std::to_string(j)}}))
            return;

        if (arr[j] <= pivot) {
            i++;
            if (i != j) {
                std::swap(arr[i], arr[j]);
                if (!emit(parent_id, depth+1, "swap", arr, {i, j},
                          {{"i", std::to_string(i)}, {"j", std::to_string(j)}}))
                    return;
            }
        }
    }
    std::swap(arr[i+1], arr[hi]);
    int pivot_pos = i + 1;
    if (!emit(parent_id, depth, "sorted", arr, {pivot_pos},
              {{"pivot_placed", std::to_string(pivot_pos)}}))
        return;

    int cur_id = g_step_id;
    rqs_partition_and_recurse(arr, lo, pivot_pos - 1, depth + 1, cur_id);
    rqs_partition_and_recurse(arr, pivot_pos + 1, hi, depth + 1, cur_id);
}

void run_randomized_quicksort(std::vector<int> arr) {
    if (arr.size() <= 1) return;
    rqs_partition_and_recurse(arr, 0, (int)arr.size()-1, 0, 0);
    std::vector<int> all_idx(arr.size());
    std::iota(all_idx.begin(), all_idx.end(), 0);
    emit(0, 0, "done", arr, all_idx, {{"algorithm", "randomized_quicksort"}});
}

static void sift_down(std::vector<int>& arr, int n, int i, int depth, int parent_id) {
    int largest = i;
    int left    = 2 * i + 1;
    int right   = 2 * i + 2;

    if (left < n) {
        emit(parent_id, depth, "compare", arr, {i, left},
             {{"parent", std::to_string(arr[i])},
              {"left",   std::to_string(arr[left])},
              {"i",      std::to_string(i)}});
        if (arr[left] > arr[largest]) largest = left;
    }
    if (right < n) {
        emit(parent_id, depth, "compare", arr, {largest, right},
             {{"current_largest", std::to_string(arr[largest])},
              {"right",           std::to_string(arr[right])},
              {"right_idx",       std::to_string(right)}});
        if (arr[right] > arr[largest]) largest = right;
    }

    if (largest != i) {
        std::swap(arr[i], arr[largest]);
        emit(parent_id, depth, "swap", arr, {i, largest},
             {{"from", std::to_string(i)}, {"to", std::to_string(largest)}});
        sift_down(arr, n, largest, depth + 1, g_step_id);
    }
}

void run_heapsort(std::vector<int> arr) {
    int n = arr.size();
    if (n <= 1) return;

    // Build max heap
    for (int i = n / 2 - 1; i >= 0; i--) {
        if (!emit(0, 0, "highlight", arr, {i},
                  {{"heapifying", std::to_string(i)},
                   {"phase",      "build_heap"}}))
            return;
        sift_down(arr, n, i, 1, g_step_id);
        if (g_truncated) return;
    }

    // Extract elements
    for (int i = n - 1; i > 0; i--) {
        std::swap(arr[0], arr[i]);
        if (!emit(0, 0, "swap", arr, {0, i},
                  {{"extracted", std::to_string(arr[i])},
                   {"heap_size", std::to_string(i)}}))
            return;

        if (!emit(0, 0, "sorted", arr, {i},
                  {{"placed", std::to_string(arr[i])}}))
            return;

        sift_down(arr, i, 0, 1, g_step_id);
        if (g_truncated) return;
    }

    std::vector<int> all_idx(n);
    std::iota(all_idx.begin(), all_idx.end(), 0);
    emit(0, 0, "done", arr, all_idx, {{"sorted", "true"}});
}

void run_exponential_search(std::vector<int> arr) {
    int n = arr.size();
    if (n == 0) return;

    // Target is last element for demo purposes, or input[0] as target
    // For visualization, we search for the median value
    std::vector<int> sorted_arr = arr;
    std::sort(sorted_arr.begin(), sorted_arr.end());
    int target = sorted_arr[n/2]; // search for median

    emit(0, 0, "highlight", sorted_arr, {0},
         {{"target", std::to_string(target)}, {"phase", "start"}});

    if (sorted_arr[0] == target) {
        emit(0, 0, "compare", sorted_arr, {0}, {{"found_at", "0"}});
        return;
    }

    // Exponential doubling phase
    int bound = 1;
    while (bound < n && sorted_arr[bound] <= target) {
        if (!emit(0, 0, "compare", sorted_arr, {bound},
                  {{"bound",   std::to_string(bound)},
                   {"value",   std::to_string(sorted_arr[bound])},
                   {"target",  std::to_string(target)},
                   {"phase",   "exponential"}}))
            return;
        bound *= 2;
    }

    // Binary search in [bound/2, min(bound, n-1)]
    int lo = bound / 2;
    int hi = std::min(bound, n - 1);

    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;

        if (!emit(0, 0, "compare", sorted_arr, {lo, hi, mid},
                  {{"lo",    std::to_string(lo)},
                   {"hi",    std::to_string(hi)},
                   {"mid",   std::to_string(mid)},
                   {"val",   std::to_string(sorted_arr[mid])},
                   {"target",std::to_string(target)},
                   {"phase", "binary_search"}}))
            return;

        if (sorted_arr[mid] == target) {
            emit(0, 0, "sorted", sorted_arr, {mid},
                 {{"found_at", std::to_string(mid)}, {"value", std::to_string(target)}});
            return;
        } else if (sorted_arr[mid] < target) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    emit(0, 0, "done", sorted_arr, {}, {{"result", "not_found"}});
}

// Helper: build adjacency matrix from input
static std::vector<std::vector<int>> build_adj_matrix(
    const std::vector<int>& input, int& V
) {
    V = (input.size() > 0) ? input[0] : 5;
    if (V < 2) V = 5;
    if (V > 10) V = 10; // cap for visualization

    std::vector<std::vector<int>> adj(V, std::vector<int>(V, 0));

    int expected = V * V + 1;
    if ((int)input.size() >= expected) {
        // Read from input
        for (int i = 0; i < V; i++)
            for (int j = 0; j < V; j++)
                adj[i][j] = input[1 + i * V + j];
    } else {
        // Default demo graph (directed, weighted)
        if (V >= 5) {
            adj[0][1]=4; adj[0][2]=2;
            adj[1][2]=1; adj[1][3]=5;
            adj[2][3]=8; adj[2][4]=10;
            adj[3][4]=2; adj[4][3]=0;
        }
    }
    return adj;
}

void run_dijkstra(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);

    std::vector<int> dist(V, INT_MAX);
    std::vector<bool> visited(V, false);
    // min-heap: (dist, node)
    std::priority_queue<std::pair<int,int>,
                        std::vector<std::pair<int,int>>,
                        std::greater<>> pq;

    dist[0] = 0;
    pq.push({0, 0});

    emit_graph(0, 0, "visit_node", {{"dist","0"},{"source","0"}}, 0, -1, -1, 0, 0);

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (visited[u]) continue;
        visited[u] = true;

        std::vector<int> queue_state;
        auto pq_copy = pq;
        while (!pq_copy.empty()) {
            queue_state.push_back(pq_copy.top().second);
            pq_copy.pop();
        }

        if (!emit_graph(0, 0, "finalize_node",
                        {{"node", std::to_string(u)},
                         {"dist", std::to_string(dist[u])}},
                        u, -1, -1, 0, dist[u], queue_state))
            return;

        for (int v = 0; v < V; v++) {
            if (adj[u][v] > 0 && !visited[v]) {
                int new_dist = dist[u] + adj[u][v];

                if (!emit_graph(0, 1, "relax_edge",
                                {{"from",     std::to_string(u)},
                                 {"to",       std::to_string(v)},
                                 {"weight",   std::to_string(adj[u][v])},
                                 {"old_dist", dist[v]==INT_MAX ? "inf" : std::to_string(dist[v])},
                                 {"new_dist", std::to_string(new_dist)}},
                                v, u, v, adj[u][v], new_dist))
                    return;

                if (new_dist < dist[v]) {
                    dist[v] = new_dist;
                    pq.push({new_dist, v});
                }
            }
        }
    }
    emit_graph(0, 0, "finalize_node", {{"done","all_nodes_finalized"}}, -1, -1, -1, 0, -1);
}

void run_bellman_ford(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);

    // Build edge list
    struct Edge { int u, v, w; };
    std::vector<Edge> edges;
    for (int i = 0; i < V; i++)
        for (int j = 0; j < V; j++)
            if (adj[i][j] > 0)
                edges.push_back({i, j, adj[i][j]});

    std::vector<int> dist(V, INT_MAX);
    dist[0] = 0;

    emit_graph(0, 0, "visit_node",
               {{"source","0"},{"pass","init"}},
               0, -1, -1, 0, 0);

    // V-1 relaxation passes
    for (int pass = 1; pass < V; pass++) {
        bool updated = false;
        for (auto& e : edges) {
            if (dist[e.u] == INT_MAX) continue;
            int new_d = dist[e.u] + e.w;

            if (!emit_graph(0, 1, "relax_edge",
                            {{"pass",     std::to_string(pass)},
                             {"from",     std::to_string(e.u)},
                             {"to",       std::to_string(e.v)},
                             {"weight",   std::to_string(e.w)},
                             {"old_dist", dist[e.v]==INT_MAX?"inf":std::to_string(dist[e.v])},
                             {"new_dist", std::to_string(new_d)}},
                            e.v, e.u, e.v, e.w, new_d))
                return;

            if (new_d < dist[e.v]) {
                dist[e.v] = new_d;
                updated = true;
            }
        }
        if (!updated) break; // Early exit

        if (!emit_graph(0, 0, "finalize_node",
                        {{"pass","pass_"+std::to_string(pass)},
                         {"early_exit",updated?"false":"true"}},
                        -1, -1, -1, 0, -1))
            return;
    }

    // Negative cycle check
    bool has_neg_cycle = false;
    for (auto& e : edges) {
        if (dist[e.u] != INT_MAX && dist[e.u] + e.w < dist[e.v]) {
            has_neg_cycle = true;
            break;
        }
    }

    emit_graph(0, 0, "finalize_node",
               {{"negative_cycle", has_neg_cycle ? "true" : "false"},
                {"done","true"}},
               -1, -1, -1, 0, -1);
}

void run_floyd_warshall(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);
    if (V > 7) V = 7; // Cap — V³ steps blow budget quickly

    const int INF = 1e9;
    std::vector<std::vector<int>> dist(V, std::vector<int>(V, INF));

    for (int i = 0; i < V; i++) dist[i][i] = 0;
    for (int i = 0; i < V; i++)
        for (int j = 0; j < V; j++)
            if (adj[i][j] > 0) dist[i][j] = adj[i][j];

    for (int k = 0; k < V; k++) {
        if (!emit_graph(0, 0, "visit_node",
                        {{"intermediate_k", std::to_string(k)},
                         {"phase","new_intermediate"}},
                        k, -1, -1, 0, -1))
            return;

        for (int i = 0; i < V; i++) {
            for (int j = 0; j < V; j++) {
                if (dist[i][k] == INF || dist[k][j] == INF) continue;
                int via_k = dist[i][k] + dist[k][j];

                if (!emit_graph(0, 1, "relax_edge",
                                {{"i",        std::to_string(i)},
                                 {"j",        std::to_string(j)},
                                 {"k",        std::to_string(k)},
                                 {"via_k",    std::to_string(via_k)},
                                 {"current",  dist[i][j]==INF?"inf":std::to_string(dist[i][j])}},
                                j, i, j, 0, via_k))
                    return;

                if (via_k < dist[i][j]) dist[i][j] = via_k;
            }
        }
    }
    emit_graph(0, 0, "finalize_node", {{"done","all_pairs_computed"}}, -1, -1, -1, 0, -1);
}

// Union-Find with path compression and rank
struct UnionFind {
    std::vector<int> parent, rank;
    UnionFind(int n) : parent(n), rank(n, 0) {
        std::iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }
    bool unite(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;
        if (rank[px] < rank[py]) std::swap(px, py);
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        return true;
    }
};

void run_kruskal(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);

    struct Edge { int u, v, w; };
    std::vector<Edge> edges;
    for (int i = 0; i < V; i++)
        for (int j = i+1; j < V; j++)
            if (adj[i][j] > 0)
                edges.push_back({i, j, adj[i][j]});

    // Sort edges by weight
    std::sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b){
        return a.w < b.w;
    });

    UnionFind uf(V);
    int mst_weight = 0;
    int edges_added = 0;

    for (auto& e : edges) {
        if (edges_added == V - 1) break;

        int pu = uf.find(e.u);
        int pv = uf.find(e.v);

        if (!emit_graph(0, 0, "relax_edge",
                        {{"u",          std::to_string(e.u)},
                         {"v",          std::to_string(e.v)},
                         {"weight",     std::to_string(e.w)},
                         {"cycle",      pu == pv ? "would_create_cycle" : "safe_to_add"},
                         {"mst_weight", std::to_string(mst_weight)}},
                        e.v, e.u, e.v, e.w, -1))
            return;

        if (uf.unite(e.u, e.v)) {
            mst_weight += e.w;
            edges_added++;
            if (!emit_graph(0, 0, "finalize_node",
                            {{"added_edge",  std::to_string(e.u) + "->" + std::to_string(e.v)},
                             {"mst_weight",  std::to_string(mst_weight)},
                             {"edges_in_mst",std::to_string(edges_added)}},
                            e.v, e.u, e.v, e.w, -1))
                return;
        }
    }
    emit_graph(0, 0, "finalize_node",
               {{"done","true"},{"mst_weight",std::to_string(mst_weight)}},
               -1, -1, -1, 0, -1);
}

void run_prim(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);

    std::vector<int> key(V, INT_MAX);     // min weight to connect to MST
    std::vector<bool> in_mst(V, false);
    std::vector<int> parent(V, -1);

    key[0] = 0;
    std::priority_queue<std::pair<int,int>,
                        std::vector<std::pair<int,int>>,
                        std::greater<>> pq;
    pq.push({0, 0});

    emit_graph(0, 0, "visit_node", {{"start","0"},{"phase","init"}}, 0, -1, -1, 0, 0);

    while (!pq.empty()) {
        auto [cost, u] = pq.top(); pq.pop();
        if (in_mst[u]) continue;
        in_mst[u] = true;

        if (!emit_graph(0, 0, "finalize_node",
                        {{"added_to_mst",  std::to_string(u)},
                         {"edge_cost",     std::to_string(cost)},
                         {"parent",        parent[u]==-1?"none":std::to_string(parent[u])}},
                        u, parent[u], u, cost, cost))
            return;

        for (int v = 0; v < V; v++) {
            if (adj[u][v] > 0 && !in_mst[v] && adj[u][v] < key[v]) {
                key[v] = adj[u][v];
                parent[v] = u;
                pq.push({key[v], v});

                if (!emit_graph(0, 1, "relax_edge",
                                {{"from",      std::to_string(u)},
                                 {"to",        std::to_string(v)},
                                 {"weight",    std::to_string(adj[u][v])},
                                 {"new_key",   std::to_string(key[v])}},
                                v, u, v, adj[u][v], key[v]))
                    return;
            }
        }
    }
    emit_graph(0, 0, "finalize_node", {{"done","mst_complete"}}, -1, -1, -1, 0, -1);
}

void run_topological(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);

    // Make it a DAG: only use upper triangle
    for (int i = 0; i < V; i++)
        for (int j = 0; j <= i; j++)
            adj[i][j] = 0;

    std::vector<int> in_degree(V, 0);
    for (int u = 0; u < V; u++)
        for (int v = 0; v < V; v++)
            if (adj[u][v] > 0) in_degree[v]++;

    std::queue<int> q;
    for (int i = 0; i < V; i++)
        if (in_degree[i] == 0) q.push(i);

    std::vector<int> topo_order;

    while (!q.empty()) {
        int u = q.front(); q.pop();
        topo_order.push_back(u);

        std::vector<int> q_state;
        auto q_copy = q;
        while (!q_copy.empty()) { q_state.push_back(q_copy.front()); q_copy.pop(); }

        if (!emit_graph(0, 0, "dequeue",
                        {{"node",       std::to_string(u)},
                         {"topo_pos",   std::to_string((int)topo_order.size()-1)},
                         {"queue_size", std::to_string(q.size())}},
                        u, -1, -1, 0, topo_order.size()-1, q_state))
            return;

        for (int v = 0; v < V; v++) {
            if (adj[u][v] > 0) {
                in_degree[v]--;
                if (!emit_graph(0, 1, "relax_edge",
                                {{"from",       std::to_string(u)},
                                 {"to",         std::to_string(v)},
                                 {"new_indegree",std::to_string(in_degree[v])}},
                                v, u, v, 0, in_degree[v]))
                    return;
                if (in_degree[v] == 0) {
                    q.push(v);
                    emit_graph(0, 1, "enqueue",
                               {{"enqueued", std::to_string(v)}}, v, -1, -1, 0, -1);
                }
            }
        }
    }

    bool is_dag = (int)topo_order.size() == V;
    emit_graph(0, 0, "finalize_node",
               {{"done","true"},
                {"is_dag",    is_dag ? "true" : "false (cycle detected)"},
                {"order_len", std::to_string(topo_order.size())}},
               -1, -1, -1, 0, -1);
}

static bool hamilton_found = false;

static void hamilton_recurse(
    const std::vector<std::vector<int>>& adj,
    std::vector<int>& path,
    std::vector<bool>& visited,
    int V, int depth
) {
    if (g_truncated || hamilton_found) return;

    if ((int)path.size() == V) {
        hamilton_found = true;
        emit_graph(0, depth, "finalize_node",
                   {{"hamiltonian_path_found","true"},
                    {"path_length",std::to_string(V)}},
                   path.back(), -1, -1, 0, -1);
        return;
    }

    int last = path.back();
    for (int v = 0; v < V; v++) {
        if (!visited[v] && adj[last][v] > 0) {
            visited[v] = true;
            path.push_back(v);

            if (!emit_graph(0, depth, "visit_node",
                            {{"visiting",   std::to_string(v)},
                             {"path_len",   std::to_string(path.size())},
                             {"from",       std::to_string(last)}},
                            v, last, v, 0, -1))
                return;

            hamilton_recurse(adj, path, visited, V, depth + 1);

            if (!hamilton_found) {
                path.pop_back();
                visited[v] = false;
                emit_graph(0, depth, "finalize_node",
                           {{"backtrack_from", std::to_string(v)},
                            {"returning_to",   std::to_string(last)}},
                           v, -1, -1, 0, -1);
            }
        }
    }
}

void run_hamilton_path(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);
    if (V > 8) V = 8;
    hamilton_found = false;

    std::vector<bool> visited(V, false);
    std::vector<int> path = {0};
    visited[0] = true;

    emit_graph(0, 0, "visit_node", {{"start","0"}}, 0, -1, -1, 0, -1);
    hamilton_recurse(adj, path, visited, V, 1);

    if (!hamilton_found) {
        emit_graph(0, 0, "finalize_node",
                   {{"result","no_hamiltonian_path_found"}}, -1, -1, -1, 0, -1);
    }
}

static bool coloring_solve(
    const std::vector<std::vector<int>>& adj,
    std::vector<int>& color,
    int V, int m, int node, int depth
) {
    if (node == V) return true;

    for (int c = 1; c <= m; c++) {
        // Check if color c is safe
        bool safe = true;
        for (int nb = 0; nb < V; nb++) {
            if (adj[node][nb] > 0 && color[nb] == c) { safe = false; break; }
        }

        if (!emit_graph(0, depth, "relax_edge",
                        {{"node",   std::to_string(node)},
                         {"trying_color", std::to_string(c)},
                         {"safe",   safe ? "yes" : "no (conflict)"}},
                        node, -1, -1, c, -1))
            return false;

        if (safe) {
            color[node] = c;
            emit_graph(0, depth, "visit_node",
                       {{"node",  std::to_string(node)},
                        {"color", std::to_string(c)}},
                       node, -1, -1, c, -1);

            if (coloring_solve(adj, color, V, m, node + 1, depth + 1))
                return true;

            color[node] = 0;
            emit_graph(0, depth, "finalize_node",
                       {{"backtrack", std::to_string(node)},
                        {"removed_color", std::to_string(c)}},
                       node, -1, -1, 0, -1);
        }
    }
    return false;
}

void run_graph_coloring(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);
    if (V > 8) V = 8;
    int m = 3; // try 3-coloring

    std::vector<int> color(V, 0);
    bool solved = coloring_solve(adj, color, V, m, 0, 0);

    emit_graph(0, 0, "finalize_node",
               {{"chromatic_success", solved ? "true" : "false"},
                {"colors_used", std::to_string(m)}},
               -1, -1, -1, 0, -1);
}

static void kosaraju_dfs1(
    const std::vector<std::vector<int>>& adj,
    std::vector<bool>& visited,
    std::stack<int>& finish_stack,
    int u, int V, int depth
) {
    visited[u] = true;
    emit_graph(0, depth, "visit_node", {{"u",std::to_string(u)},{"pass","first"}},
               u, -1, -1, 0, -1);
    for (int v = 0; v < V; v++) {
        if (adj[u][v] > 0 && !visited[v])
            kosaraju_dfs1(adj, visited, finish_stack, v, V, depth+1);
    }
    finish_stack.push(u);
    emit_graph(0, depth, "finalize_node",
               {{"u",std::to_string(u)},{"finish_order","push"}},
               u, -1, -1, 0, -1);
}

static void kosaraju_dfs2(
    const std::vector<std::vector<int>>& adj_t,
    std::vector<bool>& visited,
    int u, int V, int scc_id, int depth
) {
    visited[u] = true;
    emit_graph(0, depth, "visit_node",
               {{"u",std::to_string(u)},{"scc",std::to_string(scc_id)},{"pass","second"}},
               u, -1, -1, 0, scc_id);
    for (int v = 0; v < V; v++) {
        if (adj_t[u][v] > 0 && !visited[v])
            kosaraju_dfs2(adj_t, visited, v, V, scc_id, depth+1);
    }
}

void run_kosaraju(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);

    // Build transpose
    std::vector<std::vector<int>> adj_t(V, std::vector<int>(V, 0));
    for (int i = 0; i < V; i++)
        for (int j = 0; j < V; j++)
            adj_t[j][i] = adj[i][j];

    // Pass 1
    std::vector<bool> visited(V, false);
    std::stack<int> finish_stack;
    for (int u = 0; u < V; u++)
        if (!visited[u])
            kosaraju_dfs1(adj, visited, finish_stack, u, V, 0);

    // Pass 2
    std::fill(visited.begin(), visited.end(), false);
    int scc_count = 0;
    while (!finish_stack.empty()) {
        int u = finish_stack.top(); finish_stack.pop();
        if (!visited[u]) {
            scc_count++;
            emit_graph(0, 0, "enqueue",
                       {{"new_scc", std::to_string(scc_count)}, {"root", std::to_string(u)}},
                       u, -1, -1, 0, scc_count);
            kosaraju_dfs2(adj_t, visited, u, V, scc_count, 1);
        }
    }
    emit_graph(0, 0, "finalize_node",
               {{"scc_count", std::to_string(scc_count)}, {"done","true"}},
               -1, -1, -1, 0, -1);
}

static int fib_step_parent = 0;

static int fib_recurse(int n, int depth, const std::string& node_id) {
    int cur_parent = g_step_id;

    if (!emit_recursion(fib_step_parent, depth, "call", node_id, {n}))
        return 0;
    fib_step_parent = cur_parent;

    if (n <= 1) {
        emit_recursion(cur_parent, depth, "base_case", node_id, {n}, n);
        return n;
    }

    std::string left_id  = node_id + "L";
    std::string right_id = node_id + "R";

    int left_val  = fib_recurse(n-1, depth+1, left_id);
    if (g_truncated) return 0;
    int right_val = fib_recurse(n-2, depth+1, right_id);
    if (g_truncated) return 0;

    int result = left_val + right_val;
    emit_recursion(cur_parent, depth, "return", node_id, {n}, result, "");
    return result;
}

void run_fibonacci(std::vector<int> input) {
    int n = (input.size() > 0 && input[0] > 0) ? input[0] : 6;
    if (n > 15) n = 15; // cap — 2^15 = 32k steps
    fib_step_parent = 0;
    fib_recurse(n, 0, "root");
}

static void hanoi_move(int n, char from, char to, char aux, int depth, int parent) {
    if (n == 0) return;

    int cur = g_step_id;
    if (!emit_recursion(parent, depth, "call",
                        "hanoi_" + std::to_string(n) + "_" + from + to,
                        {n, (int)from, (int)to, (int)aux}))
        return;

    // Move n-1 disks from -> aux
    hanoi_move(n-1, from, aux, to, depth+1, cur);
    if (g_truncated) return;

    // Move disk n from -> to
    if (!emit_recursion(cur, depth, "return",
                        "move_" + std::to_string(n) + "_" + from + to,
                        {n, (int)from, (int)to}, n))
        return;

    // Move n-1 disks aux -> to
    hanoi_move(n-1, aux, to, from, depth+1, cur);
}

void run_hanoi(std::vector<int> input) {
    int n = (input.size() > 0 && input[0] > 0) ? input[0] : 4;
    if (n > 12) n = 12; // 2^12 = 4096 moves

    emit_recursion(0, 0, "call", "root", {n}, INT_MIN, "");
    hanoi_move(n, 'A', 'C', 'B', 1, 0);
}

static bool subset_found = false;
static int subset_target = 0;

static void subset_recurse(
    const std::vector<int>& arr, int idx, int current_sum,
    std::vector<int>& current_subset, int depth, int parent
) {
    if (g_truncated || subset_found) return;

    std::vector<int> params = {idx, current_sum, subset_target};
    int cur = g_step_id;

    if (!emit_recursion(parent, depth, "call",
                        "subset_" + std::to_string(idx),
                        params))
        return;

    if (current_sum == subset_target) {
        subset_found = true;
        emit_recursion(cur, depth, "base_case",
                       "found_" + std::to_string(idx),
                       current_subset, current_sum);
        return;
    }

    if (idx >= (int)arr.size() || current_sum > subset_target) {
        emit_recursion(cur, depth, "return",
                       "prune_" + std::to_string(idx), params, -1);
        return;
    }

    // Include arr[idx]
    current_subset.push_back(arr[idx]);
    subset_recurse(arr, idx+1, current_sum+arr[idx], current_subset, depth+1, cur);
    if (!g_truncated && !subset_found) {
        current_subset.pop_back();
        // Exclude arr[idx]
        subset_recurse(arr, idx+1, current_sum, current_subset, depth+1, cur);
    }

    emit_recursion(cur, depth, "return",
                   "done_" + std::to_string(idx), params,
                   subset_found ? 1 : 0);
}

void run_subset_sum(std::vector<int> input) {
    if (input.size() < 2) {
        // Default: array [3,5,6,1,4] target=9
        input = {9, 3, 5, 6, 1, 4};
    }
    subset_target = input[0];
    std::vector<int> arr(input.begin()+1, input.end());
    if (arr.size() > 15) arr.resize(15);

    subset_found = false;
    std::vector<int> current;
    emit_recursion(0, 0, "call", "root", {subset_target}, INT_MIN, "");
    subset_recurse(arr, 0, 0, current, 1, 0);
}

static std::vector<std::vector<int>> queens_solutions;

static bool is_safe(const std::vector<int>& board, int row, int col, int n) {
    for (int r = 0; r < row; r++) {
        if (board[r] == col) return false;
        if (std::abs(board[r] - col) == std::abs(r - row)) return false;
    }
    return true;
}

static void nqueens_recurse(
    std::vector<int>& board, int row, int n, int depth, int parent
) {
    if (g_truncated) return;

    if (row == n) {
        queens_solutions.push_back(board);
        // Emit with board state encoded in vars
        std::map<std::string, std::string> vars;
        for (int i = 0; i < n; i++)
            vars["row_" + std::to_string(i)] = std::to_string(board[i]);
        vars["solution_num"] = std::to_string(queens_solutions.size());

        emit(parent, depth, "sorted", board, {}, vars);
        return;
    }

    for (int col = 0; col < n; col++) {
        bool safe = is_safe(board, row, col, n);
        board[row] = col;

        std::map<std::string, std::string> vars = {
            {"row",  std::to_string(row)},
            {"col",  std::to_string(col)},
            {"safe", safe ? "yes" : "no"},
        };

        if (!emit(parent, depth, safe ? "compare" : "highlight", board, {row, col}, vars))
            return;

        if (safe) {
            nqueens_recurse(board, row+1, n, depth+1, g_step_id);
            if (queens_solutions.size() >= 3) return; // show first 3 solutions
        }
        board[row] = -1;
    }

    if (!emit(parent, depth, "assign", board, {},
              {{"backtrack_from_row", std::to_string(row)}}))
        return;
}

void run_nqueens(std::vector<int> input) {
    int n = (input.size() > 0 && input[0] > 0) ? input[0] : 6;
    if (n > 10) n = 10;
    queens_solutions.clear();

    std::vector<int> board(n, -1);
    emit(0, 0, "highlight", board, {}, {{"n", std::to_string(n)}, {"phase","start"}});
    nqueens_recurse(board, 0, n, 1, 0);

    emit(0, 0, "done", board, {},
         {{"solutions_found", std::to_string(queens_solutions.size())}});
}

// Helper: emit a DP table fill step
bool emit_dp(int depth, const std::string& op,
             int row, int col, int value,
             const std::map<std::string, std::string>& vars,
             int from_row = -1, int from_col = -1) {
    if (g_step_id >= g_step_budget) {
        if (!g_truncated) {
            g_truncated = true;
            std::cerr << "TRUNCATED:" << g_step_id << std::endl;
        }
        return false;
    }

    json step;
    step["step_id"]    = g_step_id++;
    step["parent_id"]  = 0;
    step["depth"]      = depth;
    step["op"]         = op;
    step["array_state"]= std::vector<int>{};
    step["array"]      = std::vector<int>{};
    step["indices"]    = std::vector<int>{};
    step["vars"]       = vars;
    step["heap_delta"] = 0;
    step["run_length"] = 1;

    // DP-specific fields for DPTable frontend component
    step["row"]   = row;
    step["col"]   = col;
    step["value"] = value;
    if (from_row >= 0) step["from_row"] = from_row;
    if (from_col >= 0) step["from_col"] = from_col;

    std::cout << step.dump() << "\n";
    return true;
}

void run_knapsack01(std::vector<int> input) {
    // input encoding: [W, n, w1, v1, w2, v2, ...]
    // Default demo if insufficient input
    int W = 10, n = 5;
    std::vector<int> weights = {2, 3, 4, 5, 1};
    std::vector<int> values  = {3, 4, 5, 6, 2};

    if (input.size() >= 2) {
        W = input[0]; n = input[1];
        int available_pairs = static_cast<int>((input.size() - 2) / 2);
        int pair_count = std::min(n, available_pairs);
        if (pair_count > 0) {
            weights.clear(); values.clear();
            for (int i = 0; i < pair_count; i++) {
                weights.push_back(input[2 + 2*i]);
                values.push_back(input[2 + 2*i + 1]);
            }
            n = pair_count;
        } else {
            n = static_cast<int>(weights.size());
        }
    }
    if (weights.size() != values.size()) {
        n = static_cast<int>(std::min(weights.size(), values.size()));
        weights.resize(n);
        values.resize(n);
    }
    if ((int)weights.size() < n) {
        n = static_cast<int>(weights.size());
    }
    if (W > 20) W = 20;
    if (n > 10) n = 10;

    // dp[i][w] = max value using first i items with capacity w
    std::vector<std::vector<int>> dp(n+1, std::vector<int>(W+1, 0));

    // Init row
    for (int w = 0; w <= W; w++)
        emit_dp(0, "init", 0, w, 0, {{"phase","init"},{"w",std::to_string(w)}});

    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            int exclude = dp[i-1][w];

            if (!emit_dp(1, "depend", i, w, exclude,
                         {{"item", std::to_string(i)},
                          {"weight_i", std::to_string(weights[i-1])},
                          {"value_i",  std::to_string(values[i-1])},
                          {"w",        std::to_string(w)},
                          {"option",   "exclude"}},
                         i-1, w))
                return;

            int include_val = -1;
            if (weights[i-1] <= w) {
                include_val = dp[i-1][w - weights[i-1]] + values[i-1];

                if (!emit_dp(1, "depend", i, w, include_val,
                             {{"item",    std::to_string(i)},
                              {"option",  "include"},
                              {"from_w",  std::to_string(w - weights[i-1])},
                              {"profit",  std::to_string(include_val)}},
                             i-1, w - weights[i-1]))
                    return;
            }

            dp[i][w] = (include_val > exclude) ? include_val : exclude;

            if (!emit_dp(0, "fill_cell", i, w, dp[i][w],
                         {{"item",    std::to_string(i)},
                          {"w",       std::to_string(w)},
                          {"value",   std::to_string(dp[i][w])},
                          {"choice",  include_val > exclude ? "include" : "exclude"}}))
                return;
        }
    }
    emit_dp(0, "backtrack", n, W, dp[n][W],
            {{"optimal_value", std::to_string(dp[n][W])}});
}

void run_lcs(std::vector<int> input) {
    // input: two sequences separated by 0 as delimiter
    // e.g., [3,1,4,1,5,0,1,4,2,5] -> seq1=[3,1,4,1,5], seq2=[1,4,2,5]
    std::vector<int> seq1, seq2;
    bool in_seq2 = false;
    for (int v : input) {
        if (v == 0 && !in_seq2) { in_seq2 = true; continue; }
        if (!in_seq2) seq1.push_back(v);
        else seq2.push_back(v);
    }
    if (seq1.empty()) seq1 = {3,1,4,1,5,9,2};
    if (seq2.empty()) seq2 = {1,4,5,9,2,6};
    if (seq1.size() > 12) seq1.resize(12);
    if (seq2.size() > 12) seq2.resize(12);

    int m = seq1.size(), n = seq2.size();
    std::vector<std::vector<int>> dp(m+1, std::vector<int>(n+1, 0));

    for (int i = 0; i <= m; i++)
        emit_dp(0, "init", i, 0, 0, {{"init_col","0"}});
    for (int j = 1; j <= n; j++)
        emit_dp(0, "init", 0, j, 0, {{"init_row","0"}});

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (seq1[i-1] == seq2[j-1]) {
                dp[i][j] = dp[i-1][j-1] + 1;
                if (!emit_dp(1, "fill_cell", i, j, dp[i][j],
                             {{"match", std::to_string(seq1[i-1])},
                              {"extend_from", "diagonal"}},
                             i-1, j-1))
                    return;
            } else {
                dp[i][j] = std::max(dp[i-1][j], dp[i][j-1]);
                bool from_top = dp[i-1][j] >= dp[i][j-1];
                if (!emit_dp(1, "fill_cell", i, j, dp[i][j],
                             {{"no_match",   "true"},
                              {"seq1_val",   std::to_string(seq1[i-1])},
                              {"seq2_val",   std::to_string(seq2[j-1])},
                              {"from",       from_top ? "top" : "left"}},
                             from_top ? i-1 : i,
                             from_top ? j   : j-1))
                    return;
            }
        }
    }
    emit_dp(0, "backtrack", m, n, dp[m][n],
            {{"lcs_length", std::to_string(dp[m][n])}});
}

void run_lis(std::vector<int> input) {
    if (input.empty()) input = {10,9,2,5,3,7,101,18};
    if (input.size() > 20) input.resize(20);
    int n = input.size();

    std::vector<int> dp(n, 1); // dp[i] = LIS length ending at index i
    std::vector<int> prev_idx(n, -1);

    for (int i = 1; i < n; i++) {
        if (!emit(0, 0, "highlight", input, {i},
                  {{"considering", std::to_string(input[i])},
                   {"i", std::to_string(i)}}))
            return;

        for (int j = 0; j < i; j++) {
            if (!emit(0, 1, "compare", input, {j, i},
                      {{"arr[j]", std::to_string(input[j])},
                       {"arr[i]", std::to_string(input[i])},
                       {"j",      std::to_string(j)},
                       {"dp[j]",  std::to_string(dp[j])}}))
                return;

            if (input[j] < input[i] && dp[j] + 1 > dp[i]) {
                dp[i] = dp[j] + 1;
                prev_idx[i] = j;
                if (!emit(0, 1, "assign", input, {i},
                          {{"new_dp[i]", std::to_string(dp[i])},
                           {"extended_from", std::to_string(j)}}))
                    return;
            }
        }

        // Show dp row state
        if (!emit(0, 0, "sorted", dp, {},
                  {{"dp_after_i", std::to_string(i)},
                   {"dp_i",       std::to_string(dp[i])}}))
            return;
    }

    int max_len = *std::max_element(dp.begin(), dp.end());
    emit(0, 0, "done", input, {}, {{"lis_length", std::to_string(max_len)}});
}

void run_matrix_chain(std::vector<int> input) {
    // input = dimension array p[], where matrix i has dims p[i-1] x p[i]
    if (input.size() < 3) input = {10, 30, 5, 60, 15};
    if (input.size() > 9) input.resize(9); // max 8 matrices
    int n = input.size() - 1; // n matrices

    const int INF = 1e9;
    std::vector<std::vector<int>> dp(n+1, std::vector<int>(n+1, 0));

    // Fill by chain length l
    for (int l = 2; l <= n; l++) {
        for (int i = 1; i <= n-l+1; i++) {
            int j = i + l - 1;
            dp[i][j] = INF;

            for (int k = i; k < j; k++) {
                int cost = dp[i][k] + dp[k+1][j] + input[i-1]*input[k]*input[j];

                if (!emit_dp(1, "depend", i, j, cost,
                             {{"split_k",  std::to_string(k)},
                              {"cost_ijk", std::to_string(cost)},
                              {"left_cost",std::to_string(dp[i][k])},
                              {"right_cost",std::to_string(dp[k+1][j])}},
                             i, k))
                    return;

                if (cost < dp[i][j]) {
                    dp[i][j] = cost;
                    if (!emit_dp(0, "fill_cell", i, j, dp[i][j],
                                 {{"best_split", std::to_string(k)},
                                  {"min_cost",   std::to_string(dp[i][j])}}))
                        return;
                }
            }
        }
    }
    emit_dp(0, "backtrack", 1, n, dp[1][n],
            {{"optimal_cost", std::to_string(dp[1][n])}});
}

void run_fibonacci_dp(std::vector<int> input) {
    int n = (input.size() > 0 && input[0] > 0) ? input[0] : 10;
    if (n > 30) n = 30;

    std::vector<int> fib(n+1, 0);
    fib[0] = 0;
    if (n >= 1) fib[1] = 1;

    emit_dp(0, "init", 0, 0, 0, {{"base_case","fib(0)=0"}});
    if (n >= 1) emit_dp(0, "init", 0, 1, 1, {{"base_case","fib(1)=1"}});

    for (int i = 2; i <= n; i++) {
        if (!emit_dp(1, "depend", 0, i, fib[i-1],
                     {{"from","fib("+std::to_string(i-1)+")="+std::to_string(fib[i-1])}},
                     0, i-1))
            return;
        if (!emit_dp(1, "depend", 0, i, fib[i-2],
                     {{"from","fib("+std::to_string(i-2)+")="+std::to_string(fib[i-2])}},
                     0, i-2))
            return;

        fib[i] = fib[i-1] + fib[i-2];
        if (!emit_dp(0, "fill_cell", 0, i, fib[i],
                     {{"fib_n",    std::to_string(i)},
                      {"value",    std::to_string(fib[i])},
                      {"from_n-1", std::to_string(fib[i-1])},
                      {"from_n-2", std::to_string(fib[i-2])}}))
            return;
    }

    emit_dp(0, "backtrack", 0, n, fib[n],
            {{"result", "fib("+std::to_string(n)+")="+std::to_string(fib[n])}});
}

// Helper: emit a hash step with all hash-specific fields
bool emit_hash(const std::string& op, int key, int bucket,
               int new_bucket = -1, int chain_pos = -1,
               const std::map<std::string, std::string>& vars = {}) {
    if (g_step_id >= g_step_budget) {
        if (!g_truncated) {
            g_truncated = true;
            std::cerr << "TRUNCATED:" << g_step_id << std::endl;
        }
        return false;
    }
    json step;
    step["step_id"]    = g_step_id++;
    step["parent_id"]  = 0;
    step["depth"]      = 0;
    step["op"]         = op;
    step["array_state"]= std::vector<int>{};
    step["array"]      = std::vector<int>{};
    step["indices"]    = std::vector<int>{};
    step["vars"]       = vars;
    step["heap_delta"] = 0;
    step["run_length"] = 1;
    step["key"]    = key;
    step["bucket"] = bucket;
    if (new_bucket >= 0) step["new_bucket"]  = new_bucket;
    if (chain_pos >= 0)  step["chain_pos"]   = chain_pos;
    std::cout << step.dump() << "\n";
    return true;
}

void run_hash_chaining(std::vector<int> input) {
    if (input.empty()) input = {12,23,34,45,56,14,7,19};
    int TABLE_SIZE = 7;

    std::vector<std::vector<int>> table(TABLE_SIZE);

    for (int key : input) {
        int h = ((key % TABLE_SIZE) + TABLE_SIZE) % TABLE_SIZE;

        if (!emit_hash("hash", key, h, -1, -1,
                       {{"key",         std::to_string(key)},
                        {"hash_result", std::to_string(h)},
                        {"formula",     "key % " + std::to_string(TABLE_SIZE)}}))
            return;

        if (!table[h].empty()) {
            if (!emit_hash("collision", key, h, -1, (int)table[h].size(),
                           {{"collision_at",  std::to_string(h)},
                            {"chain_length",  std::to_string(table[h].size())},
                            {"existing_keys", std::to_string(table[h].front())}}))
                return;
        }

        table[h].push_back(key);
        if (!emit_hash("insert", key, h, -1, (int)table[h].size()-1,
                       {{"inserted_at_bucket", std::to_string(h)},
                        {"chain_position",      std::to_string(table[h].size()-1)}}))
            return;
    }
}

void run_linear_probing(std::vector<int> input) {
    if (input.empty()) input = {12,23,34,45,56,14,7,19};
    int TABLE_SIZE = 11;
    std::vector<int> table(TABLE_SIZE, INT_MIN);

    for (int key : input) {
        int h = ((key % TABLE_SIZE) + TABLE_SIZE) % TABLE_SIZE;
        int probe = h;

        if (!emit_hash("hash", key, h, -1, -1,
                       {{"key", std::to_string(key)},
                        {"initial_bucket", std::to_string(h)}}))
            return;

        while (table[probe] != INT_MIN) {
            if (!emit_hash("probe", key, probe, (probe+1)%TABLE_SIZE, -1,
                           {{"probing",      std::to_string(probe)},
                            {"occupied_by",  std::to_string(table[probe])},
                            {"next_probe",   std::to_string((probe+1)%TABLE_SIZE)}}))
                return;
            probe = (probe + 1) % TABLE_SIZE;
            if (probe == h) {
                emit_hash("collision", key, probe, -1, -1, {{"error","table_full"}});
                return;
            }
        }

        table[probe] = key;
        if (!emit_hash("insert", key, probe, -1, -1,
                       {{"placed_at", std::to_string(probe)},
                        {"probes_needed", std::to_string((probe-h+TABLE_SIZE)%TABLE_SIZE)}}))
            return;
    }
}

void run_quadratic_probing(std::vector<int> input) {
    if (input.empty()) input = {12,23,34,45,56,14,7,19};
    int TABLE_SIZE = 11; // must be prime for guaranteed termination
    std::vector<int> table(TABLE_SIZE, INT_MIN);

    for (int key : input) {
        int h = ((key % TABLE_SIZE) + TABLE_SIZE) % TABLE_SIZE;
        bool inserted = false;

        if (!emit_hash("hash", key, h, -1, -1,
                       {{"key", std::to_string(key)},
                        {"initial_bucket", std::to_string(h)}}))
            return;

        for (int i = 0; i < TABLE_SIZE; i++) {
            int probe = (h + i*i) % TABLE_SIZE;

            if (table[probe] == INT_MIN) {
                table[probe] = key;
                if (!emit_hash("insert", key, probe, -1, i,
                               {{"probe_i",     std::to_string(i)},
                                {"placed_at",   std::to_string(probe)},
                                {"formula",     "(" + std::to_string(h) + " + " + std::to_string(i) + "²) % " + std::to_string(TABLE_SIZE)}}))
                    return;
                inserted = true;
                break;
            }

            if (!emit_hash("probe", key, probe, (h+(i+1)*(i+1))%TABLE_SIZE, i,
                           {{"probe_i",      std::to_string(i)},
                            {"probing",      std::to_string(probe)},
                            {"occupied_by",  std::to_string(table[probe])}}))
                return;
        }
        if (!inserted)
            emit_hash("collision", key, h, -1, -1, {{"error","table_full"}});
    }
}

void run_double_hashing(std::vector<int> input) {
    if (input.empty()) input = {12,23,34,45,56,14,7,19};
    int TABLE_SIZE = 11; // prime
    std::vector<int> table(TABLE_SIZE, INT_MIN);

    auto h1 = [&](int k){ return ((k % TABLE_SIZE) + TABLE_SIZE) % TABLE_SIZE; };
    auto h2 = [&](int k){ return 7 - ((k % 7) + 7) % 7; }; // 7 - (k mod 7), never 0

    for (int key : input) {
        int step1 = h1(key);
        int step2 = h2(key);
        if (step2 == 0) step2 = 1;

        if (!emit_hash("hash", key, step1, -1, -1,
                       {{"h1",  std::to_string(step1)},
                        {"h2",  std::to_string(step2)},
                        {"key", std::to_string(key)}}))
            return;

        for (int i = 0; i < TABLE_SIZE; i++) {
            int probe = (step1 + i * step2) % TABLE_SIZE;

            if (table[probe] == INT_MIN) {
                table[probe] = key;
                if (!emit_hash("insert", key, probe, -1, i,
                               {{"probe_i",   std::to_string(i)},
                                {"placed_at", std::to_string(probe)},
                                {"formula",   "(h1 + i*h2) % TABLE_SIZE"}}))
                    return;
                break;
            }

            if (!emit_hash("probe", key, probe, (step1+(i+1)*step2)%TABLE_SIZE, i,
                           {{"probe_i",     std::to_string(i)},
                            {"probing",     std::to_string(probe)},
                            {"occupied_by", std::to_string(table[probe])}}))
                return;
        }
    }
}

// Helper: emit string step
bool emit_string(const std::string& op,
                 int text_idx, int pattern_idx,
                 bool match_result,
                 int position = -1,
                 const std::map<std::string, std::string>& vars = {}) {
    if (g_step_id >= g_step_budget) {
        if (!g_truncated) {
            g_truncated = true;
            std::cerr << "TRUNCATED:" << g_step_id << std::endl;
        }
        return false;
    }
    json step;
    step["step_id"]    = g_step_id++;
    step["parent_id"]  = 0;
    step["depth"]      = 0;
    step["op"]         = op;
    step["array_state"]= std::vector<int>{};
    step["array"]      = std::vector<int>{};
    step["indices"]    = std::vector<int>{};
    step["vars"]       = vars;
    step["heap_delta"] = 0;
    step["run_length"] = 1;
    step["text_idx"]    = text_idx;
    step["pattern_idx"] = pattern_idx;
    step["match"]       = match_result;
    if (position >= 0) step["position"] = position;
    std::cout << step.dump() << "\n";
    return true;
}

// ─── String input decoder ────────────────────────────────────────────────────
// Input encoding: [textASCII..., 0, patternASCII...]
// Falls back to demo strings when input is empty or malformed.
static void parse_string_input(
    const std::vector<int>& input,
    std::string& text,
    std::string& pattern,
    const std::string& default_text = "AABAACAADAABAAABAA",
    const std::string& default_pat  = "AABA"
) {
    text    = default_text;
    pattern = default_pat;
    if (input.empty()) return;
    std::string dt, dp;
    bool in_pat = false;
    for (int c : input) {
        if (!in_pat && c == 0 && !dt.empty()) { in_pat = true; continue; }
        if (c >= 32 && c <= 126) {
            if (!in_pat) dt += (char)c;
            else         dp += (char)c;
        }
    }
    if (dt.size() >= 2 && !dp.empty() && dp.size() <= dt.size()) {
        text = dt; pattern = dp;
    }
}

void run_naive_match(std::vector<int> input) {
    std::string text, pattern;
    parse_string_input(input, text, pattern);

    int n = text.size(), m = pattern.size();
    std::vector<int> matches;

    for (int i = 0; i <= n - m; i++) {
        bool matched = true;

        for (int j = 0; j < m; j++) {
            bool char_match = (text[i+j] == pattern[j]);

            if (!emit_string("compare_char", i+j, j, char_match, -1,
                             {{"text_char",    std::string(1, text[i+j])},
                              {"pattern_char", std::string(1, pattern[j])},
                              {"window_start", std::to_string(i)}}))
                return;

            if (!char_match) {
                matched = false;
                if (!emit_string("mismatch", i+j, j, false, -1,
                                 {{"mismatch_at", std::to_string(i+j)},
                                  {"shift_to",    std::to_string(i+1)}}))
                    return;
                break;
            }
        }

        if (matched) {
            matches.push_back(i);
            if (!emit_string("found", i, 0, true, i,
                             {{"match_at",      std::to_string(i)},
                              {"matches_so_far",std::to_string(matches.size())}}))
                return;
        }
    }
}

static std::vector<int> compute_failure(const std::string& pattern) {
    int m = pattern.size();
    std::vector<int> fail(m, 0);
    int k = 0;
    for (int i = 1; i < m; i++) {
        while (k > 0 && pattern[k] != pattern[i]) k = fail[k-1];
        if (pattern[k] == pattern[i]) k++;
        fail[i] = k;
    }
    return fail;
}

void run_kmp(std::vector<int> input) {
    std::string text, pattern;
    parse_string_input(input, text, pattern);
    int n = text.size(), m = pattern.size();

    auto fail = compute_failure(pattern);

    // Show failure function
    for (int i = 0; i < m; i++) {
        if (!emit_string("compare_char", -1, i, true, -1,
                         {{"failure_fn_idx",  std::to_string(i)},
                          {"failure_val",     std::to_string(fail[i])},
                          {"pattern_char",    std::string(1,pattern[i])},
                          {"phase",           "build_failure_fn"}}))
            return;
    }

    int q = 0; // number of chars matched so far
    for (int i = 0; i < n; i++) {
        while (q > 0 && pattern[q] != text[i]) {
            if (!emit_string("shift", i, q, false, -1,
                             {{"mismatch",    "true"},
                              {"shift_from",  std::to_string(q)},
                              {"shift_to",    std::to_string(fail[q-1])},
                              {"text_char",   std::string(1, text[i])},
                              {"pattern_char",std::string(1,pattern[q])}}))
                return;
            q = fail[q-1];
        }

        bool char_match = (pattern[q] == text[i]);
        if (!emit_string("compare_char", i, q, char_match, -1,
                         {{"text_char",    std::string(1, text[i])},
                          {"pattern_char", std::string(1, pattern[q])},
                          {"q",            std::to_string(q)}}))
            return;

        if (char_match) q++;

        if (q == m) {
            int pos = i - m + 1;
            if (!emit_string("found", i, q-1, true, pos,
                             {{"match_at", std::to_string(pos)}}))
                return;
            q = fail[q-1];
        }
    }
}

void run_rabin_karp(std::vector<int> input) {
    std::string text, pattern;
    parse_string_input(input, text, pattern);
    int n = text.size(), m = pattern.size();
    int BASE = 256, MOD = 101;

    long long pat_hash  = 0;
    long long text_hash = 0;
    long long h = 1;
    for (int i = 0; i < m-1; i++) h = (h * BASE) % MOD;

    for (int i = 0; i < m; i++) {
        pat_hash  = (BASE * pat_hash  + pattern[i]) % MOD;
        text_hash = (BASE * text_hash + text[i])    % MOD;
    }

    for (int i = 0; i <= n - m; i++) {
        bool hash_match = (pat_hash == text_hash);

        if (!emit_string("hash_check", i, 0, hash_match, -1,
                         {{"window_start",  std::to_string(i)},
                          {"text_hash",     std::to_string(text_hash)},
                          {"pattern_hash",  std::to_string(pat_hash)},
                          {"hash_match",    hash_match ? "yes" : "no (spurious or real)"}}))
            return;

        if (hash_match) {
            // Verify character by character
            bool full_match = true;
            for (int j = 0; j < m; j++) {
                bool char_m = (text[i+j] == pattern[j]);
                if (!emit_string("compare_char", i+j, j, char_m, -1,
                                 {{"text_char",    std::string(1,text[i+j])},
                                  {"pattern_char", std::string(1,pattern[j])},
                                  {"verify",       "true"}}))
                    return;
                if (!char_m) { full_match = false; break; }
            }

            if (full_match) {
                if (!emit_string("found", i, m-1, true, i,
                                 {{"match_at", std::to_string(i)}}))
                    return;
            }
        }

        // Roll hash to next window
        if (i < n - m) {
            text_hash = (BASE * (text_hash - text[i] * h) + text[i+m]) % MOD;
            if (text_hash < 0) text_hash += MOD;
            if (!emit_string("shift", i+1, 0, false, -1,
                             {{"rolling_hash",  std::to_string(text_hash)},
                              {"removed_char",  std::string(1, text[i])},
                              {"added_char",    std::string(1, text[i+m])}}))
                return;
        }
    }
}

void run_activity_selection(std::vector<int> input) {
    // input pairs: [start1, end1, start2, end2, ...]
    struct Activity { int id, start, end; };
    std::vector<Activity> acts;

    if (input.size() >= 2 && input.size() % 2 == 0) {
        for (int i = 0; i < (int)input.size(); i += 2)
            acts.push_back({i/2, input[i], input[i+1]});
    } else {
        // Default demo activities
        acts = {{0,1,4},{1,3,5},{2,0,6},{3,5,7},{4,3,9},{5,5,9},{6,6,10},{7,8,11},{8,8,12},{9,2,14}};
    }

    // Sort by end time
    std::sort(acts.begin(), acts.end(), [](const Activity& a, const Activity& b){
        return a.end < b.end;
    });

    std::vector<int> selected;
    int last_end = -1;

    for (auto& a : acts) {
        bool compatible = (a.start >= last_end);

        std::map<std::string,std::string> vars = {
            {"activity_id",  std::to_string(a.id)},
            {"start",        std::to_string(a.start)},
            {"end",          std::to_string(a.end)},
            {"last_end",     std::to_string(last_end)},
            {"compatible",   compatible ? "yes" : "no"},
        };

        if (!emit(0, 0, compatible ? "compare" : "highlight",
                  selected, {a.id}, vars))
            return;

        if (compatible) {
            selected.push_back(a.id);
            last_end = a.end;
            if (!emit(0, 0, "sorted", selected, {(int)selected.size()-1},
                      {{"selected_activity", std::to_string(a.id)},
                       {"total_selected",    std::to_string(selected.size())},
                       {"new_last_end",      std::to_string(last_end)}}))
                return;
        }
    }

    emit(0, 0, "done", selected, {},
         {{"total_activities_selected", std::to_string(selected.size())}});
}

// ─── Knapsack-specific emit ───────────────────────────────────────────────────
// Emits a step with top-level fields that KnapsackVisualizer reads directly.
bool emit_knapsack(
    const std::string& op,
    int item_id,
    float fraction,
    int current_weight,
    float current_value,
    const std::map<std::string, std::string>& vars = {}
) {
    if (g_step_id >= g_step_budget) {
        if (!g_truncated) { g_truncated = true; std::cerr << "TRUNCATED:" << g_step_id << std::endl; }
        return false;
    }
    json step;
    step["step_id"]       = g_step_id++;
    step["parent_id"]     = 0;
    step["depth"]         = 0;
    step["op"]            = op;
    step["array_state"]   = std::vector<int>{};
    step["array"]         = std::vector<int>{};
    step["indices"]       = std::vector<int>{};
    step["vars"]          = vars;
    step["heap_delta"]    = 0;
    step["run_length"]    = 1;
    // Top-level fields KnapsackVisualizer reads directly
    step["item_id"]       = item_id;
    step["fraction"]      = fraction;
    step["current_weight"]= current_weight;
    step["current_value"] = current_value;
    std::cout << step.dump() << "\n";
    return true;
}

void run_fractional_knapsack(std::vector<int> input) {
    // input: [W, n, w1, v1, w2, v2, ...]
    // Default weights match frontend DEFAULT_ITEMS: {10,20,30,15,25} / {60,100,120,40,50}
    int W = 50, n = 5;
    std::vector<int> weights = {10, 20, 30, 15, 25};
    std::vector<int> values  = {60, 100, 120, 40, 50};

    if (input.size() >= 2) {
        W = input[0]; n = input[1];
        if ((int)input.size() >= 2 + 2*n) {
            weights.clear(); values.clear();
            for (int i = 0; i < n; i++) {
                weights.push_back(input[2 + 2*i]);
                values.push_back(input[2 + 2*i + 1]);
            }
        }
    }

    struct Item { int id, w, v; float ratio; };
    std::vector<Item> items;
    for (int i = 0; i < n; i++)
        items.push_back({i, weights[i], values[i], (float)values[i]/weights[i]});

    // Greedy: sort by value/weight ratio descending
    std::sort(items.begin(), items.end(), [](const Item& a, const Item& b){
        return a.ratio > b.ratio;
    });

    float total_value    = 0.0f;
    int   remaining_W    = W;
    int   weight_taken   = 0;

    for (auto& item : items) {
        // Emit consider_item before deciding
        if (!emit_knapsack("consider_item", item.id, 0.0f, weight_taken, total_value,
                           {{"weight",      std::to_string(item.w)},
                            {"value",       std::to_string(item.v)},
                            {"ratio",       std::to_string(item.ratio)},
                            {"remaining_W", std::to_string(remaining_W)}}))
            return;

        if (remaining_W <= 0) {
            // No capacity left — exclude this item
            if (!emit_knapsack("exclude", item.id, 0.0f, weight_taken, total_value,
                               {{"reason", "capacity_full"}}))
                return;
            continue;
        }

        float fraction    = 1.0f;
        int   take_weight = item.w;

        if (item.w > remaining_W) {
            fraction    = (float)remaining_W / item.w;
            take_weight = remaining_W;
        }

        total_value  += fraction * item.v;
        weight_taken += take_weight;
        remaining_W  -= take_weight;

        std::string op = (fraction < 1.0f) ? "partial_include" : "include";
        if (!emit_knapsack(op, item.id, fraction, weight_taken, total_value,
                           {{"weight",       std::to_string(item.w)},
                            {"value",        std::to_string(item.v)},
                            {"fraction",     std::to_string(fraction)},
                            {"taken_weight", std::to_string(take_weight)},
                            {"remaining_W",  std::to_string(remaining_W)}}))
            return;
    }

    emit_knapsack("done", -1, 0.0f, weight_taken, total_value,
                  {{"optimal_value", std::to_string(total_value)},
                   {"capacity_used", std::to_string(W - remaining_W)}});
}

void run_job_sequencing(std::vector<int> input) {
    // input: [n, d1, p1, d2, p2, ...] (deadline, profit pairs)
    struct Job { int id, deadline, profit; };
    std::vector<Job> jobs;

    if (input.size() >= 3) {
        int n = input[0];
        for (int i = 0; i < n && 1 + 2*i + 1 < (int)input.size(); i++)
            jobs.push_back({i, input[1+2*i], input[2+2*i]});
    }

    if (jobs.empty()) {
        jobs = {{0,2,100},{1,1,19},{2,2,27},{3,1,25},{4,3,15}};
    }

    // Sort by profit descending
    std::sort(jobs.begin(), jobs.end(), [](const Job& a, const Job& b){
        return a.profit > b.profit;
    });

    int max_deadline = 0;
    for (auto& j : jobs) max_deadline = std::max(max_deadline, j.deadline);
    std::vector<int> schedule(max_deadline + 1, -1);
    int total_profit = 0;

    for (auto& j : jobs) {
        // Find latest available slot ≤ deadline
        bool placed = false;
        for (int t = j.deadline; t >= 1; t--) {
            if (!emit(0, 0, "compare",
                      std::vector<int>(schedule.begin(), schedule.end()),
                      {t, j.id},
                      {{"job_id",     std::to_string(j.id)},
                       {"profit",     std::to_string(j.profit)},
                       {"deadline",   std::to_string(j.deadline)},
                       {"checking_slot", std::to_string(t)},
                       {"slot_free",  schedule[t]==-1 ? "yes":"no"}}))
                return;

            if (schedule[t] == -1) {
                schedule[t] = j.id;
                total_profit += j.profit;
                placed = true;
                if (!emit(0, 0, "assign",
                          std::vector<int>(schedule.begin(), schedule.end()),
                          {t},
                          {{"placed_job",    std::to_string(j.id)},
                           {"at_slot",       std::to_string(t)},
                           {"total_profit",  std::to_string(total_profit)}}))
                    return;
                break;
            }
        }

        if (!placed) {
            emit(0, 0, "highlight",
                 std::vector<int>(schedule.begin(), schedule.end()), {},
                 {{"rejected_job",   std::to_string(j.id)},
                  {"no_slot_before", std::to_string(j.deadline)}});
        }
    }

    emit(0, 0, "done",
         std::vector<int>(schedule.begin(), schedule.end()), {},
         {{"total_profit", std::to_string(total_profit)},
          {"jobs_scheduled", std::to_string(max_deadline)}});
}

void run_huffman(std::vector<int> input) {
    // input = frequencies (can be any positive integers)
    if (input.empty()) input = {5, 9, 12, 13, 16, 45};
    if (input.size() > 12) input.resize(12);

    int n = input.size();

    struct HNode {
        int freq, id;
        int left, right; // child indices, -1 if leaf
    };

    std::vector<HNode> nodes;
    for (int i = 0; i < n; i++)
        nodes.push_back({input[i], i, -1, -1});

    // Min-heap by frequency
    auto cmp = [](const std::pair<int,int>& a, const std::pair<int,int>& b){
        return a.first > b.first; // min-heap
    };
    std::priority_queue<std::pair<int,int>,
                        std::vector<std::pair<int,int>>,
                        decltype(cmp)> pq(cmp);

    for (int i = 0; i < n; i++) {
        pq.push({nodes[i].freq, i});
        if (!emit(0, 0, "highlight", input, {i},
                  {{"char_id",   std::to_string(i)},
                   {"frequency", std::to_string(input[i])},
                   {"phase",     "init_priority_queue"}}))
            return;
    }

    while (pq.size() > 1) {
        auto [f1, id1] = pq.top(); pq.pop();
        auto [f2, id2] = pq.top(); pq.pop();

        int merged_freq = f1 + f2;
        int new_id = nodes.size();
        nodes.push_back({merged_freq, new_id, id1, id2});
        pq.push({merged_freq, new_id});

        if (!emit(0, 0, "merge",
                  std::vector<int>{f1, f2, merged_freq},
                  {id1, id2, new_id},
                  {{"left_node",    std::to_string(id1)},
                   {"right_node",   std::to_string(id2)},
                   {"left_freq",    std::to_string(f1)},
                   {"right_freq",   std::to_string(f2)},
                   {"merged_freq",  std::to_string(merged_freq)},
                   {"new_node_id",  std::to_string(new_id)},
                   {"queue_size",   std::to_string(pq.size())}}))
            return;
    }

    auto [root_freq, root_id] = pq.top();
    emit(0, 0, "done", {root_freq}, {root_id},
         {{"huffman_root_freq", std::to_string(root_freq)},
          {"total_nodes",       std::to_string(nodes.size())}});
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE 7 ALGORITHMS (Segment 1) — added inline since no separate files exist
// ═══════════════════════════════════════════════════════════════════════════════

// ── Bubble Sort ──────────────────────────────────────────────────────────────
void run_bubblesort(std::vector<int> arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (!emit(0, 0, "compare", arr, {j, j+1},
                      {{"arr[j]", std::to_string(arr[j])},
                       {"arr[j+1]", std::to_string(arr[j+1])},
                       {"pass", std::to_string(i)}}))
                return;
            if (arr[j] > arr[j+1]) {
                std::swap(arr[j], arr[j+1]);
                swapped = true;
                if (!emit(0, 0, "swap", arr, {j, j+1},
                          {{"swapped", std::to_string(arr[j+1]) + "<->" + std::to_string(arr[j])}}))
                    return;
            }
        }
        if (!emit(0, 0, "sorted", arr, {n-1-i}, {{"pass", std::to_string(i)}}))
            return;
        if (!swapped) break;
    }
    std::vector<int> all(n); std::iota(all.begin(), all.end(), 0);
    emit(0, 0, "done", arr, all, {{"sorted", "true"}});
}

// ── Quicksort (Lomuto) ────────────────────────────────────────────────────────
static void qs_recurse(std::vector<int>& arr, int lo, int hi, int depth, int pid) {
    if (lo >= hi) return;
    int pivot = arr[hi];
    if (!emit(pid, depth, "pivot", arr, {hi},
              {{"pivot_val", std::to_string(pivot)}, {"lo", std::to_string(lo)}, {"hi", std::to_string(hi)}}))
        return;
    int i = lo - 1;
    for (int j = lo; j < hi; j++) {
        if (!emit(pid, depth+1, "compare", arr, {j, hi},
                  {{"arr[j]", std::to_string(arr[j])}, {"pivot", std::to_string(pivot)}}))
            return;
        if (arr[j] <= pivot) {
            i++;
            if (i != j) {
                std::swap(arr[i], arr[j]);
                if (!emit(pid, depth+1, "swap", arr, {i, j}, {{"i", std::to_string(i)}, {"j", std::to_string(j)}}))
                    return;
            }
        }
    }
    std::swap(arr[i+1], arr[hi]);
    int pp = i + 1;
    if (!emit(pid, depth, "sorted", arr, {pp}, {{"pivot_placed", std::to_string(pp)}}))
        return;
    int cur = g_step_id;
    qs_recurse(arr, lo, pp-1, depth+1, cur);
    qs_recurse(arr, pp+1, hi, depth+1, cur);
}
void run_quicksort(std::vector<int> arr) {
    if (arr.size() <= 1) return;
    qs_recurse(arr, 0, (int)arr.size()-1, 0, 0);
    std::vector<int> all(arr.size()); std::iota(all.begin(), all.end(), 0);
    emit(0, 0, "done", arr, all, {{"sorted", "true"}});
}

// ── Merge Sort ────────────────────────────────────────────────────────────────
static void ms_merge(std::vector<int>& arr, int lo, int mid, int hi, int depth, int pid) {
    std::vector<int> L(arr.begin()+lo, arr.begin()+mid+1);
    std::vector<int> R(arr.begin()+mid+1, arr.begin()+hi+1);
    int i=0, j=0, k=lo;
    while (i < (int)L.size() && j < (int)R.size()) {
        if (!emit(pid, depth, "compare", arr, {lo+i, mid+1+j},
                  {{"left", std::to_string(L[i])}, {"right", std::to_string(R[j])}}))
            return;
        if (L[i] <= R[j]) arr[k++] = L[i++];
        else               arr[k++] = R[j++];
        emit(pid, depth, "assign", arr, {k-1}, {{"placed", std::to_string(arr[k-1])}});
    }
    while (i < (int)L.size()) { arr[k++] = L[i++]; emit(pid, depth, "assign", arr, {k-1}, {}); }
    while (j < (int)R.size()) { arr[k++] = R[j++]; emit(pid, depth, "assign", arr, {k-1}, {}); }
}
static void ms_recurse(std::vector<int>& arr, int lo, int hi, int depth, int pid) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    emit(pid, depth, "highlight", arr, {lo, hi}, {{"split_at", std::to_string(mid)}});
    int cur = g_step_id;
    ms_recurse(arr, lo, mid, depth+1, cur);
    ms_recurse(arr, mid+1, hi, depth+1, cur);
    ms_merge(arr, lo, mid, hi, depth, cur);
    emit(cur, depth, "sorted", arr, {lo, hi}, {{"merged_range", std::to_string(lo)+"-"+std::to_string(hi)}});
}
void run_mergesort(std::vector<int> arr) {
    if (arr.size() <= 1) return;
    ms_recurse(arr, 0, (int)arr.size()-1, 0, 0);
    std::vector<int> all(arr.size()); std::iota(all.begin(), all.end(), 0);
    emit(0, 0, "done", arr, all, {{"sorted", "true"}});
}

// ── Linear Search ─────────────────────────────────────────────────────────────
void run_linear_search(std::vector<int> arr) {
    if (arr.empty()) return;
    int target = arr[arr.size()/2]; // search for median
    std::sort(arr.begin(), arr.end());
    emit(0, 0, "highlight", arr, {}, {{"target", std::to_string(target)}, {"phase", "start"}});
    for (int i = 0; i < (int)arr.size(); i++) {
        if (!emit(0, 0, "compare", arr, {i},
                  {{"val", std::to_string(arr[i])}, {"target", std::to_string(target)}, {"i", std::to_string(i)}}))
            return;
        if (arr[i] == target) {
            emit(0, 0, "sorted", arr, {i}, {{"found_at", std::to_string(i)}});
            return;
        }
    }
    emit(0, 0, "done", arr, {}, {{"result", "not_found"}});
}

// ── Binary Search ─────────────────────────────────────────────────────────────
void run_binary_search(std::vector<int> arr) {
    if (arr.empty()) return;
    std::sort(arr.begin(), arr.end());
    int target = arr[arr.size()/2];
    emit(0, 0, "highlight", arr, {}, {{"target", std::to_string(target)}, {"phase", "start"}});
    int lo = 0, hi = (int)arr.size()-1;
    while (lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if (!emit(0, 0, "compare", arr, {lo, hi, mid},
                  {{"lo", std::to_string(lo)}, {"hi", std::to_string(hi)},
                   {"mid", std::to_string(mid)}, {"val", std::to_string(arr[mid])},
                   {"target", std::to_string(target)}}))
            return;
        if (arr[mid] == target) {
            emit(0, 0, "sorted", arr, {mid}, {{"found_at", std::to_string(mid)}});
            return;
        } else if (arr[mid] < target) lo = mid + 1;
        else                           hi = mid - 1;
    }
    emit(0, 0, "done", arr, {}, {{"result", "not_found"}});
}

// ── BFS ───────────────────────────────────────────────────────────────────────
void run_bfs(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);
    std::vector<bool> visited(V, false);
    std::queue<int> q;
    q.push(0); visited[0] = true;
    emit_graph(0, 0, "enqueue", {{"source","0"}}, 0, -1, -1, 0, -1, {0});
    while (!q.empty()) {
        int u = q.front(); q.pop();
        std::vector<int> qs;
        auto tmp = q; while (!tmp.empty()) { qs.push_back(tmp.front()); tmp.pop(); }
        if (!emit_graph(0, 0, "visit_node", {{"node", std::to_string(u)}}, u, -1, -1, 0, -1, qs))
            return;
        for (int v = 0; v < V; v++) {
            if (adj[u][v] > 0 && !visited[v]) {
                visited[v] = true;
                q.push(v);
                std::vector<int> qs2;
                auto tmp2 = q; while (!tmp2.empty()) { qs2.push_back(tmp2.front()); tmp2.pop(); }
                if (!emit_graph(0, 1, "enqueue",
                                {{"from", std::to_string(u)}, {"to", std::to_string(v)}},
                                v, u, v, adj[u][v], -1, qs2))
                    return;
            }
        }
    }
    emit_graph(0, 0, "done", {{"visited_all","true"}}, -1, -1, -1, 0, -1);
}

// ── DFS ───────────────────────────────────────────────────────────────────────
static void dfs_recurse(const std::vector<std::vector<int>>& adj, std::vector<bool>& visited,
                        int u, int depth, int pid) {
    visited[u] = true;
    if (!emit_graph(pid, depth, "visit_node", {{"node", std::to_string(u)}}, u, -1, -1, 0, -1))
        return;
    int V = (int)adj.size();
    for (int v = 0; v < V; v++) {
        if (adj[u][v] > 0 && !visited[v]) {
            if (!emit_graph(g_step_id, depth+1, "relax_edge",
                            {{"from", std::to_string(u)}, {"to", std::to_string(v)}},
                            v, u, v, adj[u][v], -1))
                return;
            dfs_recurse(adj, visited, v, depth+1, g_step_id);
            if (g_truncated) return;
        }
    }
}
void run_dfs(std::vector<int> input) {
    int V;
    auto adj = build_adj_matrix(input, V);
    std::vector<bool> visited(V, false);
    dfs_recurse(adj, visited, 0, 0, 0);
    emit_graph(0, 0, "done", {{"complete","true"}}, -1, -1, -1, 0, -1);
}
