# ATHENA v3.0 — Viva Explanation
## Split: You 50% · Person B 25% · Person C 25%

---

> **How to say this to Sir:** Read each person's 3 paragraphs. Simple language. Easy to speak.

---

## 👤 YOUR PART — 50%

**Paragraph 1 — What I did:**
I built the complete core of this project. My biggest work was writing the C++ engine — a program that actually runs all 44 algorithms. When someone clicks "Run" on the website, my C++ program starts, reads the input, runs the algorithm step by step, and sends every single step as output so the frontend can show it visually. I wrote all 44 algorithms myself in C++ — all sorting algorithms like bubble sort, merge sort, quick sort, heap sort; all graph algorithms like BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Kruskal, Prim; dynamic programming algorithms like 0/1 Knapsack, LCS, Matrix Chain; recursion and backtracking like Fibonacci, Tower of Hanoi, N-Queens; hashing, string matching like KMP and Rabin-Karp; and greedy algorithms like Huffman Coding and Activity Selection. Every single one of the 44 algorithms was written and tested by me.

**Paragraph 2 — How it connects to the project:**
I also built the entire Python backend that connects the website to the engine. I also built the complexity analysis system — this is a major feature where you can paste code and it analyses the loop structure to estimate the Big-O complexity, or you pick an algorithm and it runs it at different input sizes, measures the time, and fits a curve to find the real complexity. I built the Lie Detector feature too — where you claim a complexity, the system runs the algorithm and proves whether you were right or wrong. I also built the algorithm comparison system using Longest Common Subsequence — a DAA algorithm I applied in the backend to compare how two algorithm execution traces differ from each other step by step.

**Paragraph 3 — Why it is the most important:**
My work is 50% because without it, literally nothing else runs. The C++ engine is the heart — all visualizations, all benchmarks, all comparisons depend on it. The complexity analysis backend is entirely mine — the AST parser that detects loop depth, the curve fitting that identifies O(n²) vs O(n log n), the lie detector verdict. I also fixed several critical bugs — a crash in the knapsack algorithm, a deadlock in the C++ process communication, and a bug in the trace comparison engine. My part covers the most DAA content — Divide and Conquer, Greedy, Dynamic Programming, Graph Traversal, Backtracking, Recursion, Hashing, String Matching — all implemented in real working C++ code.

---

---

## 👥 PERSON B — 25%

**Paragraph 1 — What I did:**
I built all the visual components on the website — the parts that actually show you what an algorithm is doing on screen. When you run bubble sort and you see bars moving and swapping with colours, that is my work. I made 10 different types of visualizers — one for sorting that shows a bar chart, one for graph algorithms that shows nodes and edges, one for recursion that shows a tree growing step by step, one for dynamic programming that shows a table filling up, one for hashing that shows buckets, one for string matching that shows characters being compared one by one, a chessboard for N-Queens, a tree for Huffman coding, an item display for knapsack, and a Gantt timeline for activity selection.

**Paragraph 2 — How it connects to the project:**
I also built the playback controls — the play, pause, forward, back, and speed buttons that let you step through an algorithm one step at a time. This is important because the whole purpose of the project is to see algorithms running step by step. Each visualizer reads the step data that comes from the backend — every step has information about which elements are being compared, which are being swapped, what the current array looks like — and my visualizer uses that to update the screen correctly. I also wrote the pseudocode shown in the code panel for all 44 algorithms so students can read the code alongside the animation.

**Paragraph 3 — Why this matters for DAA:**
My work makes DAA concepts understandable visually. When a student watches bubble sort compare adjacent elements and swap them, they immediately understand why it is O(n²) — they can see how many comparisons are happening. When they watch merge sort split and merge, they see divide and conquer in action. When they watch Dijkstra updating distances on the graph, they understand greedy shortest path. Visualization is the core feature of this DAA project, and everything I built serves that purpose — turning abstract algorithm theory into something you can actually watch and understand step by step.

---

---

## 👥 PERSON C — 25%

**Paragraph 1 — What I did:**
I handled the testing of the entire project. I tested all 44 algorithms one by one — ran each algorithm with different inputs and verified the output was correct. I tested all the features — the compare feature, the bug injection feature, the what-if feature, the cache simulation, the search bar, and the complexity results page. I also tested all the connections between the frontend and the backend — making sure every API call was reaching the right endpoint and returning the right data. If something was broken or giving wrong results, I was the one who found it and reported it.

**Paragraph 2 — How it connects to the project:**
I also built the frontend pages for the comparison and analysis features. I built the compare page UI, the bug injection page UI, the what-if page UI, and the cache simulation page UI. I built the complexity results display page — the chart that shows timing data, the verdict box that shows MATCH or WORSE, and the explanation text below it. The actual analysis logic and the complexity engine was built by the first person, but I built the interface that displays those results to the user. I also built the app navigation bar, the overall layout, and the global CSS styling of the website.

**Paragraph 3 — Why this matters for DAA:**
Testing is what makes the project reliable and correct. I verified that every sorting algorithm produces a correctly sorted output. I verified that graph algorithms like Dijkstra produce the right shortest distances. I verified that the LCS algorithm finds the correct longest common subsequence. I confirmed that the complexity measurements were reasonable — that quicksort measured close to O(n log n) and bubble sort measured close to O(n²). I also confirmed all the frontend-to-backend connections were working — so when someone uses the website, every feature actually works correctly. Without proper testing, even a well-built project can give wrong answers.

---

---

## 📝 Quick Summary Table (For Sir)

| Person | Work | % |
|---|---|---|
| **You** | C++ engine (all 44 algorithms) + Python backend + complexity analysis engine (AST parser, curve fitting, lie detector) + trace comparison (LCS diff) + bug injection logic + what-if logic | **50%** |
| **Person B** | All 10 algorithm visualizer components + playback controls + pseudocode for all 44 algorithms | **25%** |
| **Person C** | Testing all 44 algorithms + testing all features + testing all API connections + frontend pages (compare, bug, what-if, cache, complexity UI display) + app layout + CSS | **25%** |
