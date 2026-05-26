import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:3004';
const OUT_DIR = path.resolve('test-artifacts', 'ui-verify');

function normalizeComplexity(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/\^/g, '');
}

function normalizeBadgeText(s) {
  return String(s || '')
    .replace(/\u2212/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCoreComplexity(text) {
  const raw = normalizeBadgeText(text);
  const m = raw.match(/^(O\([^)]*\)(?:\s*avg)?|UNVERIFIABLE|varies)/i);
  return m ? m[1] : raw;
}

async function parseAlgorithmMeta() {
  const filePath = path.resolve('lib', 'algorithms.ts');
  const src = await fs.readFile(filePath, 'utf8');

  const regex = /\{\s*id:\s*'([^']+)'[\s\S]*?timeComplexity:\s*'([^']+)'[\s\S]*?visualizer:\s*'([^']+)'/g;
  const out = [];
  let m;
  while ((m = regex.exec(src)) !== null) {
    out.push({ id: m[1], timeComplexity: m[2], visualizer: m[3] });
  }
  return out;
}

async function hasClientError(page) {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  return /Application error|client-side exception|Internal Server Error/i.test(bodyText);
}

async function extractComplexityBadge(page) {
  return await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('span,div,p'))
      .filter((el) => {
        const t = (el.textContent || '').trim();
        if (!t) return false;
        if (t.length > 30) return false;
        return /^O\s*\(/i.test(t) || /^UNVERIFIABLE$/i.test(t) || /^varies$/i.test(t);
      })
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.top < 260 && r.width > 20 && r.height > 10;
      });

    return (candidates[0]?.textContent || '').trim();
  });
}

async function visualizerLooksPresent(page, visualizerType) {
  const checks = {
    sorting: async () => (await page.locator('.vis-bar').count()) > 0 || (await page.locator('svg').count()) > 0,
    graph: async () => (await page.locator('svg circle').count()) >= 5,
    recursion: async () => (await page.locator('svg, canvas, .panel').count()) > 0,
    dp: async () => (await page.locator('table, .grid').count()) > 0,
    nqueens: async () => (await page.locator('.grid, table, svg').count()) > 0,
    hash: async () => (await page.locator('.grid, svg, canvas').count()) > 0,
    string: async () => (await page.locator('.font-mono, svg, .grid').count()) > 0,
    huffman: async () => (await page.locator('svg, canvas').count()) > 0,
    activity: async () => (await page.locator('svg, canvas').count()) > 0,
    knapsack: async () => (await page.locator('table, .grid, svg').count()) > 0,
  };

  if (checks[visualizerType]) {
    return checks[visualizerType]();
  }

  return (await page.locator('svg, canvas, .vis-bar, .grid, table').count()) > 0;
}

async function hasGenericCodeFlowFallback(page) {
  const panelText = await page
    .locator('text=/Code Flow/i')
    .first()
    .locator('..')
    .innerText()
    .catch(() => '');

  return /for each step in trace/i.test(panelText);
}

async function graphLooksConnected(page) {
  return await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'));
    let best = null;

    for (const svg of svgs) {
      const circles = svg.querySelectorAll('circle').length;
      const lines = svg.querySelectorAll('line').length;
      if (circles >= 5 && (!best || circles > best.circles)) {
        best = { circles, lines };
      }
    }

    if (!best) return false;
    return best.lines >= Math.max(1, best.circles - 1);
  });
}

async function checkAlgorithm(page, meta) {
  const { id, timeComplexity, visualizer } = meta;
  const url = `${BASE_URL}/run/${id}`;
  const consoleErrors = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  page.on('console', onConsole);

  const issues = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(800);

    if (await hasClientError(page)) {
      issues.push('client_error_text_on_load');
    }

    const runBtn = page.getByRole('button', { name: /run/i }).first();
    await runBtn.click({ timeout: 10000 });
    await Promise.race([
      page.locator('text=/Wall Time/i').first().waitFor({ timeout: 15000 }).catch(() => null),
      page.waitForTimeout(3500),
    ]);

    if (await hasClientError(page)) {
      issues.push('client_error_after_run');
    }

    const badgeRaw = await extractComplexityBadge(page);
    const badge = extractCoreComplexity(badgeRaw);
    const expected = extractCoreComplexity(timeComplexity);

    if (!badge) {
      issues.push('missing_complexity_badge');
    } else if (!normalizeComplexity(badge).startsWith(normalizeComplexity(expected))) {
      issues.push(`complexity_mismatch expected=${expected} got=${badge}`);
    }

    const visOk = await visualizerLooksPresent(page, visualizer);
    if (!visOk) issues.push(`visualizer_missing type=${visualizer}`);

    const fallbackCode = await hasGenericCodeFlowFallback(page);
    if (fallbackCode) issues.push('code_flow_generic_fallback');

    if (visualizer === 'graph') {
      const graphConnected = await graphLooksConnected(page);
      if (!graphConnected) issues.push('graph_visualizer_disconnected');
    }

    const stepText = await page.locator('text=/\\b\\d+\\s*\\/\\s*\\d+\\b/').first().textContent().catch(() => '');
    const stepCounterPresent = Boolean(stepText && stepText.trim());

    if (consoleErrors.some((e) => /TypeError|ReferenceError|Cannot read properties/i.test(e))) {
      issues.push('runtime_console_error');
    }

    const screenshot = path.join(OUT_DIR, `algo_${id}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    return {
      algo: id,
      visualizer,
      url,
      expectedComplexity: expected,
      observedComplexity: badge,
      ok: issues.length === 0,
      issues,
      stepCounterPresent,
      screenshot,
      consoleErrors: consoleErrors.slice(0, 4),
    };
  } catch (e) {
    const screenshot = path.join(OUT_DIR, `algo_${id}.png`);
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    return {
      algo: id,
      visualizer,
      url,
      expectedComplexity: timeComplexity,
      observedComplexity: null,
      ok: false,
      issues: [String(e?.message || e)],
      screenshot,
      consoleErrors: consoleErrors.slice(0, 4),
    };
  } finally {
    page.off('console', onConsole);
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const metas = await parseAlgorithmMeta();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = [];
  for (const meta of metas) {
    const res = await checkAlgorithm(page, meta);
    results.push(res);
    process.stdout.write(`CHECK ${meta.id} ${res.ok ? 'OK' : 'FAIL'}\n`);
  }

  await browser.close();

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    total: results.length,
    pass: okCount,
    fail: failCount,
    results,
  };

  const reportPath = path.join(OUT_DIR, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  const mdLines = [];
  mdLines.push('# UI Verification Report');
  mdLines.push('');
  mdLines.push(`- Total: ${results.length}`);
  mdLines.push(`- Pass: ${okCount}`);
  mdLines.push(`- Fail: ${failCount}`);
  mdLines.push('');
  mdLines.push('## Failures');
  mdLines.push('');

  const failures = results.filter((r) => !r.ok);
  if (failures.length === 0) {
    mdLines.push('- None');
  } else {
    for (const f of failures) {
      mdLines.push(`- ${f.algo}: ${f.issues.join(' | ')}`);
    }
  }

  const mdPath = path.join(OUT_DIR, 'report.md');
  await fs.writeFile(mdPath, mdLines.join('\n'), 'utf8');

  process.stdout.write(`REPORT_JSON ${reportPath}\n`);
  process.stdout.write(`REPORT_MD ${mdPath}\n`);
  process.stdout.write(`SUMMARY pass=${okCount} fail=${failCount}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
