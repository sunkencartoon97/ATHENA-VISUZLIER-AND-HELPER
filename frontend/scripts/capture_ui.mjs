import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:3004';
const OUT_DIR = path.resolve('test-artifacts', 'ui-screenshots');

const featurePages = [
  '/',
  '/compare',
  '/complexity',
  '/cache',
  '/bug-injection',
  '/whatif',
  '/turing',
];

const algos = [
  'bubblesort','insertionsort','selectionsort','quicksort','mergesort','heapsort','countingsort','radixsort','bucketsort','randomizedquicksort',
  'linearsearch','binarysearch','exponentialsearch',
  'bfs','dfs','dijkstra','bellmanford','floydwarshall','kruskal','prim','topological','hamiltonpath','graphcoloring','kosaraju',
  'fibonacci','hanoi','subsetsum','nqueens',
  'knapsack01','lcs','matrixchain','lis','fibonaccidp',
  'chaining','linearprobing','quadraticprobing','doublehashing',
  'naivematch','kmp','rabinkarp',
  'activityselection','jobsequencing','huffman','fractionalknapsack','turing',
];

function safeName(input) {
  return input.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function hasClientError(page) {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  return (
    bodyText.includes('Application error') ||
    bodyText.includes('client-side exception') ||
    bodyText.includes('500')
  );
}

async function captureFeature(page, route) {
  const url = `${BASE_URL}${route}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1200);
  const error = await hasClientError(page);
  const filePath = path.join(OUT_DIR, `feature_${safeName(route || 'home')}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return { route, url, screenshot: filePath, ok: !error, error: error ? 'client_error_text_detected' : null };
}

async function runAndCaptureAlgo(page, algo) {
  const route = `/run/${algo}`;
  const url = `${BASE_URL}${route}`;
  const consoleErrors = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  };

  page.on('console', onConsole);

  let ok = true;
  let error = null;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1000);

    const runBtn = page.getByRole('button', { name: /run/i }).first();
    await runBtn.click({ timeout: 8000 });

    await Promise.race([
      page.locator('text=step').first().waitFor({ timeout: 20000 }).catch(() => null),
      page.waitForTimeout(5000),
    ]);

    if (await hasClientError(page)) {
      ok = false;
      error = 'client_error_text_detected';
    } else if (consoleErrors.some((e) => /TypeError|ReferenceError|Cannot read properties/i.test(e))) {
      ok = false;
      error = 'console_runtime_error';
    }
  } catch (e) {
    ok = false;
    error = String(e?.message || e);
  }

  const filePath = path.join(OUT_DIR, `algo_${safeName(algo)}.png`);
  await page.screenshot({ path: filePath, fullPage: true });

  page.off('console', onConsole);

  return {
    algo,
    url,
    screenshot: filePath,
    ok,
    error,
    consoleErrors: consoleErrors.slice(0, 5),
  };
}

async function main() {
  await ensureDir(OUT_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const featureResults = [];
  for (const route of featurePages) {
    const r = await captureFeature(page, route);
    featureResults.push(r);
    process.stdout.write(`FEATURE ${route} ${r.ok ? 'OK' : 'FAIL'}\n`);
  }

  const algoResults = [];
  for (const algo of algos) {
    const r = await runAndCaptureAlgo(page, algo);
    algoResults.push(r);
    process.stdout.write(`ALGO ${algo} ${r.ok ? 'OK' : 'FAIL'}\n`);
  }

  await browser.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    featurePass: featureResults.filter((r) => r.ok).length,
    featureFail: featureResults.filter((r) => !r.ok).length,
    algoPass: algoResults.filter((r) => r.ok).length,
    algoFail: algoResults.filter((r) => !r.ok).length,
    featureResults,
    algoResults,
  };

  const reportPath = path.join(OUT_DIR, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2), 'utf8');

  process.stdout.write(`REPORT ${reportPath}\n`);
  process.stdout.write(`SUMMARY features ${summary.featurePass}/${featurePages.length} algos ${summary.algoPass}/${algos.length}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
