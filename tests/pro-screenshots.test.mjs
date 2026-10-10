import test from 'node:test';
import assert from 'node:assert/strict';

function buildOpenSessionKey(timer) {
  const t = timer || {};
  if (t.captureSegmentId) return String(t.captureSegmentId);
  const day = t.day || '';
  const start = String(t.dayStart || '').trim();
  const projectId = t.projectId || '';
  if (!projectId || !day) return '';
  return `open:${projectId}:${day}:${start}`;
}

function truncateTwoLines(text, max = 120) {
  const s = String(text || '').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function clampPdfLines(text, maxLines = 2, maxWidth = 90) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const words = raw.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  if (words.join(' ').length > lines.join(' ').length && lines.length === maxLines) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxWidth - 1)}…`;
  }
  return lines.join('\n');
}

function paginatePdfItems(items, defaultPerPage, pageLayouts) {
  const pages = [];
  let idx = 0;
  let pageNum = 0;
  while (idx < items.length) {
    const layout = Math.min(Math.max(1, pageLayouts[pageNum] || defaultPerPage), 4);
    pages.push({ layout, items: items.slice(idx, idx + layout) });
    idx += layout;
    pageNum += 1;
  }
  return pages;
}

const KOFI_PROMPT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

function shouldShowKofiSupportPrompt(lastSeenMs, nowMs) {
  const last = Number(lastSeenMs) || 0;
  if (!last) return true;
  return nowMs - last >= KOFI_PROMPT_INTERVAL_MS;
}

test('buildOpenSessionKey links timer segment to screenshots', () => {
  assert.equal(
    buildOpenSessionKey({ projectId: 'p1', day: '2026-09-05', dayStart: '09:00', captureSegmentId: 'cap_123' }),
    'cap_123'
  );
  assert.equal(buildOpenSessionKey({ projectId: 'p1', day: '2026-09-05', dayStart: '09:00' }), 'open:p1:2026-09-05:09:00');
  assert.equal(buildOpenSessionKey({ projectId: '', day: '2026-09-05', dayStart: '09:00' }), '');
});

test('kofi support prompt shows at most once per 30 days', () => {
  const t0 = Date.UTC(2026, 0, 1);
  assert.equal(shouldShowKofiSupportPrompt(0, t0), true);
  assert.equal(shouldShowKofiSupportPrompt(t0, t0 + KOFI_PROMPT_INTERVAL_MS - 1), false);
  assert.equal(shouldShowKofiSupportPrompt(t0, t0 + KOFI_PROMPT_INTERVAL_MS), true);
});

test('truncateTwoLines keeps short notes and ellipsizes long ones', () => {
  assert.equal(truncateTwoLines('Short note'), 'Short note');
  assert.match(truncateTwoLines('x'.repeat(200)), /…$/);
});

test('paginatePdfItems respects per-page overrides', () => {
  const items = [1, 2, 3, 4, 5];
  const pages = paginatePdfItems(items, 2, { 1: 3 });
  assert.deepEqual(
    pages.map(p => p.items),
    [[1, 2], [3, 4, 5]]
  );
});

test('clampPdfLines limits note preview to two lines', () => {
  const out = clampPdfLines('one two three four five six seven eight nine ten eleven twelve thirteen fourteen', 2, 20);
  assert.ok(out.split('\n').length <= 2);
});
