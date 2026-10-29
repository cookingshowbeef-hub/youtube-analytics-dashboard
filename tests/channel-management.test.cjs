const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const summaries = JSON.parse(fs.readFileSync(path.join(root, 'data/demo-analytics/summaries.json'), 'utf8')).rows;

function loadApp({ search = '?mode=demo', savedMode = null } = {}) {
  const nodes = new Map();
  const ids = ['view-mgmt-channel', 'mgmt-stat-total-channels', 'mgmt-stat-active-channels',
    'mgmt-stat-total-subs', 'mgmt-stat-total-views', 'mgmt-stat-total-rev', 'mgmt-stat-views-label',
    'mgmt-stat-subs-note', 'mgmt-stat-views-note', 'mgmt-stat-revenue-note', 'mgmt-table-views-label',
    'mgmt-data-source', 'mgmt-data-hint', 'channel-cards-grid', 'table-mgmt-channels-body'];
  for (const id of ids) nodes.set(id, {
    textContent: '', innerHTML: '', style: {}, hidden: false,
    classList: { contains: name => name === 'dashboard-view', add() {}, remove() {}, toggle() {} }
  });
  for (const id of ['mgmt-channel-search', 'mgmt-filter-team', 'mgmt-filter-category', 'mgmt-filter-status']) {
    nodes.set(id, { value: id === 'mgmt-channel-search' ? '' : 'all', options: [{ value: 'all' }],
      appendChild(option) { this.options.push(option); } });
  }
  const storage = new Map(savedMode ? [['tubepulse_view_mode', savedMode]] : []);
  const context = {
    window: { location: { search, hash: '#view-mgmt-channel' }, addEventListener() {}, scrollTo() {} },
    document: { readyState: 'loading', getElementById: id => nodes.get(id) || null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({}) },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    URLSearchParams, console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, setInterval, clearInterval, Intl
  };
  vm.createContext(context);
  for (const file of ['data/mock-hierarchy/dataset.js', 'data/demo-analytics/demo_bundle.js', 'app.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  return {
    app: context.window, nodes,
    render() { context.window.appSwitchView('view-mgmt-channel'); },
    text(id) { return nodes.get(id).textContent; },
    html(id) { return nodes.get(id).innerHTML; }
  };
}

test('demo shows all 15 channels and the same period revenue in cards, table and totals', () => {
  const page = loadApp();
  page.render();
  const expected = summaries.filter(row => row.period_key === 'last_28_days' && row.entity_type === 'channel');
  assert.equal((page.html('channel-cards-grid').match(/data-channel-id=/g) || []).length, 15);
  for (const row of expected) {
    const value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.metrics.estimatedRevenue);
    assert.ok(page.html('channel-cards-grid').includes(value), `${row.entity_id} card revenue`);
    assert.ok(page.html('table-mgmt-channels-body').includes(value), `${row.entity_id} table revenue`);
  }
  const total = expected.reduce((sum, row) => sum + Math.round(row.metrics.estimatedRevenue * 100), 0) / 100;
  assert.equal(page.text('mgmt-stat-total-rev'), new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total));
  assert.match(page.text('mgmt-data-source'), /minh họa.*2026-10-01.*2026-10-28/);
  assert.match(page.html('channel-cards-grid'), /Lượt xem trong kỳ/);
  assert.equal(page.nodes.get('mgmt-data-hint').hidden, true);
});

test('public mode preserves public counters and does not invent revenue', () => {
  const page = loadApp({ search: '?mode=live' });
  page.render();
  assert.equal(page.text('mgmt-stat-total-rev'), '—');
  assert.match(page.text('mgmt-stat-views-label'), /cộng dồn/);
  assert.match(page.html('channel-cards-grid'), /Lượt xem cộng dồn/);
  assert.equal(page.nodes.get('mgmt-data-hint').hidden, false);
});

test('missing monetary scope stays missing while period views still display', () => {
  const page = loadApp();
  page.app.state.demoScenario = 'analytics_without_monetary';
  page.render();
  assert.equal(page.text('mgmt-stat-total-rev'), '—');
  assert.match(page.text('mgmt-stat-views-note'), /15\/15/);
  assert.ok(!page.html('channel-cards-grid').includes('$0.00'));
});

test('partial monetary coverage sums only the one eligible channel', () => {
  const page = loadApp();
  page.app.state.demoScenario = 'partial_monetary';
  page.render();
  assert.equal(page.text('mgmt-stat-total-rev'), '$20.79');
  assert.match(page.text('mgmt-stat-revenue-note'), /Tổng một phần.*1\/15/);
});

test('legitimate zero revenue is displayed rather than treated as missing', () => {
  const page = loadApp();
  page.app.state.demoScenario = 'zero_revenue_positive_views';
  page.render();
  assert.ok(page.html('channel-cards-grid').includes('$0.00'));
  assert.ok(page.html('table-mgmt-channels-body').includes('$0.00'));
  assert.match(page.text('mgmt-stat-revenue-note'), /15\/15/);
});

test('team filter keeps cards and table on the same five-channel scope', () => {
  const page = loadApp();
  page.nodes.get('mgmt-filter-team').value = 'Jazz & Lo-fi';
  page.render();
  assert.equal((page.html('channel-cards-grid').match(/data-channel-id=/g) || []).length, 5);
  assert.equal((page.html('table-mgmt-channels-body').match(/<tr>/g) || []).length, 5);
});

test('shared demo links and explicit live links override saved display mode', () => {
  assert.equal(loadApp({ search: '?mode=demo', savedMode: 'live' }).app.state.viewMode, 'demo');
  assert.equal(loadApp({ search: '?mode=live', savedMode: 'demo' }).app.state.viewMode, 'live');
  assert.equal(loadApp({ search: '', savedMode: 'demo' }).app.state.viewMode, 'demo');
  assert.equal(loadApp({ search: '', savedMode: 'invalid' }).app.state.viewMode, 'live');
});
