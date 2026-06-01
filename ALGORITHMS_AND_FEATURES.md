# Athena Algorithms and Features

This project currently exposes 44 algorithms through the backend and a connected frontend for visual traces, benchmarking, comparison, cache simulation, bug injection, what-if analysis, search, and explainability.

## Algorithm Count

- Total supported algorithms: 44

## Algorithms

- quicksort
- mergesort
- bubblesort
- insertionsort
- selectionsort
- heapsort
- countingsort
- radixsort
- bucketsort
- randomizedquicksort
- linearsearch
- binarysearch
- exponentialsearch
- bfs
- dfs
- dijkstra
- bellmanford
- floydwarshall
- kruskal
- prim
- topological
- hamiltonpath
- graphcoloring
- kosaraju
- fibonacci
- hanoi
- subsetsum
- nqueens
- knapsack01
- lcs
- matrixchain
- lis
- fibonaccidp
- chaining
- linearprobing
- quadraticprobing
- doublehashing
- naivematch
- kmp
- rabinkarp
- activityselection
- jobsequencing
- huffman
- fractionalknapsack

## Core Features

- Algorithm trace rendering through `/run-algorithm`.
- Complexity analysis through `/analyze-complexity`.
- Benchmarking through `/benchmark`.
- Cache simulation through `/simulate-cache`.
- Diff comparison through `/run-diff`.
- Bug-injection testing through `/run-bug`.
- What-if analysis through `/run-whatif`.
- Search and detection routes through `/search` and `/detect-code`.
- Explanation requests and streaming updates through `/request-explanation` and `/explain-stream/{request_id}`.
- Frontend dev integration with backend on port 8001.
- Backend health and registry checks through `/health` and `/algos`.

## Verified Runtime Notes

- Backend base URL: `http://127.0.0.1:8001`
- Frontend base URL: `http://localhost:3004`
- Frontend API URL: `NEXT_PUBLIC_API_URL=http://localhost:8001`
- `knapsack01` crash was fixed in the engine by validating the declared item count against available `(weight, value)` pairs.
