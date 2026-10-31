/**
 * BgMedia YouTube Analytics Dashboard — V3 "One Question Per Page" Engine
 * Implements Phase 0-3 Normalized Architecture:
 * - Shared Global Scope Bar (MIN available_end, Snapshot/Analytics/Monetary counts)
 * - Shared Unified Time Filter (7d, 30d, Month, Quarter, Custom + Prev/YoY Gated Toggle)
 * - Fixed Team Palette: TEAM-01 (#38BDF8 Sky), TEAM-02 (#F59E0B Amber), TEAM-03 (#EC4899 Magenta)
 * - Semantic Delta ONLY: Positive (#10B981 Green + ▲), Negative (#EF4444 Red − ▼)
 * - Zero Decorative Emojis; Explicit Text Badges & RemixIcons
 */
(function () {
  'use strict';

  const TEAM_COLORS = {
    'TEAM-01': '#38BDF8', // Sky Blue — Jazz & Lo-fi
    'TEAM-02': '#F59E0B', // Amber — Retro & Electronic (No red clash)
    'TEAM-03': '#EC4899'  // Magenta — Indie & Chill (Distinct from Sky)
  };

  const COMPARE_LINE_COLORS = ['#38BDF8', '#F59E0B', '#EC4899', '#A855F7', '#14B8A6'];

  const FIXED_CHANNEL_PALETTE = [
    '#06B6D4', // 0: EMP-001 Nguyễn Văn An (Lunavia Vintage Melodies)
    '#38BDF8', // 1: EMP-002 Lê Minh Anh (Mellow Moon Lofi)
    '#A855F7', // 2: EMP-003 Phạm Hà Linh (Harbor Breeze Beats)
    '#6366F1', // 3: EMP-004 Đỗ Gia Huy (Velvet Espresso Jazz)
    '#F59E0B', // 4: EMP-005 Trần Ngọc Mai (Saigon Corner BGM)
    '#F97316', // 5: EMP-006 Trần Minh Bình (Cassette Horizon 84)
    '#14B8A6', // 6: EMP-007 Nguyễn Hoàng Nam (Aether Grid Synth)
    '#EAB308', // 7: EMP-008 Võ Thanh Tùng (Neon Mirage Wave)
    '#22C55E', // 8: EMP-009 Phan Bảo Ngọc (Arcade Midnight Club)
    '#8B5CF6', // 9: EMP-010 Đặng Quốc Bảo (Prism Pulse Audio)
    '#10B981', // 10: EMP-011 Hoàng Thảo Vy (Starlight Drift Music)
    '#EC4899', // 11: EMP-012 Trịnh Minh Khang (Cloudburst Coast Chill)
    '#F43F5E', // 12: EMP-013 Bùi Quỳnh Chi (Amber Campus Sessions)
    '#0EA5E9', // 13: EMP-014 Đinh Tuấn Kiệt (Pinewood Indie Folk)
    '#D946EF'  // 14: EMP-015 Dương Khánh An (Tidal Bloom Acoustic)
  ];

  const FIXED_EMPLOYEE_COLORS = {
    'EMP-001': '#06B6D4',
    'EMP-002': '#38BDF8',
    'EMP-003': '#A855F7',
    'EMP-004': '#6366F1',
    'EMP-005': '#F59E0B',
    'EMP-006': '#F97316',
    'EMP-007': '#14B8A6',
    'EMP-008': '#EAB308',
    'EMP-009': '#22C55E',
    'EMP-010': '#8B5CF6',
    'EMP-011': '#10B981',
    'EMP-012': '#EC4899',
    'EMP-013': '#F43F5E',
    'EMP-014': '#0EA5E9',
    'EMP-015': '#D946EF'
  };

  const FIXED_CHANNEL_COLORS = {
    'UCJhjE7wbdYAae1G25m0tHAA': '#06B6D4', // EMP-001 Nguyễn Văn An (Lunavia Vintage Melodies)
    'UCSJ4gkVC6NrvII8umztf0Ow': '#38BDF8', // EMP-002 Lê Minh Anh (Mellow Moon Lofi)
    'UCM9KEEuzacwVlkt9JfJad7g': '#6366F1'  // EMP-004 Đỗ Gia Huy (Velvet Espresso Jazz)
  };

  const PAGE_QUESTIONS = {
    'view-report-overview': { tag: 'Trang 1 · Tổng quan', question: 'Toàn công ty tháng này ổn không?' },
    'view-report-team': { tag: 'Trang 2 · Theo Team', question: 'Team nào đang tốt nhất, và vì sao?' },
    'view-report-channel': { tag: 'Trang 3 · Theo Kênh', question: 'Kênh này đang đi lên hay đi xuống?' },
    'view-report-staff': { tag: 'Trang 4 · Theo Nhân viên', question: 'Ai đang tăng, ai đang chậm?' },
    'view-report-project': { tag: 'Trang 5 · Theo Dự án', question: 'Dự án nội dung nào đang hiệu quả?' },
    'view-report-network': { tag: 'Trang 6 · Network MCN', question: 'Mạng lưới kênh đóng góp thế nào?' },
    'view-report-guide': { tag: 'Trang 7 · Từ điển & Quy chuẩn', question: 'Con số này nghĩa là gì, lấy từ đâu?' }
  };

  const v3State = {
    preset: '30d',          // '7d' | '30d' | 'month' | 'quarter' | 'custom'
    monthKey: '2026-10',    // '2026-10' | '2026-09' | '2026-08'
    quarterKey: '2026-Q4',  // '2026-Q4' | '2026-Q3' | '2026-Q2'
    startDate: '2026-09-27',
    endDate: '2026-10-26',
    compareMode: 'prev',    // 'prev' | 'yoy'
    overviewMetric: 'views',// 'views' | 'revenue' | 'watchHours' | 'netSubs'
    overviewPeriodTab: 'mom', // 'mom' | 'qoq'
    alertDropThreshold: Number(localStorage.getItem('bgmedia_alert_drop_pct')) || -10,
    alertUploadCycleDays: Number(localStorage.getItem('bgmedia_alert_upload_days')) || 7,
    alertShowAllDrops: false,
    alertShowAllSlow: false,
    alertShowAllPerm: false,
    // Page 2 (Team)
    selectedTeamId: 'TEAM-01',
    teamRankSortField: 'views', // 'views' | 'growth' | 'netSubs' | 'revenue' | 'channels'
    teamRankSortAsc: false,
    teamChartMetric: 'views',
    teamChartCustomPeriod: false, // false = "Theo kỳ chung", true = "Kỳ riêng"
    teamChartPreset: '30d',       // '7d' | '30d' | 'month' | 'quarter' | 'custom'
    teamChartMonthKey: '2026-10',
    teamChartQuarterKey: '2026-Q4',
    teamChartStartDate: '2026-09-27',
    teamChartEndDate: '2026-10-26',
    teamSingleMetric: 'views',    // 'views' | 'netSubs' | 'revenue'
    teamSingleCompareMode: 'prev',// 'prev' | 'prev_quarter' | 'yoy' | 'custom'
    teamSingleRefStartDate: '2026-08-28',
    teamSingleRefEndDate: '2026-09-26',
    teamSingleRefError: '',
    teamSingleUnequalMode: 'avg', // 'avg' | 'total'
    teamTableSort: 'growth',      // 'growth' | 'views'
    teamQuickPickerOpen: false,
    teamQuickPickerQuery: '',
    teamQuickPickerTeamFilter: 'ALL',
    // Page 3 (Channel)
    channelMode: 'single',  // 'single' | 'compare'
    selectedChannelId: 'UCSJ4gkVC6NrvII8umztf0Ow',
    channelChartMetric: 'views', // 'views' | 'netSubs' | 'videosPublished' | 'revenue'
    channelCompareMode: 'prev',  // 'prev' | 'prev_quarter' | 'yoy' | 'custom'
    channelRefStartDate: '2026-08-28',
    channelRefEndDate: '2026-09-26',
    channelRefError: '',
    channelUnequalMode: 'avg',   // 'avg' | 'total'
    channelPickerOpen: false,
    channelPickerQuery: '',
    channelPickerTeamFilter: 'ALL',
    channelDailyPanelOpen: false,
    channelSelectedDayIdx: null,
    channelSelectedDayIso: null,
    channelHoveredDayIdx: null,
    deepAnalyticsOpen: false,
    compareChannelIds: ['UCSJ4gkVC6NrvII8umztf0Ow', 'UCJhjE7wbdYAae1G25m0tHAA', 'UCM9KEEuzacwVlkt9JfJad7g'],
    compareChannelMetric: 'views',
    comparePickerOpen: false,
    comparePickerQuery: '',
    compareTeamFilter: 'ALL',    // 'ALL' | 'TEAM-01' | 'TEAM-02' | 'TEAM-03'
    compareSortField: 'views',   // 'views' | 'netSubs' | 'videosPublished' | 'engagementRate' | 'revenue'
    compareSortAsc: false,
    compareChartScale: 'actual', // 'actual' | 'index100' | 'log'
    // Page 4 (Staff)
    staffTab: 'ranking',            // 'ranking' ("Báo cáo NV theo số liệu") | 'compare' ("Báo cáo NV theo biểu đồ")
    staffSortField: 'views',        // 'views' | 'growth' | 'netSubs' | 'videos' | 'engagement' | 'revenue'
    staffSortAsc: false,
    staffTeamFilter: 'ALL',         // 'ALL' | 'TEAM-01' | 'TEAM-02' | 'TEAM-03'
    staffChartMetric: 'views',      // 'views' | 'netSubs' | 'revenue'
    staffChartScale: 'actual',      // 'actual' | 'index100'
    staffSelectedIds: ['EMP-005', 'EMP-012', 'EMP-011'], // Default top 3 by 30d views (max 5)
    staffClearedEmpty: false,
    staffPickerOpen: false,
    staffPickerQuery: '',
    staffPickerTeamFilter: 'ALL',   // 'ALL' | 'TEAM-01' | 'TEAM-02' | 'TEAM-03'
    _pickerListScrollTop: 0,
    staffShowTotalLine: true,
    staffShowPrevLine: true,        // Enabled only when selectedStaff.length === 1
    staffHiddenKeys: [],            // Dataset keys toggled off on legend ('EMP-xxx', 'TOTAL', 'PREV')
    staffChartCustomPeriod: false,  // false = theo kỳ chung, true = kỳ riêng
    staffChartPreset: '30d',        // '7d' | '30d' | 'month' | 'quarter' | 'custom'
    staffChartMonthKey: '2026-10',
    staffChartQuarterKey: '2026-Q4',
    staffChartStartDate: '2026-09-27',
    staffChartEndDate: '2026-10-26',
    // Page 5 (Project)
    projectConfigured: false,
    selectedProjectId: 'PRJ-01',
    // Page 6 (Network)
    mcnEnabled: localStorage.getItem('bgmedia_mcn_enabled') === 'true',
    // Page 7 (Guide)
    guideSearchQuery: ''
  };

  const chartInstances = {};

  function destroyChart(key) {
    if (chartInstances[key]) {
      try {
        const inst = chartInstances[key];
        if (inst.tooltip && typeof inst.tooltip.setActiveElements === 'function') {
          inst.tooltip.setActiveElements([], { x: 0, y: 0 });
        }
        if (typeof inst.setActiveElements === 'function') {
          inst.setActiveElements([]);
        }
        inst.destroy();
      } catch (e) { }
      delete chartInstances[key];
    }
  }

  function core() {
    return window.__BGMEDIA_CORE__ || {};
  }

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtInt(n) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
    const num = Math.round(Number(n));
    const sign = num < 0 ? '−' : '';
    return sign + new Intl.NumberFormat('vi-VN').format(Math.abs(num));
  }

  function fmtDec(n, digits = 2) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
    const num = Number(n);
    const sign = num < 0 ? '−' : '';
    return sign + new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(num));
  }

  function fmtCompact(n, keepTwoDecimalsForMillions = false) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
    const num = Number(n);
    const abs = Math.abs(num);
    const sign = num < 0 ? '−' : '';
    if (abs >= 1e9) {
      const s = (abs / 1e9).toFixed(2);
      return sign + (keepTwoDecimalsForMillions ? s : s.replace(/\.00$/, '')).replace('.', ',') + 'B';
    }
    if (abs >= 1e6) {
      const s = (abs / 1e6).toFixed(2);
      return sign + (keepTwoDecimalsForMillions ? s : s.replace(/\.00$/, '')).replace('.', ',') + 'M';
    }
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'K';
    return fmtInt(num);
  }

  function fmtMoney(usd, fxRateOverride) {
    if (usd === null || usd === undefined || Number.isNaN(Number(usd))) return '—';
    const c = core();
    const curr = (c.state && c.state.currency) || 'USD';
    const rate = fxRateOverride || (c.state && c.state.exchangeRate) || 25450;
    const num = Number(usd);
    const sign = num < 0 ? '−' : '';
    const abs = Math.abs(num);
    if (curr === 'VND') {
      return sign + new Intl.NumberFormat('vi-VN').format(Math.round(abs * rate)) + ' ₫';
    }
    return sign + '$' + new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
  }

  function fmtPct(pct, showPlus = true, digits = 1) {
    if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return '—';
    const v = Number(pct);
    const sign = (v > 0 && showPlus) ? '+' : (v < 0 ? '−' : '');
    return `${sign}${Math.abs(v).toFixed(digits).replace('.', ',')}%`;
  }

  function fmtDeltaBadge(currVal, prevVal, isCurrency = false, isPercentPoint = false) {
    if (currVal === null || currVal === undefined || prevVal === null || prevVal === undefined) {
      return `<span class="v3-delta flat">— Chưa đủ dữ liệu kỳ so sánh</span>`;
    }
    const diff = Number(currVal) - Number(prevVal);
    let pct = null;
    if (Number(prevVal) !== 0) {
      pct = (diff / Math.abs(Number(prevVal))) * 100;
    } else if (Number(currVal) === 0) {
      pct = 0;
    }
    // Neutral delta threshold: |Δ%| < 0,5% (or < 0,05 điểm % for percentage-point metrics)
    const isSmallChange = isPercentPoint
      ? Math.abs(diff) < 0.05
      : (pct !== null ? Math.abs(pct) < 0.5 : Math.abs(diff) < 0.0001);
    const cls = isSmallChange ? 'flat' : (diff > 0.0001 ? 'up' : (diff < -0.0001 ? 'down' : 'flat'));
    const arrow = diff > 0.0001 ? '▲' : (diff < -0.0001 ? '▼' : '•');
    const sign = diff > 0.0001 ? '+' : (diff < -0.0001 ? '−' : '');
    const absDiff = Math.abs(diff);
    let diffText = '';
    if (isCurrency) {
      diffText = `${sign}${fmtMoney(absDiff)}`;
    } else if (isPercentPoint) {
      diffText = `${sign}${absDiff.toFixed(2).replace('.', ',')} điểm %`;
    } else {
      diffText = `${sign}${fmtCompact(absDiff)}`;
    }
    const pctText = (pct !== null && !isPercentPoint) ? ` (${fmtPct(pct)})` : (pct !== null && isPercentPoint ? ` (${fmtPct(pct)})` : '');
    return `<span class="v3-delta ${cls}">${arrow} ${diffText}${pctText}</span>`;
  }

  function fmtPctBadge(pct) {
    if (pct === null || pct === undefined || Number.isNaN(Number(pct))) {
      return `<span class="v3-delta flat">—</span>`;
    }
    const v = Number(pct);
    const isSmall = Math.abs(v) < 0.5;
    const cls = isSmall ? 'flat' : (v > 0 ? 'up' : 'down');
    const arrow = v > 0.0001 ? '▲' : (v < -0.0001 ? '▼' : '•');
    return `<span class="v3-delta ${cls}">${arrow} ${fmtPct(v)}</span>`;
  }

  function helpBadge(guideAnchor, tooltipText) {
    return `<a href="#${guideAnchor}" class="v3-help-link" data-guide-link="${guideAnchor}" title="${esc(tooltipText)} (Nhấn để xem chi tiết tại trang Hướng dẫn)">?</a>`;
  }

  function formatIsoToVN(isoStr) {
    if (!isoStr) return '—';
    const parts = String(isoStr).slice(0, 10).split('-');
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function formatIsoToShortVN(isoStr) {
    if (!isoStr) return '—';
    const parts = String(isoStr).slice(0, 10).split('-');
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}`;
  }

  function formatIsoToWeekdayVN(isoStr) {
    if (!isoStr) return '';
    const parts = String(isoStr).slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
    const dow = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
    const names = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return names[dow] || '';
  }

  function shiftIsoDays(isoStr, deltaDays) {
    const [y, m, d] = isoStr.split('-').map(Number);
    const dtObj = new Date(Date.UTC(y, m - 1, d + deltaDays));
    return dtObj.toISOString().slice(0, 10);
  }

  function shiftIsoYear(isoStr, deltaYears) {
    const [y, m, d] = isoStr.split('-').map(Number);
    const dtObj = new Date(Date.UTC(y + deltaYears, m - 1, d));
    return dtObj.toISOString().slice(0, 10);
  }

  function shiftIsoMonths(isoStr, deltaMonths) {
    const [y, m, d] = isoStr.split('-').map(Number);
    const totalMonths = (y * 12 + (m - 1)) + deltaMonths;
    const ny = Math.floor(totalMonths / 12);
    const nm = ((totalMonths % 12) + 12) % 12;
    const maxDayInTarget = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
    const nd = Math.min(d, maxDayInTarget);
    const dtObj = new Date(Date.UTC(ny, nm, nd));
    return dtObj.toISOString().slice(0, 10);
  }

  function listIsoDays(startIso, endIso) {
    const out = [];
    let cur = startIso;
    let safety = 0;
    while (cur <= endIso && safety < 800) {
      out.push(cur);
      cur = shiftIsoDays(cur, 1);
      safety++;
    }
    return out;
  }

  // =========================================================================
  // UNIFIED PERIOD & SCENARIO DATA AGGREGATION ENGINE
  // =========================================================================
  function buildPeriodWindow(opts) {
    const preset = (opts && opts.preset) || v3State.preset;
    const monthKey = (opts && opts.monthKey) || v3State.monthKey;
    const quarterKey = (opts && opts.quarterKey) || v3State.quarterKey;
    let start = (opts && opts.startDate) || v3State.startDate;
    let end = (opts && opts.endDate) || v3State.endDate;
    const compareMode = (opts && opts.compareMode) || v3State.compareMode;

    let label = '30 ngày (27/09 – 26/10/2026)';
    let shortPresetName = '30 ngày';
    let isPartialPeriod = false;
    let isPartialQuarter = false;
    let quarterCalendarDays = 92;
    let totalCalendarDays = 30;

    if (preset === '7d') {
      start = '2026-10-20';
      end = '2026-10-26';
      totalCalendarDays = 7;
      shortPresetName = '7 ngày';
      label = '7 ngày (20/10 – 26/10/2026)';
    } else if (preset === '30d' || preset === '28d') {
      start = '2026-09-27';
      end = '2026-10-26';
      totalCalendarDays = 30;
      shortPresetName = '30 ngày';
      label = '30 ngày (27/09 – 26/10/2026)';
    } else if (preset === 'month') {
      if (monthKey === '2026-10') {
        start = '2026-10-01'; end = '2026-10-26'; isPartialPeriod = true;
        totalCalendarDays = 31;
        shortPresetName = 'Tháng 10/2026';
        label = 'Tháng 10/2026 (26/31 ngày · đến 26/10)';
      } else if (monthKey === '2026-09') {
        start = '2026-09-01'; end = '2026-09-30';
        totalCalendarDays = 30;
        shortPresetName = 'Tháng 09/2026';
        label = 'Tháng 09/2026 (30/30 ngày)';
      } else {
        start = '2026-08-01'; end = '2026-08-31';
        totalCalendarDays = 31;
        shortPresetName = 'Tháng 08/2026';
        label = 'Tháng 08/2026 (31/31 ngày)';
      }
    } else if (preset === 'quarter') {
      if (quarterKey === '2026-Q4') {
        start = '2026-10-01'; end = '2026-10-26';
        isPartialPeriod = true;
        isPartialQuarter = true;
        quarterCalendarDays = 92;
        totalCalendarDays = 92;
        shortPresetName = 'Quý 4/2026';
        label = 'Quý 4/2026 (Chưa trọn quý: 26/92 ngày · đến 26/10)';
      } else if (quarterKey === '2026-Q3') {
        start = '2026-07-01'; end = '2026-09-30';
        quarterCalendarDays = 92;
        totalCalendarDays = 92;
        shortPresetName = 'Quý 3/2026';
        label = 'Quý 3/2026 (92/92 ngày)';
      } else {
        start = '2026-04-01'; end = '2026-06-30';
        quarterCalendarDays = 91;
        totalCalendarDays = 91;
        shortPresetName = 'Quý 2/2026';
        label = 'Quý 2/2026 (91/91 ngày)';
      }
    } else {
      const customDays = listIsoDays(start, end).length;
      totalCalendarDays = customDays;
      shortPresetName = 'Tùy chỉnh';
      label = `Tùy chỉnh (${customDays} ngày: ${formatIsoToVN(start)} – ${formatIsoToVN(end)})`;
    }

    const days = listIsoDays(start, end);
    const dayCount = Math.max(1, days.length);

    let prevStart, prevEnd, compareLabel, compareModeName;
    if (compareMode === 'yoy') {
      prevStart = shiftIsoYear(start, -1);
      prevEnd = shiftIsoDays(prevStart, dayCount - 1);
      compareModeName = 'Cùng kỳ năm ngoái';
      compareLabel = `Cùng kỳ năm ngoái (${formatIsoToVN(prevStart)} – ${formatIsoToVN(prevEnd)})`;
    } else if (compareMode === 'prev_quarter' || (preset === 'quarter' && compareMode !== 'prev_exact')) {
      prevStart = shiftIsoMonths(start, -3);
      prevEnd = shiftIsoDays(prevStart, dayCount - 1);
      compareModeName = 'Quý trước';
      compareLabel = `Quý trước (${formatIsoToVN(prevStart)} – ${formatIsoToVN(prevEnd)})`;
    } else {
      prevEnd = shiftIsoDays(start, -1);
      prevStart = shiftIsoDays(prevEnd, -(dayCount - 1));
      compareModeName = 'Kỳ trước';
      compareLabel = `Kỳ liền trước (${formatIsoToVN(prevStart)} – ${formatIsoToVN(prevEnd)})`;
    }

    const compareRangeShort = compareMode === 'yoy'
      ? `${formatIsoToShortVN(prevStart)}/${prevStart.slice(2, 4)}–${formatIsoToShortVN(prevEnd)}/${prevEnd.slice(2, 4)}`
      : `${formatIsoToShortVN(prevStart)}–${formatIsoToShortVN(prevEnd)}`;
    const compareShortTag = `vs ${compareModeName} (${compareRangeShort})`;
    const compareTableColHeader = `So với ${compareModeName} (${compareRangeShort})`;

    return {
      preset,
      shortPresetName,
      start,
      end,
      dayCount,
      days,
      prevStart,
      prevEnd,
      prevDays: listIsoDays(prevStart, prevEnd),
      label,
      compareLabel,
      compareModeName,
      compareRangeShort,
      compareShortTag,
      compareTableColHeader,
      isPartialPeriod,
      isPartialQuarter,
      quarterCalendarDays,
      totalCalendarDays
    };
  }

  function getPeriodWindow() {
    return buildPeriodWindow();
  }

  function getActiveScenarioId() {
    const c = core();
    if (c.state && c.state.viewMode === 'live') return 'public_only';
    return (c.state && c.state.demoScenario) || 'all_demo_ready';
  }

  function getChannelMetadataList() {
    const c = core();
    const ds = c.DATA_STORE;
    const demo = c.DEMO_STORE;
    if (!ds || !ds.channels) return [];
    return ds.channels.map((ch, idx) => {
      const asg = ds.getAssignmentByChannel(ch.id);
      const emp = asg ? ds.getEmployee(asg.employee_id) : null;
      const team = emp ? ds.getTeam(emp.team_id) : null;
      const snapProfile = (demo && demo.getChannelSnapshotProfile) ? demo.getChannelSnapshotProfile(ch.id) : null;
      const avatar = (ch.snippet && ch.snippet.thumbnails && ch.snippet.thumbnails.medium && ch.snippet.thumbnails.medium.url) ||
        (ch.snippet && ch.snippet.thumbnails && ch.snippet.thumbnails.default && ch.snippet.thumbnails.default.url) || '';
      const rawVids = ds.videosByChannel.get(ch.id) || [];
      let lastPubIso = null;
      if (demo && demo.getDailyRows) {
        const rowsUpToCutoff = demo.getDailyRows(ch.id, '2025-01-01', '2026-10-26');
        for (let k = rowsUpToCutoff.length - 1; k >= 0; k--) {
          if ((rowsUpToCutoff[k].daily_videos_published || 0) > 0) {
            lastPubIso = rowsUpToCutoff[k].day;
            break;
          }
        }
      }
      if (!lastPubIso && snapProfile && snapProfile.last_video_published_pt && snapProfile.last_video_published_pt <= '2026-10-26') {
        lastPubIso = snapProfile.last_video_published_pt;
      }
      if (!lastPubIso && rawVids.length) {
        lastPubIso = rawVids.map(v => (v.published_at || '').slice(0, 10)).filter(d => d && d <= '2026-10-26').sort().slice(-1)[0];
      }
      const demoSubs = snapProfile ? snapProfile.subscriber_count_public : ((ch.statistics && ch.statistics.subscriberCount) || 0);
      const subStep = snapProfile ? snapProfile.sub_rounding_step : 1000;
      const lifetimeViews = (snapProfile && snapProfile.view_count_cumulative)
        ? Number(snapProfile.view_count_cumulative)
        : ((ch.statistics && Number(ch.statistics.viewCount)) || 0);
      const lifetimeVideos = (snapProfile && snapProfile.video_count_public)
        ? Number(snapProfile.video_count_public)
        : ((ch.statistics && Number(ch.statistics.videoCount)) || 0);
      const createdDatePt = (ch.snippet && ch.snippet.publishedAt)
        ? String(ch.snippet.publishedAt).slice(0, 10)
        : '2018-01-01';
      return {
        index: idx,
        id: ch.id,
        title: (ch.snippet && ch.snippet.title) || ch.title || ch.id,
        handle: (ch.snippet && ch.snippet.customUrl) || ch.requested_handle || `@${ch.id}`,
        avatar,
        teamId: team ? team.id : 'TEAM-01',
        teamName: team ? team.name : 'Chưa phân loại',
        teamColor: TEAM_COLORS[team ? team.id : 'TEAM-01'] || '#38BDF8',
        channelColor: (emp && FIXED_EMPLOYEE_COLORS[emp.id]) || FIXED_CHANNEL_COLORS[ch.id] || FIXED_CHANNEL_PALETTE[idx % FIXED_CHANNEL_PALETTE.length],
        employeeColor: (emp && FIXED_EMPLOYEE_COLORS[emp.id]) || FIXED_CHANNEL_COLORS[ch.id] || FIXED_CHANNEL_PALETTE[idx % FIXED_CHANNEL_PALETTE.length],
        employeeId: emp ? emp.id : `EMP-${String(idx + 1).padStart(3, '0')}`,
        employeeName: emp ? emp.full_name : 'Chưa phân công',
        employeeEmail: emp ? emp.email : '',
        subscribers: demoSubs,
        lifetimeViews,
        lifetimeVideos,
        createdDatePt,
        lifetimeSubscribersRaw: (ch.statistics && ch.statistics.subscriberCount) || 0,
        subRoundingStep: subStep,
        snapProfile,
        lastPublishedPt: lastPubIso || '2026-10-20',
        expectedUploadCycleDays: (snapProfile && snapProfile.expected_upload_cycle_days) || v3State.alertUploadCycleDays || 7,
        rawVideos: rawVids
      };
    });
  }

  /**
   * Computes single-source metrics for one channel over [startIso, endIso].
   * Never mixes Analytics and Public Snapshot within the same channel metric.
   */
  function computeChannelWindowMetrics(channelMeta, startIso, endIso, scenarioId) {
    const c = core();
    const demo = c.DEMO_STORE;
    const chId = channelMeta.id;
    const chState = (demo && demo.getChannelState)
      ? demo.getChannelState(chId, scenarioId)
      : { channel_id: chId, analytics_status: 'demo_ready', monetary_status: 'demo_ready', analytics_available_end: '2026-10-26', monetary_available_end: '2026-10-26' };

    const analyticsStatus = chState.analytics_status || 'not_connected';
    const monetaryStatus = chState.monetary_status || 'not_connected';
    const isAnalyticsReady = analyticsStatus === 'demo_ready';
    const isMonetaryReady = monetaryStatus === 'demo_ready';
    const availEnd = chState.analytics_available_end || '2026-10-26';
    const monEnd = chState.monetary_available_end || '2026-10-26';

    const rawRows = (demo && demo.getDailyRows) ? demo.getDailyRows(chId, startIso, endIso) : [];
    const last7dRows = (demo && demo.getDailyRows) ? demo.getDailyRows(chId, '2026-10-20', '2026-10-26') : [];

    // Item 11: Count videos published from channel-level daily_videos_published (NOT from 10 sample videos)
    const videosInPeriod = rawRows.reduce((sum, r) => {
      if (r.day <= '2026-10-26') {
        return sum + Number(r.daily_videos_published || 0);
      }
      return sum;
    }, 0);

    const videosLast7d = last7dRows.reduce((sum, r) => {
      if (r.day <= '2026-10-26') {
        return sum + Number(r.daily_videos_published || 0);
      }
      return sum;
    }, 0);

    // Item 3: Negative delta anomaly views strictly within the active period [startIso, endIso]
    const snapAnomalies = (channelMeta.snapProfile && Array.isArray(channelMeta.snapProfile.negative_anomalies))
      ? channelMeta.snapProfile.negative_anomalies.filter(a => {
        const d = (a.snapshot_date_pt || '').slice(0, 10);
        return d >= startIso && d <= endIso;
      })
      : [];
    const negativeAnomalyViews = snapAnomalies.reduce((sum, a) => sum + Number(a.raw_daily_views_delta || 0), 0);

    // Scenario overrides
    const scenarioObj = (demo && demo.getScenario) ? demo.getScenario(scenarioId) : null;
    const override = (scenarioObj && scenarioObj.metric_overrides)
      ? scenarioObj.metric_overrides.find(o => o.channel_id === chId)
      : null;

    // Case 1: Empty Report or Revoked -> Missing data ('—')
    if (analyticsStatus === 'no_rows' || analyticsStatus === 'revoked') {
      return {
        channelId: chId,
        meta: channelMeta,
        sourceMode: analyticsStatus, // 'no_rows' | 'revoked'
        hasAnalytics: false,
        hasMonetary: false,
        hasYoYHistory: false,
        analyticsStatus,
        monetaryStatus,
        availableEnd: null,
        monetaryAvailableEnd: null,
        views: null,
        viewsWithMonetary: 0,
        watchMinutes: null,
        watchHours: null,
        avdSeconds: null,
        likes: null,
        comments: null,
        shares: null,
        engagementRate: null,
        engagementIncludesShares: false,
        subsGained: null,
        subsLost: null,
        netSubs: null,
        subDeltaBelowStep: false,
        estimatedRevenue: null,
        proxyRpm: null,
        videosPublished: videosInPeriod,
        videosLast7d,
        negativeAnomalyViews,
        dailyMap: new Map()
      };
    }

    // Case 2: Public Only (Daily Snapshot from Data API v3, no Analytics OAuth)
    if (!isAnalyticsReady || analyticsStatus === 'not_connected') {
      let viewsSum = 0;
      let likesSum = 0;
      let commentsSum = 0;
      const dailyMap = new Map();
      rawRows.forEach(r => {
        if (r.day <= '2026-10-26') {
          const dV = r.views || 0;
          const dLk = r.likes || 0;
          const dCm = r.comments || 0;
          const dInt = dLk + dCm;
          viewsSum += dV;
          likesSum += dLk;
          commentsSum += dCm;
          dailyMap.set(r.day, {
            views: dV,
            watchHours: null,
            netSubs: null,
            subsGained: null,
            subsLost: null,
            likes: dLk,
            comments: dCm,
            shares: null,
            interactions: dInt,
            engagementRate: dV > 0 ? Number(((dInt / dV) * 100).toFixed(2)) : null,
            revenue: null,
            videosPublished: Number(r.daily_videos_published || 0)
          });
        }
      });
      const snap = channelMeta.snapProfile;
      const dayLen = listIsoDays(startIso, endIso).length;
      const pubSubDelta = snap ? (dayLen <= 7 ? snap.public_sub_delta_7d : snap.public_sub_delta_28d) : 0;
      const belowStep = snap ? (dayLen <= 7 ? snap.sub_delta_7d_below_step : snap.sub_delta_28d_below_step) : true;
      const engRate = viewsSum > 0 ? ((likesSum + commentsSum) / viewsSum) * 100 : null;

      return {
        channelId: chId,
        meta: channelMeta,
        sourceMode: 'snapshot_only',
        hasAnalytics: false,
        hasMonetary: false,
        hasYoYHistory: false, // Snapshot only accumulates from install date
        analyticsStatus: 'not_connected',
        monetaryStatus: 'not_connected',
        availableEnd: '2026-10-26',
        monetaryAvailableEnd: null,
        views: viewsSum,
        viewsWithMonetary: 0,
        watchMinutes: null,
        watchHours: null,
        avdSeconds: null,
        likes: likesSum,
        comments: commentsSum,
        shares: null, // Shares require Analytics API
        engagementRate: engRate,
        engagementIncludesShares: false,
        subsGained: null,
        subsLost: null,
        netSubs: belowStep ? null : pubSubDelta,
        subDeltaBelowStep: belowStep,
        estimatedRevenue: null,
        proxyRpm: null,
        videosPublished: videosInPeriod,
        videosLast7d,
        negativeAnomalyViews,
        dailyMap
      };
    }

    // Case 3: Analytics Connected (demo_ready)
    let viewsSum = 0;
    let viewsWithMon = 0;
    let minSum = 0;
    let likesSum = 0;
    let commentsSum = 0;
    let sharesSum = 0;
    let subsGained = 0;
    let subsLost = 0;
    let revCents = 0;
    let hasAnyMonDay = false;
    const dailyMap = new Map();

    rawRows.forEach(r => {
      if (availEnd && r.day > availEnd) return;
      let v = r.views || 0;
      let m = r.estimatedMinutesWatched || 0;
      let lk = r.likes || 0;
      let cm = r.comments || 0;
      let sh = r.shares || 0;
      let sg = r.subscribersGained || 0;
      let sl = r.subscribersLost || 0;
      let rev = r.estimatedRevenue;

      if (override && override.metrics) {
        const om = override.metrics;
        if (om.views === 0) { v = 0; m = 0; lk = 0; cm = 0; sh = 0; sg = 0; sl = 0; }
        if (om.estimatedRevenue === 0) { rev = 0; }
      }

      const dayHasMon = isMonetaryReady && (!monEnd || r.day <= monEnd) && rev !== null && rev !== undefined;
      viewsSum += v;
      minSum += m;
      likesSum += lk;
      commentsSum += cm;
      sharesSum += sh;
      subsGained += sg;
      subsLost += sl;
      if (dayHasMon) {
        hasAnyMonDay = true;
        viewsWithMon += v;
        revCents += Math.round(Number(rev) * 100);
      }

      const dInt = lk + cm + sh;
      dailyMap.set(r.day, {
        views: v,
        watchHours: Number((m / 60).toFixed(2)),
        netSubs: sg - sl,
        subsGained: sg,
        subsLost: sl,
        likes: lk,
        comments: cm,
        shares: sh,
        interactions: dInt,
        engagementRate: v > 0 ? Number(((dInt / v) * 100).toFixed(2)) : 0,
        revenue: dayHasMon ? Number(rev) : null,
        viewsWithMon: dayHasMon ? v : 0,
        videosPublished: Number(r.daily_videos_published || 0)
      });
    });

    const watchHours = Number((minSum / 60).toFixed(2));
    const avdSeconds = viewsSum > 0 ? Number(((minSum * 60) / viewsSum).toFixed(1)) : null;
    const engagementRate = viewsSum > 0 ? Number((((likesSum + commentsSum + sharesSum) / viewsSum) * 100).toFixed(2)) : null;
    const netSubs = subsGained - subsLost;
    const estimatedRevenue = hasAnyMonDay ? Number((revCents / 100).toFixed(2)) : null;
    const proxyRpm = (hasAnyMonDay && viewsWithMon > 0)
      ? Number(((estimatedRevenue / viewsWithMon) * 1000).toFixed(4))
      : null;

    return {
      channelId: chId,
      meta: channelMeta,
      sourceMode: 'analytics',
      hasAnalytics: true,
      hasMonetary: hasAnyMonDay,
      hasYoYHistory: true,
      analyticsStatus,
      monetaryStatus: hasAnyMonDay ? 'demo_ready' : monetaryStatus,
      availableEnd: availEnd,
      monetaryAvailableEnd: hasAnyMonDay ? monEnd : null,
      views: viewsSum,
      viewsWithMonetary: viewsWithMon,
      watchMinutes: minSum,
      watchHours,
      avdSeconds,
      likes: likesSum,
      comments: commentsSum,
      shares: sharesSum,
      engagementRate,
      engagementIncludesShares: true,
      subsGained,
      subsLost,
      netSubs,
      subDeltaBelowStep: false,
      estimatedRevenue,
      proxyRpm,
      videosPublished: videosInPeriod,
      videosLast7d,
      negativeAnomalyViews,
      dailyMap
    };
  }

  /**
   * Aggregates a list of channel window results into a single group (Team / System) result.
   * Respects MIN(available_end), m/N monetary coverage, and single RPM formula.
   */
  function aggregateChannelMetricsList(chResults, periodDaysList) {
    const totalChannels = chResults.length;
    const validViewChannels = chResults.filter(c => c.views !== null);
    const analyticsChannels = chResults.filter(c => c.hasAnalytics);
    const monetaryChannels = chResults.filter(c => c.hasMonetary);
    const yoyChannels = chResults.filter(c => c.hasYoYHistory);
    const activeUpload7dChannels = chResults.filter(c => c.videosLast7d > 0);

    // Effective available_end = MIN(available_end), NEVER MAX
    const availDates = chResults.map(c => c.availableEnd).filter(Boolean).sort();
    const monDates = monetaryChannels.map(c => c.monetaryAvailableEnd).filter(Boolean).sort();
    const allEndDates = [...availDates, ...monDates].filter(Boolean).sort();
    const minAvailableEnd = allEndDates.length ? allEndDates[0] : '2026-10-26';
    const maxAvailableEnd = allEndDates.length ? allEndDates[allEndDates.length - 1] : '2026-10-26';

    const hasAnyViews = validViewChannels.length > 0;
    const views = hasAnyViews ? validViewChannels.reduce((s, c) => s + (c.views || 0), 0) : null;
    const viewsWithMonetary = monetaryChannels.reduce((s, c) => s + (c.viewsWithMonetary || 0), 0);

    const hasAnyAnalytics = analyticsChannels.length > 0;
    const watchMinutes = hasAnyAnalytics ? analyticsChannels.reduce((s, c) => s + (c.watchMinutes || 0), 0) : null;
    const watchHours = watchMinutes !== null ? Number((watchMinutes / 60).toFixed(2)) : null;
    const analyticsViews = analyticsChannels.reduce((s, c) => s + (c.views || 0), 0);
    const avdSeconds = (watchMinutes !== null && analyticsViews > 0) ? Number(((watchMinutes * 60) / analyticsViews).toFixed(1)) : null;

    const likes = hasAnyViews ? validViewChannels.reduce((s, c) => s + (c.likes || 0), 0) : null;
    const comments = hasAnyViews ? validViewChannels.reduce((s, c) => s + (c.comments || 0), 0) : null;
    const shares = hasAnyAnalytics ? analyticsChannels.reduce((s, c) => s + (c.shares || 0), 0) : null;

    let engagementRate = null;
    const engagementIncludesShares = hasAnyAnalytics;
    if (views && views > 0) {
      const num = (likes || 0) + (comments || 0) + (hasAnyAnalytics ? (shares || 0) : 0);
      engagementRate = Number(((num / views) * 100).toFixed(2));
    }

    const validSubChannels = chResults.filter(c => c.netSubs !== null);
    const netSubs = validSubChannels.length > 0 ? validSubChannels.reduce((s, c) => s + (c.netSubs || 0), 0) : null;
    const allSubBelowStep = validSubChannels.length === 0 && chResults.some(c => c.subDeltaBelowStep);

    const hasAnyMonetary = monetaryChannels.length > 0;
    const revCents = hasAnyMonetary ? monetaryChannels.reduce((s, c) => s + Math.round((c.estimatedRevenue || 0) * 100), 0) : null;
    const estimatedRevenue = revCents !== null ? Number((revCents / 100).toFixed(2)) : null;
    const proxyRpm = (hasAnyMonetary && viewsWithMonetary > 0)
      ? Number(((estimatedRevenue / viewsWithMonetary) * 1000).toFixed(4))
      : null;

    const videosPublished = chResults.reduce((s, c) => s + (c.videosPublished || 0), 0);
    const videosLast7d = chResults.reduce((s, c) => s + (c.videosLast7d || 0), 0);
    const subscribersTotal = chResults.reduce((s, c) => s + (c.meta.subscribers || 0), 0);
    const negativeAnomalyViews = chResults.reduce((s, c) => s + (c.negativeAnomalyViews || 0), 0);

    // Build daily series across periodDaysList
    const dailySeries = (periodDaysList || []).map(dayIso => {
      let dViews = 0;
      let dWatchHours = 0;
      let dNetSubs = 0;
      let dRevCents = 0;
      let dHasRev = false;
      let dVideosPublished = 0;
      chResults.forEach(c => {
        const pt = c.dailyMap.get(dayIso);
        if (pt) {
          dViews += (pt.views || 0);
          dWatchHours += (pt.watchHours || 0);
          dNetSubs += (pt.netSubs || 0);
          dVideosPublished += (pt.videosPublished || 0);
          if (pt.revenue !== null && pt.revenue !== undefined) {
            dHasRev = true;
            dRevCents += Math.round(pt.revenue * 100);
          }
        }
      });
      return {
        day: dayIso,
        views: hasAnyViews ? dViews : null,
        watchHours: hasAnyAnalytics ? Number(dWatchHours.toFixed(2)) : null,
        netSubs: validSubChannels.length > 0 ? dNetSubs : null,
        revenue: dHasRev ? Number((dRevCents / 100).toFixed(2)) : null,
        videosPublished: dVideosPublished
      };
    });

    return {
      totalChannels,
      validViewCount: validViewChannels.length,
      analyticsCount: analyticsChannels.length,
      monetaryCount: monetaryChannels.length,
      yoyCount: yoyChannels.length,
      allHaveYoY: yoyChannels.length === totalChannels && totalChannels > 0,
      activeUpload7dCount: activeUpload7dChannels.length,
      minAvailableEnd,
      maxAvailableEnd,
      views,
      viewsWithMonetary,
      watchMinutes,
      watchHours,
      avdSeconds,
      likes,
      comments,
      shares,
      engagementRate,
      engagementIncludesShares,
      netSubs,
      allSubBelowStep,
      estimatedRevenue,
      proxyRpm,
      videosPublished,
      videosLast7d,
      subscribersTotal,
      negativeAnomalyViews,
      dailySeries
    };
  }

  function computeFullDatasetSnapshot() {
    const win = getPeriodWindow();
    const scenarioId = getActiveScenarioId();
    const channelsMeta = getChannelMetadataList();

    const currByChannel = channelsMeta.map(m => computeChannelWindowMetrics(m, win.start, win.end, scenarioId));
    const prevByChannel = channelsMeta.map(m => computeChannelWindowMetrics(m, win.prevStart, win.prevEnd, scenarioId));

    const prevMap = new Map();
    prevByChannel.forEach(p => prevMap.set(p.channelId, p));

    const channelPairs = currByChannel.map(curr => {
      const prev = prevMap.get(curr.channelId);
      const viewsGrowthPct = (curr.views !== null && prev && prev.views && prev.views > 0)
        ? Number((((curr.views - prev.views) / prev.views) * 100).toFixed(2))
        : null;
      const revGrowthPct = (curr.estimatedRevenue !== null && prev && prev.estimatedRevenue && prev.estimatedRevenue > 0)
        ? Number((((curr.estimatedRevenue - prev.estimatedRevenue) / prev.estimatedRevenue) * 100).toFixed(2))
        : null;
      const lastPubCutoff = curr.meta.lastPublishedPt && curr.meta.lastPublishedPt <= '2026-10-26'
        ? curr.meta.lastPublishedPt
        : '2026-10-26';
      const daysSinceLastUpload = Math.max(0, Math.round((new Date('2026-10-26T00:00:00Z') - new Date(lastPubCutoff + 'T00:00:00Z')) / 86400000));
      return {
        id: curr.channelId,
        meta: curr.meta,
        curr,
        prev,
        viewsGrowthPct,
        revGrowthPct,
        lastPublishedCutoff: lastPubCutoff,
        daysSinceLastUpload
      };
    });

    const systemCurr = aggregateChannelMetricsList(currByChannel, win.days);
    const systemPrev = aggregateChannelMetricsList(prevByChannel, win.prevDays);

    const c = core();
    const teamsRaw = (c.DATA_STORE && c.DATA_STORE.teams) || [];
    const teamPairs = teamsRaw.map(t => {
      const tCurrList = currByChannel.filter(ch => ch.meta.teamId === t.id);
      const tPrevList = prevByChannel.filter(ch => ch.meta.teamId === t.id);
      const tCurr = aggregateChannelMetricsList(tCurrList, win.days);
      const tPrev = aggregateChannelMetricsList(tPrevList, win.prevDays);
      const viewsGrowthPct = (tCurr.views !== null && tPrev.views && tPrev.views > 0)
        ? Number((((tCurr.views - tPrev.views) / tPrev.views) * 100).toFixed(2))
        : null;
      const shareOfCompanyViews = (systemCurr.views && systemCurr.views > 0 && tCurr.views !== null)
        ? Number(((tCurr.views / systemCurr.views) * 100).toFixed(1))
        : 0;
      return {
        id: t.id,
        name: t.name,
        leader: t.leader || '',
        color: TEAM_COLORS[t.id] || '#38BDF8',
        curr: tCurr,
        prev: tPrev,
        viewsGrowthPct,
        shareOfCompanyViews,
        channels: channelPairs.filter(cp => cp.meta.teamId === t.id)
      };
    });

    return {
      win,
      scenarioId,
      channelsMeta,
      channelPairs,
      systemCurr,
      systemPrev,
      teamPairs
    };
  }

  // =========================================================================
  // SHARED FLOATING SEARCHABLE PICKER COMPONENT (Page 2, Page 3, Page 4)
  // - Position: fixed (z-index: 9999) so it is never clipped by parent overflow
  //   and never occupies space in layout flow or shifts chart positions.
  // - Sticky search input + team filter bar at top; scrollable list (max 320px).
  // - Each row: checkbox, fixed color dot, name, team badge, period views.
  // - Multi-select up to 5: when 5 are selected, remaining rows dim & show "Tối đa 5".
  // - Closes on outside click or Escape key.
  // =========================================================================
  function positionFloatingPickerMenu(btnEl, menuEl) {
    if (!btnEl || !menuEl) return;
    const rect = btnEl.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 1440;
    const menuWidth = menuEl.offsetWidth || 520;
    const targetLeft = Math.max(12, Math.min(Math.round(rect.left), vw - menuWidth - 12));
    const targetTop = Math.round(rect.bottom + 6);

    menuEl.style.left = '0px';
    menuEl.style.top = '0px';
    const originRect = menuEl.getBoundingClientRect();
    menuEl.style.left = `${Math.round(targetLeft - originRect.left)}px`;
    menuEl.style.top = `${Math.round(targetTop - originRect.top)}px`;
  }

  function repositionOpenFloatingPickers() {
    document.querySelectorAll('.v3-ch-search-picker').forEach(wrap => {
      const btn = wrap.querySelector('.v3-ch-picker-btn');
      const menu = wrap.querySelector('.v3-ch-picker-menu.open');
      if (btn && menu) {
        positionFloatingPickerMenu(btn, menu);
      }
    });
  }

  function closeAllFloatingPickers(exceptWrapperId) {
    if (exceptWrapperId !== 'v3-channel-search-picker') v3State.channelPickerOpen = false;
    if (exceptWrapperId !== 'v3-compare-channel-picker') v3State.comparePickerOpen = false;
    if (exceptWrapperId !== 'v3-staff-multi-picker') v3State.staffPickerOpen = false;
    if (exceptWrapperId !== 'v3-team-channel-quick-picker') v3State.teamQuickPickerOpen = false;
    document.querySelectorAll('.v3-ch-search-picker').forEach(wrap => {
      if (exceptWrapperId && wrap.id === exceptWrapperId) return;
      const menu = wrap.querySelector('.v3-ch-picker-menu');
      const btn = wrap.querySelector('.v3-ch-picker-btn');
      if (menu) menu.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  function renderUnifiedFloatingPicker(cfg) {
    const selectedIds = Array.isArray(cfg.selectedIds) ? cfg.selectedIds : [];
    const maxSelect = cfg.maxSelect || 5;
    const isMulti = !!cfg.isMulti;
    const isMaxReached = isMulti && selectedIds.length >= maxSelect;
    const teamFilter = cfg.teamFilter || 'ALL';
    const searchQuery = cfg.searchQuery || '';

    return `
      <div class="v3-ch-search-picker" id="${cfg.wrapperId}">
        <button type="button"
                class="${cfg.btnClass || 'v3-ch-picker-btn'}"
                id="${cfg.btnId}"
                aria-haspopup="listbox"
                aria-expanded="${cfg.isOpen ? 'true' : 'false'}"
                title="${esc(cfg.btnTitle || '')}">
          ${cfg.triggerHtml}
        </button>

        <div class="v3-ch-picker-menu ${cfg.isOpen ? 'open' : ''}"
             id="${cfg.menuId}"
             role="listbox"
             aria-multiselectable="${isMulti ? 'true' : 'false'}">
          <div class="v3-ch-picker-search-wrap">
            <i class="ri-search-line"></i>
            <input type="text"
                   id="${cfg.searchId}"
                   placeholder="${esc(cfg.searchPlaceholder || 'Tìm kiếm...')}"
                   value="${esc(searchQuery)}"
                   autocomplete="off"
                   aria-label="${esc(cfg.searchPlaceholder || 'Tìm kiếm')}">
            <button type="button"
                    class="v3-picker-search-clear"
                    data-picker-clear-search="${cfg.searchId}"
                    title="Xóa từ khóa tìm kiếm"
                    style="display:${searchQuery ? 'inline-flex' : 'none'};">×</button>
          </div>

          <div class="v3-cmp-team-filter-bar" id="${cfg.teamBarId}">
            <button type="button" class="v3-cmp-team-chip ${teamFilter === 'ALL' ? 'active' : ''}" ${cfg.teamChipAttr}="ALL">Tất cả (15)</button>
            <button type="button" class="v3-cmp-team-chip ${teamFilter === 'TEAM-01' ? 'active' : ''}" ${cfg.teamChipAttr}="TEAM-01">Jazz &amp; Lo-fi (5)</button>
            <button type="button" class="v3-cmp-team-chip ${teamFilter === 'TEAM-02' ? 'active' : ''}" ${cfg.teamChipAttr}="TEAM-02">Retro &amp; Electronic (5)</button>
            <button type="button" class="v3-cmp-team-chip ${teamFilter === 'TEAM-03' ? 'active' : ''}" ${cfg.teamChipAttr}="TEAM-03">Indie &amp; Chill (5)</button>
            ${cfg.showTop3AndClear ? `
              <span class="v3-picker-actions-group">
                <button type="button" class="v3-cmp-team-chip v3-picker-act-btn" id="${cfg.top3BtnId}" data-picker-action="top3" title="Chọn nhanh Top 3 theo lượt xem trong kỳ">Chọn top 3</button>
                <button type="button" class="v3-cmp-team-chip v3-picker-act-btn is-clear" id="${cfg.clearBtnId}" data-picker-action="clear" title="Xóa chọn / đặt lại bộ lọc">Xóa</button>
              </span>
            ` : ''}
          </div>

          <div class="v3-ch-picker-list" id="${cfg.listId}">
            ${(cfg.items || []).map(item => {
              const isChecked = selectedIds.includes(item.id);
              const isMaxDisabled = isMaxReached && !isChecked;
              return `
                <div class="v3-ch-picker-item ${isChecked ? 'active' : ''} ${isMaxDisabled ? 'is-max-disabled' : ''}"
                     ${cfg.rowToggleAttr}="${esc(item.id)}"
                     ${cfg.rowTeamAttr}="${esc(item.teamId)}"
                     data-search-text="${esc(item.searchBlob)}"
                     data-max-disabled="${isMaxDisabled ? 'true' : 'false'}"
                     role="option"
                     aria-selected="${isChecked ? 'true' : 'false'}"
                     aria-disabled="${isMaxDisabled ? 'true' : 'false'}">
                  <span class="v3-cmp-check ${isChecked ? 'checked' : ''}">${isChecked ? '✓' : ''}</span>
                  <span class="v3-team-dot" style="background:${item.color};" data-picker-dot-color="${item.color}"></span>
                  <span class="v3-ch-picker-item-main">
                    <strong class="v3-picker-row-title">${esc(item.title)}${item.badgeHtml || ''}</strong>
                    <span class="v3-ch-picker-item-sub">${esc(item.subtitle || '')}</span>
                  </span>
                  <span class="v3-badge v3-picker-team-chip" style="background:${item.teamColor}18;color:${item.teamColor};border:1px solid ${item.teamColor}44;">
                    ${esc(item.teamName)}
                  </span>
                  <span class="v3-picker-views-col" data-picker-views="${item.views ?? 0}">
                    <strong>${item.views !== null && item.views !== undefined ? fmtInt(item.views) : '—'}</strong>
                    <small>views</small>
                  </span>
                  ${isMaxDisabled ? `
                    <span class="v3-picker-max-tag" data-max-tag="true">Tối đa ${maxSelect}</span>
                  ` : (item.onlyBtnHtml || '')}
                </div>
              `;
            }).join('')}
            <div id="${cfg.emptyId}" class="v3-picker-empty-msg" style="display:none;">
              ${esc(cfg.emptyText || 'Không tìm thấy kết quả phù hợp')}
            </div>
          </div>
        </div>
        ${cfg.extraHtml || ''}
      </div>
    `;
  }

  function bindUnifiedFloatingPicker(containerEl, cfg) {
    const wrapEl = document.getElementById(cfg.wrapperId);
    const btnEl = document.getElementById(cfg.btnId);
    const menuEl = document.getElementById(cfg.menuId);
    const searchEl = document.getElementById(cfg.searchId);
    const listEl = document.getElementById(cfg.listId);
    const emptyEl = document.getElementById(cfg.emptyId);
    const clearSearchBtn = wrapEl ? wrapEl.querySelector(`[data-picker-clear-search="${cfg.searchId}"]`) : null;
    if (!wrapEl || !btnEl || !menuEl) return;

    const filterDom = () => {
      const q = String(cfg.getSearchQuery() || '').trim().toLowerCase();
      const tf = cfg.getTeamFilter() || 'ALL';
      let visibleCount = 0;
      menuEl.querySelectorAll(`[${cfg.rowToggleAttr}]`).forEach(el => {
        const blob = el.getAttribute('data-search-text') || '';
        const tid = el.getAttribute(cfg.rowTeamAttr) || '';
        const matchQ = !q || blob.includes(q);
        const matchT = tf === 'ALL' || tid === tf;
        const show = matchQ && matchT;
        el.style.display = show ? 'flex' : 'none';
        if (show) visibleCount++;
      });
      if (emptyEl) emptyEl.style.display = visibleCount === 0 ? 'block' : 'none';
      if (clearSearchBtn) clearSearchBtn.style.display = q ? 'inline-flex' : 'none';
    };

    filterDom();

    if (cfg.getOpenState()) {
      positionFloatingPickerMenu(btnEl, menuEl);
      if (listEl && v3State._pickerListScrollTop) {
        listEl.scrollTop = v3State._pickerListScrollTop;
      }
    }

    btnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextOpen = !cfg.getOpenState();
      if (nextOpen) {
        closeAllFloatingPickers(cfg.wrapperId);
      }
      cfg.setOpenState(nextOpen);
      menuEl.classList.toggle('open', nextOpen);
      btnEl.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      if (nextOpen) {
        positionFloatingPickerMenu(btnEl, menuEl);
        filterDom();
        if (searchEl) {
          setTimeout(() => searchEl.focus({ preventScroll: true }), 15);
        }
      }
    });

    menuEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        cfg.setSearchQuery(e.target.value);
        filterDom();
      });
      searchEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeAllFloatingPickers();
        }
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cfg.setSearchQuery('');
        if (searchEl) {
          searchEl.value = '';
          searchEl.focus({ preventScroll: true });
        }
        filterDom();
      });
    }

    menuEl.querySelectorAll(`[${cfg.teamChipAttr}]`).forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextTeam = chip.getAttribute(cfg.teamChipAttr) || 'ALL';
        cfg.setTeamFilter(nextTeam);
        menuEl.querySelectorAll(`[${cfg.teamChipAttr}]`).forEach(c => {
          c.classList.toggle('active', c.getAttribute(cfg.teamChipAttr) === nextTeam);
        });
        filterDom();
      });
    });

    if (cfg.top3BtnId && typeof cfg.onSelectTop3 === 'function') {
      document.getElementById(cfg.top3BtnId)?.addEventListener('click', (e) => {
        e.stopPropagation();
        v3State._pickerListScrollTop = listEl ? listEl.scrollTop : 0;
        cfg.onSelectTop3();
      });
    }

    if (cfg.clearBtnId && typeof cfg.onClear === 'function') {
      document.getElementById(cfg.clearBtnId)?.addEventListener('click', (e) => {
        e.stopPropagation();
        v3State._pickerListScrollTop = 0;
        cfg.onClear();
      });
    }

    menuEl.querySelectorAll(`[${cfg.rowToggleAttr}]`).forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-stf-only-id]')) return;
        e.stopPropagation();
        const itemId = row.getAttribute(cfg.rowToggleAttr);
        if (!itemId) return;
        v3State._pickerListScrollTop = listEl ? listEl.scrollTop : 0;
        cfg.onRowClick(itemId, row);
      });
    });
  }

  // =========================================================================
  // SHARED HEADER: GLOBAL SCOPE BAR & UNIFIED TIME FILTER
  // =========================================================================
  function renderSharedHeader(snap, activeViewId) {
    const headerEl = document.getElementById('v3-shared-report-header');
    if (!headerEl) return;

    // Item 1 & Page 3 Item 2: Hide topbar "Kênh đang xem" picker on all report pages (including view-report-channel)
    // so Page 3 only has ONE channel selector inside the Channel Identity Block.
    const pickerWrap = document.getElementById('channel-picker-wrapper');
    if (pickerWrap) {
      pickerWrap.style.display = (activeViewId && activeViewId.startsWith('view-report-')) ? 'none' : 'block';
    }
    // Item 3: Keep "Dữ Liệu Thật / Xem Minh Họa" mode switcher visible in the top-right header
    const modeSwitcher = document.getElementById('mode-switcher-container');
    if (modeSwitcher) {
      modeSwitcher.style.display = 'flex';
    }

    // Sync topbar active channel title/avatar to selectedChannelId so no DOM node holds stale channel names
    if (snap && snap.channelPairs) {
      const activeCp = snap.channelPairs.find(c => c.id === v3State.selectedChannelId) || snap.channelPairs[0];
      if (activeCp) {
        const topTitle = document.getElementById('topbar-active-title');
        if (topTitle) topTitle.textContent = activeCp.meta.title;
        const topAvatar = document.getElementById('topbar-active-avatar');
        if (topAvatar && activeCp.meta.avatar) topAvatar.src = activeCp.meta.avatar;
      }
    }

    // Item 4: Remove duplicate USD button and redundant data-source badge from topbar
    const topCurrToggle = document.getElementById('currency-toggle');
    if (topCurrToggle) topCurrToggle.style.display = 'none';
    const topDsBadge = document.getElementById('data-source-badge');
    if (topDsBadge) topDsBadge.style.display = 'none';

    // Hide legacy duplicate demo banner when v3 Unified Scope Bar is active
    const legacyBanner = document.getElementById('demo-mode-banner');
    if (legacyBanner) legacyBanner.style.display = 'none';

    if (!activeViewId || !activeViewId.startsWith('view-report-') || activeViewId === 'view-report-guide') {
      headerEl.style.display = 'none';
      return;
    }
    headerEl.style.display = 'flex';

    // Determine active scope channels (omit redundant scope label on compact header pages Page 2, Page 3 & Page 4 so USD/VND & Xuất never clip)
    const isCompactHeaderPage = (
      activeViewId === 'view-report-team' ||
      activeViewId === 'view-report-channel' ||
      activeViewId === 'view-report-staff'
    );
    let scopeLabel = isCompactHeaderPage ? '' : '3 Team · 15 kênh';
    let scopeCurr = snap.systemCurr;

    // If YoY is selected but not all channels in scope have YoY history, auto-fallback to 'prev'
    if (v3State.compareMode === 'yoy' && !scopeCurr.allHaveYoY) {
      v3State.compareMode = 'prev';
    }

    const availText = scopeCurr.minAvailableEnd === scopeCurr.maxAvailableEnd
      ? `Dữ liệu đến hết: <strong>${formatIsoToVN(scopeCurr.minAvailableEnd)} (PT)</strong>`
      : `Dữ liệu đến hết: <strong>${formatIsoToVN(scopeCurr.minAvailableEnd)} (PT)</strong> <span style="color:var(--text-dim);">(mới nhất: ${formatIsoToVN(scopeCurr.maxAvailableEnd)})</span>`;

    const c = core();
    const currCode = (c.state && c.state.currency) || 'USD';
    const isDemoMode = !c.state || c.state.viewMode !== 'live';

    headerEl.innerHTML = `
      ${isDemoMode ? `
        <div class="v3-demo-bar">
          <div class="v3-demo-left">
            <span class="v3-demo-badge"><i class="ri-sparkling-fill"></i> DEMO</span>
            <span class="v3-demo-text">Chế độ Xem minh họa (666 ngày × 15 kênh · Pacific Time)</span>
          </div>
          <div class="v3-demo-right">
            <label for="v3-header-scenario-select" class="v3-demo-label"><i class="ri-flask-line"></i> Kịch bản:</label>
            <select id="v3-header-scenario-select" class="v3-select v3-select-sm" title="Chọn kịch bản dữ liệu để kiểm thử trạng thái">
              <option value="all_demo_ready" ${snap.scenarioId === 'all_demo_ready' ? 'selected' : ''}>Đủ 15/15 kênh (Analytics + Tiền)</option>
              <option value="public_only" ${snap.scenarioId === 'public_only' ? 'selected' : ''}>Chỉ Snapshot công khai (0/15 Analytics)</option>
              <option value="partial_monetary" ${snap.scenarioId === 'partial_monetary' ? 'selected' : ''}>Tiền 1 phần (1/15 kênh có tiền)</option>
              <option value="analytics_without_monetary" ${snap.scenarioId === 'analytics_without_monetary' ? 'selected' : ''}>Có Analytics, thiếu quyền tiền (0/15 tiền)</option>
              <option value="delayed_monetary" ${snap.scenarioId === 'delayed_monetary' ? 'selected' : ''}>Doanh thu trễ 2 ngày (đến 24/10)</option>
              <option value="revoked" ${snap.scenarioId === 'revoked' ? 'selected' : ''}>1 kênh bị thu hồi token OAuth</option>
              <option value="zero_revenue_positive_views" ${snap.scenarioId === 'zero_revenue_positive_views' ? 'selected' : ''}>Doanh thu $0 hợp lệ</option>
              <option value="zero_denominator" ${snap.scenarioId === 'zero_denominator' ? 'selected' : ''}>Kênh 0 views (Mẫu số = 0)</option>
              <option value="empty_report" ${snap.scenarioId === 'empty_report' ? 'selected' : ''}>API không trả hàng (—)</option>
            </select>
          </div>
        </div>
      ` : ''}

      <div class="v3-scope-bar">
        <div class="v3-scope-row-1">
          <div class="v3-scope-left">
            <span class="v3-scope-brand"><i class="ri-bar-chart-box-line" style="color:#38BDF8;"></i> BgMedia Analytics</span>
            ${scopeLabel ? `
              <span class="v3-scope-sep">·</span>
              <span class="v3-scope-text"><strong>${esc(scopeLabel)}</strong></span>
            ` : ''}
            <span class="v3-scope-sep">·</span>
            <span class="v3-scope-text">${availText} ${helpBadge('guide-timezone', 'Múi giờ báo cáo chuẩn Pacific Time (PT), đồng bộ với YouTube Analytics (trễ 48–72h)')}</span>
          </div>
          <div class="v3-scope-right">
            ${isCompactHeaderPage ? `
              <div class="v3-compact-period-bar" id="v3-compact-global-period">
                <div class="v3-preset-group" role="group" aria-label="Bộ chọn kỳ chung">
                  <button type="button" class="v3-preset-btn ${v3State.preset === '7d' ? 'active' : ''}" data-v3-preset="7d">7 ngày</button>
                  <button type="button" class="v3-preset-btn ${(v3State.preset === '30d' || v3State.preset === '28d') ? 'active' : ''}" data-v3-preset="30d">30 ngày</button>
                  <button type="button" class="v3-preset-btn ${v3State.preset === 'month' ? 'active' : ''}" data-v3-preset="month">Tháng</button>
                  <button type="button" class="v3-preset-btn ${v3State.preset === 'quarter' ? 'active' : ''}" data-v3-preset="quarter">Quý</button>
                  <button type="button" class="v3-preset-btn ${v3State.preset === 'custom' ? 'active' : ''}" data-v3-preset="custom">Tùy chỉnh</button>
                </div>
                <div class="v3-global-period-slot" id="v3-global-period-slot">
                  ${v3State.preset === 'month' ? `
                    <select id="v3-month-select" class="v3-select v3-select-sm v3-global-slot-control">
                      <option value="2026-10" ${v3State.monthKey === '2026-10' ? 'selected' : ''}>Tháng 10/2026 (26/31 ngày)</option>
                      <option value="2026-09" ${v3State.monthKey === '2026-09' ? 'selected' : ''}>Tháng 09/2026 (30 ngày)</option>
                      <option value="2026-08" ${v3State.monthKey === '2026-08' ? 'selected' : ''}>Tháng 08/2026 (31 ngày)</option>
                    </select>
                  ` : v3State.preset === 'quarter' ? `
                    <select id="v3-quarter-select" class="v3-select v3-select-sm v3-global-slot-control">
                      <option value="2026-Q4" ${v3State.quarterKey === '2026-Q4' ? 'selected' : ''}>Quý 4/2026 (26/92 ngày)</option>
                      <option value="2026-Q3" ${v3State.quarterKey === '2026-Q3' ? 'selected' : ''}>Quý 3/2026 (92 ngày)</option>
                      <option value="2026-Q2" ${v3State.quarterKey === '2026-Q2' ? 'selected' : ''}>Quý 2/2026 (91 ngày)</option>
                    </select>
                  ` : v3State.preset === 'custom' ? `
                    <div class="v3-date-inputs-wrap v3-global-custom-dates">
                      <input type="date" id="v3-custom-start" class="v3-select v3-select-sm" value="${snap.win.start}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày">
                      <span style="color:var(--text-dim);font-size:10.5px;">→</span>
                      <input type="date" id="v3-custom-end" class="v3-select v3-select-sm" value="${snap.win.end}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày">
                    </div>
                  ` : `
                    <span class="v3-select v3-select-sm v3-global-slot-control" style="display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-mono);color:var(--text-muted);cursor:default;" title="Khoảng ngày của kỳ đang chọn">${formatIsoToShortVN(snap.win.start)}–${formatIsoToVN(snap.win.end)}</span>
                  `}
                </div>
                <button type="button" class="v3-btn primary v3-btn-sm" id="v3-btn-apply-custom">Áp dụng</button>
              </div>
            ` : ''}
            <div class="v3-preset-group" role="group" aria-label="Đơn vị tiền tệ">
              <button type="button" class="v3-preset-btn ${currCode === 'USD' ? 'active' : ''}" data-v3-curr="USD" title="Hiển thị USD ($)">USD</button>
              <button type="button" class="v3-preset-btn ${currCode === 'VND' ? 'active' : ''}" data-v3-curr="VND" title="Hiển thị VND (₫)">VND</button>
            </div>
            <div class="v3-export-dropdown" id="v3-export-dropdown">
              <button type="button" class="v3-btn" id="v3-btn-export-menu" aria-haspopup="true" aria-expanded="false">
                <i class="ri-download-2-line"></i> Xuất <i class="ri-arrow-down-s-line"></i>
              </button>
              <div class="v3-export-menu" id="v3-export-menu-list">
                <button type="button" class="v3-export-item" id="v3-btn-export-csv">
                  <i class="ri-file-excel-2-line" style="color:#10B981;"></i> Xuất Excel / CSV
                </button>
                <button type="button" class="v3-export-item" id="v3-btn-export-pdf">
                  <i class="ri-file-pdf-2-line" style="color:#F59E0B;"></i> Xuất PDF (In báo cáo)
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="v3-scope-row-2">
          <div class="v3-scope-chip" title="Snapshot công khai hằng ngày từ YouTube Data API v3">
            <i class="ri-database-2-line"></i>
            <span>Snapshot công khai: <strong>${snap.systemCurr.validViewCount}/15 kênh</strong></span>
          </div>
          <div class="v3-scope-chip analytics-tag" title="Số kênh đã kết nối OAuth YouTube Analytics API v2">
            <i class="ri-line-chart-line"></i>
            <span>Analytics OAuth: <strong>${snap.systemCurr.analyticsCount}/15 kênh</strong></span>
          </div>
          <div class="v3-scope-chip monetary-tag" title="Số kênh có quyền xem doanh thu ước tính (yt-analytics-monetary.readonly)">
            <i class="ri-money-dollar-circle-line"></i>
            <span>Doanh thu (Monetary): <strong>${snap.systemCurr.monetaryCount}/15 kênh</strong></span>
          </div>
        </div>
      </div>

      ${!isCompactHeaderPage ? `
        <div class="v3-time-filter-bar">
          <div class="v3-filter-left">
            <div class="v3-preset-group" role="group" aria-label="Bộ lọc thời gian duy nhất">
              <button type="button" class="v3-preset-btn ${v3State.preset === '7d' ? 'active' : ''}" data-v3-preset="7d">7 ngày</button>
              <button type="button" class="v3-preset-btn ${(v3State.preset === '30d' || v3State.preset === '28d') ? 'active' : ''}" data-v3-preset="30d">30 ngày</button>
              <button type="button" class="v3-preset-btn ${v3State.preset === 'month' ? 'active' : ''}" data-v3-preset="month">Tháng</button>
              <button type="button" class="v3-preset-btn ${v3State.preset === 'quarter' ? 'active' : ''}" data-v3-preset="quarter">Quý</button>
              <button type="button" class="v3-preset-btn ${v3State.preset === 'custom' ? 'active' : ''}" data-v3-preset="custom">Tùy chỉnh</button>
            </div>

            ${v3State.preset === 'month' ? `
              <select id="v3-month-select" class="v3-select v3-select-sm">
                <option value="2026-10" ${v3State.monthKey === '2026-10' ? 'selected' : ''}>Tháng 10/2026 (26/31 ngày)</option>
                <option value="2026-09" ${v3State.monthKey === '2026-09' ? 'selected' : ''}>Tháng 09/2026 (30 ngày)</option>
                <option value="2026-08" ${v3State.monthKey === '2026-08' ? 'selected' : ''}>Tháng 08/2026 (31 ngày)</option>
              </select>
            ` : ''}

            ${v3State.preset === 'quarter' ? `
              <select id="v3-quarter-select" class="v3-select v3-select-sm">
                <option value="2026-Q4" ${v3State.quarterKey === '2026-Q4' ? 'selected' : ''}>Quý 4/2026 (26/92 ngày)</option>
                <option value="2026-Q3" ${v3State.quarterKey === '2026-Q3' ? 'selected' : ''}>Quý 3/2026 (92 ngày)</option>
                <option value="2026-Q2" ${v3State.quarterKey === '2026-Q2' ? 'selected' : ''}>Quý 2/2026 (91 ngày)</option>
              </select>
            ` : ''}

            <div class="v3-date-inputs-wrap">
              <input type="date" id="v3-custom-start" class="v3-select v3-select-sm" value="${snap.win.start}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày">
              <span style="color:var(--text-dim);font-size:11px;">→</span>
              <input type="date" id="v3-custom-end" class="v3-select v3-select-sm" value="${snap.win.end}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày">
              <button type="button" class="v3-btn primary v3-btn-sm" id="v3-btn-apply-custom">Áp dụng</button>
            </div>
          </div>

          <div class="v3-filter-right">
            <div class="v3-preset-group" role="group" aria-label="Chế độ đối chiếu kỳ">
              <button type="button" class="v3-preset-btn ${v3State.compareMode === 'prev' ? 'active' : ''}" data-v3-compare="prev" title="${esc(snap.win.compareLabel)}">
                So sánh kỳ trước
              </button>
              <button type="button" class="v3-preset-btn ${v3State.compareMode === 'yoy' ? 'active' : ''}" data-v3-compare="yoy"
                ${!scopeCurr.allHaveYoY ? 'disabled' : ''}
                title="${scopeCurr.allHaveYoY ? 'Đối chiếu với cùng kỳ năm ngoái (YoY)' : `Khóa YoY: Cần 100% kênh trong phạm vi có lịch sử năm trước (hiện có ${scopeCurr.yoyCount}/${scopeCurr.totalChannels} kênh)`}">
                ${!scopeCurr.allHaveYoY ? '<i class="ri-lock-line"></i> ' : ''}Cùng kỳ năm ngoái
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    // Bind Shared Header Events
    headerEl.querySelectorAll('[data-v3-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextPreset = btn.getAttribute('data-v3-preset');
        v3State.preset = nextPreset;
        v3State.channelRefError = '';
        v3State.teamSingleRefError = '';
        if (nextPreset === '7d') {
          v3State.startDate = '2026-10-20';
          v3State.endDate = '2026-10-26';
          if (v3State.channelCompareMode === 'prev_quarter') v3State.channelCompareMode = 'prev';
          if (v3State.teamSingleCompareMode === 'prev_quarter') v3State.teamSingleCompareMode = 'prev';
        } else if (nextPreset === '30d') {
          v3State.startDate = '2026-09-27';
          v3State.endDate = '2026-10-26';
          if (v3State.channelCompareMode === 'prev_quarter') v3State.channelCompareMode = 'prev';
          if (v3State.teamSingleCompareMode === 'prev_quarter') v3State.teamSingleCompareMode = 'prev';
        } else if (nextPreset === 'month') {
          if (v3State.channelCompareMode === 'prev_quarter') v3State.channelCompareMode = 'prev';
          if (v3State.teamSingleCompareMode === 'prev_quarter') v3State.teamSingleCompareMode = 'prev';
        } else if (nextPreset === 'quarter') {
          if (v3State.teamSingleCompareMode === 'prev') v3State.teamSingleCompareMode = 'prev_quarter';
          if (v3State.channelCompareMode === 'prev') v3State.channelCompareMode = 'prev_quarter';
        }
        refreshActiveView();
      });
    });

    headerEl.querySelectorAll('[data-v3-compare]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        v3State.compareMode = btn.getAttribute('data-v3-compare');
        refreshActiveView();
      });
    });

    const mSel = document.getElementById('v3-month-select');
    if (mSel) {
      mSel.addEventListener('change', () => {
        v3State.monthKey = mSel.value;
        refreshActiveView();
      });
    }

    const qSel = document.getElementById('v3-quarter-select');
    if (qSel) {
      qSel.addEventListener('change', () => {
        v3State.quarterKey = qSel.value;
        refreshActiveView();
      });
    }

    const btnCustom = document.getElementById('v3-btn-apply-custom');
    if (btnCustom) {
      btnCustom.addEventListener('click', () => {
        const s = document.getElementById('v3-custom-start')?.value;
        const e = document.getElementById('v3-custom-end')?.value;
        if (s && e && s <= e) {
          v3State.preset = 'custom';
          v3State.startDate = s;
          v3State.endDate = e;
          refreshActiveView();
        } else if (c.showToast) {
          c.showToast('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
        }
      });
    }

    const scSel = document.getElementById('v3-header-scenario-select');
    if (scSel) {
      scSel.addEventListener('change', () => {
        if (c.state) {
          c.state.viewMode = 'demo';
          c.state.demoScenario = scSel.value;
        }
        const topSel = document.getElementById('demo-scenario-select');
        if (topSel) topSel.value = scSel.value;
        refreshActiveView();
      });
    }

    headerEl.querySelectorAll('[data-v3-curr]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetCurr = btn.getAttribute('data-v3-curr');
        if (c.state && targetCurr) {
          c.state.currency = targetCurr;
          document.querySelectorAll('#currency-toggle .curr-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-currency') === c.state.currency);
          });
        }
        refreshActiveView();
      });
    });

    const exportMenuBtn = document.getElementById('v3-btn-export-menu');
    const exportDropdown = document.getElementById('v3-export-dropdown');
    if (exportMenuBtn && exportDropdown) {
      exportMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => {
        exportDropdown.classList.remove('open');
      }, { once: true });
    }

    const btnCsv = document.getElementById('v3-btn-export-csv');
    if (btnCsv) {
      btnCsv.addEventListener('click', () => {
        if (exportDropdown) exportDropdown.classList.remove('open');
        exportActiveViewCsv(snap, activeViewId);
      });
    }

    const btnPdf = document.getElementById('v3-btn-export-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => {
        if (exportDropdown) exportDropdown.classList.remove('open');
        window.print();
      });
    }

    bindHelpLinks(headerEl);
  }

  // =========================================================================
  // PAGE 1: BÁO CÁO TỔNG QUAN (#view-report-overview)
  // Question: "Toàn công ty tháng này ổn không?"
  // =========================================================================
  function computeSystemPeriodRow(channelsMeta, scenarioId, periodKey, startIso, endIso, totalCalendarDays, isComplete) {
    const chList = channelsMeta.map(m => computeChannelWindowMetrics(m, startIso, endIso, scenarioId));
    const agg = aggregateChannelMetricsList(chList, listIsoDays(startIso, endIso));
    const coveredDays = listIsoDays(startIso, endIso).length;
    const avgDailyViews = (agg.views !== null && coveredDays > 0) ? (agg.views / coveredDays) : null;
    return {
      periodKey,
      startIso,
      endIso,
      coveredDays,
      totalCalendarDays,
      isComplete,
      views: agg.views,
      avgDailyViews,
      netSubs: agg.netSubs,
      watchHours: agg.watchHours,
      estimatedRevenue: agg.estimatedRevenue
    };
  }

  function renderOverviewPage(snap) {
    const root = document.getElementById('v3-overview-root');
    if (!root) return;

    const curr = snap.systemCurr;
    const prev = snap.systemPrev;
    const c = core();

    // Item 13: Only show coverage chip on KPI card when coverage is incomplete (< 15/15)
    const viewChip = curr.validViewCount < curr.totalChannels
      ? `<span class="v3-badge partial">[${curr.validViewCount}/${curr.totalChannels} kênh]</span>`
      : '';
    const subChip = curr.analyticsCount === 0
      ? `<span class="v3-badge muted">[Snapshot]</span>`
      : (curr.analyticsCount < curr.totalChannels ? `<span class="v3-badge partial">[${curr.analyticsCount}/${curr.totalChannels} kênh]</span>` : '');
    const engChip = !curr.engagementIncludesShares
      ? `<span class="v3-badge muted">[Likes+Comments]</span>`
      : (curr.analyticsCount < curr.totalChannels ? `<span class="v3-badge partial">[${curr.analyticsCount}/${curr.totalChannels} kênh]</span>` : '');

    // 5th KPI adapts when 0/15 channels have Analytics
    let kpi5Html = '';
    if (curr.analyticsCount > 0) {
      const monChip = curr.monetaryCount < curr.totalChannels
        ? `<span class="v3-badge partial">[${curr.monetaryCount}/${curr.totalChannels} kênh]</span>`
        : '';
      kpi5Html = `
        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Doanh thu & Giờ xem ${helpBadge('guide-rpm', 'Doanh thu ước tính từ YouTube Analytics Monetary API; RPM = Doanh thu / Views có quyền tiền × 1.000')}</span>
            ${monChip}
          </div>
          <div class="v3-kpi-value">${curr.estimatedRevenue !== null ? fmtMoney(curr.estimatedRevenue) : '—'}</div>
          <div class="v3-kpi-delta-row">
            ${fmtDeltaBadge(curr.estimatedRevenue, prev.estimatedRevenue, true)}
          </div>
          <div class="v3-kpi-sub">
            Giờ xem: <strong>${curr.watchHours !== null ? fmtInt(curr.watchHours) + 'h' : '—'}</strong> •
            RPM: <strong>${curr.proxyRpm !== null ? fmtMoney(curr.proxyRpm) : '—'}</strong>
          </div>
        </div>
      `;
    } else {
      kpi5Html = `
        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Kênh đăng video (7 ngày) ${helpBadge('guide-data-states', 'Khi chưa kết nối Analytics OAuth, thẻ thứ 5 hiển thị nhịp độ hoạt động xuất bản của 15 kênh')}</span>
            <span class="v3-badge muted">[Snapshot]</span>
          </div>
          <div class="v3-kpi-value">${curr.activeUpload7dCount} / ${curr.totalChannels} kênh</div>
          <div class="v3-kpi-delta-row">
            <span class="v3-delta ${curr.activeUpload7dCount >= 10 ? 'up' : 'flat'}">
              ${fmtInt(curr.videosLast7d)} video mới trong 7 ngày qua
            </span>
          </div>
          <div class="v3-kpi-sub">
            Tổng danh mục: <strong>${fmtCompact(curr.subscribersTotal, true)}</strong> sub công khai
          </div>
        </div>
      `;
    }

    const subNote = curr.allSubBelowStep
      ? `Chưa vượt bước làm tròn 3 chữ số có nghĩa`
      : `Tổng danh mục: ${fmtCompact(curr.subscribersTotal, true)} sub`;

    const engFormulaLabel = curr.engagementIncludesShares
      ? `(Likes + Comments + Shares) / Views [Analytics]`
      : `(Likes + Comments) / Views [Snapshot công khai]`;

    // Item 3: Negative delta anomaly note under Views KPI card (only when an anomaly falls inside snap.win.start..snap.win.end)
    const anomalyNoteHtml = curr.negativeAnomalyViews < 0
      ? `<div class="v3-kpi-anomaly-note" title="Đã loại trừ biến động âm trong kỳ đang xem (${formatIsoToVN(snap.win.start)} – ${formatIsoToVN(snap.win.end)})">
           <i class="ri-information-line"></i> Đã loại điều chỉnh −${fmtInt(Math.abs(curr.negativeAnomalyViews))} views
         </div>`
      : '';

    // Item 15: Company MoM & QoQ combined into 1 tabbed panel
    const momRaw = [
      computeSystemPeriodRow(snap.channelsMeta, snap.scenarioId, '2026-10', '2026-10-01', '2026-10-26', 31, false),
      computeSystemPeriodRow(snap.channelsMeta, snap.scenarioId, '2026-09', '2026-09-01', '2026-09-30', 30, true),
      computeSystemPeriodRow(snap.channelsMeta, snap.scenarioId, '2026-08', '2026-08-01', '2026-08-31', 31, true),
      computeSystemPeriodRow(snap.channelsMeta, snap.scenarioId, '2026-07', '2026-07-01', '2026-07-31', 31, true)
    ];
    const momRows = momRaw.slice(0, 3).map((row, idx) => {
      const prevRow = momRaw[idx + 1];
      const deltaDailyPct = (row.avgDailyViews !== null && prevRow && prevRow.avgDailyViews && prevRow.avgDailyViews > 0)
        ? ((row.avgDailyViews - prevRow.avgDailyViews) / prevRow.avgDailyViews) * 100
        : null;
      return { ...row, deltaDailyPct };
    });

    const qoqRaw = [
      computeSystemPeriodRow(snap.channelsMeta, snap.scenarioId, '2026-Q4 (Q4 đến nay)', '2026-10-01', '2026-10-26', 92, false),
      computeSystemPeriodRow(snap.channelsMeta, snap.scenarioId, '2026-Q3', '2026-07-01', '2026-09-30', 92, true),
      computeSystemPeriodRow(snap.channelsMeta, snap.scenarioId, '2026-Q2', '2026-04-01', '2026-06-30', 91, true),
      computeSystemPeriodRow(snap.channelsMeta, snap.scenarioId, '2026-Q1', '2026-01-01', '2026-03-31', 90, true)
    ];
    const qoqRows = qoqRaw.slice(0, 3).map((row, idx) => {
      const prevRow = qoqRaw[idx + 1];
      const deltaDailyPct = (row.avgDailyViews !== null && prevRow && prevRow.avgDailyViews && prevRow.avgDailyViews > 0)
        ? ((row.avgDailyViews - prevRow.avgDailyViews) / prevRow.avgDailyViews) * 100
        : null;
      return { ...row, deltaDailyPct };
    });

    const activePeriodRows = v3State.overviewPeriodTab === 'qoq' ? qoqRows : momRows;
    const activePeriodColLabel = v3State.overviewPeriodTab === 'qoq' ? 'Kỳ Quý' : 'Kỳ Tháng';
    const activePeriodNote = v3State.overviewPeriodTab === 'qoq'
      ? '[Q4 đến nay: 26/92 ngày · Δ% tính theo BQ/ngày]'
      : '[2026-10: 26/31 ngày · Δ% tính theo BQ/ngày]';

    // Team Ranking sorted by views descending
    const sortedTeams = [...snap.teamPairs].sort((a, b) => (b.curr.views || 0) - (a.curr.views || 0));

    root.innerHTML = `
      <!-- 1. 5 KPI CARDS -->
      <section class="v3-kpi-grid">
        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Tổng lượt xem (Views) ${helpBadge('guide-data-states', 'Tổng lượt xem hợp lệ của 15 kênh trong kỳ đã chọn')}</span>
            ${viewChip}
          </div>
          <div class="v3-kpi-value">${curr.views !== null ? fmtInt(curr.views) : '—'}</div>
          <div class="v3-kpi-delta-row">
            ${fmtDeltaBadge(curr.views, prev.views)}
          </div>
          <div class="v3-kpi-sub">
            Kỳ so sánh: ${prev.views !== null ? fmtInt(prev.views) : '—'} views
            ${anomalyNoteHtml}
          </div>
        </div>

        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Sub ròng (Net Subs) ${helpBadge('guide-sub-rounding', 'Sub mới trừ Sub hủy trong kỳ. Chế độ công khai ẩn mức tăng nhỏ hơn bước làm tròn 3 chữ số')}</span>
            ${subChip}
          </div>
          <div class="v3-kpi-value">${curr.netSubs !== null ? (curr.netSubs > 0 ? '+' + fmtInt(curr.netSubs) : fmtInt(curr.netSubs)) : '—'}</div>
          <div class="v3-kpi-delta-row">
            ${curr.netSubs !== null ? fmtDeltaBadge(curr.netSubs, prev.netSubs) : `<span class="v3-delta flat">— Nhỏ hơn bước làm tròn</span>`}
          </div>
          <div class="v3-kpi-sub">${esc(subNote)}</div>
        </div>

        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Video đăng trong kỳ ${helpBadge('guide-views-7d', 'Tổng số video phát hành trong kỳ của 15 kênh (tính từ daily_videos_published cấp kênh)')}</span>
          </div>
          <div class="v3-kpi-value">${fmtInt(curr.videosPublished)} video</div>
          <div class="v3-kpi-delta-row">
            ${fmtDeltaBadge(curr.videosPublished, prev.videosPublished)}
          </div>
          <div class="v3-kpi-sub">7 ngày gần nhất: <strong>${fmtInt(curr.videosLast7d)} video</strong> (${curr.activeUpload7dCount}/15 kênh)</div>
        </div>

        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Tỷ lệ tương tác ${helpBadge('guide-engagement', engFormulaLabel)}</span>
            ${engChip}
          </div>
          <div class="v3-kpi-value">${curr.engagementRate !== null ? fmtDec(curr.engagementRate, 2) + '%' : '—'}</div>
          <div class="v3-kpi-delta-row">
            ${fmtDeltaBadge(curr.engagementRate, prev.engagementRate, false, true)}
          </div>
          <div class="v3-kpi-sub">
            Likes: <strong>${fmtCompact(curr.likes)}</strong> • Comments: <strong>${fmtCompact(curr.comments)}</strong>${curr.engagementIncludesShares ? ` • Shares: <strong>${fmtCompact(curr.shares)}</strong>` : ''}
          </div>
        </div>

        ${kpi5Html}
      </section>

      <!-- 2. 1 COMPANY TREND CHART (Current vs Previous / YoY) -->
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div class="v3-panel-title" style="flex-wrap:wrap;gap:6px;">
            <i class="ri-line-chart-line" style="color:#38BDF8;"></i>
            <span>Xu hướng toàn công ty (${formatIsoToShortVN(snap.win.start)}–${formatIsoToShortVN(snap.win.end)} vs ${v3State.compareMode === 'yoy' ? 'cùng kỳ năm ngoái' : 'kỳ liền trước'} ${formatIsoToShortVN(snap.win.prevStart)}–${formatIsoToShortVN(snap.win.prevEnd)})</span>
          </div>
          <div class="v3-preset-group">
            <button type="button" class="v3-preset-btn ${v3State.overviewMetric === 'views' ? 'active' : ''}" data-ov-metric="views">Lượt xem</button>
            <button type="button" class="v3-preset-btn ${v3State.overviewMetric === 'watchHours' ? 'active' : ''}" data-ov-metric="watchHours" ${curr.analyticsCount === 0 ? 'disabled' : ''}>Giờ xem</button>
            <button type="button" class="v3-preset-btn ${v3State.overviewMetric === 'netSubs' ? 'active' : ''}" data-ov-metric="netSubs" ${curr.netSubs === null ? 'disabled' : ''}>Sub ròng</button>
            <button type="button" class="v3-preset-btn ${v3State.overviewMetric === 'revenue' ? 'active' : ''}" data-ov-metric="revenue" ${curr.monetaryCount === 0 ? 'disabled' : ''}>Doanh thu</button>
          </div>
        </div>
        <div style="height: 280px; position: relative;">
          <canvas id="v3-overview-trend-canvas"></canvas>
        </div>
      </section>

      <!-- 3. COMBINED TABBED MoM & QoQ PANEL -->
      <section class="v3-panel">
        <div class="v3-panel-header" style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div class="v3-panel-title">
              <i class="ri-calendar-check-line" style="color:#38BDF8;"></i>
              Đối chiếu theo kỳ (Cấp công ty)
            </div>
            <span class="v3-badge partial">${esc(activePeriodNote)}</span>
          </div>
          <div class="v3-preset-group" role="tablist" aria-label="Chọn bảng đối chiếu Tháng hoặc Quý">
            <button type="button" class="v3-preset-btn ${v3State.overviewPeriodTab === 'mom' ? 'active' : ''}" data-ov-period-tab="mom">Theo tháng (MoM)</button>
            <button type="button" class="v3-preset-btn ${v3State.overviewPeriodTab === 'qoq' ? 'active' : ''}" data-ov-period-tab="qoq">Theo quý (QoQ)</button>
          </div>
        </div>
        <div class="v3-table-wrap">
          <table class="v3-table">
            <thead>
              <tr>
                <th>${esc(activePeriodColLabel)}</th>
                <th class="num">Lượt xem</th>
                <th class="num" title="So sánh bình quân lượt xem/ngày với kỳ liền trước để công bằng khi kỳ hiện tại chưa đủ ngày">Δ% (BQ/ngày)</th>
                <th class="num">Bình quân / ngày</th>
                <th class="num">Sub ròng</th>
                <th class="num">Giờ xem</th>
                <th class="num">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              ${activePeriodRows.map(r => `
                <tr>
                  <td style="white-space:nowrap;">
                    <strong>${esc(r.periodKey)}</strong>
                    ${!r.isComplete ? `<span class="v3-badge partial">[${r.coveredDays}/${r.totalCalendarDays} ngày]</span>` : `<span class="v3-badge ready">[${r.coveredDays} ngày]</span>`}
                  </td>
                  <td class="num"><strong>${r.views !== null ? fmtInt(r.views) : '—'}</strong></td>
                  <td class="num">${fmtPctBadge(r.deltaDailyPct)}</td>
                  <td class="num">${r.avgDailyViews !== null ? fmtInt(r.avgDailyViews) + ' / ngày' : '—'}</td>
                  <td class="num">${r.netSubs !== null ? (r.netSubs > 0 ? '+' + fmtInt(r.netSubs) : fmtInt(r.netSubs)) : '—'}</td>
                  <td class="num">${curr.analyticsCount > 0 && r.watchHours !== null ? fmtInt(r.watchHours) + 'h' : '—'}</td>
                  <td class="num">${curr.monetaryCount > 0 && r.estimatedRevenue !== null ? fmtMoney(r.estimatedRevenue) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- 4. 3-TEAM RANKING TABLE -->
      <section class="v3-panel" style="margin-bottom:0;">
        <div class="v3-panel-header">
          <div class="v3-panel-title">
            <i class="ri-team-line" style="color:#38BDF8;"></i>
            Xếp hạng 3 Team sản xuất trong kỳ
          </div>
        </div>
        <div class="v3-table-wrap">
          <table class="v3-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Team sản xuất</th>
                <th class="num">Kênh</th>
                <th class="v3-bar-cell">Lượt xem & Tỷ trọng</th>
                <th class="num">So với kỳ trước</th>
                <th class="num">Sub ròng</th>
                <th class="num">Video đăng</th>
                <th class="num">Doanh thu</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${sortedTeams.map((tp, idx) => `
                <tr class="clickable-row" data-goto-team="${tp.id}">
                  <td>
                    <span class="v3-badge ${idx === 0 ? 'highest' : 'muted'}">#${idx + 1}${idx === 0 ? ' [Dẫn đầu]' : ''}</span>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;font-weight:700;">
                      <span class="v3-team-dot" style="background:${tp.color};"></span>
                      <span>${esc(tp.name)}</span>
                    </div>
                  </td>
                  <td class="num">${tp.curr.totalChannels} kênh</td>
                  <td class="v3-bar-cell">
                    <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:12px;">
                      <strong>${tp.curr.views !== null ? fmtInt(tp.curr.views) : '—'}</strong>
                      <span style="color:var(--text-muted);">${fmtDec(tp.shareOfCompanyViews, 1)}%</span>
                    </div>
                    <div class="v3-bar-track">
                      <div class="v3-bar-fill" style="width:${Math.min(100, tp.shareOfCompanyViews)}%;background:${tp.color};"></div>
                    </div>
                  </td>
                  <td class="num">${fmtDeltaBadge(tp.curr.views, tp.prev.views)}</td>
                  <td class="num">${tp.curr.netSubs !== null ? (tp.curr.netSubs > 0 ? '+' + fmtInt(tp.curr.netSubs) : fmtInt(tp.curr.netSubs)) : '—'}</td>
                  <td class="num">${fmtInt(tp.curr.videosPublished)}</td>
                  <td class="num">
                    ${tp.curr.estimatedRevenue !== null ? fmtMoney(tp.curr.estimatedRevenue) : '—'}
                    ${tp.curr.monetaryCount > 0 && tp.curr.monetaryCount < tp.curr.totalChannels ? `<div style="font-size:10.5px;color:#F59E0B;">(${tp.curr.monetaryCount}/${tp.curr.totalChannels} kênh)</div>` : ''}
                  </td>
                  <td>
                    <button type="button" class="v3-btn" data-goto-team="${tp.id}" style="padding:3px 8px;font-size:11px;">
                      Xem Team <i class="ri-arrow-right-s-line"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">TỔNG TOÀN CÔNG TY (3 TEAM = 15 NHÂN VIÊN = 15 KÊNH)</td>
                <td class="num">15 kênh</td>
                <td class="num">${curr.views !== null ? fmtInt(curr.views) + ' (100%)' : '—'}</td>
                <td class="num">${fmtDeltaBadge(curr.views, prev.views)}</td>
                <td class="num">${curr.netSubs !== null ? (curr.netSubs > 0 ? '+' + fmtInt(curr.netSubs) : fmtInt(curr.netSubs)) : '—'}</td>
                <td class="num">${fmtInt(curr.videosPublished)}</td>
                <td class="num">${curr.estimatedRevenue !== null ? fmtMoney(curr.estimatedRevenue) : '—'}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;

    // Render Company Trend Chart
    renderOverviewTrendChart(snap);

    // Bind Overview Events
    root.querySelectorAll('[data-ov-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        v3State.overviewMetric = btn.getAttribute('data-ov-metric');
        renderOverviewPage(snap);
      });
    });

    root.querySelectorAll('[data-ov-period-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.overviewPeriodTab = btn.getAttribute('data-ov-period-tab');
        renderOverviewPage(snap);
      });
    });

    root.querySelectorAll('[data-goto-team]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        v3State.selectedTeamId = el.getAttribute('data-goto-team');
        if (c.switchView) c.switchView('view-report-team');
      });
    });

    bindHelpLinks(root);
  }

  function renderOverviewTrendChart(snap) {
    destroyChart('overviewTrend');
    const canvas = document.getElementById('v3-overview-trend-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const metric = v3State.overviewMetric;
    const currSeries = snap.systemCurr.dailySeries || [];
    const prevSeries = snap.systemPrev.dailySeries || [];

    const labels = currSeries.map(d => d.day.slice(8, 10) + '/' + d.day.slice(5, 7));
    const currData = currSeries.map(d => d[metric]);
    const prevData = currSeries.map((_, idx) => (prevSeries[idx] ? prevSeries[idx][metric] : null));

    chartInstances['overviewTrend'] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Kỳ này',
            data: currData,
            borderColor: '#38BDF8',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            borderWidth: 2.5,
            pointRadius: 2.5,
            tension: 0.3,
            fill: true
          },
          {
            label: v3State.compareMode === 'yoy' ? 'Cùng kỳ năm ngoái' : 'Kỳ liền trước',
            data: prevData,
            borderColor: '#94A3B8',
            backgroundColor: 'transparent',
            borderDash: [6, 4],
            borderWidth: 1.8,
            pointRadius: 2,
            tension: 0.3,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#CBD5E1', font: { size: 12, weight: '600' } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y;
                if (val === null || val === undefined) return `${ctx.dataset.label}: —`;
                if (metric === 'revenue') return `${ctx.dataset.label}: ${fmtMoney(val)}`;
                if (metric === 'watchHours') return `${ctx.dataset.label}: ${fmtInt(val)}h`;
                return `${ctx.dataset.label}: ${fmtInt(val)}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#94A3B8', maxTicksLimit: 14 }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: {
            beginAtZero: true,
            min: 0,
            ticks: {
              color: '#94A3B8',
              callback: (v) => metric === 'revenue' ? fmtMoney(v) : fmtInt(v)
            },
            grid: { color: 'rgba(255,255,255,0.06)' }
          }
        }
      }
    });
  }

  // =========================================================================
  // PAGE 3: BÁO CÁO THEO KÊNH (#view-report-channel)
  // Question: "Kênh này đang đi lên hay đi xuống?"
  // =========================================================================
  function buildChannelRefWindow(win, cp, snap) {
    const M = Math.max(1, win.dayCount);
    const mode = v3State.channelCompareMode || 'prev';
    let refStart = win.prevStart;
    let refEnd = win.prevEnd;
    let refModeName = 'Kỳ trước';

    if (mode === 'prev_quarter') {
      refStart = shiftIsoMonths(win.start, -3);
      refEnd = shiftIsoDays(refStart, M - 1);
      refModeName = 'Quý trước';
    } else if (mode === 'yoy') {
      refStart = shiftIsoYear(win.start, -1);
      refEnd = shiftIsoDays(refStart, M - 1);
      refModeName = 'Cùng kỳ năm ngoái';
    } else if (mode === 'custom') {
      let cs = v3State.channelRefStartDate || win.prevStart;
      let ce = v3State.channelRefEndDate || win.prevEnd;
      if (cs > '2026-10-26') cs = '2026-10-26';
      if (ce > '2026-10-26') ce = '2026-10-26';
      if (cs > ce) {
        const tmp = cs; cs = ce; ce = tmp;
      }
      // Ensure custom reference does not overlap current window [win.start, win.end]
      if (cs <= win.end && ce >= win.start) {
        cs = win.prevStart;
        ce = win.prevEnd;
      }
      v3State.channelRefStartDate = cs;
      v3State.channelRefEndDate = ce;
      refStart = cs;
      refEnd = ce;
      refModeName = 'Tùy chỉnh';
    } else {
      refEnd = shiftIsoDays(win.start, -1);
      refStart = shiftIsoDays(refEnd, -(M - 1));
      refModeName = 'Kỳ trước';
    }

    const refDays = listIsoDays(refStart, refEnd);
    const N = Math.max(1, refDays.length);
    const isUnequalLength = (N !== M);
    const refMetrics = (mode === 'prev' && refStart === win.prevStart && refEnd === win.prevEnd)
      ? cp.prev
      : computeChannelWindowMetrics(cp.meta, refStart, refEnd, snap.scenarioId);

    const sameYear = refStart.slice(0, 4) === win.start.slice(0, 4) && refEnd.slice(0, 4) === win.end.slice(0, 4);
    const refRangeShort = sameYear
      ? `${formatIsoToShortVN(refStart)}–${formatIsoToShortVN(refEnd)}`
      : `${formatIsoToShortVN(refStart)}/${refStart.slice(2, 4)}–${formatIsoToShortVN(refEnd)}/${refEnd.slice(2, 4)}`;
    const refRangeFullVN = `${formatIsoToVN(refStart)} – ${formatIsoToVN(refEnd)}`;

    return {
      mode,
      refModeName,
      refStart,
      refEnd,
      refDays,
      refDayCount: N,
      currDayCount: M,
      isUnequalLength,
      refRangeShort,
      refRangeFullVN,
      refMetrics
    };
  }

  function buildChannelHealthConclusion(cp, win, refWin, snap) {
    const curr = cp.curr;
    const ref = refWin.refMetrics;
    const M = refWin.currDayCount;
    const N = refWin.refDayCount;
    const useAvg = refWin.isUnequalLength && v3State.channelUnequalMode === 'avg';

    const cViews = curr.views !== null ? (useAvg ? curr.views / M : curr.views) : null;
    const rViews = ref.views !== null ? (useAvg ? ref.views / N : ref.views) : null;
    const viewsPct = (cViews !== null && rViews !== null && rViews > 0)
      ? ((cViews - rViews) / rViews) * 100
      : null;

    const cSubs = curr.netSubs !== null ? (useAvg ? curr.netSubs / M : curr.netSubs) : null;
    const rSubs = ref.netSubs !== null ? (useAvg ? ref.netSubs / N : ref.netSubs) : null;
    const subsPct = (cSubs !== null && rSubs !== null && Math.abs(rSubs) > 0)
      ? ((cSubs - rSubs) / Math.abs(rSubs)) * 100
      : null;

    // Item 1: 10 ngày gần nhất (r10Start..r10End) so với 10 ngày liền trước (p10Start..p10End), không viết cứng
    const r10End = win.end;
    const r10Start = shiftIsoDays(r10End, -9);
    const p10End = shiftIsoDays(r10Start, -1);
    const p10Start = shiftIsoDays(p10End, -9);
    const scenarioId = (snap && snap.scenarioId) || getActiveScenarioId();
    const mRecent10 = computeChannelWindowMetrics(cp.meta, r10Start, r10End, scenarioId);
    const mPrev10 = computeChannelWindowMetrics(cp.meta, p10Start, p10End, scenarioId);
    const vRecent10 = mRecent10.views || 0;
    const vPrev10 = mPrev10.views || 0;
    const recent10Pct = vPrev10 > 0 ? ((vRecent10 - vPrev10) / vPrev10) * 100 : 0;

    const r10Tag = `${formatIsoToShortVN(r10Start)}–${formatIsoToShortVN(r10End)}`;
    const p10Tag = `${formatIsoToShortVN(p10Start)}–${formatIsoToShortVN(p10End)}`;

    const refLabelLower = refWin.refModeName.toLowerCase();
    let part1 = '';
    if (viewsPct !== null) {
      const vDir = viewsPct >= 0 ? 'tăng' : 'giảm';
      const vStr = `${Math.abs(viewsPct).toFixed(1).replace('.', ',')}%`;
      if (subsPct !== null) {
        const sDir = subsPct >= 0 ? 'tăng' : 'giảm';
        const sStr = `${Math.abs(subsPct).toFixed(1).replace('.', ',')}%`;
        const conj = (viewsPct >= 0 && subsPct >= 0) || (viewsPct < 0 && subsPct < 0) ? 'và' : 'nhưng';
        part1 = `Views ${vDir} ${vStr} so với ${refLabelLower} ${conj} sub ròng ${sDir} ${sStr}`;
      } else {
        part1 = `Views ${vDir} ${vStr} so với ${refLabelLower}`;
      }
    } else {
      part1 = `Đang theo dõi dữ liệu kênh trong kỳ (${formatIsoToShortVN(win.start)}–${formatIsoToShortVN(win.end)})`;
    }

    let part2 = '';
    if (Math.abs(recent10Pct) < 2.0) {
      part2 = `10 ngày gần nhất (${r10Tag}) giữ nhịp ổn định (${fmtPct(recent10Pct)}) so với 10 ngày liền trước (${p10Tag})`;
    } else if (recent10Pct > 0) {
      const verb = (viewsPct !== null && viewsPct < 0) ? 'đang hồi phục' : 'tăng';
      part2 = `10 ngày gần nhất (${r10Tag}) ${verb} ${fmtPct(recent10Pct)} so với 10 ngày liền trước (${p10Tag})`;
    } else {
      part2 = `10 ngày gần nhất (${r10Tag}) giảm ${fmtPct(recent10Pct)} so với 10 ngày liền trước (${p10Tag})`;
    }

    return `${part1}; ${part2}.`;
  }

  function buildCompareHealthConclusion(selectedPairs, win, refWinById) {
    if (!selectedPairs || !selectedPairs.length) return 'Chọn từ 2 đến 5 kênh để so sánh.';
    const M = Math.max(1, win.dayCount);
    const items = selectedPairs.map(cp => {
      const rw = refWinById.get(cp.id);
      const N = rw ? rw.refDayCount : M;
      const useAvg = rw && rw.isUnequalLength && v3State.channelUnequalMode === 'avg';
      const cV = cp.curr.views !== null ? (useAvg ? cp.curr.views / M : cp.curr.views) : null;
      const rV = (rw && rw.refMetrics && rw.refMetrics.views !== null) ? (useAvg ? rw.refMetrics.views / N : rw.refMetrics.views) : null;
      const pct = (cV !== null && rV !== null && rV > 0) ? ((cV - rV) / rV) * 100 : null;
      return { cp, views: cp.curr.views || 0, pct };
    });

    const withPct = items.filter(x => x.pct !== null).sort((a, b) => b.pct - a.pct);
    const byViews = [...items].sort((a, b) => b.views - a.views);
    const topViewsItem = byViews[0];

    if (withPct.length >= 2) {
      const best = withPct[0];
      const worst = withPct[withPct.length - 1];
      const bestLabel = best.pct > 0 ? 'tăng nhanh nhất trong nhóm' : 'giảm ít nhất trong nhóm';
      const worstLabel = worst.pct < 0 ? 'giảm mạnh nhất trong nhóm' : 'tăng chậm nhất trong nhóm';
      return `${best.cp.meta.title} ${bestLabel} (${fmtPct(best.pct)}); ${worst.cp.meta.title} ${worstLabel} (${fmtPct(worst.pct)}) · Dẫn đầu views: ${topViewsItem.cp.meta.title} (${fmtInt(topViewsItem.views)}).`;
    }
    return `Dẫn đầu lượt xem trong nhóm: ${topViewsItem.cp.meta.title} (${fmtInt(topViewsItem.views)} views).`;
  }

  function renderChannelPage(snap) {
    const root = document.getElementById('v3-channel-root');
    if (!root) return;

    const c = core();
    const demo = c.DEMO_STORE;
    if (v3State.channelMode !== 'single' && v3State.channelMode !== 'compare') {
      v3State.channelMode = 'single';
    }
    const cp = snap.channelPairs.find(x => x.id === v3State.selectedChannelId) || snap.channelPairs[0];
    if (cp) v3State.selectedChannelId = cp.id;

    root.innerHTML = `<div id="v3-channel-mode-body"></div>`;
    const body = document.getElementById('v3-channel-mode-body');
    if (v3State.channelMode === 'compare') {
      renderChannelCompareMode(body, snap);
    } else {
      renderChannelSingleMode(body, snap, cp, demo);
    }
    bindHelpLinks(root);
  }

  function resolveChannelSelectedDayIdx(cp, win) {
    const currDays = (win && win.days) || [];
    const M = currDays.length;
    if (!M) return 0;

    if (v3State.channelSelectedDayIso && currDays.includes(v3State.channelSelectedDayIso)) {
      const idx = currDays.indexOf(v3State.channelSelectedDayIso);
      v3State.channelSelectedDayIdx = idx;
      return idx;
    }
    if (v3State.channelSelectedDayIdx !== null && v3State.channelSelectedDayIdx >= 0 && v3State.channelSelectedDayIdx < M) {
      v3State.channelSelectedDayIso = currDays[v3State.channelSelectedDayIdx];
      return v3State.channelSelectedDayIdx;
    }
    // Default to peak views day in the active period
    let peakIdx = 0;
    let peakViews = -1;
    currDays.forEach((d, idx) => {
      const pt = cp && cp.curr && cp.curr.dailyMap ? cp.curr.dailyMap.get(d) : null;
      const v = pt && pt.views !== null && pt.views !== undefined ? Number(pt.views) : -1;
      if (v > peakViews) {
        peakViews = v;
        peakIdx = idx;
      }
    });
    v3State.channelSelectedDayIdx = peakIdx;
    v3State.channelSelectedDayIso = currDays[peakIdx];
    return peakIdx;
  }

  function fmtDailyDeltaCompact(currVal, refVal, labelPrefix, isCurrency = false, isPercentPoint = false, isSignedDiff = false) {
    if (currVal === null || currVal === undefined || refVal === null || refVal === undefined || Number.isNaN(Number(currVal)) || Number.isNaN(Number(refVal))) {
      return `<div class="v3-daily-delta-line"><span class="v3-daily-delta-lbl">${esc(labelPrefix)}:</span> <span class="v3-delta flat v3-daily-delta-badge">—</span></div>`;
    }
    const cNum = Number(currVal);
    const rNum = Number(refVal);
    const diff = cNum - rNum;
    let pct = null;
    if (Math.abs(rNum) > 0.0001) {
      pct = (diff / Math.abs(rNum)) * 100;
    } else if (Math.abs(cNum) < 0.0001) {
      pct = 0;
    }
    const isSmall = isPercentPoint
      ? Math.abs(diff) < 0.05
      : (pct !== null ? Math.abs(pct) < 0.5 : Math.abs(diff) < 0.01);
    const cls = isSmall ? 'flat' : (diff > 0.0001 ? 'up' : (diff < -0.0001 ? 'down' : 'flat'));
    const arrow = diff > 0.0001 ? '▲' : (diff < -0.0001 ? '▼' : '•');
    const sign = diff > 0.0001 ? '+' : (diff < -0.0001 ? '−' : '');
    const absDiff = Math.abs(diff);

    let valText = '';
    if (isPercentPoint) {
      valText = `${sign}${absDiff.toFixed(2).replace('.', ',')} điểm %`;
    } else if (isCurrency) {
      valText = `${sign}${fmtMoney(absDiff)}${pct !== null ? ` (${fmtPct(pct)})` : ''}`;
    } else if (isSignedDiff) {
      const diffFormatted = Number.isInteger(cNum) && Number.isInteger(rNum)
        ? fmtInt(Math.round(absDiff))
        : fmtDec(absDiff, 1);
      valText = `${sign}${diffFormatted}${pct !== null ? ` (${fmtPct(pct)})` : ''}`;
    } else {
      valText = `${sign}${fmtCompact(Math.round(absDiff))}${pct !== null ? ` (${fmtPct(pct)})` : ''}`;
    }
    return `
      <div class="v3-daily-delta-line">
        <span class="v3-daily-delta-lbl">${esc(labelPrefix)}:</span>
        <span class="v3-delta ${cls} v3-daily-delta-badge">${arrow} ${valText}</span>
      </div>
    `;
  }

  function buildDailyReportConclusion(cp, win, refWin, dayIdx, dayIso, refDayIso, dayPt, refPt, vidReport, isDelayDay) {
    const curr = cp.curr;
    const currDays = win.days || [];
    const M = Math.max(1, currDays.length);
    const weekdayVN = formatIsoToWeekdayVN(dayIso);
    const dateFullVN = `${weekdayVN ? weekdayVN + ', ' : ''}${formatIsoToVN(dayIso)}`;

    // Rank this day by views within the active period
    const allDayViewsSorted = currDays
      .map(d => {
        const pt = curr.dailyMap.get(d);
        return { day: d, views: pt && pt.views !== null && pt.views !== undefined ? Number(pt.views) : 0 };
      })
      .sort((a, b) => (b.views - a.views) || a.day.localeCompare(b.day));
    const rankPos = Math.max(1, allDayViewsSorted.findIndex(x => x.day === dayIso) + 1);

    const dayViews = dayPt && dayPt.views !== null && dayPt.views !== undefined ? Number(dayPt.views) : 0;
    const avgViews = curr.views !== null ? (curr.views / M) : 0;
    const vsAvgPct = avgViews > 0 ? ((dayViews - avgViews) / avgViews) * 100 : 0;
    const refViews = refPt && refPt.views !== null && refPt.views !== undefined ? Number(refPt.views) : null;
    const vsRefPct = (refViews !== null && refViews > 0) ? ((dayViews - refViews) / refViews) * 100 : null;

    let rankPhrase = `đứng hạng #${rankPos}/${M} ngày trong kỳ`;
    if (rankPos === 1) {
      rankPhrase = `là ngày đỉnh cao nhất kỳ (#1/${M} ngày)`;
    } else if (rankPos <= 3) {
      rankPhrase = `nằm trong nhóm 3 ngày cao điểm nhất kỳ (#${rankPos}/${M} ngày)`;
    } else if (rankPos === M) {
      rankPhrase = `là ngày thấp nhất trong kỳ (#${M}/${M} ngày)`;
    }

    const avgCmpPhrase = Math.abs(vsAvgPct) < 0.5
      ? `ngang mức trung bình kỳ (${fmtInt(Math.round(avgViews))} views/ngày)`
      : `${vsAvgPct > 0 ? 'cao hơn' : 'thấp hơn'} trung bình ngày của kỳ ${fmtPct(Math.abs(vsAvgPct), false)} (TB: ${fmtInt(Math.round(avgViews))} views/ngày)`;

    const refCmpPhrase = (vsRefPct !== null && refDayIso)
      ? `, ${vsRefPct >= 0 ? 'tăng' : 'giảm'} ${fmtPct(Math.abs(vsRefPct), false)} so với ngày thứ ${dayIdx + 1} kỳ đối chứng (${formatIsoToShortVN(refDayIso)}: ${fmtInt(refViews)} views)`
      : '';

    let videoPhrase = '';
    if (!curr.hasAnalytics) {
      videoPhrase = `Kênh chưa cấp quyền Analytics nên chỉ hiển thị số tổng ngày (${fmtInt(dayPt.videosPublished || 0)} video đăng); chưa mở khóa phân rã views theo video.`;
    } else {
      const pubVids = (vidReport && vidReport.published_videos) || [];
      const top3 = (vidReport && vidReport.top3_videos) || [];
      const top3Sum = top3.reduce((s, v) => s + (v.views || 0), 0);
      const top3Share = dayViews > 0 ? (top3Sum / dayViews) * 100 : 0;
      if (pubVids.length > 0) {
        const pv = pubVids[0];
        const pvShare = dayViews > 0 ? (pv.views / dayViews) * 100 : 0;
        videoPhrase = `Có ${pubVids.length} video đăng mới lúc ${pv.published_time_pt} (“${pv.title}”) đóng góp ngay ${fmtInt(pv.views)} views (${fmtDec(pvShare, 1)}% views ngày); Top 3 video chiếm ${fmtDec(top3Share, 1)}% tổng views ngày.`;
      } else if (top3.length > 0 && dayViews > 0) {
        const t1 = top3[0];
        const t1Share = (t1.views / dayViews) * 100;
        videoPhrase = `Không có video đăng mới (0 video); lưu lượng dẫn dắt bởi “${t1.title}” (${fmtInt(t1.views)} views, ${fmtDec(t1Share, 1)}%), Top 3 video chiếm ${fmtDec(top3Share, 1)}% tổng views ngày.`;
      } else {
        videoPhrase = `Không có phát sinh lượt xem video trong ngày này.`;
      }
    }

    const delayPhrase = isDelayDay
      ? ` [Lưu ý: Ngày ${formatIsoToShortVN(dayIso)} thuộc khoảng độ trễ 2–3 ngày nên dữ liệu chưa ổn định].`
      : '';

    return `${dateFullVN} đạt ${fmtInt(dayViews)} views (${rankPhrase}, ${avgCmpPhrase}${refCmpPhrase}). ${videoPhrase}${delayPhrase}`;
  }

  function renderDailyReportPanelInner(cp, snap, refWin, demo) {
    const curr = cp.curr;
    const meta = cp.meta;
    const win = snap.win;
    const currDays = win.days || [];
    const refDays = (refWin && refWin.refDays) ? refWin.refDays : (win.prevDays || []);
    const M = Math.max(1, currDays.length);

    const dayIdx = resolveChannelSelectedDayIdx(cp, win);
    const dayIso = currDays[dayIdx] || win.end;
    const refDayIso = refDays[dayIdx] || null;
    const weekdayVN = formatIsoToWeekdayVN(dayIso);
    const refWeekdayVN = refDayIso ? formatIsoToWeekdayVN(refDayIso) : '';

    // Find peak day and a representative normal day in the active period for quick selection & testing
    let peakDayIdx = 0;
    let peakDayViews = -1;
    currDays.forEach((d, idx) => {
      const pt = curr.dailyMap.get(d);
      const v = pt && pt.views !== null ? Number(pt.views) : -1;
      if (v > peakDayViews) {
        peakDayViews = v;
        peakDayIdx = idx;
      }
    });
    const peakDayIso = currDays[peakDayIdx] || win.end;

    // Pick a normal day (not in top 3, not in delay window 24..26/10 if possible, preferably with a published video)
    const sortedByViews = currDays
      .map((d, idx) => {
        const pt = curr.dailyMap.get(d);
        return {
          idx,
          day: d,
          views: pt && pt.views !== null ? Number(pt.views) : 0,
          vidsPub: pt ? Number(pt.videosPublished || 0) : 0
        };
      })
      .sort((a, b) => (b.views - a.views) || a.day.localeCompare(b.day));

    const rankPos = Math.max(1, sortedByViews.findIndex(x => x.day === dayIso) + 1);
    const midCandidates = sortedByViews.slice(Math.min(4, Math.floor(M * 0.25)), Math.max(5, Math.floor(M * 0.78)));
    const normalCandidate = midCandidates.find(x => x.day < '2026-10-24' && x.vidsPub > 0) ||
      midCandidates.find(x => x.day < '2026-10-24') ||
      sortedByViews[Math.floor(M / 2)] ||
      { idx: 0, day: currDays[0], views: 0 };
    const normalDayIdx = normalCandidate.idx;
    const normalDayIso = normalCandidate.day;

    const dayPt = curr.dailyMap.get(dayIso) || {
      views: 0,
      netSubs: null,
      videosPublished: 0,
      interactions: 0,
      engagementRate: null,
      revenue: null
    };
    const refMap = (refWin && refWin.refMetrics && refWin.refMetrics.dailyMap) ? refWin.refMetrics.dailyMap : cp.prev.dailyMap;
    const refPt = (refDayIso && refMap) ? refMap.get(refDayIso) : null;

    const avgViews = curr.views !== null ? (curr.views / M) : null;
    const avgNetSubs = curr.netSubs !== null ? (curr.netSubs / M) : null;
    const avgVids = curr.videosPublished !== null ? (curr.videosPublished / M) : null;
    const avgEngRate = curr.engagementRate;
    const avgRev = curr.estimatedRevenue !== null ? (curr.estimatedRevenue / M) : null;

    const hasOAuth = !!curr.hasAnalytics;
    const hasMonetary = !!(curr.hasAnalytics && curr.hasMonetary);
    // Item 5: Days in the 2-3 day Analytics delay window (24/10 - 26/10/2026) show "Dữ liệu chưa ổn định"
    const isDelayDay = dayIso >= '2026-10-24';

    // Fetch per-video daily breakdown (Item 3 & Item 7)
    let vidReport = (demo && demo.getDailyVideoReport) ? demo.getDailyVideoReport(cp.id, dayIso) : null;
    if (vidReport && dayPt.views === 0 && vidReport.day_views > 0) {
      // Respect scenario zero_denominator override
      vidReport = {
        ...vidReport,
        day_views: 0,
        published_videos: (vidReport.published_videos || []).map(v => ({ ...v, views: 0 })),
        top3_videos: (vidReport.top3_videos || []).map(v => ({ ...v, views: 0 })),
        video_views: (vidReport.video_views || []).map(v => ({ ...v, views: 0 }))
      };
    }

    const publishedVideos = vidReport ? (vidReport.published_videos || []) : [];
    const top3Videos = vidReport ? (vidReport.top3_videos || []) : [];
    const allDayVideos = vidReport ? (vidReport.video_views || []) : [];
    const dayVideoViewsSum = allDayVideos.reduce((s, v) => s + (v.views || 0), 0);
    const top3DayViews = top3Videos.reduce((s, v) => s + (v.views || 0), 0);
    const top3DayShare = dayPt.views > 0 ? (top3DayViews / dayPt.views) * 100 : 0;

    const refShortLabel = refDayIso
      ? `ĐC N${dayIdx + 1} (${formatIsoToShortVN(refDayIso)})`
      : `ĐC N${dayIdx + 1}`;

    const conclusionText = buildDailyReportConclusion(
      cp, win, refWin, dayIdx, dayIso, refDayIso, dayPt, refPt, vidReport, isDelayDay
    );

    const isOpen = !!v3State.channelDailyPanelOpen;

    return `
      <!-- Lớp chờ khi chưa mở (Giữ nguyên chiều cao cố định 274px để mở/đóng không làm biểu đồ nhảy) -->
      <div class="v3-daily-standby-layer ${isOpen ? 'is-hidden' : 'is-visible'}" id="v3-daily-report-standby">
        <div class="v3-daily-standby-box">
          <div class="v3-daily-standby-title">
            <i class="ri-calendar-event-line" style="color:${meta.channelColor};font-size:16px;"></i>
            <strong>Báo cáo ngày (${esc(meta.title)})</strong>
            <span class="v3-badge muted">Chưa chọn ngày</span>
          </div>
          <div class="v3-daily-standby-desc">
            Bấm vào <strong>bất kỳ cột dọc ngày nào</strong> trên biểu đồ <em>“Xu hướng theo ngày”</em> phía trên để mở Báo cáo ngày chi tiết (5 chỉ số ngày + delta so với ngày thứ N kỳ đối chứng &amp; TB kỳ + danh sách video đăng trong ngày + Top 3 video cao nhất ngày).
          </div>
          <div class="v3-daily-standby-actions">
            <button type="button" class="v3-btn v3-daily-quick-btn" id="v3-daily-open-peak-btn" data-open-day-idx="${peakDayIdx}">
              <i class="ri-fire-line" style="color:#F59E0B;"></i>
              <span>Xem ngày đỉnh kỳ: <strong>${formatIsoToVN(peakDayIso)}</strong> (${fmtInt(peakDayViews)} views)</span>
            </button>
            <button type="button" class="v3-btn v3-daily-quick-btn" id="v3-daily-open-normal-btn" data-open-day-idx="${normalDayIdx}">
              <i class="ri-calendar-check-line" style="color:#38BDF8;"></i>
              <span>Xem ngày thường: <strong>${formatIsoToVN(normalDayIso)}</strong> (${fmtInt(normalCandidate.views)} views)</span>
            </button>
            <button type="button" class="v3-btn v3-daily-quick-btn" id="v3-daily-open-latest-btn" data-open-day-idx="${M - 1}">
              <i class="ri-time-line" style="color:#10B981;"></i>
              <span>Xem ngày cuối kỳ: <strong>${formatIsoToVN(currDays[M - 1])}</strong> (Trễ 2–3 ngày)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Lớp nội dung chi tiết Báo cáo ngày -->
      <div class="v3-daily-active-layer ${isOpen ? 'is-visible' : 'is-hidden'}"
           id="v3-daily-report-active-body"
           data-day-iso="${esc(dayIso)}"
           data-day-idx="${dayIdx}"
           data-day-views="${dayPt.views ?? ''}"
           data-day-video-views-sum="${dayVideoViewsSum}"
           data-day-subs="${dayPt.netSubs ?? ''}"
           data-day-vids-pub="${dayPt.videosPublished ?? 0}"
           data-day-published-list-count="${publishedVideos.length}"
           data-day-eng-rate="${dayPt.engagementRate ?? ''}"
           data-day-interactions="${dayPt.interactions ?? ''}"
           data-day-rev="${dayPt.revenue ?? ''}"
           data-is-delay-day="${isDelayDay ? 'true' : 'false'}"
           data-has-oauth="${hasOAuth ? 'true' : 'false'}">

        <!-- Thanh tiêu đề Báo cáo ngày: Ngày thật + Thứ + Mốc ngày thứ N + Nhãn trạng thái + Nút ‹ › và × -->
        <div class="v3-daily-header-bar" id="v3-daily-report-header">
          <div class="v3-daily-header-left">
            <span class="v3-daily-panel-tag" style="border-color:${meta.channelColor}66;background:${meta.channelColor}18;color:${meta.channelColor};">
              <i class="ri-calendar-check-fill"></i> Báo cáo ngày
            </span>
            <strong class="v3-daily-real-date" id="v3-daily-real-date">${esc(weekdayVN)}, ${formatIsoToVN(dayIso)}</strong>
            <span class="v3-badge muted" id="v3-daily-nth-badge">Ngày ${dayIdx + 1}/${M}</span>
            <span class="v3-badge ${rankPos === 1 ? 'highest' : (rankPos <= 3 ? 'analytics' : 'muted')}" id="v3-daily-rank-badge">
              ${rankPos === 1 ? `Đỉnh #1/${M}` : `Hạng #${rankPos}/${M}`}
            </span>
            ${isDelayDay ? `
              <span class="v3-badge warn v3-daily-unstable-badge" id="v3-daily-unstable-badge" style="flex-shrink:0;" title="Ngày nằm trong khoảng độ trễ 2–3 ngày của YouTube Analytics">
                <i class="ri-error-warning-line"></i> Dữ liệu chưa ổn định
              </span>
            ` : ''}
            ${!hasOAuth ? `
              <span class="v3-badge warn" id="v3-daily-no-oauth-badge" style="flex-shrink:0;">
                Chưa cấp quyền Analytics
              </span>
            ` : ''}
          </div>

          <div class="v3-daily-header-right">
            <div class="v3-daily-QuickPick-group">
              <button type="button" class="v3-daily-QuickPick-btn ${dayIdx === peakDayIdx ? 'active' : ''}" data-daily-jump-idx="${peakDayIdx}" title="Nhảy tới ngày đỉnh nhất trong kỳ (${formatIsoToVN(peakDayIso)})">
                Ngày đỉnh (${formatIsoToShortVN(peakDayIso)})
              </button>
              <button type="button" class="v3-daily-QuickPick-btn ${dayIdx === normalDayIdx ? 'active' : ''}" data-daily-jump-idx="${normalDayIdx}" title="Nhảy tới ngày thường (${formatIsoToVN(normalDayIso)})">
                Ngày thường (${formatIsoToShortVN(normalDayIso)})
              </button>
            </div>
            <div class="v3-daily-nav-group" role="group" aria-label="Chuyển ngày trên biểu đồ">
              <button type="button" class="v3-daily-nav-btn" id="v3-daily-prev-btn" ${dayIdx <= 0 ? 'disabled' : ''} title="Ngày liền trước (‹)" aria-label="Ngày liền trước">‹</button>
              <span class="v3-daily-nav-label" id="v3-daily-nav-label">${formatIsoToShortVN(dayIso)} (${dayIdx + 1}/${M})</span>
              <button type="button" class="v3-daily-nav-btn" id="v3-daily-next-btn" ${dayIdx >= M - 1 ? 'disabled' : ''} title="Ngày liền sau (›)" aria-label="Ngày liền sau">›</button>
            </div>
            <button type="button" class="v3-daily-close-btn" id="v3-daily-close-btn" title="Đóng Báo cáo ngày (×)" aria-label="Đóng Báo cáo ngày">×</button>
          </div>
        </div>

        <!-- Hàng 1: 5 chỉ số trong ngày (Views, Sub ròng, Video đăng, Tương tác, Doanh thu) kèm 2 dòng delta (vs Ngày thứ N kỳ đối chứng & vs TB ngày của kỳ) -->
        <div class="v3-daily-kpi-grid" id="v3-daily-kpi-grid">
          <!-- 1. Views -->
          <div class="v3-daily-kpi-card" data-daily-kpi="views">
            <div class="v3-daily-kpi-top">
              <span class="v3-daily-kpi-name">Views</span>
              <strong class="v3-daily-kpi-val" data-daily-val="views">${dayPt.views !== null ? fmtInt(dayPt.views) : '—'}</strong>
            </div>
            ${fmtDailyDeltaCompact(dayPt.views, refPt ? refPt.views : null, refShortLabel, false, false)}
            ${fmtDailyDeltaCompact(dayPt.views, avgViews, `TB kỳ (${avgViews !== null ? fmtInt(Math.round(avgViews)) : '—'})`, false, false)}
          </div>

          <!-- 2. Sub ròng -->
          <div class="v3-daily-kpi-card" data-daily-kpi="netSubs">
            <div class="v3-daily-kpi-top">
              <span class="v3-daily-kpi-name">Sub ròng</span>
              <strong class="v3-daily-kpi-val" data-daily-val="netSubs">
                ${hasOAuth && dayPt.netSubs !== null ? (dayPt.netSubs > 0 ? '+' + fmtInt(dayPt.netSubs) : fmtInt(dayPt.netSubs)) : (hasOAuth ? '—' : '<span class="v3-daily-no-perm-inline">Chưa cấp quyền</span>')}
              </strong>
            </div>
            ${hasOAuth
              ? fmtDailyDeltaCompact(dayPt.netSubs, refPt ? refPt.netSubs : null, refShortLabel, false, false, true)
              : `<div class="v3-daily-delta-line"><span class="v3-daily-delta-lbl">${esc(refShortLabel)}:</span> <span class="v3-daily-delta-muted">Chưa cấp quyền</span></div>`
            }
            ${hasOAuth
              ? fmtDailyDeltaCompact(dayPt.netSubs, avgNetSubs, `TB kỳ (${avgNetSubs !== null ? fmtDec(avgNetSubs, 1) : '—'})`, false, false, true)
              : `<div class="v3-daily-delta-line"><span class="v3-daily-delta-lbl">TB kỳ:</span> <span class="v3-daily-delta-muted">—</span></div>`
            }
          </div>

          <!-- 3. Video đăng -->
          <div class="v3-daily-kpi-card" data-daily-kpi="videosPublished">
            <div class="v3-daily-kpi-top">
              <span class="v3-daily-kpi-name">Video đăng</span>
              <strong class="v3-daily-kpi-val" data-daily-val="videosPublished">${fmtInt(dayPt.videosPublished || 0)}</strong>
            </div>
            ${fmtDailyDeltaCompact(dayPt.videosPublished, refPt ? refPt.videosPublished : null, refShortLabel, false, false, true)}
            ${fmtDailyDeltaCompact(dayPt.videosPublished, avgVids, `TB kỳ (${avgVids !== null ? fmtDec(avgVids, 2) : '—'})`, false, false, true)}
          </div>

          <!-- 4. Tương tác -->
          <div class="v3-daily-kpi-card" data-daily-kpi="engagement">
            <div class="v3-daily-kpi-top">
              <span class="v3-daily-kpi-name">Tương tác</span>
              <strong class="v3-daily-kpi-val" data-daily-val="engagement">
                ${dayPt.engagementRate !== null ? `${fmtDec(dayPt.engagementRate, 2)}% <span class="v3-daily-sub-cnt">(${fmtInt(dayPt.interactions || 0)})</span>` : '—'}
              </strong>
            </div>
            ${fmtDailyDeltaCompact(dayPt.engagementRate, refPt ? refPt.engagementRate : null, refShortLabel, false, true)}
            ${fmtDailyDeltaCompact(dayPt.engagementRate, avgEngRate, `TB kỳ (${avgEngRate !== null ? fmtDec(avgEngRate, 2) + '%' : '—'})`, false, true)}
          </div>

          <!-- 5. Doanh thu -->
          <div class="v3-daily-kpi-card" data-daily-kpi="revenue">
            <div class="v3-daily-kpi-top">
              <span class="v3-daily-kpi-name">Doanh thu</span>
              <strong class="v3-daily-kpi-val" data-daily-val="revenue">
                ${(hasOAuth && hasMonetary && dayPt.revenue !== null)
                  ? fmtMoney(dayPt.revenue)
                  : (!hasOAuth
                    ? '<span class="v3-daily-no-perm-inline">Chưa cấp quyền</span>'
                    : (isDelayDay ? '<span class="v3-daily-no-perm-inline">Dữ liệu chưa ổn định</span>' : '—'))}
              </strong>
            </div>
            ${(hasOAuth && hasMonetary && dayPt.revenue !== null)
              ? fmtDailyDeltaCompact(dayPt.revenue, refPt ? refPt.revenue : null, refShortLabel, true, false)
              : `<div class="v3-daily-delta-line"><span class="v3-daily-delta-lbl">${esc(refShortLabel)}:</span> <span class="v3-daily-delta-muted">${!hasOAuth ? 'Chưa cấp quyền' : (isDelayDay ? 'Dữ liệu chưa ổn định' : '—')}</span></div>`
            }
            ${(hasOAuth && hasMonetary && dayPt.revenue !== null)
              ? fmtDailyDeltaCompact(dayPt.revenue, avgRev, `TB kỳ (${avgRev !== null ? fmtMoney(avgRev) : '—'})`, true, false)
              : `<div class="v3-daily-delta-line"><span class="v3-daily-delta-lbl">TB kỳ:</span> <span class="v3-daily-delta-muted">—</span></div>`
            }
          </div>
        </div>

        <!-- Hàng 2: Danh sách video đăng trong ngày & Top 3 video có views cao nhất ngày đó (Hoặc thông báo Chưa cấp quyền Analytics ở phần video) -->
        <div class="v3-daily-videos-section" id="v3-daily-videos-section">
          ${!hasOAuth ? `
            <div class="v3-daily-video-no-oauth" id="v3-daily-video-no-oauth">
              <span class="v3-badge warn"><i class="ri-lock-2-line"></i> Chưa cấp quyền Analytics</span>
              <span>
                Kênh <strong>${esc(meta.title)}</strong> chưa kết nối OAuth YouTube Analytics API v2 nên chỉ hiện số tổng ngày (<strong>${fmtInt(dayPt.views || 0)} views</strong> · <strong>${fmtInt(dayPt.videosPublished || 0)} video đăng</strong>).
                Cấp quyền Analytics để xem danh sách video đăng trong ngày và Top 3 video có views cao nhất ngày.
              </span>
            </div>
          ` : `
            <div class="v3-daily-videos-grid">
              <!-- Cột trái: Danh sách video đăng trong ngày (tên, giờ đăng, views trong ngày) -->
              <div class="v3-daily-video-box" id="v3-daily-published-box">
                <div class="v3-daily-video-box-hdr">
                  <span>
                    <i class="ri-upload-cloud-2-line" style="color:#10B981;"></i>
                    <strong>Video đăng trong ngày (${publishedVideos.length} video)</strong>
                  </span>
                  <span class="v3-daily-box-sub">Khớp daily_videos_published: ${dayPt.videosPublished || 0}</span>
                </div>
                <div class="v3-daily-video-box-body" id="v3-daily-published-list">
                  ${publishedVideos.length > 0 ? publishedVideos.map(pv => {
                    const pvShare = dayPt.views > 0 ? (pv.views / dayPt.views) * 100 : 0;
                    return `
                      <div class="v3-daily-vid-item is-pub-item" data-published-video-id="${esc(pv.video_id)}" data-published-video-views="${pv.views}">
                        <span class="v3-badge highest" style="font-size:9.5px;padding:1px 5px;flex-shrink:0;">Mới đăng</span>
                        <span class="v3-daily-vid-title" title="${esc(pv.title)}">${esc(pv.title)}</span>
                        <span class="v3-daily-vid-time"><i class="ri-time-line"></i> ${esc(pv.published_time_pt)}</span>
                        <strong class="v3-daily-vid-views">${fmtInt(pv.views)} views <small>(${fmtDec(pvShare, 1)}%)</small></strong>
                      </div>
                    `;
                  }).join('') : `
                    <div class="v3-daily-vid-empty" id="v3-daily-published-empty">
                      <i class="ri-information-line"></i>
                      <span>Không có video đăng mới trong ngày ${formatIsoToVN(dayIso)} (<strong>0 video</strong>). Toàn bộ <strong>${fmtInt(dayPt.views || 0)} views</strong> ngày này đến từ ${allDayVideos.length} video đã phát hành trước đó.</span>
                    </div>
                  `}
                </div>
              </div>

              <!-- Cột phải: Top 3 video có views cao nhất ngày đó -->
              <div class="v3-daily-video-box" id="v3-daily-top3-box">
                <div class="v3-daily-video-box-hdr">
                  <span>
                    <i class="ri-trophy-line" style="color:#F59E0B;"></i>
                    <strong>Top 3 video có views cao nhất ngày ${formatIsoToShortVN(dayIso)}</strong>
                  </span>
                  <span class="v3-daily-box-sub">
                    Top 3: <strong>${fmtInt(top3DayViews)}</strong> (${fmtDec(top3DayShare, 1)}%) · Tổng ${allDayVideos.length} video = <strong>${fmtInt(dayVideoViewsSum)}</strong> views
                  </span>
                </div>
                <div class="v3-daily-video-box-body" id="v3-daily-top3-list">
                  ${top3Videos.map((tv, idx) => {
                    const tvShare = dayPt.views > 0 ? (tv.views / dayPt.views) * 100 : 0;
                    const isPubToday = tv.published_day_pt === dayIso;
                    return `
                      <div class="v3-daily-vid-item is-top-item" data-top3-rank="${idx + 1}" data-top3-video-id="${esc(tv.video_id)}" data-top3-video-views="${tv.views}">
                        <span class="v3-daily-rank-pill rank-${idx + 1}">#${idx + 1}</span>
                        <span class="v3-daily-vid-title" title="${esc(tv.title)}">${esc(tv.title)}</span>
                        <span class="v3-daily-vid-time">
                          ${isPubToday ? `<strong style="color:#10B981;">Đăng hôm nay · ${esc(tv.published_time_pt)}</strong>` : `${formatIsoToShortVN(tv.published_day_pt)} · ${esc(tv.published_time_pt)}`}
                        </span>
                        <strong class="v3-daily-vid-views">${fmtInt(tv.views)} views <small>(${fmtDec(tvShare, 1)}%)</small></strong>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          `}
        </div>

        <!-- Hàng 3: Một dòng kết luận sinh từ dữ liệu, không viết cứng (Item 4) -->
        <div class="v3-daily-conclusion-bar" id="v3-daily-conclusion-bar">
          <span class="v3-daily-conclusion-tag">Kết luận ngày:</span>
          <span class="v3-daily-conclusion-text" id="v3-daily-conclusion-text">${esc(conclusionText)}</span>
        </div>
      </div>
    `;
  }

  function updateDailyReportSelection(nextIdx, openPanel, cp, snap, refWin, demo) {
    const currDays = (snap && snap.win && snap.win.days) || [];
    if (!currDays.length) return;
    const clampedIdx = Math.max(0, Math.min(currDays.length - 1, Number(nextIdx) || 0));
    v3State.channelSelectedDayIdx = clampedIdx;
    v3State.channelSelectedDayIso = currDays[clampedIdx];
    v3State.channelDailyPanelOpen = Boolean(openPanel);

    const panel = document.getElementById('v3-channel-daily-report-panel');
    if (panel) {
      panel.classList.toggle('is-open', v3State.channelDailyPanelOpen);
      panel.classList.toggle('is-closed', !v3State.channelDailyPanelOpen);
      panel.classList.toggle('is-panel-open', v3State.channelDailyPanelOpen);
      panel.classList.toggle('is-panel-closed', !v3State.channelDailyPanelOpen);
      panel.setAttribute('data-daily-open', v3State.channelDailyPanelOpen ? 'true' : 'false');
      panel.setAttribute('data-panel-open', v3State.channelDailyPanelOpen ? 'true' : 'false');
      panel.setAttribute('data-selected-day', v3State.channelSelectedDayIso || '');
      panel.setAttribute('data-selected-day-idx', String(clampedIdx));
      panel.innerHTML = renderDailyReportPanelInner(cp, snap, refWin, demo);
      bindDailyReportPanelEvents(panel, cp, snap, refWin, demo);
    }

    const chart = chartInstances['channelSingle'];
    if (chart) {
      chart.update('none');
    }
  }

  function bindDailyReportPanelEvents(container, cp, snap, refWin, demo) {
    if (!container) return;
    const currDays = (snap && snap.win && snap.win.days) || [];
    const M = currDays.length;

    container.querySelector('#v3-daily-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      updateDailyReportSelection(v3State.channelSelectedDayIdx || 0, false, cp, snap, refWin, demo);
    });

    container.querySelector('#v3-daily-prev-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const curIdx = resolveChannelSelectedDayIdx(cp, snap.win);
      if (curIdx > 0) {
        updateDailyReportSelection(curIdx - 1, true, cp, snap, refWin, demo);
      }
    });

    container.querySelector('#v3-daily-next-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const curIdx = resolveChannelSelectedDayIdx(cp, snap.win);
      if (curIdx < M - 1) {
        updateDailyReportSelection(curIdx + 1, true, cp, snap, refWin, demo);
      }
    });

    container.querySelectorAll('[data-open-day-idx], [data-daily-jump-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const attrVal = btn.getAttribute('data-open-day-idx') ?? btn.getAttribute('data-daily-jump-idx');
        const idx = Number(attrVal);
        if (!Number.isNaN(idx)) {
          updateDailyReportSelection(idx, true, cp, snap, refWin, demo);
        }
      });
    });
  }

  function renderChannelSingleMode(body, snap, cp, demo) {
    const curr = cp.curr;
    const meta = cp.meta;
    const win = snap.win;
    const currRangeFullVN = `${formatIsoToVN(win.start)} – ${formatIsoToVN(win.end)}`;
    const currRangeShort = `${formatIsoToShortVN(win.start)}–${formatIsoToShortVN(win.end)}`;

    // Ensure valid chart metric ('views' | 'netSubs' | 'videosPublished' | 'revenue')
    const validChartMetrics = ['views', 'netSubs', 'videosPublished', 'revenue'];
    if (!validChartMetrics.includes(v3State.channelChartMetric)) {
      v3State.channelChartMetric = 'views';
    }

    // Build reference window & metrics (Item 10 & Item 12)
    const refWin = buildChannelRefWindow(win, cp, snap);
    const ref = refWin.refMetrics;
    const M = refWin.currDayCount;
    const N = refWin.refDayCount;
    const useAvg = refWin.isUnequalLength && v3State.channelUnequalMode === 'avg';

    // Fetch 10 sample videos for this channel to compute the 1-line video summary below chart (Item 13)
    const periodVideosFromDaily = (demo && demo.getPeriodVideoViews) ? demo.getPeriodVideoViews(cp.id, win.start, win.end) : null;
    const rawVids = (core().DATA_STORE && core().DATA_STORE.getVideos(cp.id)) || [];
    const periodType = win.dayCount <= 7 ? 'metrics_7d' : (win.dayCount <= 28 ? 'metrics_28d' : 'metrics');
    const enrichedVideos = (periodVideosFromDaily && periodVideosFromDaily.length > 0 && curr.hasAnalytics)
      ? periodVideosFromDaily
      : rawVids.map(v => {
          const vs = (demo && demo.getVideoSummary) ? demo.getVideoSummary(v.id) : null;
          const pMetrics = vs ? (vs[periodType] || vs.metrics || vs.metrics_28d) : null;
          const periodViews = (curr.hasAnalytics && pMetrics && pMetrics.views !== undefined)
            ? pMetrics.views
            : (curr.views !== null && vs && (vs.metrics || vs.metrics_28d) ? (vs.metrics || vs.metrics_28d).views : 0);
          return {
            ...v,
            periodViews
          };
        }).sort((a, b) => (b.periodViews || 0) - (a.periodViews || 0));

    const top1Vid = enrichedVideos[0] || null;
    const top1Views = top1Vid ? (top1Vid.periodViews || 0) : 0;
    const top1SharePct = (curr.views && curr.views > 0) ? ((top1Views / curr.views) * 100) : 0;
    const top3Views = enrichedVideos.slice(0, 3).reduce((s, v) => s + (v.periodViews || 0), 0);
    const top3SharePct = (curr.views && curr.views > 0) ? ((top3Views / curr.views) * 100) : 0;

    // Breakdowns: Country (Vietnamese names + "Khác") & Traffic Sources ("Danh sách phát", "Người đăng ký", "Tìm kiếm YouTube", "Khác")
    const bdKey = win.dayCount <= 7
      ? 'last_7_days'
      : (win.dayCount <= 28 ? 'last_28_days' : (win.dayCount <= 31 ? 'last_30_days' : 'last_90_days'));
    const breakdowns = (demo && demo.getChannelBreakdowns) ? demo.getChannelBreakdowns(cp.id, bdKey) : null;

    const totalChViews = curr.views !== null ? curr.views : 0;
    const totalChHours = curr.watchHours !== null ? curr.watchHours : null;
    const totalChRev = (curr.hasMonetary && curr.estimatedRevenue !== null) ? curr.estimatedRevenue : null;

    const COUNTRY_VN_MAP = {
      US: 'Hoa Kỳ',
      VN: 'Việt Nam',
      GB: 'Vương quốc Anh',
      CA: 'Canada'
    };
    const rawCountries = (breakdowns && breakdowns.country) ? breakdowns.country : [];
    const rawCViewsSum = rawCountries.reduce((s, r) => s + (r.views || 0), 0);
    const rawCHoursSum = rawCountries.reduce((s, r) => s + (r.estimatedHoursWatched || 0), 0);
    const rawCRevSum = rawCountries.reduce((s, r) => s + (r.estimatedRevenue || 0), 0);

    const namedCountries = rawCountries
      .filter(r => r.value !== 'OTHER' && COUNTRY_VN_MAP[r.value])
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .map(r => ({
        code: r.value,
        label: COUNTRY_VN_MAP[r.value],
        isOther: false,
        views: rawCViewsSum > 0 ? Math.round((r.views / rawCViewsSum) * totalChViews) : 0,
        hours: (rawCHoursSum > 0 && totalChHours !== null) ? Number(((r.estimatedHoursWatched / rawCHoursSum) * totalChHours).toFixed(2)) : 0,
        revenue: (totalChRev !== null && rawCRevSum > 0 && r.estimatedRevenue !== null)
          ? Number(((r.estimatedRevenue / rawCRevSum) * totalChRev).toFixed(2))
          : (totalChRev === 0 ? 0 : null)
      }));
    const sumNamedCViews = namedCountries.reduce((s, x) => s + x.views, 0);
    const sumNamedCHours = namedCountries.reduce((s, x) => s + (x.hours || 0), 0);
    const sumNamedCRev = namedCountries.reduce((s, x) => s + (x.revenue || 0), 0);
    const countryRows = [
      ...namedCountries,
      {
        code: 'OTHER',
        label: 'Khác',
        isOther: true,
        views: Math.max(0, totalChViews - sumNamedCViews),
        hours: totalChHours !== null ? Math.max(0, Number((totalChHours - sumNamedCHours).toFixed(2))) : null,
        revenue: totalChRev !== null ? Math.max(0, Number((totalChRev - sumNamedCRev).toFixed(2))) : null
      }
    ];
    const countryShares = allocateExactTenthsPct(countryRows.map(r => r.views));

    // Item 1: Tách đủ 5 nguồn truy cập thực tế từ YouTube Analytics để dòng "Khác" (NO_LINK_OTHER) dưới ~20% và vẫn cộng đúng tổng views kênh (465.653)
    const TRAFFIC_VN_ITEMS = [
      { key: 'RELATED_VIDEO', label: 'Video đề xuất' },
      { key: 'SUBSCRIBER', label: 'Người đăng ký' },
      { key: 'YT_SEARCH', label: 'Tìm kiếm YouTube' },
      { key: 'PLAYLIST', label: 'Danh sách phát' },
      { key: 'EXT_URL', label: 'Nguồn bên ngoài' }
    ];
    const rawTraffic = (breakdowns && breakdowns.insightTrafficSourceType) ? breakdowns.insightTrafficSourceType : [];
    const rawTViewsSum = rawTraffic.reduce((s, r) => s + (r.views || 0), 0);
    const rawTHoursSum = rawTraffic.reduce((s, r) => s + (r.estimatedHoursWatched || 0), 0);
    const namedTraffic = TRAFFIC_VN_ITEMS.map(item => {
      const found = rawTraffic.find(r => r.value === item.key);
      const rawV = found ? (found.views || 0) : 0;
      const rawH = found ? (found.estimatedHoursWatched || 0) : 0;
      return {
        key: item.key,
        label: item.label,
        isOther: false,
        views: rawTViewsSum > 0 ? Math.round((rawV / rawTViewsSum) * totalChViews) : 0,
        hours: (rawTHoursSum > 0 && totalChHours !== null) ? Number(((rawH / rawTHoursSum) * totalChHours).toFixed(2)) : 0
      };
    }).sort((a, b) => (b.views || 0) - (a.views || 0));
    const sumNamedTViews = namedTraffic.reduce((s, x) => s + x.views, 0);
    const sumNamedTHours = namedTraffic.reduce((s, x) => s + (x.hours || 0), 0);
    const trafficRows = [
      ...namedTraffic,
      {
        key: 'OTHER',
        label: 'Khác',
        isOther: true,
        views: Math.max(0, totalChViews - sumNamedTViews),
        hours: totalChHours !== null ? Math.max(0, Number((totalChHours - sumNamedTHours).toFixed(2))) : null
      }
    ];
    const trafficShares = allocateExactTenthsPct(trafficRows.map(r => r.views));

    // KPI comparison values (supports both equal-length / Total mode and unequal-length Trung bình/ngày mode)
    const cmpViewsCurr = curr.views !== null ? (useAvg ? curr.views / M : curr.views) : null;
    const cmpViewsRef = ref.views !== null ? (useAvg ? ref.views / N : ref.views) : null;
    const cmpSubsCurr = curr.netSubs !== null ? (useAvg ? curr.netSubs / M : curr.netSubs) : null;
    const cmpSubsRef = ref.netSubs !== null ? (useAvg ? ref.netSubs / N : ref.netSubs) : null;
    const cmpVidsCurr = curr.videosPublished !== null ? (useAvg ? curr.videosPublished / M : curr.videosPublished) : null;
    const cmpVidsRef = ref.videosPublished !== null ? (useAvg ? ref.videosPublished / N : ref.videosPublished) : null;
    const cmpRevCurr = curr.estimatedRevenue !== null ? (useAvg ? curr.estimatedRevenue / M : curr.estimatedRevenue) : null;
    const cmpRevRef = ref.estimatedRevenue !== null ? (useAvg ? ref.estimatedRevenue / N : ref.estimatedRevenue) : null;

    const viewsSubText = useAvg
      ? `TB/ngày: ${cmpViewsRef !== null ? fmtInt(Math.round(cmpViewsRef)) : '—'} (${refWin.refRangeShort})`
      : `So với ${ref.views !== null ? fmtInt(ref.views) : '—'} (${refWin.refRangeShort})`;
    const subsRefFormatted = ref.netSubs !== null ? (ref.netSubs > 0 ? '+' + fmtInt(ref.netSubs) : fmtInt(ref.netSubs)) : '—';
    const subsSubText = useAvg
      ? `TB/ngày: ${cmpSubsRef !== null ? fmtDec(cmpSubsRef, 1) : '—'} (${refWin.refRangeShort})`
      : `So với ${subsRefFormatted} (${refWin.refRangeShort})`;
    const vidsSubText = useAvg
      ? `TB/ngày: ${cmpVidsRef !== null ? fmtDec(cmpVidsRef, 2) : '—'} video (${refWin.refRangeShort})`
      : `So với ${fmtInt(ref.videosPublished)} video (${refWin.refRangeShort})`;
    const engSubText = `So với ${ref.engagementRate !== null ? fmtDec(ref.engagementRate, 2) + '%' : '—'} (${refWin.refRangeShort})`;
    const revSubText = useAvg
      ? `TB/ngày: ${cmpRevRef !== null ? fmtMoney(cmpRevRef) : '—'} (${refWin.refRangeShort})`
      : `So với ${ref.estimatedRevenue !== null ? fmtMoney(ref.estimatedRevenue) : '—'} (${refWin.refRangeShort})`;

    const avdStr = curr.avdSeconds !== null
      ? `${Math.floor(curr.avdSeconds / 60)}p${String(Math.round(curr.avdSeconds % 60)).padStart(2, '0')}s`
      : '—';
    const viewsTooltip = `Nguồn: ${curr.hasAnalytics ? 'YouTube Analytics' : 'Snapshot công khai'} • Trung bình: ${curr.views !== null ? fmtInt(Math.round(curr.views / M)) : '—'} views/ngày`;
    const subsTooltip = `Sub mới: +${fmtInt(curr.subsGained)} • Sub hủy: −${fmtInt(curr.subsLost)} • Bước làm tròn công khai: ${fmtInt(meta.subRoundingStep)}`;
    const vidsTooltip = `Đăng gần nhất: ${formatIsoToVN(cp.lastPublishedCutoff)} (${cp.daysSinceLastUpload} ngày trước) • Nhịp đăng kỳ vọng: ${meta.expectedUploadCycleDays} ngày/video`;
    // Item 4: Thẻ Tỷ lệ tương tác: tooltip ghi "Không có biểu đồ theo ngày"
    const engTooltip = `Không có biểu đồ theo ngày • Likes: ${fmtInt(curr.likes)} • Comments: ${fmtInt(curr.comments)}${curr.engagementIncludesShares ? ` • Shares: ${fmtInt(curr.shares)}` : ''}`;
    const revTooltip = `Giờ xem: ${curr.watchHours !== null ? fmtInt(curr.watchHours) + 'h' : '—'} • AVD: ${avdStr} • RPM: ${curr.proxyRpm !== null ? fmtMoney(curr.proxyRpm) : '—'}`;

    const healthConclusion = buildChannelHealthConclusion(cp, win, refWin, snap);

    const metricTitleMap = {
      views: 'Views',
      netSubs: 'Sub ròng',
      videosPublished: 'Video đăng',
      revenue: 'Doanh thu'
    };
    const activeMetricTitle = metricTitleMap[v3State.channelChartMetric] || 'Views';

    // Determine status chip in Chart Header Row 1 (always occupies space to prevent UI jump)
    let statusChipVisible = false;
    let statusChipText = 'Đối chứng cùng độ dài';
    let statusChipIsError = false;
    if (v3State.channelRefError) {
      statusChipVisible = true;
      statusChipText = v3State.channelRefError;
      statusChipIsError = true;
    } else if (refWin.isUnequalLength) {
      statusChipVisible = true;
      statusChipText = `Đối chứng ${N} ngày, kỳ này ${M} ngày`;
    } else if (win.isPartialQuarter) {
      statusChipVisible = true;
      statusChipText = `Chưa trọn quý (${win.dayCount}/${win.quarterCalendarDays} ngày) · So với ${win.dayCount} ngày đầu`;
    }

    body.innerHTML = `
      <!-- 1. KHỐI NHẬN DIỆN KÊNH + BỘ CHỌN KÊNH CỐ ĐỊNH + HÀNG TOÀN THỜI GIAN + KẾT LUẬN XU HƯỚNG -->
      <section class="v3-panel v3-ch-identity-locked" id="v3-channel-identity-panel">
        <!-- Hàng 1 cố định riêng cho Công tắc chế độ ("Một kênh | So sánh kênh") & Ô chọn kênh (Mục 2 & Mục 7) -->
        <div class="v3-ch-control-row" id="v3-channel-control-row">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div class="v3-preset-group" id="v3-channel-mode-switch" role="group" aria-label="Chế độ xem kênh">
              <button type="button" class="v3-preset-btn active" data-ch-mode="single">Một kênh</button>
              <button type="button" class="v3-preset-btn" data-ch-mode="compare">So sánh kênh</button>
            </div>

            <!-- Ô chọn kênh duy nhất đặt cố định ở vị trí riêng, dùng chung component dropdown nổi -->
            ${renderUnifiedFloatingPicker({
              wrapperId: 'v3-channel-search-picker',
              btnId: 'v3-channel-picker-btn',
              btnClass: 'v3-ch-picker-btn',
              btnTitle: 'Chọn hoặc tìm kiếm kênh YouTube',
              triggerHtml: `
                <span class="v3-team-dot" style="background:${meta.channelColor};"></span>
                <span class="v3-ch-picker-btn-text">
                  <strong>${esc(meta.title)}</strong>
                  <span style="color:var(--text-muted);font-weight:500;">· ${esc(meta.employeeName)} · ${esc(meta.teamName)}</span>
                </span>
                <i class="ri-search-eye-line" style="color:#38BDF8;font-size:14px;margin-left:4px;"></i>
                <i class="ri-arrow-down-s-line" style="color:var(--text-muted);font-size:15px;"></i>
              `,
              menuId: 'v3-channel-picker-menu',
              searchId: 'v3-channel-picker-search',
              searchPlaceholder: 'Tìm tên kênh, @handle, PIC, team...',
              searchQuery: v3State.channelPickerQuery,
              teamBarId: 'v3-channel-picker-team-bar',
              teamChipAttr: 'data-ch-picker-team',
              teamFilter: v3State.channelPickerTeamFilter,
              showTop3AndClear: false,
              listId: 'v3-channel-picker-list',
              emptyId: 'v3-channel-picker-empty',
              emptyText: 'Không tìm thấy kênh phù hợp',
              isOpen: v3State.channelPickerOpen,
              isMulti: false,
              maxSelect: 1,
              selectedIds: [cp.id],
              rowToggleAttr: 'data-pick-channel-id',
              rowTeamAttr: 'data-pick-team-id',
              items: snap.channelPairs.map(item => ({
                id: item.id,
                title: item.meta.title,
                subtitle: `${item.meta.handle} · PIC: ${item.meta.employeeName}`,
                color: item.meta.channelColor,
                teamId: item.meta.teamId,
                teamName: item.meta.teamName.replace(/^Team\s+/i, ''),
                teamColor: item.meta.teamColor,
                views: item.curr.views,
                searchBlob: `${item.meta.title} ${item.meta.handle} ${item.meta.employeeName} ${item.meta.teamName}`.toLowerCase()
              })),
              extraHtml: `
                <select id="v3-single-channel-select" style="display:none;" aria-hidden="true">
                  ${snap.channelPairs.map(item => `
                    <option value="${item.id}" ${item.id === cp.id ? 'selected' : ''}>${esc(item.meta.title)}</option>
                  `).join('')}
                </select>
              `
            })}
          </div>

          <div style="display:flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;">
            <span class="v3-badge ${curr.hasAnalytics ? 'analytics' : 'warn'}" id="v3-channel-oauth-status-badge">
              ${curr.hasAnalytics ? '[Đã kết nối Analytics]' : 'Chưa cấp quyền Analytics'}
            </span>
            <span class="v3-badge muted" id="v3-channel-analytics-delay-note">Dữ liệu Analytics có độ trễ 2–3 ngày</span>
          </div>
        </div>

        <!-- Hàng 2: Khối định danh kênh độc lập -->
        <div class="v3-ch-identity-top" style="height:44px;min-height:44px;max-height:44px;">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;width:100%;">
            <img src="${esc(meta.avatar)}" alt="${esc(meta.title)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid ${meta.channelColor};flex-shrink:0;" onerror="this.style.display='none'">
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap;white-space:nowrap;height:22px;">
                <h2 style="font-size:16.5px;font-weight:800;color:var(--text-main);margin:0;white-space:nowrap;">${esc(meta.title)}</h2>
                <span style="font-size:11.8px;color:var(--text-muted);font-family:var(--font-mono);white-space:nowrap;">${esc(meta.handle)}</span>
                <span class="v3-badge" style="background:${meta.teamColor}22;color:${meta.teamColor};border:1px solid ${meta.teamColor}55;">
                  <span class="v3-team-dot" style="background:${meta.teamColor};"></span> ${esc(meta.teamName)}
                </span>
                <span style="margin:0 4px;color:var(--text-dim);">·</span>
                <span style="font-size:12px;color:var(--text-muted);">Người phụ trách (PIC): <strong style="color:var(--text-main);" id="v3-channel-pic-name">${esc(meta.employeeName)}</strong></span>
                <span style="margin:0 4px;color:var(--text-dim);">·</span>
                <span style="font-size:12px;color:var(--text-muted);">Kỳ đang xem: <strong style="color:var(--text-main);font-family:var(--font-mono);">${currRangeFullVN}</strong></span>
                <span class="v3-badge partial" style="margin-left:4px;visibility:${win.isPartialQuarter ? 'visible' : 'hidden'};">Chưa trọn quý (${win.dayCount}/${win.quarterCalendarDays} ngày)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- HÀNG "TOÀN THỜI GIAN" (Không đổi khi đổi bộ chọn kỳ) -->
        <div class="v3-ch-lifetime-strip" id="v3-channel-lifetime-strip">
          <span class="v3-ch-lifetime-tag" title="Số liệu tích lũy toàn thời gian của kênh, không thay đổi theo bộ chọn kỳ">
            <i class="ri-history-line"></i> Toàn thời gian
          </span>
          <div class="v3-ch-lifetime-items">
            <span class="v3-ch-lifetime-item">
              Tổng sub hiện tại: <strong data-lifetime-subs="${meta.subscribers}">${fmtInt(meta.subscribers)}</strong>
            </span>
            <span class="v3-scope-sep">·</span>
            <span class="v3-ch-lifetime-item">
              Tổng views trọn đời: <strong data-lifetime-views="${meta.lifetimeViews}">${fmtInt(meta.lifetimeViews)}</strong>
            </span>
            <span class="v3-scope-sep">·</span>
            <span class="v3-ch-lifetime-item">
              Tổng số video: <strong data-lifetime-videos="${meta.lifetimeVideos}">${fmtInt(meta.lifetimeVideos)} video</strong>
            </span>
            <span class="v3-scope-sep">·</span>
            <span class="v3-ch-lifetime-item">
              Ngày tạo kênh: <strong data-lifetime-created="${meta.createdDatePt}">${formatIsoToVN(meta.createdDatePt)}</strong>
            </span>
            <span class="v3-scope-sep">·</span>
            <span class="v3-ch-lifetime-item">
              Ngày đăng gần nhất: <strong data-lifetime-last-pub="${cp.lastPublishedCutoff}">${formatIsoToVN(cp.lastPublishedCutoff)}</strong>
              <span class="${cp.daysSinceLastUpload > 7 ? 'v3-slow-upload-pill' : ''}" style="font-size:11px;margin-left:3px;">(${cp.daysSinceLastUpload} ngày trước)</span>
            </span>
          </div>
        </div>

        <!-- DÒNG KẾT LUẬN TỰ ĐỘNG: "Kênh này đang đi lên hay đi xuống?" (Mục 1 & Mục 9) -->
        <div class="v3-ch-health-bar" id="v3-channel-health-bar">
          <span class="v3-ch-health-q">Kênh này đang đi lên hay đi xuống?</span>
          <span class="v3-ch-health-text" id="v3-channel-health-conclusion">${esc(healthConclusion)}</span>
        </div>
      </section>

      <!-- 2. KHỐI 5 THẺ KPI TRONG KỲ (Kiêm bộ chọn chỉ số cho biểu đồ xu hướng · Khóa chiều cao chống nhảy UI) -->
      <section class="v3-panel v3-ch-kpi-locked" id="v3-channel-kpi-panel">
        <div class="v3-chart-a-header-row1" style="margin-bottom:8px;">
          <div class="v3-panel-title" style="font-size:14.5px;white-space:nowrap;">
            <i class="ri-dashboard-3-line" style="color:${meta.channelColor};"></i>
            <span>Chỉ số kênh trong kỳ</span>
            <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
          </div>
          <div style="font-size:11.2px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            Nhấn thẻ <strong>Views / Sub ròng / Video đăng / Doanh thu</strong> để đổi biểu đồ · Rê chuột xem chi tiết
          </div>
        </div>

        <div class="v3-kpi-grid v3-ch-kpi-grid-locked" id="v3-channel-kpi-grid">
          <!-- Card 1: Views (Selectable) -->
          <div class="v3-kpi-card v3-ch-kpi-card is-chart-selectable ${v3State.channelChartMetric === 'views' ? 'is-chart-active' : ''}"
               data-ch-kpi-metric="views"
               data-kpi-tooltip="${esc(viewsTooltip)}"
               title="${esc(viewsTooltip)}"
               role="button"
               tabindex="0"
               aria-pressed="${v3State.channelChartMetric === 'views' ? 'true' : 'false'}">
            <div class="v3-kpi-top">
              <span class="v3-kpi-label">Views</span>
              <i class="ri-line-chart-line v3-kpi-chart-icon"></i>
            </div>
            <div class="v3-kpi-value" data-kpi-val="views">${curr.views !== null ? fmtInt(curr.views) : '—'}</div>
            <div class="v3-kpi-delta-row" data-kpi-delta="views">${fmtDeltaBadge(cmpViewsCurr, cmpViewsRef)}</div>
            <div class="v3-kpi-sub" data-kpi-sub="views">${esc(viewsSubText)}</div>
          </div>

          <!-- Card 2: Sub ròng (Selectable) -->
          <div class="v3-kpi-card v3-ch-kpi-card is-chart-selectable ${v3State.channelChartMetric === 'netSubs' ? 'is-chart-active' : ''}"
               data-ch-kpi-metric="netSubs"
               data-kpi-tooltip="${esc(subsTooltip)}"
               title="${esc(subsTooltip)}"
               role="button"
               tabindex="0"
               aria-pressed="${v3State.channelChartMetric === 'netSubs' ? 'true' : 'false'}">
            <div class="v3-kpi-top">
              <span class="v3-kpi-label">Sub ròng</span>
              <i class="ri-line-chart-line v3-kpi-chart-icon"></i>
            </div>
            <div class="v3-kpi-value" data-kpi-val="netSubs">${curr.netSubs !== null ? (curr.netSubs > 0 ? '+' + fmtInt(curr.netSubs) : fmtInt(curr.netSubs)) : '—'}</div>
            <div class="v3-kpi-delta-row" data-kpi-delta="netSubs">
              ${curr.netSubs !== null ? fmtDeltaBadge(cmpSubsCurr, cmpSubsRef) : `<span class="v3-delta flat">— Nhỏ hơn bước ${fmtInt(meta.subRoundingStep)}</span>`}
            </div>
            <div class="v3-kpi-sub" data-kpi-sub="netSubs">${esc(subsSubText)}</div>
          </div>

          <!-- Card 3: Video đăng (Selectable) -->
          <div class="v3-kpi-card v3-ch-kpi-card is-chart-selectable ${v3State.channelChartMetric === 'videosPublished' ? 'is-chart-active' : ''}"
               data-ch-kpi-metric="videosPublished"
               data-kpi-tooltip="${esc(vidsTooltip)}"
               title="${esc(vidsTooltip)}"
               role="button"
               tabindex="0"
               aria-pressed="${v3State.channelChartMetric === 'videosPublished' ? 'true' : 'false'}">
            <div class="v3-kpi-top">
              <span class="v3-kpi-label">Video đăng</span>
              <i class="ri-line-chart-line v3-kpi-chart-icon"></i>
            </div>
            <div class="v3-kpi-value" data-kpi-val="videosPublished">${fmtInt(curr.videosPublished)}</div>
            <div class="v3-kpi-delta-row" data-kpi-delta="videosPublished">${fmtDeltaBadge(cmpVidsCurr, cmpVidsRef)}</div>
            <div class="v3-kpi-sub" data-kpi-sub="videosPublished">${esc(vidsSubText)}</div>
          </div>

          <!-- Card 4: Tỷ lệ tương tác (NOT clickable for chart · Mục 4: Tooltip "Không có biểu đồ theo ngày") -->
          <div class="v3-kpi-card v3-ch-kpi-card is-chart-disabled"
               data-ch-kpi-disabled="true"
               data-kpi-tooltip="${esc(engTooltip)}"
               title="${esc(engTooltip)}">
            <div class="v3-kpi-top">
              <span class="v3-kpi-label">Tỷ lệ tương tác</span>
              <i class="ri-information-line v3-kpi-info-icon" title="Không có biểu đồ theo ngày"></i>
            </div>
            <div class="v3-kpi-value" data-kpi-val="engagementRate">${curr.engagementRate !== null ? fmtDec(curr.engagementRate, 2) + '%' : '—'}</div>
            <div class="v3-kpi-delta-row" data-kpi-delta="engagementRate">${fmtDeltaBadge(curr.engagementRate, ref.engagementRate, false, true)}</div>
            <div class="v3-kpi-sub" data-kpi-sub="engagementRate">${esc(engSubText)}</div>
          </div>

          <!-- Card 5: Doanh thu (Selectable) -->
          <div class="v3-kpi-card v3-ch-kpi-card is-chart-selectable ${v3State.channelChartMetric === 'revenue' ? 'is-chart-active' : ''}"
               data-ch-kpi-metric="revenue"
               data-kpi-tooltip="${esc(revTooltip)}"
               title="${esc(revTooltip)}"
               role="button"
               tabindex="0"
               aria-pressed="${v3State.channelChartMetric === 'revenue' ? 'true' : 'false'}">
            <div class="v3-kpi-top">
              <span class="v3-kpi-label">Doanh thu</span>
              <i class="ri-line-chart-line v3-kpi-chart-icon"></i>
            </div>
            <div class="v3-kpi-value" data-kpi-val="revenue">${curr.estimatedRevenue !== null ? fmtMoney(curr.estimatedRevenue) : (curr.hasAnalytics ? '—' : '<span style="font-size:12px;color:#FBBF24;">Chưa cấp quyền Analytics</span>')}</div>
            <div class="v3-kpi-delta-row" data-kpi-delta="revenue">${curr.estimatedRevenue !== null ? fmtDeltaBadge(cmpRevCurr, cmpRevRef, true) : `<span class="v3-delta flat" style="font-size:10px;padding:2px 5px;">Dữ liệu Analytics trễ 2–3 ngày</span>`}</div>
            <div class="v3-kpi-sub" data-kpi-sub="revenue">${esc(revSubText)}</div>
          </div>
        </div>
      </section>

      <!-- 3. KHỐI BIỂU ĐỒ XU HƯỚNG KÊNH + DÒNG TÓM TẮT VIDEO (Gộp chú giải lên hàng "So với" · Mục 6) -->
      <section class="v3-panel v3-ch-trend-locked" id="v3-channel-trend-panel">
        <div class="v3-chart-a-header" id="v3-channel-chart-header">
          <div class="v3-chart-a-header-row1" id="v3-channel-chart-header-row1">
            <div class="v3-panel-title" style="white-space:nowrap;">
              <i class="ri-line-chart-line" style="color:${meta.channelColor};"></i>
              <span id="v3-channel-chart-title">Xu hướng ${esc(activeMetricTitle)} theo ngày</span>
              <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
            </div>
            <span class="v3-chart-status-chip ${statusChipVisible ? 'is-visible' : 'is-hidden'} ${statusChipIsError ? 'is-error' : ''}" id="v3-channel-chart-status-chip">
              <span class="v3-chart-status-chip-text">${esc(statusChipText)}</span>
            </span>
          </div>

          <div class="v3-chart-a-header-row2" id="v3-channel-chart-header-row2">
            <span style="font-size:11.5px;color:var(--text-muted);font-weight:700;flex-shrink:0;">So với:</span>
            <div class="v3-preset-group" id="v3-channel-ref-mode-group" role="group" aria-label="Chọn kỳ đối chứng">
              <button type="button" class="v3-preset-btn ${refWin.mode === 'prev' ? 'active' : ''}" data-ch-ref-mode="prev">Kỳ trước</button>
              <button type="button" class="v3-preset-btn ${refWin.mode === 'prev_quarter' ? 'active' : ''}" data-ch-ref-mode="prev_quarter">Quý trước</button>
              <button type="button" class="v3-preset-btn ${refWin.mode === 'yoy' ? 'active' : ''}" data-ch-ref-mode="yoy" ${!curr.hasYoYHistory ? 'disabled' : ''}>Cùng kỳ năm ngoái</button>
              <button type="button" class="v3-preset-btn ${refWin.mode === 'custom' ? 'active' : ''}" data-ch-ref-mode="custom">Tùy chỉnh</button>
            </div>

            <div class="v3-chart-period-slot" id="v3-channel-ref-date-slot">
              ${refWin.mode === 'custom' ? `
                <div class="v3-chart-custom-dates" id="v3-ch-ref-custom-dates" title="Khoảng ngày đối chứng tùy chỉnh">
                  <i class="ri-calendar-event-line v3-date-range-icon"></i>
                  <input type="date" id="v3-ch-ref-start" class="v3-date-range-part" value="${refWin.refStart}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày đối chứng">
                  <span class="v3-chart-date-sep">→</span>
                  <input type="date" id="v3-ch-ref-end" class="v3-date-range-part" value="${refWin.refEnd}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày đối chứng">
                </div>
              ` : `
                <select id="v3-ch-ref-fixed-select" class="v3-select v3-select-sm v3-chart-slot-control" disabled aria-label="Khoảng ngày kỳ đối chứng">
                  <option>${refWin.refRangeFullVN} (${refWin.refDayCount} ngày)</option>
                </select>
              `}
            </div>

            <div class="v3-preset-group" id="v3-ch-unequal-mode-group" style="display:${refWin.isUnequalLength ? 'inline-flex' : 'none'};" role="group" aria-label="Chế độ tính delta khi kỳ đối chứng khác số ngày">
              <button type="button" class="v3-preset-btn ${v3State.channelUnequalMode === 'avg' ? 'active' : ''}" data-ch-unequal-mode="avg">Trung bình/ngày</button>
              <button type="button" class="v3-preset-btn ${v3State.channelUnequalMode === 'total' ? 'active' : ''}" data-ch-unequal-mode="total">Tổng</button>
            </div>

            <!-- Mục 6: Gộp chú giải "Kỳ này / Kỳ đối chứng" lên hàng "So với" để tiết kiệm chiều cao -->
            <div class="v3-ch-inline-legend" id="v3-channel-inline-legend">
              <span class="v3-ch-legend-item">
                <span class="v3-ch-legend-line solid" style="background:${meta.channelColor};"></span>
                <span>Kỳ này (${currRangeShort})</span>
              </span>
              <span class="v3-ch-legend-item">
                <span class="v3-ch-legend-line dashed"></span>
                <span>${refWin.mode === 'yoy' ? 'Năm ngoái' : esc(refWin.refModeName)} (${refWin.refRangeShort})</span>
              </span>
            </div>
          </div>
        </div>

        <div class="v3-chart-a-canvas-wrap" id="v3-channel-chart-canvas-wrap" style="height:220px;min-height:220px;max-height:220px;">
          <canvas id="v3-channel-single-canvas"></canvas>
        </div>

        <!-- MỘT DÒNG TÓM TẮT VIDEO NGAY DƯỚI BIỂU ĐỒ (Mục 13) -->
        <div class="v3-ch-video-summary-line" id="v3-channel-video-summary-line" title="${top1Vid ? esc(top1Vid.title) : ''}">
          ${top1Vid && curr.views ? `
            <span>Video lớn nhất trong kỳ:</span>
            <strong class="v3-ch-video-summary-title">${esc(top1Vid.title)}</strong>
            <span>(<strong>${fmtInt(top1Views)}</strong> views · <strong>${fmtDec(top1SharePct, 1)}%</strong> views kênh)</span>
            <span class="v3-scope-sep">·</span>
            <span>Top 3 video đóng góp <strong>${fmtInt(top3Views)}</strong> views (<strong>${fmtDec(top3SharePct, 1)}%</strong> tổng views kênh).</span>
          ` : `
            Chưa có dữ liệu phân rã video trong kỳ đang chọn.
          `}
        </div>
      </section>

      <!-- 3B. PANEL "BÁO CÁO NGÀY" NGAY DƯỚI BIỂU ĐỒ XU HƯỚNG (Chiếm chỗ cố định 274px, mở/đóng/chuyển ngày không nhảy UI) -->
      <section class="v3-panel v3-ch-daily-report-locked ${v3State.channelDailyPanelOpen ? 'is-panel-open' : 'is-panel-closed'}"
               id="v3-channel-daily-report-panel"
               data-panel-open="${v3State.channelDailyPanelOpen ? 'true' : 'false'}">
        ${renderDailyReportPanelInner(cp, snap, refWin, demo)}
      </section>

      <!-- 4. KHỐI GẬP MẶC ĐỊNH: "QUỐC GIA VÀ NGUỒN TRUY CẬP" (Mục 14) -->
      <section class="v3-panel" id="v3-channel-geo-traffic-panel" style="margin-bottom:0;" data-collapsed="${v3State.deepAnalyticsOpen ? 'false' : 'true'}">
        <div class="v3-panel-header" style="margin-bottom:${v3State.deepAnalyticsOpen ? '14px' : '0'};flex-wrap:nowrap;">
          <div style="min-width:0;">
            <div class="v3-panel-title" id="v3-channel-geo-traffic-title" style="white-space:nowrap;">
              <i class="ri-compass-3-line" style="color:#38BDF8;"></i>
              <span>Quốc gia và nguồn truy cập</span>
              <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
              <span class="v3-badge ${curr.hasAnalytics ? 'analytics' : 'warn'}">${curr.hasAnalytics ? '[Analytics]' : 'Chưa cấp quyền Analytics'}</span>
            </div>
            <div class="v3-panel-subtitle">
              Phân rã lượt xem và giờ xem theo Quốc gia và Nguồn truy cập từ YouTube Analytics API v2 · Dữ liệu Analytics có độ trễ 2–3 ngày
            </div>
          </div>
          <button type="button" class="v3-btn" id="v3-btn-toggle-deep-analytics" style="flex-shrink:0;">
            ${v3State.deepAnalyticsOpen ? 'Thu gọn ▲' : 'Mở Quốc gia và nguồn truy cập ▼'}
          </button>
        </div>

        ${v3State.deepAnalyticsOpen ? (
        !curr.hasAnalytics ? `
            <div id="v3-channel-no-oauth-notice" style="padding:20px;border:1px dashed var(--border-medium);border-radius:8px;text-align:center;color:var(--text-muted);">
              <div style="font-size:14px;font-weight:700;color:#FBBF24;margin-bottom:6px;">Chưa cấp quyền Analytics</div>
              <div>
                Kênh <strong>${esc(meta.title)}</strong> chưa kết nối OAuth YouTube Analytics API v2.
                Vui lòng cấp quyền OAuth để xem bảng Quốc gia và Nguồn truy cập (ghi chú: dữ liệu Analytics có độ trễ 2–3 ngày).
              </div>
            </div>
          ` : `
            <div class="v3-grid-2" style="margin-bottom:0;" id="v3-channel-geo-traffic-grid">
              <div>
                <strong style="font-size:13px;display:block;margin-bottom:8px;">Bảng Quốc gia (${currRangeShort})</strong>
                <div class="v3-table-wrap">
                  <table class="v3-table" id="v3-channel-country-table">
                    <thead>
                      <tr>
                        <th>Quốc gia</th>
                        <th class="num">Lượt xem</th>
                        <th class="num">Tỷ trọng</th>
                        <th class="num">Giờ xem</th>
                        <th class="num">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${countryRows.map((row, idx) => `
                        <tr data-country-row="${esc(row.code)}" data-row-views="${row.views}">
                          <td><strong>${esc(row.label)}</strong></td>
                          <td class="num"><strong>${fmtInt(row.views)}</strong></td>
                          <td class="num">${fmtDec(countryShares[idx] || 0, 1)}%</td>
                          <td class="num">${row.hours !== null ? fmtInt(row.hours) + 'h' : '—'}</td>
                          <td class="num">${curr.hasMonetary && row.revenue !== null ? fmtMoney(row.revenue) : '—'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr id="v3-channel-country-total-row" data-total-views="${totalChViews}">
                        <td><strong>Tổng cộng kênh</strong></td>
                        <td class="num"><strong>${fmtInt(totalChViews)}</strong></td>
                        <td class="num"><strong>100,0%</strong></td>
                        <td class="num"><strong>${totalChHours !== null ? fmtInt(totalChHours) + 'h' : '—'}</strong></td>
                        <td class="num"><strong>${curr.hasMonetary && totalChRev !== null ? fmtMoney(totalChRev) : '—'}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <strong style="font-size:13px;display:block;margin-bottom:8px;">Bảng Nguồn truy cập (${currRangeShort})</strong>
                <div class="v3-table-wrap">
                  <table class="v3-table" id="v3-channel-traffic-table">
                    <thead>
                      <tr>
                        <th>Nguồn truy cập</th>
                        <th class="num">Lượt xem</th>
                        <th class="num">Tỷ trọng</th>
                        <th class="num">Giờ xem</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${trafficRows.map((row, idx) => `
                        <tr data-traffic-row="${esc(row.key)}" data-row-views="${row.views}">
                          <td><strong>${esc(row.label)}</strong></td>
                          <td class="num"><strong>${fmtInt(row.views)}</strong></td>
                          <td class="num">${fmtDec(trafficShares[idx] || 0, 1)}%</td>
                          <td class="num">${row.hours !== null ? fmtInt(row.hours) + 'h' : '—'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr id="v3-channel-traffic-total-row" data-total-views="${totalChViews}">
                        <td><strong>Tổng cộng kênh</strong></td>
                        <td class="num"><strong>${fmtInt(totalChViews)}</strong></td>
                        <td class="num"><strong>100,0%</strong></td>
                        <td class="num"><strong>${totalChHours !== null ? fmtInt(totalChHours) + 'h' : '—'}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          `
      ) : ''}
      </section>
    `;

    // Render Single Channel Trend Chart (Current vs Active Reference Period)
    renderSingleChannelChart(cp, snap, refWin);

    // Bind Daily Report Panel events (× close, ‹ › prev/next, quick chips)
    const dailyPanelEl = document.getElementById('v3-channel-daily-report-panel');
    if (dailyPanelEl) {
      bindDailyReportPanelEvents(dailyPanelEl, cp, snap, refWin, demo);
    }

    // Bind Mode Switch ("Một kênh | So sánh kênh")
    body.querySelectorAll('[data-ch-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextMode = btn.getAttribute('data-ch-mode');
        if (!nextMode || v3State.channelMode === nextMode) return;
        v3State.channelMode = nextMode;
        v3State.channelPickerOpen = false;
        v3State.comparePickerOpen = false;
        if (nextMode === 'compare') {
          if (!v3State.compareChannelIds.includes(v3State.selectedChannelId)) {
            v3State.compareChannelIds = [
              v3State.selectedChannelId,
              ...v3State.compareChannelIds.filter(id => id !== v3State.selectedChannelId)
            ].slice(0, 5);
          } else {
            // Keep selectedChannelId as first row (Kênh gốc)
            v3State.compareChannelIds = [
              v3State.selectedChannelId,
              ...v3State.compareChannelIds.filter(id => id !== v3State.selectedChannelId)
            ];
          }
        }
        renderChannelPage(snap);
      });
    });

    // Bind Unified Floating Single-Channel Picker
    bindUnifiedFloatingPicker(body, {
      wrapperId: 'v3-channel-search-picker',
      btnId: 'v3-channel-picker-btn',
      menuId: 'v3-channel-picker-menu',
      searchId: 'v3-channel-picker-search',
      listId: 'v3-channel-picker-list',
      emptyId: 'v3-channel-picker-empty',
      teamChipAttr: 'data-ch-picker-team',
      rowToggleAttr: 'data-pick-channel-id',
      rowTeamAttr: 'data-pick-team-id',
      getOpenState: () => v3State.channelPickerOpen,
      setOpenState: (v) => { v3State.channelPickerOpen = v; },
      getSearchQuery: () => v3State.channelPickerQuery,
      setSearchQuery: (v) => { v3State.channelPickerQuery = v; },
      getTeamFilter: () => v3State.channelPickerTeamFilter,
      setTeamFilter: (v) => { v3State.channelPickerTeamFilter = v; },
      onRowClick: (nextId) => {
        v3State.selectedChannelId = nextId;
        v3State.channelPickerOpen = false;
        v3State.channelPickerQuery = '';
        renderSharedHeader(snap, 'view-report-channel');
        renderChannelPage(snap);
      }
    });

    const chSel = document.getElementById('v3-single-channel-select');
    if (chSel) {
      chSel.addEventListener('change', () => {
        v3State.selectedChannelId = chSel.value;
        v3State.channelPickerOpen = false;
        renderSharedHeader(snap, 'view-report-channel');
        renderChannelPage(snap);
      });
    }

    // Bind KPI Card Metric Selection (Item 11)
    body.querySelectorAll('[data-ch-kpi-metric]').forEach(card => {
      const activateMetric = () => {
        const nextMetric = card.getAttribute('data-ch-kpi-metric');
        if (!nextMetric || v3State.channelChartMetric === nextMetric) return;
        v3State.channelChartMetric = nextMetric;
        renderChannelPage(snap);
      };
      card.addEventListener('click', activateMetric);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateMetric();
        }
      });
    });

    // Bind Reference Period Mode ("So với: Kỳ trước / Quý trước / Cùng kỳ năm ngoái / Tùy chỉnh")
    body.querySelectorAll('[data-ch-ref-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const nextMode = btn.getAttribute('data-ch-ref-mode');
        v3State.channelCompareMode = nextMode;
        v3State.channelRefError = '';
        if (nextMode === 'custom') {
          if (!v3State.channelRefStartDate || !v3State.channelRefEndDate ||
              (v3State.channelRefStartDate <= win.end && v3State.channelRefEndDate >= win.start)) {
            v3State.channelRefStartDate = win.prevStart;
            v3State.channelRefEndDate = win.prevEnd;
          }
        }
        renderChannelPage(snap);
      });
    });

    // Bind Custom Reference Date Inputs with Validation (no date > 2026-10-26, no overlap with active window)
    const applyCustomRefDates = () => {
      const sInput = document.getElementById('v3-ch-ref-start');
      const eInput = document.getElementById('v3-ch-ref-end');
      if (!sInput || !eInput) return;
      let s = sInput.value;
      let e = eInput.value;
      if (!s || !e) return;

      if (s > '2026-10-26' || e > '2026-10-26') {
        v3State.channelRefError = 'Không được vượt quá ngày 26/10/2026';
        if (s > '2026-10-26') s = '2026-10-26';
        if (e > '2026-10-26') e = '2026-10-26';
        sInput.value = s;
        eInput.value = e;
        renderChannelPage(snap);
        return;
      }
      if (s > e) {
        v3State.channelRefError = 'Ngày bắt đầu đối chứng phải ≤ ngày kết thúc';
        renderChannelPage(snap);
        return;
      }
      if (s <= win.end && e >= win.start) {
        v3State.channelRefError = `Không được trùng kỳ đang xem (${formatIsoToShortVN(win.start)}–${formatIsoToShortVN(win.end)})`;
        renderChannelPage(snap);
        return;
      }
      v3State.channelRefError = '';
      v3State.channelCompareMode = 'custom';
      v3State.channelRefStartDate = s;
      v3State.channelRefEndDate = e;
      renderChannelPage(snap);
    };
    document.getElementById('v3-ch-ref-start')?.addEventListener('change', applyCustomRefDates);
    document.getElementById('v3-ch-ref-end')?.addEventListener('change', applyCustomRefDates);

    // Bind Unequal-Length Mode Toggle ("Trung bình/ngày" | "Tổng")
    body.querySelectorAll('[data-ch-unequal-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.channelUnequalMode = btn.getAttribute('data-ch-unequal-mode') || 'avg';
        renderChannelPage(snap);
      });
    });

    // Bind Collapsible Country & Traffic Source Section
    const btnDeep = document.getElementById('v3-btn-toggle-deep-analytics');
    if (btnDeep) {
      btnDeep.addEventListener('click', () => {
        v3State.deepAnalyticsOpen = !v3State.deepAnalyticsOpen;
        renderChannelPage(snap);
      });
    }
  }

  function renderSingleChannelChart(cp, snap, refWin) {
    destroyChart('channelSingle');
    const canvas = document.getElementById('v3-channel-single-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const metric = v3State.channelChartMetric || 'views';
    const currDays = snap.win.days || [];
    const refDays = (refWin && refWin.refDays) ? refWin.refDays : (snap.win.prevDays || []);
    const maxLen = Math.max(currDays.length, refDays.length, 1);

    const labels = Array.from({ length: maxLen }, (_, idx) => {
      const d = currDays[idx];
      return d ? formatIsoToShortVN(d) : `Ngày ${idx + 1}`;
    });

    const currData = Array.from({ length: maxLen }, (_, idx) => {
      const d = currDays[idx];
      if (!d) return null;
      const pt = cp.curr.dailyMap.get(d);
      return pt && pt[metric] !== undefined ? pt[metric] : null;
    });

    const refMap = (refWin && refWin.refMetrics && refWin.refMetrics.dailyMap) ? refWin.refMetrics.dailyMap : cp.prev.dailyMap;
    const prevData = Array.from({ length: maxLen }, (_, idx) => {
      const pd = refDays[idx];
      if (!pd || !refMap) return null;
      const pt = refMap.get(pd);
      return pt && pt[metric] !== undefined ? pt[metric] : null;
    });

    const fmtChartMetricVal = (val) => {
      if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
      if (metric === 'revenue') return fmtMoney(val);
      if (metric === 'netSubs') {
        const n = Math.round(Number(val));
        return n > 0 ? `+${fmtInt(n)}` : fmtInt(n);
      }
      if (metric === 'videosPublished') return `${fmtInt(val)} video`;
      return fmtInt(val);
    };

    const currRangeShort = `${formatIsoToShortVN(snap.win.start)}–${formatIsoToShortVN(snap.win.end)}`;
    const refModeName = refWin ? refWin.refModeName : 'Kỳ trước';
    const refRangeShort = refWin ? refWin.refRangeShort : snap.win.compareRangeShort;
    const lineColor = cp.meta.channelColor || cp.meta.teamColor;
    const demo = core().DEMO_STORE;

    // Resolve nearest day column index for any X coordinate within chartArea (full-column click/hover)
    const getColumnIndexAtX = (chart, pixelX) => {
      const xScale = chart && chart.scales ? chart.scales.x : null;
      const area = chart ? chart.chartArea : null;
      if (!xScale || !area || currDays.length === 0) return -1;
      if (pixelX < area.left - 8 || pixelX > area.right + 8) return -1;
      let bestIdx = 0;
      let bestDist = Infinity;
      const limit = currDays.length;
      for (let i = 0; i < limit; i++) {
        const px = xScale.getPixelForValue(i);
        const dist = Math.abs(pixelX - px);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const v3DailyColumnCrosshairPlugin = {
      id: 'v3DailyColumnCrosshairPlugin',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const area = chart.chartArea;
        const xScale = chart.scales && chart.scales.x;
        if (!ctx || !area || !xScale || currDays.length === 0) return;

        const stepPx = currDays.length > 1
          ? Math.abs(xScale.getPixelForValue(1) - xScale.getPixelForValue(0))
          : Math.max(24, (area.right - area.left) / 2);
        const colHalfW = Math.max(6, Math.min(22, stepPx * 0.45));

        // 1. Selected Day Column Band + Solid Vertical Line + Active Point Ring (when panel is open)
        if (v3State.channelDailyPanelOpen) {
          const selIdx = resolveChannelSelectedDayIdx(cp, snap.win);
          if (selIdx >= 0 && selIdx < currDays.length) {
            const selX = xScale.getPixelForValue(selIdx);
            ctx.save();
            const bandLeft = Math.max(area.left, selX - colHalfW);
            const bandRight = Math.min(area.right, selX + colHalfW);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.11)';
            ctx.fillRect(bandLeft, area.top, Math.max(2, bandRight - bandLeft), area.bottom - area.top);

            ctx.beginPath();
            ctx.moveTo(selX, area.top);
            ctx.lineTo(selX, area.bottom);
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = '#38BDF8';
            ctx.stroke();

            const meta0 = chart.getDatasetMeta(0);
            const ptEl = meta0 && meta0.data ? meta0.data[selIdx] : null;
            if (ptEl && typeof ptEl.y === 'number' && !Number.isNaN(ptEl.y)) {
              ctx.beginPath();
              ctx.arc(selX, ptEl.y, 5.5, 0, Math.PI * 2);
              ctx.fillStyle = lineColor;
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#F8FAFC';
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // 2. Hovered Day Vertical Crosshair Line across full column height
        const hovIdx = typeof v3State.channelHoveredDayIdx === 'number' ? v3State.channelHoveredDayIdx : -1;
        if (hovIdx >= 0 && hovIdx < currDays.length) {
          const hovX = xScale.getPixelForValue(hovIdx);
          ctx.save();
          const bandLeft = Math.max(area.left, hovX - colHalfW);
          const bandRight = Math.min(area.right, hovX + colHalfW);
          ctx.fillStyle = 'rgba(248, 250, 252, 0.045)';
          ctx.fillRect(bandLeft, area.top, Math.max(2, bandRight - bandLeft), area.bottom - area.top);

          ctx.beginPath();
          ctx.setLineDash([4, 3]);
          ctx.moveTo(hovX, area.top);
          ctx.lineTo(hovX, area.bottom);
          ctx.lineWidth = 1.35;
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.78)';
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    const chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      plugins: [v3DailyColumnCrosshairPlugin],
      data: {
        labels,
        datasets: [
          {
            label: `Kỳ này (${currRangeShort})`,
            data: currData,
            borderColor: lineColor,
            backgroundColor: lineColor + '1F',
            borderWidth: 2.6,
            pointRadius: 2.3,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: true
          },
          {
            label: `${refModeName} (${refRangeShort})`,
            data: prevData,
            borderColor: '#94A3B8',
            borderDash: [6, 4],
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 1.8,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: false
          }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 6, bottom: 0 } },
        interaction: { mode: 'index', axis: 'x', intersect: false },
        onHover: (event, activeElements, chartInst) => {
          const nativeEvt = event && event.native ? event.native : null;
          if (!nativeEvt) return;
          const area = chartInst.chartArea;
          const x = event.x;
          const y = event.y;
          if (area && x >= area.left - 6 && x <= area.right + 6 && y >= area.top - 6 && y <= area.bottom + 18) {
            const colIdx = getColumnIndexAtX(chartInst, x);
            canvas.style.cursor = colIdx >= 0 ? 'pointer' : 'default';
            if (v3State.channelHoveredDayIdx !== colIdx) {
              v3State.channelHoveredDayIdx = colIdx;
              chartInst.draw();
            }
          } else {
            canvas.style.cursor = 'default';
            if (v3State.channelHoveredDayIdx !== -1) {
              v3State.channelHoveredDayIdx = -1;
              chartInst.draw();
            }
          }
        },
        onClick: (event, activeElements, chartInst) => {
          let clickedIdx = -1;
          if (event && typeof event.x === 'number') {
            clickedIdx = getColumnIndexAtX(chartInst, event.x);
          }
          if (clickedIdx < 0 && activeElements && activeElements.length > 0) {
            clickedIdx = activeElements[0].index;
          }
          if (clickedIdx >= 0 && clickedIdx < currDays.length) {
            updateDailyReportSelection(clickedIdx, true, cp, snap, refWin, demo);
          }
        },
        plugins: {
          // Item 6: Legend merged into the "So với" header row to save vertical height
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: function (items) {
                const idx = items && items[0] ? items[0].dataIndex : 0;
                const dCurr = currDays[idx];
                const dRef = refDays[idx];
                return `Ngày thứ ${idx + 1} của kỳ (${dCurr ? formatIsoToVN(dCurr) : '—'} vs ${dRef ? formatIsoToVN(dRef) : '—'}) · Nhấn để mở Báo cáo ngày`;
              },
              label: function (ctx) {
                const idx = ctx.dataIndex;
                const isCurr = ctx.datasetIndex === 0;
                const realIso = isCurr ? currDays[idx] : refDays[idx];
                const prefix = isCurr ? 'Kỳ này' : refModeName;
                return ` ${prefix} (${realIso ? formatIsoToVN(realIso) : '—'}): ${fmtChartMetricVal(ctx.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Ngày thứ N của kỳ (Nhấn vào cột dọc của ngày bất kỳ để mở Báo cáo ngày)',
              color: '#94A3B8',
              font: { size: 11, weight: '600' },
              padding: { top: 2, bottom: 0 }
            },
            afterBuildTicks: function (axis) {
              const total = labels.length;
              if (total <= 7) return;
              const stepCount = 5;
              const chosen = [];
              for (let k = 0; k <= stepCount; k++) {
                const idx = Math.round((k * (total - 1)) / stepCount);
                if (!chosen.includes(idx)) chosen.push(idx);
              }
              axis.ticks = chosen.map(v => ({ value: v }));
            },
            ticks: {
              color: '#94A3B8',
              maxRotation: 0,
              minRotation: 0,
              autoSkip: false,
              font: { size: 11 }
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            beginAtZero: metric !== 'netSubs',
            min: metric !== 'netSubs' ? 0 : undefined,
            ticks: {
              color: '#94A3B8',
              precision: 0,
              callback: function (val) {
                if (metric === 'revenue') return fmtMoney(val);
                return new Intl.NumberFormat('vi-VN').format(Math.round(val));
              }
            },
            grid: { color: 'rgba(255,255,255,0.06)' }
          }
        }
      }
    });

    canvas.addEventListener('mouseleave', () => {
      canvas.style.cursor = 'default';
      if (v3State.channelHoveredDayIdx !== -1) {
        v3State.channelHoveredDayIdx = -1;
        if (chartInstances['channelSingle']) {
          chartInstances['channelSingle'].draw();
        }
      }
    });

    chartInstances['channelSingle'] = chart;
  }

  function renderChannelCompareMode(body, snap) {
    const win = snap.win;
    const currRangeFullVN = `${formatIsoToVN(win.start)} – ${formatIsoToVN(win.end)}`;
    const currRangeShort = `${formatIsoToShortVN(win.start)}–${formatIsoToShortVN(win.end)}`;

    // Ensure 2..5 valid channels; first channel is always Kênh gốc
    const validIds = [];
    v3State.compareChannelIds.forEach(id => {
      if (snap.channelPairs.some(c => c.id === id) && !validIds.includes(id) && validIds.length < 5) {
        validIds.push(id);
      }
    });
    if (validIds.length < 2) {
      snap.channelPairs.forEach(c => {
        if (!validIds.includes(c.id) && validIds.length < 3) validIds.push(c.id);
      });
    }
    v3State.compareChannelIds = validIds;

    const selectedPairs = v3State.compareChannelIds
      .map(id => snap.channelPairs.find(c => c.id === id))
      .filter(Boolean);

    const validChartMetrics = ['views', 'netSubs', 'videosPublished', 'revenue'];
    if (!validChartMetrics.includes(v3State.channelChartMetric)) {
      v3State.channelChartMetric = 'views';
    }
    const validSortFields = ['views', 'netSubs', 'videosPublished', 'engagementRate', 'revenue'];
    if (!validSortFields.includes(v3State.compareSortField)) {
      v3State.compareSortField = v3State.channelChartMetric;
    }

    // Build reference window for each selected channel
    const refWinById = new Map();
    selectedPairs.forEach(cp => {
      refWinById.set(cp.id, buildChannelRefWindow(win, cp, snap));
    });
    const baseCp = selectedPairs[0];
    const baseRefWin = refWinById.get(baseCp.id);
    const M = baseRefWin.currDayCount;
    const N = baseRefWin.refDayCount;
    const useAvg = baseRefWin.isUnequalLength && v3State.channelUnequalMode === 'avg';

    // Sort rows 2..K while keeping Row 1 pinned as Kênh gốc (Item 8)
    const getSortMetricVal = (cp, field) => {
      const val = cp.curr[field];
      if (val === null || val === undefined || Number.isNaN(Number(val))) return -Infinity;
      return Number(val);
    };
    const otherPairs = selectedPairs.slice(1).sort((a, b) => {
      const va = getSortMetricVal(a, v3State.compareSortField);
      const vb = getSortMetricVal(b, v3State.compareSortField);
      return v3State.compareSortAsc ? (va - vb) : (vb - va);
    });
    const orderedPairs = [baseCp, ...otherPairs];

    const compareConclusion = buildCompareHealthConclusion(selectedPairs, win, refWinById);

    const metricTitleMap = {
      views: 'Views',
      netSubs: 'Sub ròng',
      videosPublished: 'Video đăng',
      revenue: 'Doanh thu'
    };
    const activeMetricTitle = metricTitleMap[v3State.channelChartMetric] || 'Views';
    const baseDiffMetric = v3State.compareSortField || v3State.channelChartMetric;
    const baseDiffMetricNames = {
      views: 'views',
      netSubs: 'sub ròng',
      videosPublished: 'video',
      engagementRate: 'tương tác',
      revenue: 'doanh thu'
    };

    const cmpScaleMode = ['actual', 'index100', 'log'].includes(v3State.compareChartScale)
      ? v3State.compareChartScale
      : 'actual';
    v3State.compareChartScale = cmpScaleMode;

    // Determine status chip in Chart Header Row 1
    let statusChipVisible = false;
    let statusChipText = 'Đối chứng cùng độ dài';
    let statusChipIsError = false;
    if (win.isPartialQuarter) {
      statusChipVisible = true;
      statusChipText = `Chưa trọn quý (${win.dayCount}/${win.quarterCalendarDays} ngày) · So với ${win.dayCount} ngày đầu`;
    }

    // Group totals for table tfoot & summary line below the chart (reconciles 100% with Page 2 in USD & VND)
    const groupViewsSum = selectedPairs.reduce((s, cp) => s + (cp.curr.views || 0), 0);
    const groupPrevViewsSum = selectedPairs.reduce((s, cp) => {
      const rw = refWinById.get(cp.id) || baseRefWin;
      return s + ((rw.refMetrics && rw.refMetrics.views) || 0);
    }, 0);
    const anySubMissing = selectedPairs.some(cp => !cp.curr.hasAnalytics && cp.curr.netSubs === null);
    const groupSubsSum = anySubMissing ? null : selectedPairs.reduce((s, cp) => s + (cp.curr.netSubs || 0), 0);
    const groupPrevSubsSum = anySubMissing ? null : selectedPairs.reduce((s, cp) => {
      const rw = refWinById.get(cp.id) || baseRefWin;
      return s + ((rw.refMetrics && rw.refMetrics.netSubs) || 0);
    }, 0);
    const groupVidsSum = selectedPairs.reduce((s, cp) => s + (cp.curr.videosPublished || 0), 0);
    const groupPrevVidsSum = selectedPairs.reduce((s, cp) => {
      const rw = refWinById.get(cp.id) || baseRefWin;
      return s + ((rw.refMetrics && rw.refMetrics.videosPublished) || 0);
    }, 0);
    const groupEngNum = selectedPairs.reduce((s, cp) => s + (cp.curr.likes || 0) + (cp.curr.comments || 0) + (cp.curr.shares || 0), 0);
    const groupEngRate = groupViewsSum > 0 ? Number(((groupEngNum / groupViewsSum) * 100).toFixed(2)) : null;
    const groupPrevEngNum = selectedPairs.reduce((s, cp) => {
      const rw = refWinById.get(cp.id) || baseRefWin;
      const rm = rw.refMetrics || {};
      return s + (rm.likes || 0) + (rm.comments || 0) + (rm.shares || 0);
    }, 0);
    const groupPrevEngRate = groupPrevViewsSum > 0 ? Number(((groupPrevEngNum / groupPrevViewsSum) * 100).toFixed(2)) : null;
    const anyRevMissing = selectedPairs.some(cp => !cp.curr.hasAnalytics || !cp.curr.hasMonetary || cp.curr.estimatedRevenue === null);
    const groupRevSum = anyRevMissing ? null : Number(selectedPairs.reduce((s, cp) => s + (cp.curr.estimatedRevenue || 0), 0).toFixed(2));
    const groupPrevRevSum = anyRevMissing ? null : Number(selectedPairs.reduce((s, cp) => {
      const rw = refWinById.get(cp.id) || baseRefWin;
      return s + ((rw.refMetrics && rw.refMetrics.estimatedRevenue) || 0);
    }, 0).toFixed(2));

    const groupAvgViews = selectedPairs.length > 0 ? Math.round(groupViewsSum / selectedPairs.length) : 0;
    const topGroupCh = [...selectedPairs].sort((a, b) => (b.curr.views || 0) - (a.curr.views || 0))[0];

    const allHaveYoY = selectedPairs.every(cp => cp.curr.hasYoYHistory);
    const anyMissingOAuth = selectedPairs.some(cp => !cp.curr.hasAnalytics);

    const fmtCompactCellDelta = (currVal, prevVal, isCurrency = false, isPercentPoint = false) => {
      if (currVal === null || currVal === undefined || prevVal === null || prevVal === undefined) {
        return `<span class="v3-delta flat v3-cmp-delta">—</span>`;
      }
      const diff = Number(currVal) - Number(prevVal);
      let pct = null;
      if (Number(prevVal) !== 0) {
        pct = (diff / Math.abs(Number(prevVal))) * 100;
      } else if (Number(currVal) === 0) {
        pct = 0;
      }
      const isSmallChange = isPercentPoint
        ? Math.abs(diff) < 0.20
        : (pct !== null ? Math.abs(pct) < 2.0 : Math.abs(diff) < 0.0001);
      const cls = isSmallChange ? 'flat' : (diff > 0.0001 ? 'up' : (diff < -0.0001 ? 'down' : 'flat'));
      const arrow = diff > 0.0001 ? '▲' : (diff < -0.0001 ? '▼' : '•');
      if (isPercentPoint) {
        const sign = diff > 0.0001 ? '+' : (diff < -0.0001 ? '−' : '');
        return `<span class="v3-delta ${cls} v3-cmp-delta">${arrow} ${sign}${Math.abs(diff).toFixed(2).replace('.', ',')} điểm %</span>`;
      }
      return `<span class="v3-delta ${cls} v3-cmp-delta">${arrow} ${pct !== null ? fmtPct(pct) : '0,0%'}</span>`;
    };

    const sortArrow = (field) => {
      if (v3State.compareSortField !== field) return `<span style="opacity:0.35;margin-left:2px;">↕</span>`;
      return `<span style="color:#38BDF8;margin-left:2px;">${v3State.compareSortAsc ? '↑' : '↓'}</span>`;
    };

    body.innerHTML = `
      <!-- 1. KHỐI ĐIỀU KHIỂN SO SÁNH KÊNH + DẢI KÊNH ĐANG CHỌN + DÒNG KẾT LUẬN NHÓM (Ẩn hàng "Toàn thời gian", khóa cùng chiều cao 184px) -->
      <section class="v3-panel v3-ch-identity-locked" id="v3-channel-identity-panel">
        <div class="v3-ch-control-row" id="v3-channel-control-row">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div class="v3-preset-group" id="v3-channel-mode-switch" role="group" aria-label="Chế độ xem kênh">
              <button type="button" class="v3-preset-btn" data-ch-mode="single">Một kênh</button>
              <button type="button" class="v3-preset-btn active" data-ch-mode="compare">So sánh kênh</button>
            </div>

            <!-- Ô chọn nhiều kênh có tìm kiếm và lọc theo team, tối đa 5 kênh, dùng chung component dropdown nổi -->
            ${renderUnifiedFloatingPicker({
              wrapperId: 'v3-compare-channel-picker',
              btnId: 'v3-compare-picker-btn',
              btnClass: 'v3-ch-picker-btn',
              btnTitle: 'Chọn từ 2 đến 5 kênh để so sánh',
              triggerHtml: `
                <i class="ri-scales-3-line" style="color:#38BDF8;font-size:14px;"></i>
                <span class="v3-ch-picker-btn-text">
                  <strong>Chọn kênh so sánh (${selectedPairs.length}/5 kênh)</strong>
                  <span style="color:var(--text-muted);font-weight:500;">· Gốc: ${esc(baseCp.meta.title)}</span>
                </span>
                <i class="ri-search-eye-line" style="color:#38BDF8;font-size:14px;margin-left:4px;"></i>
                <i class="ri-arrow-down-s-line" style="color:var(--text-muted);font-size:15px;"></i>
              `,
              menuId: 'v3-compare-picker-menu',
              searchId: 'v3-compare-picker-search',
              searchPlaceholder: 'Tìm tên kênh, @handle, PIC, team...',
              searchQuery: v3State.comparePickerQuery,
              teamBarId: 'v3-compare-team-filter',
              teamChipAttr: 'data-cmp-team-filter',
              teamFilter: v3State.compareTeamFilter,
              showTop3AndClear: true,
              top3BtnId: 'v3-compare-pick-top3',
              clearBtnId: 'v3-compare-pick-clear',
              listId: 'v3-compare-picker-list',
              emptyId: 'v3-compare-picker-empty',
              emptyText: 'Không tìm thấy kênh phù hợp',
              isOpen: v3State.comparePickerOpen,
              isMulti: true,
              maxSelect: 5,
              selectedIds: v3State.compareChannelIds,
              rowToggleAttr: 'data-cmp-toggle-id',
              rowTeamAttr: 'data-cmp-team-id',
              items: snap.channelPairs.map(item => {
                const isBase = item.id === baseCp.id;
                return {
                  id: item.id,
                  title: item.meta.title,
                  badgeHtml: isBase ? ' <span class="v3-badge highest" style="font-size:9.5px;padding:1px 5px;">Kênh gốc</span>' : '',
                  subtitle: `${item.meta.handle} · PIC: ${item.meta.employeeName}`,
                  color: item.meta.channelColor,
                  teamId: item.meta.teamId,
                  teamName: item.meta.teamName.replace(/^Team\s+/i, ''),
                  teamColor: item.meta.teamColor,
                  views: item.curr.views,
                  searchBlob: `${item.meta.title} ${item.meta.handle} ${item.meta.employeeName} ${item.meta.teamName}`.toLowerCase()
                };
              })
            })}
          </div>

          <div style="display:flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;">
            <span class="v3-badge ${anyMissingOAuth ? 'warn' : 'analytics'}" id="v3-channel-oauth-status-badge">
              ${anyMissingOAuth ? 'Có kênh chưa cấp quyền' : `[Đã kết nối ${selectedPairs.length}/${selectedPairs.length} kênh]`}
            </span>
            <span class="v3-badge muted" id="v3-channel-analytics-delay-note">Dữ liệu Analytics có độ trễ 2–3 ngày</span>
          </div>
        </div>

        <!-- Dải chip các kênh đang so sánh (thay thế vị trí định danh + hàng Toàn thời gian đã ẩn để giữ nguyên chiều cao 184px) -->
        <div class="v3-cmp-selected-strip" id="v3-compare-selected-strip">
          <div style="font-size:11.8px;color:var(--text-muted);display:flex;align-items:center;justify-content:space-between;white-space:nowrap;">
            <span>
              Đang đối chiếu <strong>${selectedPairs.length}/5 kênh</strong> · Kênh gốc (Dòng 1): <strong style="color:var(--text-main);">${esc(baseCp.meta.title)}</strong> · Kỳ: <strong style="color:var(--text-main);font-family:var(--font-mono);">${currRangeFullVN}</strong>
            </span>
            <span style="font-size:11px;color:var(--text-dim);">Nhấn tên chip để đặt làm kênh gốc · Nhấn × để gỡ kênh</span>
          </div>
          <div class="v3-cmp-pills-row" id="v3-compare-pills-row">
            ${selectedPairs.map((cp, idx) => `
              <span class="v3-cmp-channel-pill ${idx === 0 ? 'is-base' : ''}" data-cmp-pill-id="${cp.id}" style="border-color:${cp.meta.channelColor}88;background:${cp.meta.channelColor}14;">
                <span class="v3-team-dot" style="background:${cp.meta.channelColor};"></span>
                <button type="button" class="v3-cmp-set-base-btn" data-set-base-ch="${cp.id}" title="${idx === 0 ? 'Đang là kênh gốc (Dòng 1)' : 'Nhấn để đặt kênh này làm Kênh gốc (Dòng 1)'}">
                  <strong>${esc(cp.meta.title)}</strong>
                  ${idx === 0 ? `<span class="v3-cmp-base-tag">Gốc</span>` : ''}
                </button>
                <button type="button" class="v3-cmp-rm-btn" data-remove-cmp-ch="${cp.id}" title="Gỡ kênh khỏi so sánh" ${selectedPairs.length <= 2 ? 'disabled' : ''}>×</button>
              </span>
            `).join('')}
          </div>
        </div>

        <!-- DÒNG KẾT LUẬN TỰ ĐỘNG SINH TỪ DỮ LIỆU NHÓM KÊNH (Mục 8) -->
        <div class="v3-ch-health-bar" id="v3-channel-health-bar">
          <span class="v3-ch-health-q">So sánh nhóm kênh:</span>
          <span class="v3-ch-health-text" id="v3-channel-health-conclusion">${esc(compareConclusion)}</span>
        </div>
      </section>

      <!-- 2. BẢNG SO SÁNH KÊNH (Co chiều cao tự nhiên theo số kênh · Ghi rõ phạm vi tác động của công tắc đối chứng cho delta bảng) -->
      <section class="v3-panel v3-ch-compare-panel" id="v3-channel-kpi-panel">
        <div class="v3-chart-a-header-row1" style="margin-bottom:8px;">
          <div class="v3-panel-title" style="font-size:14.2px;white-space:nowrap;">
            <i class="ri-table-line" style="color:#38BDF8;"></i>
            <span>Bảng so sánh chỉ số các kênh</span>
            <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
          </div>
          <div style="display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex-shrink:0;">
            <span style="font-size:11px;color:var(--text-muted);" id="v3-cmp-ref-scope-note">
              Delta trong bảng so với <strong>${esc(baseRefWin.refModeName)} (${esc(baseRefWin.refRangeShort)})</strong>:
            </span>
            <div class="v3-preset-group" id="v3-channel-ref-mode-group" role="group" aria-label="Chọn kỳ đối chứng cho delta trong bảng so sánh">
              <button type="button" class="v3-preset-btn ${baseRefWin.mode === 'prev' ? 'active' : ''}" data-ch-ref-mode="prev" title="Chỉ tác động tới cột delta trong bảng so sánh">Kỳ trước</button>
              <button type="button" class="v3-preset-btn ${baseRefWin.mode === 'prev_quarter' ? 'active' : ''}" data-ch-ref-mode="prev_quarter" title="Chỉ tác động tới cột delta trong bảng so sánh">Quý trước</button>
              <button type="button" class="v3-preset-btn ${baseRefWin.mode === 'yoy' ? 'active' : ''}" data-ch-ref-mode="yoy" ${!allHaveYoY ? 'disabled' : ''} title="Chỉ tác động tới cột delta trong bảng so sánh">Cùng kỳ năm ngoái</button>
            </div>
            <span style="font-size:10.5px;color:var(--text-dim);">· Nhấn tiêu đề cột để sắp xếp</span>
          </div>
        </div>

        <div class="v3-ch-compare-table-wrap is-dynamic-height" id="v3-channel-compare-table-wrap">
          <table class="v3-table v3-ch-compare-table" id="v3-channel-compare-table">
            <thead>
              <tr>
                <th style="width:28.5%;">Kênh YouTube &amp; Team</th>
                <th style="width:12.5%;" class="num is-sortable-col ${v3State.channelChartMetric === 'views' ? 'is-active-metric-col' : ''}" data-cmp-col="views" title="Nhấn để vẽ biểu đồ Views và sắp xếp">
                  Views ${sortArrow('views')}
                </th>
                <th style="width:11.0%;" class="num is-sortable-col ${v3State.channelChartMetric === 'netSubs' ? 'is-active-metric-col' : ''}" data-cmp-col="netSubs" title="Nhấn để vẽ biểu đồ Sub ròng và sắp xếp">
                  Sub ròng ${sortArrow('netSubs')}
                </th>
                <th style="width:8.5%;" class="num is-sortable-col ${v3State.channelChartMetric === 'videosPublished' ? 'is-active-metric-col' : ''}" data-cmp-col="videosPublished" title="Nhấn để vẽ biểu đồ Video đăng và sắp xếp">
                  Video ${sortArrow('videosPublished')}
                </th>
                <th style="width:12.0%;" class="num is-sortable-col" data-cmp-col="engagementRate" title="Không có biểu đồ theo ngày (Nhấn để sắp xếp theo Tỷ lệ tương tác)">
                  Tương tác ${sortArrow('engagementRate')}
                </th>
                <th style="width:12.5%;" class="num is-sortable-col ${v3State.channelChartMetric === 'revenue' ? 'is-active-metric-col' : ''}" data-cmp-col="revenue" title="Nhấn để vẽ biểu đồ Doanh thu và sắp xếp">
                  Doanh thu ${sortArrow('revenue')}
                </th>
                <th class="num" id="v3-cmp-diff-col-header" style="width:15.0%;" title="Chênh lệch ${esc(baseDiffMetricNames[baseDiffMetric] || 'views')} so với Kênh gốc ở dòng 1">
                  Chênh ${esc(baseDiffMetricNames[baseDiffMetric] || 'views')} vs kênh gốc
                </th>
              </tr>
            </thead>
            <tbody>
              ${orderedPairs.map((cp, rowIdx) => {
                const curr = cp.curr;
                const rw = refWinById.get(cp.id) || baseRefWin;
                const ref = rw.refMetrics;
                const cViews = curr.views !== null ? (useAvg ? curr.views / M : curr.views) : null;
                const rViews = ref.views !== null ? (useAvg ? ref.views / N : ref.views) : null;
                const cSubs = curr.netSubs !== null ? (useAvg ? curr.netSubs / M : curr.netSubs) : null;
                const rSubs = ref.netSubs !== null ? (useAvg ? ref.netSubs / N : ref.netSubs) : null;
                const cVids = curr.videosPublished !== null ? (useAvg ? curr.videosPublished / M : curr.videosPublished) : null;
                const rVids = ref.videosPublished !== null ? (useAvg ? ref.videosPublished / N : ref.videosPublished) : null;
                const cRev = curr.estimatedRevenue !== null ? (useAvg ? curr.estimatedRevenue / M : curr.estimatedRevenue) : null;
                const rRev = ref.estimatedRevenue !== null ? (useAvg ? ref.estimatedRevenue / N : ref.estimatedRevenue) : null;

                const isBaseRow = rowIdx === 0;
                const revMissing = !curr.hasAnalytics || !curr.hasMonetary || curr.estimatedRevenue === null;
                const subMissing = !curr.hasAnalytics && curr.netSubs === null;
                const shortTeamName = cp.meta.teamName.replace(/^Team\s+/i, '');

                // Diff vs baseCp on baseDiffMetric
                let diffVsBaseHtml = '';
                if (isBaseRow) {
                  diffVsBaseHtml = `<span class="v3-badge muted" style="font-size:10px;">Kênh gốc (Mốc 0)</span>`;
                } else {
                  const bVal = baseCp.curr[baseDiffMetric];
                  const rVal = curr[baseDiffMetric];
                  if (bVal === null || bVal === undefined || rVal === null || rVal === undefined) {
                    diffVsBaseHtml = `<span class="v3-no-oauth-cell">Chưa cấp quyền</span>`;
                  } else {
                    diffVsBaseHtml = fmtDeltaBadge(
                      rVal,
                      bVal,
                      baseDiffMetric === 'revenue',
                      baseDiffMetric === 'engagementRate'
                    );
                  }
                }

                return `
                  <tr class="${isBaseRow ? 'v3-cmp-base-row' : ''}"
                      data-compare-row-id="${cp.id}"
                      data-row-views="${curr.views !== null ? curr.views : ''}"
                      data-row-subs="${curr.netSubs !== null ? curr.netSubs : ''}"
                      data-row-vids="${curr.videosPublished}"
                      data-row-eng="${curr.engagementRate !== null ? curr.engagementRate : ''}"
                      data-row-rev="${curr.estimatedRevenue !== null ? curr.estimatedRevenue : ''}">
                    <td>
                      <div class="v3-cmp-ch-cell">
                        <span class="v3-team-dot" style="background:${cp.meta.channelColor};flex-shrink:0;" data-channel-color="${cp.meta.channelColor}"></span>
                        <strong class="v3-cmp-ch-name">${esc(cp.meta.title)}</strong>
                        ${isBaseRow ? `<span class="v3-cmp-base-tag">Kênh gốc</span>` : ''}
                        <span class="v3-badge v3-cmp-team-badge" style="background:${cp.meta.teamColor}1D;color:${cp.meta.teamColor};border:1px solid ${cp.meta.teamColor}50;">
                          <span class="v3-team-dot" style="background:${cp.meta.teamColor};"></span>
                          <span>${esc(shortTeamName)}</span>
                        </span>
                      </div>
                    </td>
                    <td class="num">
                      <div class="v3-cmp-cell-inner">
                        <strong>${curr.views !== null ? fmtInt(curr.views) : '—'}</strong>
                        ${fmtCompactCellDelta(cViews, rViews)}
                      </div>
                    </td>
                    <td class="num">
                      ${subMissing ? `<span class="v3-no-oauth-cell">Chưa cấp quyền</span>` : `
                        <div class="v3-cmp-cell-inner">
                          <strong>${curr.netSubs !== null ? (curr.netSubs > 0 ? '+' + fmtInt(curr.netSubs) : fmtInt(curr.netSubs)) : '—'}</strong>
                          ${fmtCompactCellDelta(cSubs, rSubs)}
                        </div>
                      `}
                    </td>
                    <td class="num">
                      <div class="v3-cmp-cell-inner">
                        <strong>${fmtInt(curr.videosPublished)}</strong>
                        ${fmtCompactCellDelta(cVids, rVids)}
                      </div>
                    </td>
                    <td class="num">
                      <div class="v3-cmp-cell-inner">
                        <strong>${curr.engagementRate !== null ? fmtDec(curr.engagementRate, 2) + '%' : '—'}</strong>
                        ${fmtCompactCellDelta(curr.engagementRate, ref.engagementRate, false, true)}
                      </div>
                    </td>
                    <td class="num ${revMissing ? 'is-oauth-dimmed' : ''}" data-cmp-rev-cell="${cp.id}">
                      ${revMissing ? `<span class="v3-no-oauth-cell">Chưa cấp quyền</span>` : `
                        <div class="v3-cmp-cell-inner">
                          <strong>${fmtMoney(curr.estimatedRevenue)}</strong>
                          ${fmtCompactCellDelta(cRev, rRev, true)}
                        </div>
                      `}
                    </td>
                    <td class="num" data-cmp-diff-base="${cp.id}">
                      ${diffVsBaseHtml}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr id="v3-channel-compare-total-row"
                  data-group-views="${groupViewsSum}"
                  data-group-prev-views="${groupPrevViewsSum}"
                  data-group-subs="${groupSubsSum ?? ''}"
                  data-group-vids="${groupVidsSum}"
                  data-group-eng="${groupEngRate ?? ''}"
                  data-group-rev="${groupRevSum ?? ''}">
                <td>
                  <strong>Tổng nhóm (${orderedPairs.length} kênh đang chọn)</strong>
                </td>
                <td class="num">
                  <div class="v3-cmp-cell-inner">
                    <strong>${fmtInt(groupViewsSum)}</strong>
                    ${fmtCompactCellDelta(groupViewsSum, groupPrevViewsSum)}
                  </div>
                </td>
                <td class="num">
                  ${groupSubsSum === null ? `<span class="v3-no-oauth-cell">Chưa cấp quyền</span>` : `
                    <div class="v3-cmp-cell-inner">
                      <strong>${groupSubsSum > 0 ? '+' + fmtInt(groupSubsSum) : fmtInt(groupSubsSum)}</strong>
                      ${fmtCompactCellDelta(groupSubsSum, groupPrevSubsSum)}
                    </div>
                  `}
                </td>
                <td class="num">
                  <div class="v3-cmp-cell-inner">
                    <strong>${fmtInt(groupVidsSum)}</strong>
                    ${fmtCompactCellDelta(groupVidsSum, groupPrevVidsSum)}
                  </div>
                </td>
                <td class="num">
                  <div class="v3-cmp-cell-inner">
                    <strong>${groupEngRate !== null ? fmtDec(groupEngRate, 2) + '%' : '—'}</strong>
                    ${fmtCompactCellDelta(groupEngRate, groupPrevEngRate, false, true)}
                  </div>
                </td>
                <td class="num">
                  ${groupRevSum === null ? `<span class="v3-no-oauth-cell">Chưa cấp quyền</span>` : `
                    <div class="v3-cmp-cell-inner">
                      <strong>${fmtMoney(groupRevSum)}</strong>
                      ${fmtCompactCellDelta(groupRevSum, groupPrevRevSum, true)}
                    </div>
                  `}
                </td>
                <td class="num">
                  <span style="font-size:10.5px;color:var(--text-muted);">TB: ${fmtInt(groupAvgViews)} views/kênh</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- 3. BIỂU ĐỒ ĐƯỜNG ĐA KÊNH THEO NGÀY (Công tắc "Thực tế | Chuẩn hóa (ngày đầu = 100) | Thang log", không có "So với", trục X "Ngày") -->
      <section class="v3-panel v3-ch-trend-locked" id="v3-channel-trend-panel">
        <div class="v3-chart-a-header" id="v3-channel-chart-header">
          <div class="v3-chart-a-header-row1" id="v3-channel-chart-header-row1">
            <div class="v3-panel-title" style="white-space:nowrap;">
              <i class="ri-line-chart-line" style="color:#38BDF8;"></i>
              <span id="v3-channel-chart-title">Xu hướng ${esc(activeMetricTitle)} theo ngày — ${selectedPairs.length} kênh</span>
              <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
            </div>
            <div style="display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex-shrink:0;">
              <span class="v3-chart-status-chip ${statusChipVisible ? 'is-visible' : 'is-hidden'} ${statusChipIsError ? 'is-error' : ''}" id="v3-channel-chart-status-chip">
                <span class="v3-chart-status-chip-text">${esc(statusChipText)}</span>
              </span>
              <div class="v3-preset-group" id="v3-compare-scale-switch" role="group" aria-label="Chế độ thang đo biểu đồ so sánh kênh">
                <button type="button" class="v3-preset-btn ${cmpScaleMode === 'actual' ? 'active' : ''}" data-cmp-scale="actual" title="Hiển thị giá trị thực tế theo ngày">Thực tế</button>
                <button type="button" class="v3-preset-btn ${cmpScaleMode === 'index100' ? 'active' : ''}" data-cmp-scale="index100" title="Quy chuẩn ngày đầu tiên của kỳ = 100 để so sánh tốc độ tăng trưởng">Chuẩn hóa (ngày đầu = 100)</button>
                <button type="button" class="v3-preset-btn ${cmpScaleMode === 'log' ? 'active' : ''}" data-cmp-scale="log" title="Thang đo logarit cơ số 10 giúp quan sát đồng thời kênh lớn và kênh nhỏ">Thang log</button>
              </div>
            </div>
          </div>

          <div class="v3-chart-a-header-row2" id="v3-channel-chart-header-row2">
            <span style="font-size:11.2px;color:var(--text-muted);white-space:nowrap;">
              <i class="ri-information-line" style="color:#38BDF8;"></i>
              Biểu đồ vẽ trực tiếp <strong>${selectedPairs.length} kênh</strong> trong kỳ đang chọn (${currRangeShort}) · Không vẽ đường kỳ đối chứng
            </span>

            <!-- Chú giải màu cố định của các kênh đang so sánh nằm ngay trên hàng 2 -->
            <div class="v3-ch-inline-legend" id="v3-channel-inline-legend">
              ${selectedPairs.map(cp => `
                <span class="v3-ch-legend-item">
                  <span class="v3-ch-legend-line solid" style="background:${cp.meta.channelColor};"></span>
                  <span>${esc(cp.meta.title)}</span>
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="v3-chart-a-canvas-wrap" id="v3-channel-chart-canvas-wrap" style="height:220px;min-height:220px;max-height:220px;">
          <canvas id="v3-channel-single-canvas"></canvas>
        </div>

        <div class="v3-ch-video-summary-line" id="v3-channel-video-summary-line">
          <span>Tổng nhóm <strong>${selectedPairs.length} kênh</strong> trong kỳ: <strong>${fmtInt(groupViewsSum)}</strong> views</span>
          <span class="v3-scope-sep">·</span>
          <span>Trung bình: <strong>${fmtInt(groupAvgViews)}</strong> views/kênh</span>
          <span class="v3-scope-sep">·</span>
          <span>Kênh dẫn đầu nhóm: <strong>${esc(topGroupCh.meta.title)}</strong> (<strong>${fmtInt(topGroupCh.curr.views || 0)}</strong> views).</span>
        </div>
      </section>
    `;

    // Render Multi-Channel Daily Line Chart (1 line per channel, supports Actual | Index100 | Log scale)
    renderCompareChannelChart(selectedPairs, snap);

    // Bind Scale Switch ("Thực tế | Chuẩn hóa (ngày đầu = 100) | Thang log")
    body.querySelectorAll('[data-cmp-scale]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextScale = btn.getAttribute('data-cmp-scale') || 'actual';
        if (v3State.compareChartScale === nextScale) return;
        v3State.compareChartScale = nextScale;
        renderChannelPage(snap);
      });
    });

    // Bind Mode Switch ("Một kênh | So sánh kênh")
    body.querySelectorAll('[data-ch-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextMode = btn.getAttribute('data-ch-mode');
        if (!nextMode || v3State.channelMode === nextMode) return;
        v3State.channelMode = nextMode;
        v3State.comparePickerOpen = false;
        renderChannelPage(snap);
      });
    });

    // Bind Unified Floating Multi-Channel Picker
    bindUnifiedFloatingPicker(body, {
      wrapperId: 'v3-compare-channel-picker',
      btnId: 'v3-compare-picker-btn',
      menuId: 'v3-compare-picker-menu',
      searchId: 'v3-compare-picker-search',
      listId: 'v3-compare-picker-list',
      emptyId: 'v3-compare-picker-empty',
      teamChipAttr: 'data-cmp-team-filter',
      rowToggleAttr: 'data-cmp-toggle-id',
      rowTeamAttr: 'data-cmp-team-id',
      top3BtnId: 'v3-compare-pick-top3',
      clearBtnId: 'v3-compare-pick-clear',
      getOpenState: () => v3State.comparePickerOpen,
      setOpenState: (v) => { v3State.comparePickerOpen = v; },
      getSearchQuery: () => v3State.comparePickerQuery,
      setSearchQuery: (v) => { v3State.comparePickerQuery = v; },
      getTeamFilter: () => v3State.compareTeamFilter,
      setTeamFilter: (v) => { v3State.compareTeamFilter = v; },
      onSelectTop3: () => {
        const top3Ch = [...snap.channelPairs].sort((a, b) => (b.curr.views || 0) - (a.curr.views || 0)).slice(0, 3).map(c => c.id);
        v3State.compareChannelIds = top3Ch;
        v3State.selectedChannelId = top3Ch[0];
        v3State.comparePickerOpen = true;
        renderChannelPage(snap);
      },
      onClear: () => {
        v3State.comparePickerQuery = '';
        v3State.compareTeamFilter = 'ALL';
        v3State.compareChannelIds = v3State.compareChannelIds.slice(0, 2);
        v3State.comparePickerOpen = true;
        renderChannelPage(snap);
      },
      onRowClick: (chId) => {
        if (v3State.compareChannelIds.includes(chId)) {
          if (v3State.compareChannelIds.length <= 2) {
            if (core().showToast) core().showToast('Cần giữ tối thiểu 2 kênh để so sánh');
            return;
          }
          v3State.compareChannelIds = v3State.compareChannelIds.filter(x => x !== chId);
        } else {
          if (v3State.compareChannelIds.length >= 5) {
            if (core().showToast) core().showToast('Chỉ so sánh tối đa 5 kênh cùng lúc');
            return;
          }
          v3State.compareChannelIds.push(chId);
        }
        renderChannelPage(snap);
      }
    });

    body.querySelectorAll('[data-set-base-ch]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const baseId = btn.getAttribute('data-set-base-ch');
        if (!baseId || v3State.compareChannelIds[0] === baseId) return;
        v3State.compareChannelIds = [
          baseId,
          ...v3State.compareChannelIds.filter(id => id !== baseId)
        ];
        v3State.selectedChannelId = baseId;
        renderChannelPage(snap);
      });
    });

    body.querySelectorAll('[data-remove-cmp-ch]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rmId = btn.getAttribute('data-remove-cmp-ch');
        if (v3State.compareChannelIds.length <= 2) {
          if (core().showToast) core().showToast('Cần giữ tối thiểu 2 kênh để so sánh');
          return;
        }
        v3State.compareChannelIds = v3State.compareChannelIds.filter(x => x !== rmId);
        renderChannelPage(snap);
      });
    });

    // Bind Table Column Header Click (select metric for chart & sort rows)
    body.querySelectorAll('[data-cmp-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-cmp-col');
        if (!col) return;
        if (v3State.compareSortField === col) {
          v3State.compareSortAsc = !v3State.compareSortAsc;
        } else {
          v3State.compareSortField = col;
          v3State.compareSortAsc = false;
        }
        if (['views', 'netSubs', 'videosPublished', 'revenue'].includes(col)) {
          v3State.channelChartMetric = col;
        }
        renderChannelPage(snap);
      });
    });

    // Bind Reference Period Mode ("So với")
    body.querySelectorAll('[data-ch-ref-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const nextMode = btn.getAttribute('data-ch-ref-mode');
        v3State.channelCompareMode = nextMode;
        v3State.channelRefError = '';
        if (nextMode === 'custom') {
          if (!v3State.channelRefStartDate || !v3State.channelRefEndDate ||
              (v3State.channelRefStartDate <= win.end && v3State.channelRefEndDate >= win.start)) {
            v3State.channelRefStartDate = win.prevStart;
            v3State.channelRefEndDate = win.prevEnd;
          }
        }
        renderChannelPage(snap);
      });
    });

    const applyCustomRefDates = () => {
      const sInput = document.getElementById('v3-ch-ref-start');
      const eInput = document.getElementById('v3-ch-ref-end');
      if (!sInput || !eInput) return;
      let s = sInput.value;
      let e = eInput.value;
      if (!s || !e) return;
      if (s > '2026-10-26' || e > '2026-10-26') {
        v3State.channelRefError = 'Không được vượt quá ngày 26/10/2026';
        if (s > '2026-10-26') s = '2026-10-26';
        if (e > '2026-10-26') e = '2026-10-26';
        sInput.value = s;
        eInput.value = e;
        renderChannelPage(snap);
        return;
      }
      if (s > e) {
        v3State.channelRefError = 'Ngày bắt đầu đối chứng phải ≤ ngày kết thúc';
        renderChannelPage(snap);
        return;
      }
      if (s <= win.end && e >= win.start) {
        v3State.channelRefError = `Không được trùng kỳ đang xem (${formatIsoToShortVN(win.start)}–${formatIsoToShortVN(win.end)})`;
        renderChannelPage(snap);
        return;
      }
      v3State.channelRefError = '';
      v3State.channelCompareMode = 'custom';
      v3State.channelRefStartDate = s;
      v3State.channelRefEndDate = e;
      renderChannelPage(snap);
    };
    document.getElementById('v3-ch-ref-start')?.addEventListener('change', applyCustomRefDates);
    document.getElementById('v3-ch-ref-end')?.addEventListener('change', applyCustomRefDates);

    body.querySelectorAll('[data-ch-unequal-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.channelUnequalMode = btn.getAttribute('data-ch-unequal-mode') || 'avg';
        renderChannelPage(snap);
      });
    });
  }

  function renderCompareChannelChart(selectedPairs, snap) {
    destroyChart('channelSingle');
    const canvas = document.getElementById('v3-channel-single-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const metric = v3State.channelChartMetric || 'views';
    const scaleMode = ['actual', 'index100', 'log'].includes(v3State.compareChartScale)
      ? v3State.compareChartScale
      : 'actual';
    const currDays = snap.win.days || [];
    const labels = currDays.map(d => formatIsoToShortVN(d));

    const fmtChartMetricVal = (val) => {
      if (val === null || val === undefined || Number.isNaN(Number(val))) return 'Chưa cấp quyền';
      if (metric === 'revenue') return fmtMoney(val);
      if (metric === 'netSubs') {
        const n = Math.round(Number(val));
        return n > 0 ? `+${fmtInt(n)}` : fmtInt(n);
      }
      if (metric === 'videosPublished') return `${fmtInt(val)} video`;
      return fmtInt(val);
    };

    // Item 8 & Item 3: Mỗi kênh một đường theo ngày, màu cố định, hỗ trợ Thực tế | Chuẩn hóa (ngày đầu = 100) | Thang log
    const datasets = selectedPairs.map((cp, idx) => {
      const color = cp.meta.channelColor || cp.meta.teamColor;
      const rawData = currDays.map(d => {
        const pt = cp.curr.dailyMap.get(d);
        if (!pt || pt[metric] === undefined || pt[metric] === null) return null;
        if (metric === 'revenue' && (!cp.curr.hasAnalytics || !cp.curr.hasMonetary)) return null;
        if (metric === 'netSubs' && !cp.curr.hasAnalytics && cp.curr.netSubs === null) return null;
        return Number(pt[metric]);
      });

      const firstNonZero = rawData.find(v => v !== null && v !== undefined && Number(v) !== 0) || 1;
      const data = rawData.map(v => {
        if (v === null || v === undefined || Number.isNaN(Number(v))) return null;
        if (scaleMode === 'index100') {
          return Number(((v / Math.abs(firstNonZero)) * 100).toFixed(1));
        }
        if (scaleMode === 'log') {
          return Math.max(1, Number(v));
        }
        return v;
      });

      return {
        label: cp.meta.title,
        data,
        _rawData: rawData,
        borderColor: color,
        backgroundColor: idx === 0 && scaleMode === 'actual' ? color + '14' : 'transparent',
        borderWidth: idx === 0 ? 2.6 : 2.1,
        pointRadius: 2.0,
        tension: 0.3,
        fill: idx === 0 && scaleMode === 'actual'
      };
    });

    const yScaleConfig = scaleMode === 'log'
      ? {
          type: 'logarithmic',
          ticks: {
            color: '#94A3B8',
            callback: function (val) {
              const num = Number(val);
              if (!num || num <= 0) return '';
              const log10 = Math.log10(num);
              const frac = log10 - Math.floor(log10);
              const isCleanStep = Math.abs(frac) < 0.02 || Math.abs(frac - Math.log10(2)) < 0.02 || Math.abs(frac - Math.log10(5)) < 0.02;
              if (!isCleanStep) return '';
              if (metric === 'revenue') return fmtMoney(num);
              return new Intl.NumberFormat('vi-VN').format(Math.round(num));
            }
          },
          grid: { color: 'rgba(255,255,255,0.06)' }
        }
      : {
          type: 'linear',
          beginAtZero: scaleMode === 'actual' && metric !== 'netSubs',
          min: (scaleMode === 'actual' && metric !== 'netSubs') ? 0 : undefined,
          ticks: {
            color: '#94A3B8',
            precision: 0,
            callback: function (val) {
              if (scaleMode === 'index100') {
                return new Intl.NumberFormat('vi-VN').format(Math.round(val));
              }
              if (metric === 'revenue') return fmtMoney(val);
              return new Intl.NumberFormat('vi-VN').format(Math.round(val));
            }
          },
          grid: { color: 'rgba(255,255,255,0.06)' }
        };

    chartInstances['channelSingle'] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 6, bottom: 0 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: function (items) {
                const idx = items && items[0] ? items[0].dataIndex : 0;
                const dCurr = currDays[idx];
                return `Ngày ${dCurr ? formatIsoToVN(dCurr) : '—'} (Ngày thứ ${idx + 1} của kỳ)`;
              },
              label: function (ctx) {
                const rawArr = ctx.dataset._rawData || [];
                const rawVal = rawArr[ctx.dataIndex];
                if (scaleMode === 'index100') {
                  return ` ${ctx.dataset.label}: Chỉ số ${fmtDec(ctx.parsed.y, 1)} (Thực tế: ${fmtChartMetricVal(rawVal)})`;
                }
                return ` ${ctx.dataset.label}: ${fmtChartMetricVal(rawVal !== undefined ? rawVal : ctx.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Ngày',
              color: '#94A3B8',
              font: { size: 11, weight: '600' },
              padding: { top: 2, bottom: 0 }
            },
            afterBuildTicks: function (axis) {
              const total = labels.length;
              if (total <= 7) return;
              const stepCount = 5;
              const chosen = [];
              for (let k = 0; k <= stepCount; k++) {
                const idx = Math.round((k * (total - 1)) / stepCount);
                if (!chosen.includes(idx)) chosen.push(idx);
              }
              axis.ticks = chosen.map(v => ({ value: v }));
            },
            ticks: {
              color: '#94A3B8',
              maxRotation: 0,
              minRotation: 0,
              autoSkip: false,
              font: { size: 11 }
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: yScaleConfig
        }
      }
    });
  }

  // =========================================================================
  // PAGE 4: BÁO CÁO THEO NHÂN VIÊN (#view-report-staff)
  // Question: "Ai đang tăng, ai đang chậm?" (2 Tabs: Số liệu & Biểu đồ)
  // =========================================================================
  function buildStaffDataset(snap, customWin) {
    const win = customWin || snap.win;
    const isGlobalWin = !customWin || (
      win.start === snap.win.start &&
      win.end === snap.win.end &&
      win.prevStart === snap.win.prevStart &&
      win.prevEnd === snap.win.prevEnd
    );

    const currByChId = new Map();
    const prevByChId = new Map();
    if (isGlobalWin) {
      snap.channelPairs.forEach(cp => {
        currByChId.set(cp.id, cp.curr);
        prevByChId.set(cp.id, cp.prev);
      });
    } else {
      snap.channelsMeta.forEach(m => {
        currByChId.set(m.id, computeChannelWindowMetrics(m, win.start, win.end, snap.scenarioId));
        prevByChId.set(m.id, computeChannelWindowMetrics(m, win.prevStart, win.prevEnd, snap.scenarioId));
      });
    }

    // Group assigned channels by employeeId so each employee's metrics equal the exact sum of their assigned channels in Page 2
    const empGroups = new Map();
    snap.channelPairs.forEach(cp => {
      const empId = cp.meta.employeeId;
      if (!empGroups.has(empId)) {
        empGroups.set(empId, {
          empId,
          empName: cp.meta.employeeName,
          teamId: cp.meta.teamId,
          teamName: cp.meta.teamName,
          teamColor: cp.meta.teamColor,
          color: cp.meta.channelColor || cp.meta.teamColor,
          channelPairs: []
        });
      }
      empGroups.get(empId).channelPairs.push(cp);
    });

    const staffList = [];
    empGroups.forEach(grp => {
      const currList = grp.channelPairs.map(cp => currByChId.get(cp.id)).filter(Boolean);
      const prevList = grp.channelPairs.map(cp => prevByChId.get(cp.id)).filter(Boolean);
      const curr = aggregateChannelMetricsList(currList, win.days);
      const prev = aggregateChannelMetricsList(prevList, win.prevDays);

      const viewsGrowthPct = (curr.views !== null && prev.views !== null && prev.views > 0)
        ? Number((((curr.views - prev.views) / prev.views) * 100).toFixed(2))
        : null;
      const engDiffPt = (curr.engagementRate !== null && prev.engagementRate !== null)
        ? Number((curr.engagementRate - prev.engagementRate).toFixed(2))
        : null;

      const primaryCp = grp.channelPairs[0];
      const channelTitleSummary = grp.channelPairs.length === 1
        ? primaryCp.meta.title
        : `${primaryCp.meta.title} (+${grp.channelPairs.length - 1} kênh)`;
      const allChannelTitles = grp.channelPairs.map(c => c.meta.title).join(', ');

      staffList.push({
        empId: grp.empId,
        empName: grp.empName,
        teamId: grp.teamId,
        teamName: grp.teamName,
        teamColor: grp.teamColor,
        color: grp.color,
        channelPairs: grp.channelPairs,
        primaryChannelId: primaryCp.id,
        primaryAvatar: primaryCp.meta.avatar,
        channelTitleSummary,
        allChannelTitles,
        curr,
        prev,
        viewsGrowthPct,
        engDiffPt
      });
    });

    return {
      win,
      staffList,
      currByChId,
      prevByChId
    };
  }

  function fmtEngDeltaCompact(currEng, prevEng) {
    if (currEng === null || currEng === undefined || prevEng === null || prevEng === undefined) {
      return `<span class="v3-delta flat v3-staff-eng-delta">—</span>`;
    }
    const diff = Number(currEng) - Number(prevEng);
    let pct = null;
    if (Number(prevEng) !== 0) {
      pct = (diff / Math.abs(Number(prevEng))) * 100;
    } else if (Number(currEng) === 0) {
      pct = 0;
    }
    // Neutral threshold: |delta| < 0,5% (or < 0,05 điểm %)
    const isSmall = (pct !== null ? Math.abs(pct) < 0.5 : Math.abs(diff) < 0.05) || Math.abs(diff) < 0.05;
    const cls = isSmall ? 'flat' : (diff > 0.0001 ? 'up' : (diff < -0.0001 ? 'down' : 'flat'));
    const arrow = diff > 0.0001 ? '▲' : (diff < -0.0001 ? '▼' : '•');
    const sign = diff > 0.0001 ? '+' : (diff < -0.0001 ? '−' : '');
    return `<span class="v3-delta ${cls} v3-staff-eng-delta">${arrow} ${sign}${Math.abs(diff).toFixed(2).replace('.', ',')} điểm %</span>`;
  }

  function renderStaffPage(snap) {
    const root = document.getElementById('v3-staff-root');
    if (!root) return;

    const c = core();
    if (c.state && c.state.staffActiveTab) {
      v3State.staffTab = c.state.staffActiveTab === 'compare' ? 'compare' : 'ranking';
      delete c.state.staffActiveTab;
    }
    if (v3State.staffTab !== 'ranking' && v3State.staffTab !== 'compare') {
      v3State.staffTab = 'ranking';
    }

    root.innerHTML = `
      <div class="v3-tab-bar" id="v3-staff-tab-bar" role="tablist" aria-label="Chế độ xem Báo cáo theo nhân viên">
        <button type="button" class="v3-tab-btn ${v3State.staffTab === 'ranking' ? 'active' : ''}" data-staff-tab="ranking" role="tab" aria-selected="${v3State.staffTab === 'ranking' ? 'true' : 'false'}">
          <i class="ri-table-2"></i> Báo cáo NV theo số liệu
        </button>
        <button type="button" class="v3-tab-btn ${v3State.staffTab === 'compare' ? 'active' : ''}" data-staff-tab="compare" role="tab" aria-selected="${v3State.staffTab === 'compare' ? 'true' : 'false'}">
          <i class="ri-line-chart-line"></i> Báo cáo NV theo biểu đồ
        </button>
      </div>
      <div id="v3-staff-tab-body"></div>
    `;

    root.querySelectorAll('[data-staff-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextTab = btn.getAttribute('data-staff-tab');
        if (nextTab === v3State.staffTab) return;
        v3State.staffTab = nextTab === 'compare' ? 'compare' : 'ranking';
        v3State.staffPickerOpen = false;
        renderStaffPage(snap);
      });
    });

    const body = document.getElementById('v3-staff-tab-body');
    if (v3State.staffTab === 'compare') {
      renderStaffCompareTab(body, snap);
    } else {
      renderStaffRankingTab(body, snap);
    }
    bindHelpLinks(root);
  }

  function renderStaffRankingTab(body, snap) {
    const c = core();
    const staffDs = buildStaffDataset(snap);
    const allStaff = staffDs.staffList;
    const filtered = allStaff.filter(st => v3State.staffTeamFilter === 'ALL' || st.teamId === v3State.staffTeamFilter);

    const fieldGetter = (st, f) => {
      if (f === 'views') return st.curr.views ?? -1;
      if (f === 'growth') return st.viewsGrowthPct ?? -9999;
      if (f === 'netSubs') return st.curr.netSubs ?? -999999;
      if (f === 'videos') return st.curr.videosPublished ?? 0;
      if (f === 'engagement') return st.curr.engagementRate ?? -1;
      if (f === 'revenue') return st.curr.estimatedRevenue ?? -1;
      return st.curr.views ?? -1;
    };

    const sorted = [...filtered].sort((a, b) => {
      const va = fieldGetter(a, v3State.staffSortField);
      const vb = fieldGetter(b, v3State.staffSortField);
      return v3State.staffSortAsc ? (va - vb) : (vb - va);
    });

    const maxViews = Math.max(1, ...sorted.map(st => st.curr.views || 0));

    // Item 8: Growth badges ("Tăng nhanh nhất" only when delta > 0; if nobody > 0 then "Giảm ít nhất"; steepest drop < 0 gets "Giảm mạnh nhất")
    const staffWithGrowth = sorted.filter(st => st.viewsGrowthPct !== null && st.viewsGrowthPct !== undefined);
    let topGrowthEmpId = null;
    let topGrowthPositive = false;
    let steepestDropEmpId = null;
    if (staffWithGrowth.length >= 2) {
      const byGrowth = [...staffWithGrowth].sort((a, b) => (b.viewsGrowthPct ?? -9999) - (a.viewsGrowthPct ?? -9999));
      if (byGrowth[0].viewsGrowthPct !== byGrowth[byGrowth.length - 1].viewsGrowthPct) {
        topGrowthEmpId = byGrowth[0].empId;
        topGrowthPositive = (byGrowth[0].viewsGrowthPct ?? 0) > 0;
        const lastSt = byGrowth[byGrowth.length - 1];
        if ((lastSt.viewsGrowthPct ?? 0) < 0 && lastSt.empId !== topGrowthEmpId) {
          steepestDropEmpId = lastSt.empId;
        }
      }
    }

    // Group totals for footer row ("TỔNG CỘNG")
    const filteredCurrChannels = [];
    const filteredPrevChannels = [];
    sorted.forEach(st => {
      st.channelPairs.forEach(cp => {
        const currCh = staffDs.currByChId.get(cp.id);
        const prevCh = staffDs.prevByChId.get(cp.id);
        if (currCh) filteredCurrChannels.push(currCh);
        if (prevCh) filteredPrevChannels.push(prevCh);
      });
    });
    const groupCurr = v3State.staffTeamFilter === 'ALL'
      ? snap.systemCurr
      : aggregateChannelMetricsList(filteredCurrChannels, snap.win.days);
    const groupPrev = v3State.staffTeamFilter === 'ALL'
      ? snap.systemPrev
      : aggregateChannelMetricsList(filteredPrevChannels, snap.win.prevDays);

    const currRangeFullVN = `${formatIsoToVN(snap.win.start)} – ${formatIsoToVN(snap.win.end)}`;
    const activeTeamObj = snap.teamPairs.find(t => t.id === v3State.staffTeamFilter);

    // Status chip in Row 1 (always occupies space via visibility)
    let rankChipVisible = false;
    let rankChipText = 'Đủ 15/15 nhân viên';
    let rankChipHasReset = false;
    if (v3State.staffTeamFilter !== 'ALL' && activeTeamObj) {
      rankChipVisible = true;
      rankChipText = `Đang lọc: ${activeTeamObj.name} (${sorted.length}/15 NV)`;
      rankChipHasReset = true;
    } else if (snap.win.isPartialQuarter) {
      rankChipVisible = true;
      rankChipText = `Chưa trọn quý (${snap.win.dayCount}/${snap.win.quarterCalendarDays} ngày)`;
    }

    function sortHeader(field, label, isNum = true, widthStyle = '') {
      const active = v3State.staffSortField === field;
      const arrow = active ? (v3State.staffSortAsc ? ' ▲' : ' ▼') : '';
      return `<th class="${isNum ? 'num' : ''}" data-staff-sort="${field}" style="${widthStyle}cursor:pointer;user-select:none;${active ? 'color:#38BDF8;' : ''}">${label}${arrow}</th>`;
    }

    const growthSortActive = v3State.staffSortField === 'growth';
    const growthSortArrow = growthSortActive ? (v3State.staffSortAsc ? ' ▲' : ' ▼') : '';

    body.innerHTML = `
      <section class="v3-panel v3-staff-panel-locked" id="v3-staff-main-panel" data-staff-active-tab="ranking">
        <div class="v3-chart-a-header" id="v3-staff-ranking-header">
          <!-- Hàng 1 cố định: Tên khối + ngày kỳ + chip trạng thái (luôn giữ chỗ) + ghi chú -->
          <div class="v3-chart-a-header-row1" id="v3-staff-ranking-header-row1">
            <div class="v3-panel-title" style="white-space:nowrap;">
              <i class="ri-user-star-line" style="color:#38BDF8;"></i>
              <span>Bảng xếp hạng 15 Nhân viên phụ trách kênh</span>
              <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
            </div>
            <div style="display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap;flex-shrink:0;">
              <span class="v3-chart-status-chip ${rankChipVisible ? 'is-visible' : 'is-hidden'}" id="v3-staff-ranking-status-chip">
                <span class="v3-chart-status-chip-text">${esc(rankChipText)}</span>
                ${rankChipHasReset ? `<button type="button" class="v3-chart-status-chip-close" id="v3-staff-team-reset-btn" title="Về tất cả 15 nhân viên" aria-label="Về tất cả 15 nhân viên">×</button>` : ''}
              </span>
              <span class="v3-staff-header-hint">Nhấn tiêu đề cột để sắp xếp · Nhấn dòng để mở kênh</span>
            </div>
          </div>

          <!-- Hàng 2 cố định: Bộ lọc Team + chú thích ngưỡng delta trung tính -->
          <div class="v3-chart-a-header-row2" id="v3-staff-ranking-header-row2">
            <span class="v3-chart-row-label">Lọc theo Team:</span>
            <div class="v3-preset-group" id="v3-staff-team-filter-group" role="group" aria-label="Lọc nhân viên theo Team">
              <button type="button" class="v3-preset-btn ${v3State.staffTeamFilter === 'ALL' ? 'active' : ''}" data-staff-team="ALL">Tất cả (15 NV)</button>
              ${snap.teamPairs.map(tp => `
                <button type="button" class="v3-preset-btn ${v3State.staffTeamFilter === tp.id ? 'active' : ''}" data-staff-team="${tp.id}">
                  <span class="v3-team-dot" style="background:${tp.color};"></span> ${esc(tp.name)} (5)
                </button>
              `).join('')}
            </div>
            <span class="v3-staff-header-hint" style="margin-left:auto;">Ngưỡng delta trung tính: |Δ| &lt; 0,5% · Delta tương tác: điểm %</span>
          </div>
        </div>

        <div class="v3-table-wrap v3-staff-table-wrap" id="v3-staff-ranking-table-wrap">
          <table class="v3-table v3-staff-ranking-table" id="v3-staff-ranking-table">
            <thead>
              <tr>
                <th style="width:7.0%;">Hạng</th>
                <th style="width:16.0%;">Nhân viên (PIC)</th>
                <th style="width:10.0%;">Team</th>
                <th style="width:13.8%;">Kênh phụ trách</th>
                ${sortHeader('views', 'Views kỳ này', false, 'width:13.5%;')}
                <th class="num" style="width:11.6%;vertical-align:middle;">
                  <div style="display:inline-flex;flex-direction:column;align-items:flex-end;gap:1px;max-width:100%;">
                    <div data-staff-sort="growth" style="cursor:pointer;user-select:none;line-height:1.1;${growthSortActive ? 'color:#38BDF8;' : ''}">
                      <div>So với ${esc(snap.win.compareModeName)}${growthSortArrow}</div>
                      <div class="v3-th-sub">(${esc(snap.win.compareRangeShort)})</div>
                    </div>
                    <div class="v3-th-cmp-switch v3-staff-th-cmp-switch" role="group" aria-label="Đổi kỳ đối chứng bảng nhân viên">
                      <button type="button" class="v3-th-cmp-btn ${v3State.compareMode !== 'yoy' ? 'active' : ''}" data-staff-table-cmp="prev">Kỳ trước</button>
                      <button type="button" class="v3-th-cmp-btn ${v3State.compareMode === 'yoy' ? 'active' : ''}" data-staff-table-cmp="yoy" ${!snap.systemCurr.allHaveYoY ? 'disabled' : ''}>Cùng kỳ năm ngoái</button>
                    </div>
                  </div>
                </th>
                ${sortHeader('netSubs', 'Sub ròng', true, 'width:5.2%;')}
                ${sortHeader('videos', 'Video', true, 'width:3.6%;')}
                ${sortHeader('engagement', 'Tương tác', true, 'width:11.4%;')}
                ${sortHeader('revenue', 'Doanh thu', true, 'width:7.9%;')}
              </tr>
            </thead>
            <tbody>
              ${sorted.map((st, idx) => {
                const pctBar = st.curr.views ? Math.max(3, Math.round((st.curr.views / maxViews) * 100)) : 0;
                const g = st.viewsGrowthPct;
                const isNeutral = g === null || Math.abs(g) < 0.5;
                const gBg = isNeutral ? 'transparent' : (g > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.10)');
                let growthBadgeHtml = '';
                if (st.empId === topGrowthEmpId) {
                  growthBadgeHtml = topGrowthPositive
                    ? `<span class="v3-badge highest v3-staff-growth-tag" data-staff-growth-badge="fastest">Tăng nhanh nhất</span>`
                    : `<span class="v3-badge muted v3-staff-growth-tag" data-staff-growth-badge="least_drop">Giảm ít nhất</span>`;
                } else if (st.empId === steepestDropEmpId) {
                  growthBadgeHtml = `<span class="v3-badge lowest v3-staff-growth-tag" data-staff-growth-badge="steepest_drop">Giảm mạnh nhất</span>`;
                }
                const shortTeamName = st.teamName.replace(/^Team\s+/i, '');
                return `
                  <tr class="clickable-row v3-staff-row"
                      data-staff-row-emp="${st.empId}"
                      data-staff-open-channel="${st.primaryChannelId}"
                      data-emp-color="${st.color}"
                      data-emp-views="${st.curr.views ?? ''}"
                      data-emp-prev-views="${st.prev.views ?? ''}"
                      data-emp-subs="${st.curr.netSubs ?? ''}"
                      data-emp-videos="${st.curr.videosPublished ?? 0}"
                      data-emp-eng="${st.curr.engagementRate ?? ''}"
                      data-emp-rev="${st.curr.estimatedRevenue ?? ''}"
                      title="Nhấn để mở Báo cáo theo kênh: ${esc(st.allChannelTitles)}">
                    <td>
                      <span class="v3-badge v3-staff-rank-badge ${idx === 0 ? 'highest' : (idx === sorted.length - 1 && sorted.length > 2 ? 'lowest' : 'muted')}">
                        #${idx + 1}${idx === 0 ? ' · Cao nhất' : (idx === sorted.length - 1 && sorted.length > 2 ? ' · Thấp nhất' : '')}
                      </span>
                    </td>
                    <td>
                      <div class="v3-staff-name-cell">
                        <span class="v3-team-dot" style="background:${st.color};flex-shrink:0;" data-emp-color="${st.color}"></span>
                        <strong class="v3-staff-emp-name">${esc(st.empName)}</strong>
                        ${growthBadgeHtml}
                      </div>
                    </td>
                    <td>
                      <span class="v3-badge v3-staff-team-badge" style="background:${st.teamColor}1D;color:${st.teamColor};border:1px solid ${st.teamColor}50;">
                        <span class="v3-team-dot" style="background:${st.teamColor};"></span>
                        <span>${esc(shortTeamName)}</span>
                      </span>
                    </td>
                    <td>
                      <div class="v3-staff-channel-cell" title="${esc(st.allChannelTitles)}">
                        <img src="${esc(st.primaryAvatar)}" alt="" class="v3-staff-ch-avatar" onerror="this.style.display='none'">
                        <span class="v3-staff-ch-title">${esc(st.channelTitleSummary)}</span>
                      </div>
                    </td>
                    <td class="v3-bar-cell">
                      <div class="v3-staff-views-top">
                        <strong>${st.curr.views !== null ? fmtInt(st.curr.views) : '—'}</strong>
                        <span class="v3-staff-prev-views">Kỳ trước: ${st.prev.views !== null ? fmtInt(st.prev.views) : '—'}</span>
                      </div>
                      <div class="v3-bar-track">
                        <div class="v3-bar-fill" style="width:${pctBar}%;background:${st.teamColor};"></div>
                      </div>
                    </td>
                    <td class="num" style="background:${gBg};">${fmtDeltaBadge(st.curr.views, st.prev.views)}</td>
                    <td class="num">${st.curr.netSubs !== null ? (st.curr.netSubs > 0 ? '+' + fmtInt(st.curr.netSubs) : fmtInt(st.curr.netSubs)) : '—'}</td>
                    <td class="num">${fmtInt(st.curr.videosPublished)}</td>
                    <td class="num">
                      <div class="v3-staff-eng-cell">
                        <strong class="v3-staff-eng-val">${st.curr.engagementRate !== null ? fmtDec(st.curr.engagementRate, 2) + '%' : '—'}</strong>
                        ${fmtEngDeltaCompact(st.curr.engagementRate, st.prev.engagementRate)}
                      </div>
                    </td>
                    <td class="num"><strong>${st.curr.estimatedRevenue !== null ? fmtMoney(st.curr.estimatedRevenue) : '—'}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr id="v3-staff-total-row"
                  data-total-views="${groupCurr.views ?? ''}"
                  data-total-prev-views="${groupPrev.views ?? ''}"
                  data-total-subs="${groupCurr.netSubs ?? ''}"
                  data-total-videos="${groupCurr.videosPublished ?? 0}"
                  data-total-eng="${groupCurr.engagementRate ?? ''}"
                  data-total-rev="${groupCurr.estimatedRevenue ?? ''}">
                <td colspan="4" style="white-space:nowrap;">
                  <strong>TỔNG CỘNG (${sorted.length === 15 ? 'TẤT CẢ 15 NHÂN VIÊN = TOÀN NETWORK' : `${sorted.length} NHÂN VIÊN ĐANG HIỂN THỊ`})</strong>
                </td>
                <td class="v3-bar-cell">
                  <div class="v3-staff-views-top">
                    <strong>${groupCurr.views !== null ? fmtInt(groupCurr.views) : '—'}</strong>
                    <span class="v3-staff-prev-views">Kỳ trước: ${groupPrev.views !== null ? fmtInt(groupPrev.views) : '—'}</span>
                  </div>
                </td>
                <td class="num">${fmtDeltaBadge(groupCurr.views, groupPrev.views)}</td>
                <td class="num"><strong>${groupCurr.netSubs !== null ? (groupCurr.netSubs > 0 ? '+' + fmtInt(groupCurr.netSubs) : fmtInt(groupCurr.netSubs)) : '—'}</strong></td>
                <td class="num"><strong>${fmtInt(groupCurr.videosPublished)}</strong></td>
                <td class="num">
                  <div class="v3-staff-eng-cell">
                    <strong class="v3-staff-eng-val">${groupCurr.engagementRate !== null ? fmtDec(groupCurr.engagementRate, 2) + '%' : '—'}</strong>
                    ${fmtEngDeltaCompact(groupCurr.engagementRate, groupPrev.engagementRate)}
                  </div>
                </td>
                <td class="num"><strong>${groupCurr.estimatedRevenue !== null ? fmtMoney(groupCurr.estimatedRevenue) : '—'}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;

    // Bind sorting
    body.querySelectorAll('[data-staff-sort]').forEach(th => {
      th.addEventListener('click', (e) => {
        e.stopPropagation();
        const f = th.getAttribute('data-staff-sort');
        if (v3State.staffSortField === f) {
          v3State.staffSortAsc = !v3State.staffSortAsc;
        } else {
          v3State.staffSortField = f;
          v3State.staffSortAsc = false;
        }
        renderStaffPage(snap);
      });
    });

    // Bind Kỳ trước | Cùng kỳ năm ngoái in delta column header
    body.querySelectorAll('[data-staff-table-cmp]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        const nextCmp = btn.getAttribute('data-staff-table-cmp');
        if (nextCmp && nextCmp !== v3State.compareMode) {
          v3State.compareMode = nextCmp;
          refreshActiveView();
        }
      });
    });

    // Bind team filter buttons
    body.querySelectorAll('[data-staff-team]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.staffTeamFilter = btn.getAttribute('data-staff-team');
        renderStaffPage(snap);
      });
    });

    document.getElementById('v3-staff-team-reset-btn')?.addEventListener('click', () => {
      v3State.staffTeamFilter = 'ALL';
      renderStaffPage(snap);
    });

    // Bind row click to open channel report
    body.querySelectorAll('[data-staff-open-channel]').forEach(tr => {
      tr.addEventListener('click', () => {
        v3State.selectedChannelId = tr.getAttribute('data-staff-open-channel');
        v3State.channelMode = 'single';
        if (c.switchView) c.switchView('view-report-channel');
      });
    });
  }

  function renderStaffCompareTab(body, snap) {
    // Independent period selector for Tab 2 ("Báo cáo NV theo biểu đồ")
    const isCustomChartPeriod = !!v3State.staffChartCustomPeriod;
    const effPreset = isCustomChartPeriod ? (v3State.staffChartPreset || '30d') : v3State.preset;
    const effMonthKey = isCustomChartPeriod ? (v3State.staffChartMonthKey || '2026-10') : v3State.monthKey;
    const effQuarterKey = isCustomChartPeriod ? (v3State.staffChartQuarterKey || '2026-Q4') : v3State.quarterKey;
    const effStartDate = isCustomChartPeriod ? (v3State.staffChartStartDate || '2026-09-27') : v3State.startDate;
    const effEndDate = isCustomChartPeriod ? (v3State.staffChartEndDate || '2026-10-26') : v3State.endDate;

    const chartWin = isCustomChartPeriod
      ? buildPeriodWindow({
          preset: effPreset,
          monthKey: effMonthKey,
          quarterKey: effQuarterKey,
          startDate: effStartDate,
          endDate: effEndDate,
          compareMode: 'prev'
        })
      : snap.win;

    const staffDs = buildStaffDataset(snap, chartWin);
    const allStaffByViews = [...staffDs.staffList].sort((a, b) => (b.curr.views || 0) - (a.curr.views || 0));

    // Validate selected employee IDs (0..5 employees when explicitly cleared; default top 3 by period views)
    const validSelectedIds = (v3State.staffSelectedIds || []).filter(id => allStaffByViews.some(st => st.empId === id)).slice(0, 5);
    if (validSelectedIds.length === 0 && !v3State.staffClearedEmpty) {
      allStaffByViews.slice(0, 3).forEach(st => validSelectedIds.push(st.empId));
    }
    v3State.staffSelectedIds = validSelectedIds;

    const selectedStaff = v3State.staffSelectedIds
      .map(id => allStaffByViews.find(st => st.empId === id))
      .filter(Boolean);

    const metric = ['views', 'netSubs', 'revenue'].includes(v3State.staffChartMetric) ? v3State.staffChartMetric : 'views';
    v3State.staffChartMetric = metric;
    const scaleMode = v3State.staffChartScale === 'index100' ? 'index100' : 'actual';
    v3State.staffChartScale = scaleMode;

    const metricLabelMap = {
      views: 'Lượt xem (Views)',
      netSubs: 'Sub ròng',
      revenue: 'Doanh thu [Analytics]'
    };

    const chartRangeFullVN = `${formatIsoToVN(chartWin.start)} – ${formatIsoToVN(chartWin.end)}`;
    const chartRangeShort = `${formatIsoToShortVN(chartWin.start)}–${formatIsoToShortVN(chartWin.end)}`;
    const prevRangeShort = chartWin.compareRangeShort || `${formatIsoToShortVN(chartWin.prevStart)}–${formatIsoToShortVN(chartWin.prevEnd)}`;

    // Status chip in Row 2 (compact so Row 2 never overflows at 1280px, always occupies space via visibility)
    let statusChipVisible = false;
    let statusChipText = '';
    let statusChipTooltip = 'Đang theo kỳ chung của báo cáo';
    let statusChipHasReset = false;
    if (isCustomChartPeriod) {
      statusChipVisible = true;
      statusChipText = `Kỳ riêng · ${chartWin.shortPresetName}${chartWin.isPartialPeriod ? ` (${chartWin.dayCount}/${chartWin.totalCalendarDays}d)` : ` (${chartRangeShort})`}`;
      statusChipTooltip = `Kỳ riêng · ${chartWin.shortPresetName} · ${chartRangeShort}${chartWin.isPartialPeriod ? ` · chưa trọn ${chartWin.dayCount}/${chartWin.totalCalendarDays} ngày` : ''}`;
      statusChipHasReset = true;
    } else if (chartWin.isPartialQuarter) {
      statusChipVisible = true;
      statusChipText = `Chưa trọn quý (${chartWin.dayCount}/${chartWin.quarterCalendarDays} ngày)`;
      statusChipTooltip = statusChipText;
    } else if (chartWin.isPartialPeriod) {
      statusChipVisible = true;
      statusChipText = `Chưa trọn tháng (${chartWin.dayCount}/${chartWin.totalCalendarDays} ngày)`;
      statusChipTooltip = statusChipText;
    }

    // Calculate daily sums per employee & group total for reconciliation & legend display
    const days = chartWin.days || [];
    const prevDays = chartWin.prevDays || [];
    const getPointMetricVal = (pt, m) => {
      if (!pt) return 0;
      if (m === 'revenue') return pt.revenue !== null && pt.revenue !== undefined ? Number(pt.revenue) : 0;
      if (m === 'netSubs') return pt.netSubs !== null && pt.netSubs !== undefined ? Number(pt.netSubs) : 0;
      return pt.views !== null && pt.views !== undefined ? Number(pt.views) : 0;
    };

    const dailyMapByEmp = new Map();
    const dailySumByEmp = {};
    allStaffByViews.forEach(st => {
      const sMap = new Map();
      (st.curr.dailySeries || []).forEach(pt => sMap.set(pt.day, pt));
      dailyMapByEmp.set(st.empId, sMap);
      const sumVal = days.reduce((acc, d) => {
        const v = getPointMetricVal(sMap.get(d), metric);
        return metric === 'revenue' ? Number((acc + v).toFixed(2)) : (acc + v);
      }, 0);
      dailySumByEmp[st.empId] = sumVal;
    });

    const groupDailySum = selectedStaff.reduce((acc, st) => {
      const v = dailySumByEmp[st.empId] || 0;
      return metric === 'revenue' ? Number((acc + v).toFixed(2)) : (acc + v);
    }, 0);

    // Single-staff previous period sum (for dashed line when selectedStaff.length === 1)
    let singlePrevSum = null;
    if (selectedStaff.length === 1) {
      const onlySt = selectedStaff[0];
      const pMap = new Map();
      (onlySt.prev.dailySeries || []).forEach(pt => pMap.set(pt.day, pt));
      singlePrevSum = prevDays.reduce((acc, d) => {
        const v = getPointMetricVal(pMap.get(d), metric);
        return metric === 'revenue' ? Number((acc + v).toFixed(2)) : (acc + v);
      }, 0);
    }

    const fmtLegendMetricVal = (val) => {
      if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
      if (metric === 'revenue') return fmtMoney(val);
      if (metric === 'netSubs') return val > 0 ? '+' + fmtInt(val) : fmtInt(val);
      return fmtInt(val);
    };

    const hiddenSet = new Set(v3State.staffHiddenKeys || []);
    const isSingleStaff = selectedStaff.length === 1;
    const prevLineActive = isSingleStaff && !hiddenSet.has('PREV');

    body.innerHTML = `
      <section class="v3-panel v3-staff-panel-locked is-compare-tab" id="v3-staff-main-panel"
               data-staff-active-tab="compare"
               data-chart-period-mode="${isCustomChartPeriod ? 'custom' : 'global'}"
               data-staff-daily-sums='${esc(JSON.stringify(dailySumByEmp))}'
               data-staff-group-sum="${groupDailySum}">
        <div class="v3-chart-a-header" id="v3-staff-chart-header">
          <!-- Hàng 1 cố định: Tên khối + ngày thật + Công tắc Thực tế|Chuẩn hóa + Công tắc Views|Sub ròng|Doanh thu -->
          <div class="v3-chart-a-header-row1" id="v3-staff-chart-header-row1">
            <div class="v3-panel-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13.2px;">
              <i class="ri-line-chart-line" style="color:#38BDF8;"></i>
              <span>Xu hướng nhân viên — ${esc(metricLabelMap[metric])}</span>
              <span class="v3-panel-date-tag">(${chartRangeFullVN})</span>
            </div>
            <div style="display:inline-flex;align-items:center;gap:6px;flex-wrap:nowrap;flex-shrink:0;">
              <div class="v3-preset-group" id="v3-staff-scale-switch" role="group" aria-label="Chế độ thang đo Thực tế hoặc Chuẩn hóa">
                <button type="button" class="v3-preset-btn ${scaleMode === 'actual' ? 'active' : ''}" data-staff-scale="actual" title="Hiển thị giá trị thực tế theo ngày">Thực tế</button>
                <button type="button" class="v3-preset-btn ${scaleMode === 'index100' ? 'active' : ''}" data-staff-scale="index100" title="Quy chuẩn ngày đầu tiên của kỳ = 100 để nhân viên nhỏ không bị nhân viên lớn làm chìm">Chuẩn hóa (ngày đầu = 100)</button>
              </div>
              <div class="v3-preset-group" id="v3-staff-metric-switch" role="group" aria-label="Chỉ số biểu đồ nhân viên">
                <button type="button" class="v3-preset-btn ${metric === 'views' ? 'active' : ''}" data-staff-metric="views">Views</button>
                <button type="button" class="v3-preset-btn ${metric === 'netSubs' ? 'active' : ''}" data-staff-metric="netSubs">Sub ròng</button>
                <button type="button" class="v3-preset-btn ${metric === 'revenue' ? 'active' : ''}" data-staff-metric="revenue">Doanh thu</button>
              </div>
            </div>
          </div>

          <!-- Hàng 2 cố định (chiều cao đủ chứa nội dung, không cần cuộn từ 1280px): Ô chọn nhân viên + Nút Kỳ trước + Chip Kỳ riêng (chiếm chỗ cố định) + Nhóm nút kỳ + Một ô khoảng ngày cố định -->
          <div class="v3-chart-a-header-row2" id="v3-staff-chart-header-row2">
            ${renderUnifiedFloatingPicker({
              wrapperId: 'v3-staff-multi-picker',
              btnId: 'v3-staff-picker-btn',
              btnClass: 'v3-ch-picker-btn v3-staff-picker-trigger',
              btnTitle: 'Chọn từ 1 đến 5 nhân viên để vẽ đường xu hướng',
              triggerHtml: `
                <i class="ri-user-search-line" style="color:#38BDF8;font-size:13.5px;"></i>
                <span class="v3-ch-picker-btn-text">
                  <strong>Nhân viên (${selectedStaff.length}/5)</strong>
                </span>
                <i class="ri-arrow-down-s-line" style="color:var(--text-muted);font-size:14px;margin-left:auto;"></i>
              `,
              menuId: 'v3-staff-picker-menu',
              searchId: 'v3-staff-picker-search',
              searchPlaceholder: 'Tìm tên nhân viên, tên kênh demo, team...',
              searchQuery: v3State.staffPickerQuery,
              teamBarId: 'v3-staff-picker-team-bar',
              teamChipAttr: 'data-stf-picker-team',
              teamFilter: v3State.staffPickerTeamFilter,
              showTop3AndClear: true,
              top3BtnId: 'v3-staff-pick-top3',
              clearBtnId: 'v3-staff-pick-clear',
              listId: 'v3-staff-picker-list',
              emptyId: 'v3-staff-picker-empty',
              emptyText: 'Không tìm thấy nhân viên phù hợp',
              isOpen: v3State.staffPickerOpen,
              isMulti: true,
              maxSelect: 5,
              selectedIds: v3State.staffSelectedIds,
              rowToggleAttr: 'data-stf-toggle-id',
              rowTeamAttr: 'data-stf-team-id',
              items: allStaffByViews.map(item => ({
                id: item.empId,
                title: item.empName,
                subtitle: item.channelTitleSummary,
                color: item.color,
                teamId: item.teamId,
                teamName: item.teamName.replace(/^Team\s+/i, ''),
                teamColor: item.teamColor,
                views: item.curr.views,
                searchBlob: `${item.empName} ${item.allChannelTitles} ${item.teamName}`.toLowerCase(),
                onlyBtnHtml: `<button type="button" class="v3-staff-only-btn" data-stf-only-id="${item.empId}" title="Chỉ chọn riêng nhân viên này để bật đường đối chứng kỳ trước">Chỉ 1 NV</button>`
              }))
            })}

            <button type="button"
                    class="v3-preset-btn v3-staff-prev-ref-btn ${prevLineActive ? 'active' : ''}"
                    id="v3-staff-prev-toggle-btn"
                    ${!isSingleStaff ? 'disabled' : ''}
                    title="${isSingleStaff ? `Bật/tắt đường nét đứt đối chứng kỳ trước (${prevRangeShort})` : 'Đối chứng kỳ trước (nét đứt) chỉ bật khi chọn đúng 1 nhân viên'}">
              <i class="${isSingleStaff ? 'ri-git-commit-line' : 'ri-lock-line'}"></i>
              <span>Kỳ trước (${isSingleStaff ? prevRangeShort : '1 NV'})</span>
            </button>

            <span class="v3-chart-status-chip v3-staff-row2-status-chip ${statusChipVisible ? 'is-visible' : 'is-hidden'}" id="v3-staff-chart-period-chip" data-custom-active="${isCustomChartPeriod ? 'true' : 'false'}" title="${esc(statusChipTooltip)}">
              <span class="v3-chart-status-chip-text">${esc(statusChipText || 'Theo kỳ chung')}</span>
              <button type="button" class="v3-chart-status-chip-close" id="v3-staff-chart-reset-btn" title="Về kỳ chung" aria-label="Về kỳ chung" style="display:${statusChipHasReset ? 'inline-flex' : 'none'};" ${statusChipHasReset ? '' : 'tabindex="-1"'}>×</button>
            </span>

            <div class="v3-preset-group" id="v3-staff-chart-period-presets" style="margin-left:auto;" role="group" aria-label="Bộ chọn kỳ riêng biểu đồ nhân viên">
              <button type="button" class="v3-preset-btn ${effPreset === '7d' ? 'active' : ''}" data-stf-chart-preset="7d">7 ngày</button>
              <button type="button" class="v3-preset-btn ${(effPreset === '30d' || effPreset === '28d') ? 'active' : ''}" data-stf-chart-preset="30d">30 ngày</button>
              <button type="button" class="v3-preset-btn ${effPreset === 'month' ? 'active' : ''}" data-stf-chart-preset="month">Tháng</button>
              <button type="button" class="v3-preset-btn ${effPreset === 'quarter' ? 'active' : ''}" data-stf-chart-preset="quarter">Quý</button>
              <button type="button" class="v3-preset-btn ${effPreset === 'custom' ? 'active' : ''}" data-stf-chart-preset="custom">Tùy chỉnh</button>
            </div>
            <div class="v3-chart-period-slot" id="v3-staff-chart-period-slot">
              ${effPreset === 'month' ? `
                <select id="v3-stf-chart-month-select" class="v3-select v3-select-sm v3-chart-slot-control" aria-label="Chọn tháng cụ thể">
                  <option value="2026-10" ${effMonthKey === '2026-10' ? 'selected' : ''}>Tháng 10/2026 (26/31 ngày)</option>
                  <option value="2026-09" ${effMonthKey === '2026-09' ? 'selected' : ''}>Tháng 09/2026 (30 ngày)</option>
                  <option value="2026-08" ${effMonthKey === '2026-08' ? 'selected' : ''}>Tháng 08/2026 (31 ngày)</option>
                </select>
              ` : effPreset === 'quarter' ? `
                <select id="v3-stf-chart-quarter-select" class="v3-select v3-select-sm v3-chart-slot-control" aria-label="Chọn quý cụ thể">
                  <option value="2026-Q4" ${effQuarterKey === '2026-Q4' ? 'selected' : ''}>Quý 4/2026 (26/92 ngày)</option>
                  <option value="2026-Q3" ${effQuarterKey === '2026-Q3' ? 'selected' : ''}>Quý 3/2026 (92 ngày)</option>
                  <option value="2026-Q2" ${effQuarterKey === '2026-Q2' ? 'selected' : ''}>Quý 2/2026 (91 ngày)</option>
                </select>
              ` : effPreset === 'custom' ? `
                <div class="v3-chart-custom-dates" id="v3-stf-chart-custom-wrap" title="Khoảng ngày tùy chỉnh">
                  <i class="ri-calendar-event-line v3-date-range-icon"></i>
                  <input type="date" id="v3-stf-chart-start" class="v3-date-range-part" value="${chartWin.start}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày">
                  <span class="v3-chart-date-sep">→</span>
                  <input type="date" id="v3-stf-chart-end" class="v3-date-range-part" value="${chartWin.end}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày">
                </div>
              ` : `
                <select id="v3-stf-chart-fixed-select" class="v3-select v3-select-sm v3-chart-slot-control" disabled aria-label="Khoảng ngày kỳ đang chọn">
                  <option>${effPreset === '7d' ? '20/10/2026 – 26/10/2026 (7 ngày)' : '27/09/2026 – 26/10/2026 (30 ngày)'}</option>
                </select>
              `}
            </div>
          </div>
        </div>

        <!-- Dải chú giải tương tác (Bấm để bật/tắt từng nhân viên, đường Tổng đậm, và đường Kỳ trước nét đứt khi chọn 1 NV) -->
        <div class="v3-staff-legend-strip" id="v3-staff-chart-legend">
          <div class="v3-staff-legend-pills" id="v3-staff-legend-pills">
            ${selectedStaff.map(st => {
              const isHidden = hiddenSet.has(st.empId);
              const empSum = dailySumByEmp[st.empId] || 0;
              return `
                <button type="button"
                        class="v3-staff-legend-pill ${isHidden ? 'is-muted' : ''}"
                        data-staff-legend-key="${st.empId}"
                        data-emp-daily-sum="${empSum}"
                        style="border-color:${st.color}88;background:${st.color}15;"
                        title="Nhấn để bật/tắt đường của ${esc(st.empName)} (${esc(st.channelTitleSummary)})">
                  <span class="v3-team-dot" style="background:${st.color};"></span>
                  <strong>${esc(st.empName)}</strong>
                  <span class="v3-staff-legend-val">${fmtLegendMetricVal(empSum)}</span>
                </button>
              `;
            }).join('')}

            <!-- Đường "Tổng" của nhóm đang chọn (nét đậm, bật/tắt trên chú giải) -->
            <button type="button"
                    class="v3-staff-legend-pill is-total-pill ${hiddenSet.has('TOTAL') ? 'is-muted' : ''}"
                    data-staff-legend-key="TOTAL"
                    data-total-daily-sum="${groupDailySum}"
                    title="Nhấn để bật/tắt đường Tổng của nhóm nhân viên đang chọn (Nét đậm)">
              <span class="v3-staff-legend-line-bold"></span>
              <strong>Tổng (${selectedStaff.length} NV)</strong>
              <span class="v3-staff-legend-val">${fmtLegendMetricVal(groupDailySum)}</span>
              <i class="v3-staff-total-toggle-icon ${hiddenSet.has('TOTAL') ? 'ri-eye-off-line' : 'ri-eye-line'}" id="v3-staff-total-toggle-icon"></i>
            </button>

            ${isSingleStaff ? `
              <button type="button"
                      class="v3-staff-legend-pill is-prev-pill ${hiddenSet.has('PREV') ? 'is-muted' : ''}"
                      data-staff-legend-key="PREV"
                      data-prev-daily-sum="${singlePrevSum ?? ''}"
                      title="Nhấn để bật/tắt đường đối chứng kỳ trước (Nét đứt)">
                <span class="v3-ch-legend-line dashed"></span>
                <strong>Kỳ trước (${esc(prevRangeShort)})</strong>
                <span class="v3-staff-legend-val">${fmtLegendMetricVal(singlePrevSum)}</span>
              </button>
            ` : ''}
          </div>
          <span class="v3-staff-scale-note" id="v3-staff-scale-note">
            ${scaleMode === 'actual' ? `
              <i class="ri-information-line" style="color:#F59E0B;"></i>
              <span id="v3-staff-scale-note-text">${hiddenSet.has('TOTAL')
                ? 'Đã ẩn Tổng · Bấm Tổng để bật lại hoặc chọn'
                : 'Đường Tổng làm đường nhỏ bị chìm · Bấm Tổng để ẩn hoặc chọn'}</span>
              <button type="button" class="v3-staff-scale-quick-btn" id="v3-staff-hint-switch-norm" data-staff-scale="index100">Chuẩn hóa</button>
            ` : `
              <i class="ri-scales-3-line" style="color:#38BDF8;"></i>
              <span>Chế độ Chuẩn hóa (ngày đầu = 100) giúp đường nhỏ không bị chìm · Bấm chú giải để bật/tắt</span>
            `}
          </span>
        </div>

        <div class="v3-staff-chart-canvas-wrap" id="v3-staff-chart-canvas-wrap">
          <canvas id="v3-staff-compare-canvas"></canvas>
        </div>
      </section>
    `;

    renderStaffCompareChart(selectedStaff, chartWin, metric, scaleMode, dailyMapByEmp, hiddenSet);

    // Bind Scale Switch ("Thực tế" | "Chuẩn hóa (ngày đầu = 100)")
    body.querySelectorAll('[data-staff-scale]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.staffChartScale = btn.getAttribute('data-staff-scale') || 'actual';
        renderStaffPage(snap);
      });
    });

    // Bind Metric Switch ("Views" | "Sub ròng" | "Doanh thu")
    body.querySelectorAll('[data-staff-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.staffChartMetric = btn.getAttribute('data-staff-metric') || 'views';
        renderStaffPage(snap);
      });
    });

    // Bind Unified Floating Multi-Staff Picker
    bindUnifiedFloatingPicker(body, {
      wrapperId: 'v3-staff-multi-picker',
      btnId: 'v3-staff-picker-btn',
      menuId: 'v3-staff-picker-menu',
      searchId: 'v3-staff-picker-search',
      listId: 'v3-staff-picker-list',
      emptyId: 'v3-staff-picker-empty',
      teamChipAttr: 'data-stf-picker-team',
      rowToggleAttr: 'data-stf-toggle-id',
      rowTeamAttr: 'data-stf-team-id',
      top3BtnId: 'v3-staff-pick-top3',
      clearBtnId: 'v3-staff-pick-clear',
      getOpenState: () => v3State.staffPickerOpen,
      setOpenState: (v) => { v3State.staffPickerOpen = v; },
      getSearchQuery: () => v3State.staffPickerQuery,
      setSearchQuery: (v) => { v3State.staffPickerQuery = v; },
      getTeamFilter: () => v3State.staffPickerTeamFilter,
      setTeamFilter: (v) => { v3State.staffPickerTeamFilter = v; },
      onSelectTop3: () => {
        v3State.staffClearedEmpty = false;
        v3State.staffSelectedIds = allStaffByViews.slice(0, 3).map(st => st.empId);
        v3State.staffHiddenKeys = [];
        v3State.staffPickerOpen = true;
        renderStaffPage(snap);
      },
      onClear: () => {
        v3State.staffClearedEmpty = true;
        v3State.staffSelectedIds = [];
        v3State.staffHiddenKeys = [];
        v3State.staffPickerQuery = '';
        v3State.staffPickerTeamFilter = 'ALL';
        v3State.staffPickerOpen = true;
        renderStaffPage(snap);
      },
      onRowClick: (empId) => {
        const curr = [...(v3State.staffSelectedIds || [])];
        const idx = curr.indexOf(empId);
        if (idx >= 0) {
          curr.splice(idx, 1);
          v3State.staffClearedEmpty = (curr.length === 0);
        } else {
          if (curr.length >= 5) {
            if (core().showToast) core().showToast('Tối đa 5 nhân viên trên biểu đồ để tránh rối mắt.');
            return;
          }
          curr.push(empId);
          v3State.staffClearedEmpty = false;
        }
        v3State.staffSelectedIds = curr;
        renderStaffPage(snap);
      }
    });

    body.querySelectorAll('[data-stf-only-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = btn.getAttribute('data-stf-only-id');
        if (!empId) return;
        v3State.staffClearedEmpty = false;
        v3State.staffSelectedIds = [empId];
        v3State.staffHiddenKeys = (v3State.staffHiddenKeys || []).filter(k => k !== 'PREV' && k !== empId);
        v3State.staffPickerOpen = false;
        renderStaffPage(snap);
      });
    });

    // Bind Previous-Period Dashed Line Toggle Button (when 1 staff is selected)
    document.getElementById('v3-staff-prev-toggle-btn')?.addEventListener('click', () => {
      if (selectedStaff.length !== 1) return;
      const hs = new Set(v3State.staffHiddenKeys || []);
      if (hs.has('PREV')) hs.delete('PREV');
      else hs.add('PREV');
      v3State.staffHiddenKeys = Array.from(hs);
      renderStaffPage(snap);
    });

    // Bind Clickable Legend Pills (toggle individual lines, Total line, or Prev line)
    body.querySelectorAll('[data-staff-legend-key]').forEach(pill => {
      pill.addEventListener('click', () => {
        const key = pill.getAttribute('data-staff-legend-key');
        if (!key) return;
        const hs = new Set(v3State.staffHiddenKeys || []);
        if (hs.has(key)) hs.delete(key);
        else hs.add(key);
        v3State.staffHiddenKeys = Array.from(hs);
        const inst = chartInstances['staffCompare'];
        if (inst && inst.data && inst.data.datasets) {
          inst.data.datasets.forEach((ds, dsIdx) => {
            if (ds._legendKey === key) {
              const isHiddenNow = hs.has(key);
              inst.setDatasetVisibility(dsIdx, !isHiddenNow);
            }
          });
          inst.update('none');
        }
        pill.classList.toggle('is-muted', hs.has(key));
        if (key === 'TOTAL') {
          const tIcon = document.getElementById('v3-staff-total-toggle-icon');
          if (tIcon) {
            tIcon.className = `v3-staff-total-toggle-icon ${hs.has('TOTAL') ? 'ri-eye-off-line' : 'ri-eye-line'}`;
          }
          const noteTextEl = document.getElementById('v3-staff-scale-note-text');
          if (noteTextEl) {
            noteTextEl.textContent = hs.has('TOTAL')
              ? 'Đã ẩn Tổng · Bấm Tổng để bật lại hoặc chọn'
              : 'Đường Tổng làm đường nhỏ bị chìm · Bấm Tổng để ẩn hoặc chọn';
          }
        }
        if (key === 'PREV') {
          const prevBtn = document.getElementById('v3-staff-prev-toggle-btn');
          if (prevBtn) prevBtn.classList.toggle('active', !hs.has('PREV'));
        }
      });
    });

    // Bind Independent Period Selector in Tab 2
    body.querySelectorAll('[data-stf-chart-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextPreset = btn.getAttribute('data-stf-chart-preset');
        v3State.staffChartCustomPeriod = true;
        v3State.staffChartPreset = nextPreset;
        if (nextPreset === '7d') {
          v3State.staffChartStartDate = '2026-10-20';
          v3State.staffChartEndDate = '2026-10-26';
        } else if (nextPreset === '30d') {
          v3State.staffChartStartDate = '2026-09-27';
          v3State.staffChartEndDate = '2026-10-26';
        }
        renderStaffPage(snap);
      });
    });

    document.getElementById('v3-stf-chart-month-select')?.addEventListener('change', (e) => {
      v3State.staffChartCustomPeriod = true;
      v3State.staffChartPreset = 'month';
      v3State.staffChartMonthKey = e.target.value;
      renderStaffPage(snap);
    });

    document.getElementById('v3-stf-chart-quarter-select')?.addEventListener('change', (e) => {
      v3State.staffChartCustomPeriod = true;
      v3State.staffChartPreset = 'quarter';
      v3State.staffChartQuarterKey = e.target.value;
      renderStaffPage(snap);
    });

    const applyCustomChartDates = () => {
      const sEl = document.getElementById('v3-stf-chart-start');
      const eEl = document.getElementById('v3-stf-chart-end');
      if (!sEl || !eEl) return;
      let s = sEl.value || '2026-09-27';
      let e = eEl.value || '2026-10-26';
      if (s > '2026-10-26') s = '2026-10-26';
      if (e > '2026-10-26') e = '2026-10-26';
      if (s > e) { const t = s; s = e; e = t; }
      v3State.staffChartCustomPeriod = true;
      v3State.staffChartPreset = 'custom';
      v3State.staffChartStartDate = s;
      v3State.staffChartEndDate = e;
      renderStaffPage(snap);
    };
    document.getElementById('v3-stf-chart-start')?.addEventListener('change', applyCustomChartDates);
    document.getElementById('v3-stf-chart-end')?.addEventListener('change', applyCustomChartDates);

    document.getElementById('v3-staff-chart-reset-btn')?.addEventListener('click', () => {
      v3State.staffChartCustomPeriod = false;
      renderStaffPage(snap);
    });
  }

  function renderStaffCompareChart(selectedStaff, chartWin, metric, scaleMode, dailyMapByEmp, hiddenSet) {
    destroyChart('staffCompare');
    const canvas = document.getElementById('v3-staff-compare-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const days = chartWin.days || [];
    const prevDays = chartWin.prevDays || [];
    const labels = days.map(d => formatIsoToShortVN(d));
    const isIndex100 = scaleMode === 'index100';

    const getRawVal = (pt) => {
      if (!pt) return 0;
      if (metric === 'revenue') return pt.revenue !== null && pt.revenue !== undefined ? Number(pt.revenue) : 0;
      if (metric === 'netSubs') return pt.netSubs !== null && pt.netSubs !== undefined ? Number(pt.netSubs) : 0;
      return pt.views !== null && pt.views !== undefined ? Number(pt.views) : 0;
    };

    const normalizeSeries = (rawArr) => {
      if (!isIndex100) return rawArr;
      const firstNonZero = rawArr.find(v => v !== null && v !== undefined && Math.abs(Number(v)) > 0);
      const base = firstNonZero !== undefined ? Math.abs(Number(firstNonZero)) : 1;
      return rawArr.map(v => Number(((Number(v || 0) / base) * 100).toFixed(1)));
    };

    const datasets = [];

    // 1..5 Employee lines (Fixed colors across all pages)
    selectedStaff.forEach(st => {
      const sMap = dailyMapByEmp.get(st.empId) || new Map();
      const rawSeries = days.map(d => getRawVal(sMap.get(d)));
      const dataSeries = normalizeSeries(rawSeries);
      datasets.push({
        _legendKey: st.empId,
        _rawSeries: rawSeries,
        _realDays: days,
        label: `${st.empName} (${st.channelTitleSummary})`,
        data: dataSeries,
        hidden: hiddenSet.has(st.empId),
        borderColor: st.color,
        backgroundColor: st.color + '18',
        borderWidth: 2.3,
        pointRadius: days.length > 45 ? 0 : 2.2,
        pointHoverRadius: 4.5,
        tension: 0.28
      });
    });

    // Bold "Tổng" line of the selected group (Item 13)
    const totalRawSeries = days.map((_, idx) => {
      const sumDay = selectedStaff.reduce((acc, st) => {
        const sMap = dailyMapByEmp.get(st.empId);
        const pt = sMap ? sMap.get(days[idx]) : null;
        return acc + getRawVal(pt);
      }, 0);
      return metric === 'revenue' ? Number(sumDay.toFixed(2)) : sumDay;
    });
    const totalDataSeries = normalizeSeries(totalRawSeries);
    datasets.push({
      _legendKey: 'TOTAL',
      _rawSeries: totalRawSeries,
      _realDays: days,
      label: `Tổng nhóm (${selectedStaff.length} NV)`,
      data: totalDataSeries,
      hidden: hiddenSet.has('TOTAL'),
      borderColor: '#F8FAFC',
      backgroundColor: 'transparent',
      borderWidth: 3.4,
      pointRadius: days.length > 45 ? 0 : 2.6,
      pointHoverRadius: 5,
      tension: 0.28,
      order: 0
    });

    // Dashed previous-period reference line ONLY when exactly 1 staff is selected (Item 15)
    if (selectedStaff.length === 1) {
      const onlySt = selectedStaff[0];
      const prevMap = new Map();
      (onlySt.prev.dailySeries || []).forEach(pt => prevMap.set(pt.day, pt));
      const prevRawSeries = days.map((_, idx) => {
        const pd = prevDays[idx];
        return pd ? getRawVal(prevMap.get(pd)) : null;
      });
      const prevDataSeries = normalizeSeries(prevRawSeries);
      const prevRangeShort = chartWin.compareRangeShort || `${formatIsoToShortVN(chartWin.prevStart)}–${formatIsoToShortVN(chartWin.prevEnd)}`;
      datasets.push({
        _legendKey: 'PREV',
        _rawSeries: prevRawSeries,
        _realDays: prevDays,
        label: `Kỳ trước (${prevRangeShort})`,
        data: prevDataSeries,
        hidden: hiddenSet.has('PREV'),
        borderColor: '#94A3B8',
        backgroundColor: 'transparent',
        borderDash: [6, 4],
        borderWidth: 2.0,
        pointRadius: days.length > 45 ? 0 : 1.8,
        pointHoverRadius: 4,
        tension: 0.28
      });
    }

    const fmtActualVal = (val) => {
      if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
      if (metric === 'revenue') return fmtMoney(val);
      if (metric === 'netSubs') {
        const n = Math.round(Number(val));
        return n > 0 ? '+' + fmtInt(n) : fmtInt(n);
      }
      return fmtInt(val);
    };

    chartInstances['staffCompare'] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (items) {
                const idx = items && items[0] ? items[0].dataIndex : 0;
                const dCurr = days[idx];
                const dPrev = prevDays[idx];
                if (selectedStaff.length === 1 && dPrev) {
                  return `Ngày thứ ${idx + 1} của kỳ (${dCurr ? formatIsoToVN(dCurr) : '—'} vs Kỳ trước: ${formatIsoToVN(dPrev)})`;
                }
                return `Ngày ${dCurr ? formatIsoToVN(dCurr) : (idx + 1)}`;
              },
              label: function (ctx) {
                const ds = ctx.dataset;
                const idx = ctx.dataIndex;
                const rawVal = ds._rawSeries ? ds._rawSeries[idx] : ctx.parsed.y;
                const realIso = ds._realDays ? ds._realDays[idx] : days[idx];
                const dateTag = realIso ? ` (${formatIsoToShortVN(realIso)})` : '';
                if (isIndex100) {
                  const idxVal = ctx.parsed.y !== null && ctx.parsed.y !== undefined
                    ? Number(ctx.parsed.y).toFixed(1).replace('.', ',')
                    : '—';
                  return ` ${ds.label}${dateTag}: ${idxVal} điểm [Thực tế: ${fmtActualVal(rawVal)}]`;
                }
                return ` ${ds.label}${dateTag}: ${fmtActualVal(rawVal)}`;
              }
            }
          }
        },
        scales: {
          x: {
            afterBuildTicks: function (axis) {
              const total = labels.length;
              if (total <= 10) return;
              const stepCount = 6;
              const chosen = [];
              for (let k = 0; k <= stepCount; k++) {
                const idx = Math.round((k * (total - 1)) / stepCount);
                if (!chosen.includes(idx)) chosen.push(idx);
              }
              axis.ticks = chosen.map(v => ({ value: v }));
            },
            ticks: {
              color: '#94A3B8',
              maxRotation: 0,
              minRotation: 0,
              autoSkip: false,
              font: { size: 11 }
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            beginAtZero: !isIndex100 && metric !== 'netSubs',
            ticks: {
              color: '#94A3B8',
              precision: 0,
              callback: function (val) {
                if (isIndex100) {
                  return new Intl.NumberFormat('vi-VN').format(Math.round(val));
                }
                if (metric === 'revenue') return fmtMoney(val);
                return new Intl.NumberFormat('vi-VN').format(Math.round(val));
              }
            },
            grid: { color: 'rgba(255,255,255,0.06)' }
          }
        }
      }
    });
  }

  // =========================================================================
  // PAGE 2: BÁO CÁO THEO TEAM (#view-report-team)
  // =========================================================================
  function allocateExactTenthsPct(values) {
    const nums = values.map(v => Math.max(0, Number(v) || 0));
    const total = nums.reduce((s, v) => s + v, 0);
    if (total <= 0 || !nums.length) return nums.map(() => 0);
    const exactTenths = nums.map(v => (v / total) * 1000);
    const floored = exactTenths.map(x => Math.floor(x + 1e-9));
    const remainderTenths = 1000 - floored.reduce((s, x) => s + x, 0);
    const order = exactTenths
      .map((x, i) => ({ i, rem: x - floored[i], val: nums[i] }))
      .sort((a, b) => (b.rem - a.rem) || (b.val - a.val) || (a.i - b.i));
    for (let k = 0; k < remainderTenths && k < order.length; k++) {
      floored[order[k].i] += 1;
    }
    return floored.map(t => t / 10);
  }

  function buildSparklineSvg(dailySeries, metricKey, color, width = 108, height = 26) {
    const vals = (dailySeries || [])
      .map(d => (d && d[metricKey] !== null && d[metricKey] !== undefined ? Number(d[metricKey]) : null))
      .filter(v => v !== null && !Number.isNaN(v));
    if (vals.length < 2) {
      return `<span style="color:var(--text-dim);font-size:11px;">—</span>`;
    }
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV > 0 ? (maxV - minV) : 1;
    const padX = 4;
    const padY = 4;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const pts = vals.map((v, idx) => {
      const x = padX + (idx / (vals.length - 1)) * innerW;
      const y = padY + innerH - ((v - minV) / range) * innerH;
      return [Number(x.toFixed(1)), Number(y.toFixed(1))];
    });
    const polyPoints = pts.map(p => `${p[0]},${p[1]}`).join(' ');
    const areaPoints = `${pts[0][0]},${height - 2} ${polyPoints} ${pts[pts.length - 1][0]},${height - 2}`;
    const lastPt = pts[pts.length - 1];
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="v3-sparkline-svg" aria-hidden="true"><polygon points="${areaPoints}" fill="${color}" fill-opacity="0.14"></polygon><polyline points="${polyPoints}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline><circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="2.5" fill="${color}"></circle></svg>`;
  }

  function renderTeamPage(snap) {
    const root = document.getElementById('v3-team-root');
    if (!root) return;
    const legacySection = document.getElementById('v3-legacy-team-section');
    if (legacySection) legacySection.style.display = 'none';

    const sortedTeamsByViews = [...snap.teamPairs].sort((a, b) => (b.curr.views || 0) - (a.curr.views || 0));
    const selectedTeam = sortedTeamsByViews.find(t => t.id === v3State.selectedTeamId) || sortedTeamsByViews[0];
    if (selectedTeam) v3State.selectedTeamId = selectedTeam.id;

    // Exact 100.0% network share allocation across the 3 teams
    const teamNetShares = allocateExactTenthsPct(sortedTeamsByViews.map(t => t.curr.views || 0));
    const teamNetShareMap = new Map();
    sortedTeamsByViews.forEach((t, i) => teamNetShareMap.set(t.id, teamNetShares[i]));

    // Item 1: Team badges ("Tăng nhanh nhất" only when delta > 0; "Giảm ít nhất" when no team > 0; "Giảm mạnh nhất" for steepest drop)
    const teamsWithGrowth = snap.teamPairs.filter(tp => tp.viewsGrowthPct !== null && tp.viewsGrowthPct !== undefined);
    let topGrowthTeamId = null;
    let topGrowthTeamPositive = false;
    let slowestTeamId = null;
    if (teamsWithGrowth.length >= 2) {
      const byGrowth = [...teamsWithGrowth].sort((a, b) => (b.viewsGrowthPct ?? -999) - (a.viewsGrowthPct ?? -999));
      if (byGrowth[0].viewsGrowthPct !== byGrowth[byGrowth.length - 1].viewsGrowthPct) {
        topGrowthTeamId = byGrowth[0].id;
        topGrowthTeamPositive = (byGrowth[0].viewsGrowthPct ?? 0) > 0;
        slowestTeamId = byGrowth[byGrowth.length - 1].id;
      }
    }

    // Sortable Team Ranking Table rows
    const rankSortField = v3State.teamRankSortField || 'views';
    const rankSortAsc = !!v3State.teamRankSortAsc;
    const getTeamSortVal = (tp, f) => {
      if (f === 'growth') return tp.viewsGrowthPct ?? -9999;
      if (f === 'netSubs') return tp.curr.netSubs ?? -999999;
      if (f === 'revenue') return tp.curr.estimatedRevenue ?? -1;
      if (f === 'channels') return tp.curr.totalChannels ?? 0;
      return tp.curr.views ?? -1;
    };
    const rankedTeams = [...snap.teamPairs].sort((a, b) => {
      const va = getTeamSortVal(a, rankSortField);
      const vb = getTeamSortVal(b, rankSortField);
      return rankSortAsc ? (va - vb) : (vb - va);
    });

    function teamRankHeader(field, labelHtml, isNum = true, extraClass = '') {
      const active = rankSortField === field;
      const arrow = active ? (rankSortAsc ? ' ▲' : ' ▼') : '';
      return `<th class="${isNum ? 'num' : ''} ${extraClass}" data-team-rank-sort="${field}" style="cursor:pointer;user-select:none;${active ? 'color:#38BDF8;' : ''}">${labelHtml}${arrow}</th>`;
    }

    // Exact 100.0% share within the selected team's 5 channels
    const selectedTeamChannelsRaw = [...(selectedTeam ? selectedTeam.channels : [])].sort((a, b) => (b.curr.views || 0) - (a.curr.views || 0));
    const channelShareTenths = allocateExactTenthsPct(selectedTeamChannelsRaw.map(cp => cp.curr.views || 0));
    const channelShareMap = new Map();
    selectedTeamChannelsRaw.forEach((cp, idx) => channelShareMap.set(cp.id, channelShareTenths[idx]));

    const sortMode = v3State.teamTableSort || 'growth';
    const teamChannelsSorted = [...(selectedTeam ? selectedTeam.channels : [])].sort((a, b) => {
      if (sortMode === 'views') {
        return (b.curr.views || 0) - (a.curr.views || 0);
      }
      return (b.viewsGrowthPct ?? -999) - (a.viewsGrowthPct ?? -999);
    });

    // Item 5: Chart A ("Lượt xem theo ngày") independent period or global period
    const isCustomChartPeriod = !!v3State.teamChartCustomPeriod;
    const effChartPreset = isCustomChartPeriod ? (v3State.teamChartPreset || '30d') : v3State.preset;
    const effChartMonthKey = isCustomChartPeriod ? (v3State.teamChartMonthKey || '2026-10') : v3State.monthKey;
    const effChartQuarterKey = isCustomChartPeriod ? (v3State.teamChartQuarterKey || '2026-Q4') : v3State.quarterKey;
    const effChartStartDate = isCustomChartPeriod ? (v3State.teamChartStartDate || '2026-09-27') : v3State.startDate;
    const effChartEndDate = isCustomChartPeriod ? (v3State.teamChartEndDate || '2026-10-26') : v3State.endDate;

    const chartWin = isCustomChartPeriod
      ? buildPeriodWindow({
          preset: effChartPreset,
          monthKey: effChartMonthKey,
          quarterKey: effChartQuarterKey,
          startDate: effChartStartDate,
          endDate: effChartEndDate,
          compareMode: 'prev'
        })
      : snap.win;

    const c = core();
    const teamsRaw = (c.DATA_STORE && c.DATA_STORE.teams) || [];
    let chartTeamsByViews;
    if (isCustomChartPeriod) {
      const chChartCurr = snap.channelsMeta.map(m => computeChannelWindowMetrics(m, chartWin.start, chartWin.end, snap.scenarioId));
      const customTeamList = teamsRaw.map(t => {
        const tCurrList = chChartCurr.filter(ch => ch.meta.teamId === t.id);
        return {
          id: t.id,
          name: t.name,
          color: TEAM_COLORS[t.id] || '#38BDF8',
          curr: aggregateChannelMetricsList(tCurrList, chartWin.days)
        };
      });
      chartTeamsByViews = [...customTeamList].sort((a, b) => (b.curr.views || 0) - (a.curr.views || 0));
    } else {
      chartTeamsByViews = sortedTeamsByViews;
    }

    const chartTeamViewsSummary = {};
    chartTeamsByViews.forEach(tp => { chartTeamViewsSummary[tp.id] = tp.curr.views; });

    const chartTitleMap = {
      views: 'Lượt xem theo ngày',
      watchHours: 'Giờ xem theo ngày [Analytics]',
      revenue: 'Doanh thu theo ngày [Analytics]'
    };
    const chartTitle = chartTitleMap[v3State.teamChartMetric] || 'Lượt xem theo ngày';

    // Item 3, 4, 5, 6: Block 3 ("Xu hướng một team") has its own reference period toggle (prev / prev_quarter / yoy / custom)
    let activeSingleCmp = v3State.teamSingleCompareMode || 'prev';
    if (activeSingleCmp === 'yoy' && !snap.systemCurr.allHaveYoY) {
      activeSingleCmp = 'prev';
      v3State.teamSingleCompareMode = 'prev';
    }
    const singleWin = buildPeriodWindow({
      preset: v3State.preset,
      monthKey: v3State.monthKey,
      quarterKey: v3State.quarterKey,
      startDate: v3State.startDate,
      endDate: v3State.endDate,
      compareMode: (activeSingleCmp === 'prev' || activeSingleCmp === 'custom') ? 'prev_exact' : activeSingleCmp
    });

    const M_days = Math.max(1, singleWin.dayCount);
    let singleRefStart = singleWin.prevStart;
    let singleRefEnd = singleWin.prevEnd;
    let singleRefModeName = singleWin.compareModeName || 'Kỳ trước';

    if (activeSingleCmp === 'prev_quarter') {
      if (v3State.preset === 'quarter') {
        singleRefStart = singleWin.prevStart;
        singleRefEnd = singleWin.prevEnd;
      } else {
        singleRefStart = shiftIsoMonths(singleWin.start, -3);
        singleRefEnd = shiftIsoDays(singleRefStart, M_days - 1);
      }
      singleRefModeName = 'Quý trước';
    } else if (activeSingleCmp === 'yoy') {
      singleRefStart = shiftIsoYear(singleWin.start, -1);
      singleRefEnd = shiftIsoDays(singleRefStart, M_days - 1);
      singleRefModeName = 'Cùng kỳ năm ngoái';
    } else if (activeSingleCmp === 'custom') {
      let cs = v3State.teamSingleRefStartDate || singleWin.prevStart;
      let ce = v3State.teamSingleRefEndDate || singleWin.prevEnd;
      if (cs > '2026-10-26') cs = '2026-10-26';
      if (ce > '2026-10-26') ce = '2026-10-26';
      if (cs > ce) {
        const tmp = cs; cs = ce; ce = tmp;
      }
      // Prevent overlap with current period [singleWin.start, singleWin.end]
      if (cs <= singleWin.end && ce >= singleWin.start) {
        cs = singleWin.prevStart;
        ce = singleWin.prevEnd;
      }
      v3State.teamSingleRefStartDate = cs;
      v3State.teamSingleRefEndDate = ce;
      singleRefStart = cs;
      singleRefEnd = ce;
      singleRefModeName = 'Tùy chỉnh';
    } else {
      singleRefEnd = shiftIsoDays(singleWin.start, -1);
      singleRefStart = shiftIsoDays(singleRefEnd, -(M_days - 1));
      singleRefModeName = 'Kỳ trước';
    }

    const singleRefDays = listIsoDays(singleRefStart, singleRefEnd);
    const N_days = Math.max(1, singleRefDays.length);
    const isSingleUnequalLength = (N_days !== M_days);
    const sameRefYear = singleRefStart.slice(0, 4) === singleWin.start.slice(0, 4) && singleRefEnd.slice(0, 4) === singleWin.end.slice(0, 4);
    const singleRefRangeShort = sameRefYear
      ? `${formatIsoToShortVN(singleRefStart)}–${formatIsoToShortVN(singleRefEnd)}`
      : `${formatIsoToShortVN(singleRefStart)}/${singleRefStart.slice(2, 4)}–${formatIsoToShortVN(singleRefEnd)}/${singleRefEnd.slice(2, 4)}`;
    const singleRefRangeFullVN = `${formatIsoToVN(singleRefStart)} – ${formatIsoToVN(singleRefEnd)}`;

    const selTeamChannelsMeta = snap.channelsMeta.filter(m => m.teamId === selectedTeam.id);
    const singlePrevChMetrics = selTeamChannelsMeta.map(m => computeChannelWindowMetrics(m, singleRefStart, singleRefEnd, snap.scenarioId));
    const singleTeamPrevAgg = aggregateChannelMetricsList(singlePrevChMetrics, singleRefDays);

    const singleMetric = v3State.teamSingleMetric || 'views';
    const singleMetricLabelMap = {
      views: 'Views',
      netSubs: 'Sub ròng',
      revenue: 'Doanh thu'
    };
    const getTeamMetricVal = (aggObj, m) => {
      if (!aggObj) return null;
      if (m === 'revenue') return aggObj.estimatedRevenue;
      if (m === 'netSubs') return aggObj.netSubs;
      return aggObj.views;
    };
    const fmtSingleMetricVal = (val, m) => {
      if (val === null || val === undefined) return '—';
      if (m === 'revenue') return fmtMoney(val);
      if (m === 'netSubs') return val > 0 ? '+' + fmtInt(Math.round(val)) : (val < 0 ? '−' + fmtInt(Math.round(Math.abs(val))) : '0');
      return fmtInt(Math.round(val));
    };

    const singleCurrTotal = getTeamMetricVal(selectedTeam.curr, singleMetric);
    const singlePrevTotal = getTeamMetricVal(singleTeamPrevAgg, singleMetric);
    const useSingleAvg = isSingleUnequalLength && (v3State.teamSingleUnequalMode || 'avg') === 'avg';
    const dispCurrVal = (singleCurrTotal !== null && useSingleAvg) ? (singleCurrTotal / M_days) : singleCurrTotal;
    const dispPrevVal = (singlePrevTotal !== null && useSingleAvg) ? (singlePrevTotal / N_days) : singlePrevTotal;
    const singleDiffVal = (dispCurrVal !== null && dispPrevVal !== null) ? (dispCurrVal - dispPrevVal) : null;
    const singleDiffFormatted = singleDiffVal === null
      ? '—'
      : (singleDiffVal > 0 ? '+' : (singleDiffVal < 0 ? '−' : '')) +
      (singleMetric === 'revenue' ? fmtMoney(Math.abs(singleDiffVal)) : fmtInt(Math.round(Math.abs(singleDiffVal)))) +
      (useSingleAvg ? '/ngày' : '');
    const singleDiffPct = (singleDiffVal !== null && dispPrevVal && Math.abs(dispPrevVal) > 0)
      ? ((singleDiffVal / Math.abs(dispPrevVal)) * 100)
      : null;
    const singleDiffColorClass = singleDiffPct === null || Math.abs(singleDiffPct) < 2
      ? 'flat'
      : (singleDiffVal > 0 ? 'up' : 'down');

    // Status chip in Row 1 of "Xu hướng một team" (error, unequal length note, or partial quarter note)
    let singleStatusText = '';
    let singleStatusVisible = false;
    let singleStatusError = false;
    if (v3State.teamSingleRefError) {
      singleStatusText = v3State.teamSingleRefError;
      singleStatusVisible = true;
      singleStatusError = true;
    } else if (isSingleUnequalLength) {
      singleStatusText = `Đối chứng ${N_days} ngày, kỳ này ${M_days} ngày`;
      singleStatusVisible = true;
    } else if (singleWin.isPartialQuarter) {
      singleStatusText = `Chưa trọn quý (${singleWin.dayCount}/${singleWin.quarterCalendarDays} ngày) · So với ${N_days} ngày đầu quý đối chứng`;
      singleStatusVisible = true;
    }

    const currRangeShort = `${formatIsoToShortVN(snap.win.start)}–${formatIsoToShortVN(snap.win.end)}`;
    const currRangeFullVN = `${formatIsoToVN(snap.win.start)} – ${formatIsoToVN(snap.win.end)}`;
    const chartRangeFullVN = `${formatIsoToVN(chartWin.start)} – ${formatIsoToVN(chartWin.end)}`;
    const chartRangeShort = `${formatIsoToShortVN(chartWin.start)}–${formatIsoToShortVN(chartWin.end)}`;
    const sysCurr = snap.systemCurr;
    const sysPrev = snap.systemPrev;

    const renderTeamSelectorChips = (containerId, ariaLabel) => `
      <div class="v3-single-team-chips" id="${containerId}" role="tablist" aria-label="${esc(ariaLabel)}">
        ${sortedTeamsByViews.map(tp => {
          const active = tp.id === selectedTeam.id;
          return `
            <button type="button" class="v3-single-team-chip ${active ? 'active' : ''}" data-select-team-card="${tp.id}"
              style="${active ? `border-color:${tp.color};background:${tp.color}1F;color:var(--text-main);box-shadow:0 0 0 1px ${tp.color}40;` : ''}">
              <span class="v3-team-dot" style="background:${tp.color};"></span>
              <span>${esc(tp.name)}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    const growthSortActive = rankSortField === 'growth';
    const growthSortArrow = growthSortActive ? (rankSortAsc ? ' ▲' : ' ▼') : '';

    root.innerHTML = `
      <!-- 1. TEAM RANKING TABLE (Replaces 3 team cards; sortable columns, sparkline, fixed "Toàn network" footer, no selection state) -->
      <section class="v3-panel" id="v3-team-ranking-panel">
        <div class="v3-panel-header" style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <div class="v3-panel-title">
              <i class="ri-trophy-line" style="color:#38BDF8;"></i>
              Bảng xếp hạng 3 Team <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
            </div>
            ${snap.win.isPartialQuarter ? `<span class="v3-badge partial">Chưa trọn quý (${snap.win.dayCount}/${snap.win.quarterCalendarDays} ngày)</span>` : ''}
          </div>
          <span style="font-size:11.5px;color:var(--text-muted);">Nhấn vào tiêu đề cột để sắp xếp · Dòng “Toàn network” cố định ở cuối</span>
        </div>
        <div class="v3-table-wrap">
          <table class="v3-table" id="v3-team-ranking-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Team sản xuất</th>
                ${teamRankHeader('views', 'Views & % Views Network', false, 'v3-bar-cell')}
                <th class="num" style="vertical-align:middle;">
                  <div style="display:inline-flex;flex-direction:column;align-items:flex-end;gap:4px;">
                    <div data-team-rank-sort="growth" style="cursor:pointer;user-select:none;${growthSortActive ? 'color:#38BDF8;' : ''}">
                      <div>So với ${esc(snap.win.compareModeName)}${growthSortArrow}</div>
                      <div class="v3-th-sub">(${esc(snap.win.compareRangeShort)}${snap.win.isPartialQuarter ? ` · ${snap.win.dayCount} ngày đầu` : ''})</div>
                    </div>
                    <div class="v3-th-cmp-switch" role="group" aria-label="Đổi kỳ đối chứng bảng xếp hạng">
                      <button type="button" class="v3-th-cmp-btn ${v3State.compareMode !== 'yoy' ? 'active' : ''}" data-table-cmp="prev">Kỳ trước</button>
                      <button type="button" class="v3-th-cmp-btn ${v3State.compareMode === 'yoy' ? 'active' : ''}" data-table-cmp="yoy" ${!snap.systemCurr.allHaveYoY ? 'disabled' : ''}>Cùng kỳ năm ngoái</button>
                    </div>
                  </div>
                </th>
                ${teamRankHeader('netSubs', 'Sub ròng')}
                ${teamRankHeader('revenue', 'Doanh thu')}
                ${teamRankHeader('channels', 'Số kênh')}
                <th class="num" style="text-align:right;">Sparkline theo ngày</th>
              </tr>
            </thead>
            <tbody>
              ${rankedTeams.map((tp, idx) => {
                const netShare = teamNetShareMap.get(tp.id) ?? tp.shareOfCompanyViews;
                let growthTagHtml = '';
                if (tp.id === topGrowthTeamId) {
                  growthTagHtml = topGrowthTeamPositive
                    ? `<span class="v3-badge highest" data-team-growth-badge="fastest">Tăng nhanh nhất</span>`
                    : `<span class="v3-badge muted" data-team-growth-badge="least_drop">Giảm ít nhất</span>`;
                } else if (tp.id === slowestTeamId && (tp.viewsGrowthPct ?? 0) < 0) {
                  growthTagHtml = `<span class="v3-badge lowest" data-team-growth-badge="steepest_drop">Giảm mạnh nhất</span>`;
                }
                return `
                  <tr data-team-rank-row="${tp.id}">
                    <td style="white-space:nowrap;">
                      <span class="v3-rank-pill ${idx === 0 ? 'top1' : ''}">#${idx + 1}</span>
                    </td>
                    <td style="white-space:nowrap;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span class="v3-team-dot" style="width:10px;height:10px;background:${tp.color};flex-shrink:0;"></span>
                        <strong>${esc(tp.name)}</strong>
                        ${growthTagHtml}
                      </div>
                    </td>
                    <td class="v3-bar-cell" style="min-width:200px;">
                      <div style="display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-mono);font-size:12px;">
                        <strong>${tp.curr.views !== null ? fmtInt(tp.curr.views) : '—'}</strong>
                        <span style="color:var(--text-muted);" data-team-net-share="${netShare.toFixed(1)}">${fmtDec(netShare, 1)}%</span>
                      </div>
                      <div class="v3-bar-track">
                        <div class="v3-bar-fill" style="width:${Math.min(100, netShare)}%;min-width:2px;background:${tp.color};"></div>
                      </div>
                    </td>
                    <td class="num" style="white-space:nowrap;">${fmtDeltaBadge(tp.curr.views, tp.prev.views)}</td>
                    <td class="num" style="white-space:nowrap;">${tp.curr.netSubs !== null ? (tp.curr.netSubs > 0 ? '+' + fmtInt(tp.curr.netSubs) : fmtInt(tp.curr.netSubs)) : '—'}</td>
                    <td class="num" style="white-space:nowrap;"><strong>${tp.curr.estimatedRevenue !== null ? fmtMoney(tp.curr.estimatedRevenue) : '—'}</strong></td>
                    <td class="num" style="white-space:nowrap;">${tp.curr.totalChannels} kênh</td>
                    <td class="num" style="text-align:right;white-space:nowrap;">
                      ${buildSparklineSvg(tp.curr.dailySeries, 'views', tp.color)}
                    </td>
                  </tr>
                `;
    }).join('')}
            </tbody>
            <tfoot>
              <tr id="v3-team-ranking-network-row" data-network-views="${sysCurr.views ?? ''}" data-network-subs="${sysCurr.netSubs ?? ''}" data-network-rev="${sysCurr.estimatedRevenue ?? ''}">
                <td style="white-space:nowrap;"><span class="v3-rank-pill">Σ</span></td>
                <td style="white-space:nowrap;"><strong>Toàn network</strong></td>
                <td class="v3-bar-cell">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-mono);font-size:12px;">
                    <strong>${sysCurr.views !== null ? fmtInt(sysCurr.views) : '—'}</strong>
                    <span style="color:var(--text-main);font-weight:800;">100,0%</span>
                  </div>
                  <div class="v3-bar-track">
                    <div class="v3-bar-fill" style="width:100%;min-width:2px;background:#94A3B8;"></div>
                  </div>
                </td>
                <td class="num" style="white-space:nowrap;">${fmtDeltaBadge(sysCurr.views, sysPrev.views)}</td>
                <td class="num" style="white-space:nowrap;"><strong>${sysCurr.netSubs !== null ? (sysCurr.netSubs > 0 ? '+' + fmtInt(sysCurr.netSubs) : fmtInt(sysCurr.netSubs)) : '—'}</strong></td>
                <td class="num" style="white-space:nowrap;"><strong>${sysCurr.estimatedRevenue !== null ? fmtMoney(sysCurr.estimatedRevenue) : '—'}</strong></td>
                <td class="num" style="white-space:nowrap;"><strong>${sysCurr.totalChannels} kênh</strong></td>
                <td class="num" style="text-align:right;white-space:nowrap;" data-network-sparkline-color="#94A3B8">
                  ${buildSparklineSvg(sysCurr.dailySeries, 'views', '#94A3B8')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- 2. TABLE/CHART A: FULL-WIDTH 3-TEAM TREND CHART (Fixed 2-row header, fixed period slot, status chip always reserves space) -->
      <section class="v3-panel v3-tm-chart-a-locked" id="v3-team-chart-a-panel" data-chart-period-mode="${isCustomChartPeriod ? 'custom' : 'global'}" data-chart-team-views='${esc(JSON.stringify(chartTeamViewsSummary))}'>
        <div class="v3-chart-a-header" id="v3-team-chart-a-header">
          <div class="v3-chart-a-header-row1" id="v3-team-chart-a-header-row1">
            <div class="v3-panel-title" style="white-space:nowrap;">
              <i class="ri-line-chart-line" style="color:#38BDF8;"></i>
              <span>${esc(chartTitle)}</span> <span class="v3-panel-date-tag">(${chartRangeFullVN})</span>
            </div>
            <div class="v3-preset-group" role="group" aria-label="Chỉ số biểu đồ Lượt xem theo ngày">
              <button type="button" class="v3-preset-btn ${v3State.teamChartMetric === 'views' ? 'active' : ''}" data-tm-metric="views">Lượt xem</button>
              <button type="button" class="v3-preset-btn ${v3State.teamChartMetric === 'watchHours' ? 'active' : ''}" data-tm-metric="watchHours">Giờ xem [Analytics]</button>
              <button type="button" class="v3-preset-btn ${v3State.teamChartMetric === 'revenue' ? 'active' : ''}" data-tm-metric="revenue">Doanh thu [Analytics]</button>
            </div>
          </div>
          <div class="v3-chart-a-header-row2" id="v3-team-chart-a-header-row2">
            <div class="v3-preset-group" id="v3-team-chart-period-presets" role="group" aria-label="Bộ chọn kỳ riêng biểu đồ Lượt xem theo ngày">
              <button type="button" class="v3-preset-btn ${effChartPreset === '7d' ? 'active' : ''}" data-tm-chart-preset="7d">7 ngày</button>
              <button type="button" class="v3-preset-btn ${(effChartPreset === '30d' || effChartPreset === '28d') ? 'active' : ''}" data-tm-chart-preset="30d">30 ngày</button>
              <button type="button" class="v3-preset-btn ${effChartPreset === 'month' ? 'active' : ''}" data-tm-chart-preset="month">Tháng</button>
              <button type="button" class="v3-preset-btn ${effChartPreset === 'quarter' ? 'active' : ''}" data-tm-chart-preset="quarter">Quý</button>
              <button type="button" class="v3-preset-btn ${effChartPreset === 'custom' ? 'active' : ''}" data-tm-chart-preset="custom">Tùy chỉnh</button>
            </div>
            <div class="v3-chart-period-slot" id="v3-team-chart-period-slot">
              ${effChartPreset === 'month' ? `
                <select id="v3-tm-chart-month-select" class="v3-select v3-select-sm v3-chart-slot-control" aria-label="Chọn tháng cụ thể">
                  <option value="2026-10" ${effChartMonthKey === '2026-10' ? 'selected' : ''}>Tháng 10/2026 (26/31 ngày)</option>
                  <option value="2026-09" ${effChartMonthKey === '2026-09' ? 'selected' : ''}>Tháng 09/2026 (30 ngày)</option>
                  <option value="2026-08" ${effChartMonthKey === '2026-08' ? 'selected' : ''}>Tháng 08/2026 (31 ngày)</option>
                </select>
              ` : effChartPreset === 'quarter' ? `
                <select id="v3-tm-chart-quarter-select" class="v3-select v3-select-sm v3-chart-slot-control" aria-label="Chọn quý cụ thể">
                  <option value="2026-Q4" ${effChartQuarterKey === '2026-Q4' ? 'selected' : ''}>Quý 4/2026 (26/92 ngày)</option>
                  <option value="2026-Q3" ${effChartQuarterKey === '2026-Q3' ? 'selected' : ''}>Quý 3/2026 (92 ngày)</option>
                  <option value="2026-Q2" ${effChartQuarterKey === '2026-Q2' ? 'selected' : ''}>Quý 2/2026 (91 ngày)</option>
                </select>
              ` : effChartPreset === 'custom' ? `
                <div class="v3-chart-custom-dates" id="v3-tm-chart-custom-wrap" title="Khoảng ngày tùy chỉnh">
                  <i class="ri-calendar-event-line v3-date-range-icon"></i>
                  <input type="date" id="v3-tm-chart-start" class="v3-date-range-part" value="${chartWin.start}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày">
                  <span class="v3-chart-date-sep">→</span>
                  <input type="date" id="v3-tm-chart-end" class="v3-date-range-part" value="${chartWin.end}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày">
                </div>
              ` : `
                <select id="v3-tm-chart-fixed-select" class="v3-select v3-select-sm v3-chart-slot-control" disabled aria-label="Khoảng ngày kỳ đang chọn">
                  <option>${effChartPreset === '7d' ? '20/10/2026 – 26/10/2026 (7 ngày)' : '27/09/2026 – 26/10/2026 (30 ngày)'}</option>
                </select>
              `}
            </div>
            <span class="v3-chart-status-chip ${isCustomChartPeriod ? 'is-visible' : 'is-hidden'}" id="v3-team-chart-period-chip" data-custom-active="${isCustomChartPeriod ? 'true' : 'false'}">
              <span class="v3-chart-status-chip-text">Kỳ riêng · ${esc(chartWin.shortPresetName)} · ${chartRangeShort}${chartWin.isPartialPeriod ? ` · chưa trọn ${chartWin.dayCount}/${chartWin.totalCalendarDays} ngày` : ''}</span>
              <button type="button" class="v3-chart-status-chip-close" id="v3-team-chart-reset-btn" title="Về kỳ chung" aria-label="Về kỳ chung" ${isCustomChartPeriod ? '' : 'tabindex="-1"'}>×</button>
            </span>
          </div>
        </div>
        <div class="v3-chart-a-canvas-wrap" id="v3-team-chart-a-canvas-wrap">
          <canvas id="v3-team-trend-canvas"></canvas>
        </div>
      </section>

      <!-- 3. TABLE/CHART B: SINGLE-TEAM PERIOD COMPARISON ("Xu hướng một team" · Fixed 2-row header, custom ref dates, unequal-length toggle) -->
      <section class="v3-panel v3-tm-single-locked" id="v3-single-team-card">
        <div class="v3-chart-a-header" id="v3-single-team-header">
          <!-- Hàng 1 cố định: Tên khối, ngày kỳ, chip trạng thái (luôn giữ chỗ), công tắc Tổng|Trung bình/ngày (khi lệch độ dài), công tắc Views/Sub ròng/Doanh thu -->
          <div class="v3-chart-a-header-row1" id="v3-single-team-header-row1">
            <div class="v3-panel-title" style="white-space:nowrap;">
              <i class="ri-focus-2-line" style="color:${selectedTeam.color};"></i>
              <span>Xu hướng một team — ${esc(selectedTeam.name)}</span>
              <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
            </div>
            <div style="display:inline-flex;align-items:center;gap:6px;flex-wrap:nowrap;flex-shrink:0;">
              <span class="v3-chart-status-chip ${singleStatusVisible ? 'is-visible' : 'is-hidden'} ${singleStatusError ? 'is-error' : ''}" id="v3-single-team-status-chip">
                <span class="v3-chart-status-chip-text">${esc(singleStatusText)}</span>
              </span>
              <div class="v3-preset-group" id="v3-tm-unequal-mode-group" style="display:${isSingleUnequalLength ? 'inline-flex' : 'none'};" role="group" aria-label="Chế độ so sánh khi hai kỳ khác độ dài">
                <button type="button" class="v3-preset-btn ${(v3State.teamSingleUnequalMode || 'avg') === 'total' ? 'active' : ''}" data-tm-unequal-mode="total">Tổng</button>
                <button type="button" class="v3-preset-btn ${(v3State.teamSingleUnequalMode || 'avg') === 'avg' ? 'active' : ''}" data-tm-unequal-mode="avg">Trung bình/ngày</button>
              </div>
              <div class="v3-preset-group" role="group" aria-label="Chỉ số xu hướng 1 team">
                <button type="button" class="v3-preset-btn ${singleMetric === 'views' ? 'active' : ''}" data-tm-single-metric="views">Views</button>
                <button type="button" class="v3-preset-btn ${singleMetric === 'netSubs' ? 'active' : ''}" data-tm-single-metric="netSubs" ${selectedTeam.curr.netSubs === null ? 'disabled' : ''}>Sub ròng</button>
                <button type="button" class="v3-preset-btn ${singleMetric === 'revenue' ? 'active' : ''}" data-tm-single-metric="revenue" ${selectedTeam.curr.monetaryCount === 0 ? 'disabled' : ''}>Doanh thu</button>
              </div>
            </div>
          </div>

          <!-- Hàng 2 cố định: Ba chip chọn team, nhãn nhỏ "So với:", công tắc đối chứng (Kỳ trước / Quý trước / Cùng kỳ năm ngoái / Tùy chỉnh), ô ngày cố định -->
          <div class="v3-chart-a-header-row2" id="v3-single-team-header-row2">
            ${renderTeamSelectorChips('v3-single-team-selector', 'Chọn team cho Xu hướng một team')}
            <span class="v3-chart-row-label" id="v3-single-team-so-voi-label">So với:</span>
            <div class="v3-preset-group" id="v3-single-team-cmp-group" role="group" aria-label="Kỳ đối chứng Xu hướng một team">
              <button type="button" class="v3-preset-btn ${activeSingleCmp === 'prev' ? 'active' : ''}" data-tm-cmp="prev">Kỳ trước</button>
              <button type="button" class="v3-preset-btn ${activeSingleCmp === 'prev_quarter' ? 'active' : ''}" data-tm-cmp="prev_quarter">Quý trước</button>
              <button type="button" class="v3-preset-btn ${activeSingleCmp === 'yoy' ? 'active' : ''}" data-tm-cmp="yoy" ${!snap.systemCurr.allHaveYoY ? 'disabled' : ''}>Cùng kỳ năm ngoái</button>
              <button type="button" class="v3-preset-btn ${activeSingleCmp === 'custom' ? 'active' : ''}" data-tm-cmp="custom">Tùy chỉnh</button>
            </div>
            <div class="v3-chart-period-slot" id="v3-single-team-ref-slot">
              ${activeSingleCmp === 'custom' ? `
                <div class="v3-chart-custom-dates" id="v3-tm-ref-custom-wrap" title="Khoảng ngày đối chứng tùy chỉnh">
                  <i class="ri-calendar-event-line v3-date-range-icon"></i>
                  <input type="date" id="v3-tm-ref-start" class="v3-date-range-part" value="${singleRefStart}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày đối chứng">
                  <span class="v3-chart-date-sep">→</span>
                  <input type="date" id="v3-tm-ref-end" class="v3-date-range-part" value="${singleRefEnd}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày đối chứng">
                </div>
              ` : `
                <select id="v3-tm-ref-fixed-select" class="v3-select v3-select-sm v3-chart-slot-control" disabled aria-label="Khoảng ngày kỳ đối chứng">
                  <option>${singleRefRangeFullVN} (${N_days} ngày)</option>
                </select>
              `}
            </div>
            <div class="v3-ch-inline-legend" id="v3-single-team-inline-legend">
              <span class="v3-ch-legend-item">
                <span class="v3-ch-legend-line solid" style="background:${selectedTeam.color};"></span>
                <span>Kỳ này</span>
              </span>
              <span class="v3-ch-legend-item">
                <span class="v3-ch-legend-line dashed"></span>
                <span>Đối chứng</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Summary Strip: Các ô tóm tắt (Tổng kỳ đối chứng, Chênh lệch, % thay đổi) đều ghi ngày thật của kỳ đối chứng -->
        <div class="v3-single-team-summary-strip" id="v3-single-team-summary">
          <div class="v3-st-summary-item">
            <span class="v3-st-summary-label">
              ${useSingleAvg ? 'TB/ngày kỳ này' : 'Tổng kỳ này'} (${currRangeShort}${singleWin.isPartialQuarter ? ` · Chưa trọn quý ${M_days}/${singleWin.quarterCalendarDays} ngày` : ` · ${M_days} ngày`})
            </span>
            <strong class="v3-st-summary-val" data-st-curr-total="${singleCurrTotal ?? ''}" data-st-curr-disp="${dispCurrVal ?? ''}" style="color:${selectedTeam.color};">
              ${fmtSingleMetricVal(dispCurrVal, singleMetric)}${useSingleAvg ? `/ngày <span style="font-size:10.5px;color:var(--text-muted);font-weight:500;">(Tổng: ${fmtSingleMetricVal(singleCurrTotal, singleMetric)})</span>` : ''}
            </strong>
          </div>
          <div class="v3-st-summary-item">
            <span class="v3-st-summary-label">
              ${useSingleAvg ? 'TB/ngày kỳ đối chứng' : 'Tổng kỳ đối chứng'} (${esc(singleRefRangeShort)} · ${N_days} ngày)
            </span>
            <strong class="v3-st-summary-val" data-st-prev-total="${singlePrevTotal ?? ''}" data-st-prev-disp="${dispPrevVal ?? ''}">
              ${fmtSingleMetricVal(dispPrevVal, singleMetric)}${useSingleAvg ? `/ngày <span style="font-size:10.5px;color:var(--text-muted);font-weight:500;">(Tổng: ${fmtSingleMetricVal(singlePrevTotal, singleMetric)})</span>` : ''}
            </strong>
          </div>
          <div class="v3-st-summary-item">
            <span class="v3-st-summary-label">Chênh lệch ${esc(singleMetricLabelMap[singleMetric])} (so với ${esc(singleRefRangeShort)})</span>
            <strong class="v3-st-summary-val v3-st-diff ${singleDiffColorClass}">
              ${singleDiffFormatted}
            </strong>
          </div>
          <div class="v3-st-summary-item">
            <span class="v3-st-summary-label">% Thay đổi (so với ${esc(singleRefRangeShort)})</span>
            <div>${fmtDeltaBadge(dispCurrVal, dispPrevVal, singleMetric === 'revenue')}</div>
          </div>
        </div>

        <div class="v3-single-team-canvas-wrap" id="v3-single-team-canvas-wrap">
          <canvas id="v3-single-team-canvas"></canvas>
        </div>
      </section>

      <!-- 4. SINGLE TEAM SELECTOR + 5-CHANNEL TABLE IN SELECTED TEAM -->
      <section class="v3-panel" style="margin-bottom:0;" id="v3-team-channel-table-panel">
        <div class="v3-panel-header" style="gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div>
              <div class="v3-panel-title">
                <span class="v3-team-dot" style="width:11px;height:11px;background:${selectedTeam.color};"></span>
                Bảng 5 kênh thuộc ${esc(selectedTeam.name)} <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
              </div>
              ${selectedTeam.leader && selectedTeam.leader !== 'Trưởng nhóm' ? `
                <div class="v3-panel-subtitle">
                  Trưởng nhóm: <strong>${esc(selectedTeam.leader)}</strong>
                </div>
              ` : ''}
            </div>
            ${renderTeamSelectorChips('v3-channel-table-team-selector', 'Bộ chọn team cho bảng 5 kênh')}
            ${renderUnifiedFloatingPicker({
              wrapperId: 'v3-team-channel-quick-picker',
              btnId: 'v3-team-picker-btn',
              btnClass: 'v3-ch-picker-btn v3-staff-picker-trigger',
              btnTitle: 'Tìm kiếm nhanh kênh hoặc chuyển nhanh tới team phụ trách',
              triggerHtml: `
                <i class="ri-search-eye-line" style="color:#38BDF8;font-size:13.5px;"></i>
                <span class="v3-ch-picker-btn-text">
                  <strong>Tìm kênh (${selectedTeam.channels.length}/15)</strong>
                </span>
                <i class="ri-arrow-down-s-line" style="color:var(--text-muted);font-size:14px;margin-left:auto;"></i>
              `,
              menuId: 'v3-team-picker-menu',
              searchId: 'v3-team-picker-search',
              searchPlaceholder: 'Tìm tên kênh, @handle, PIC, team...',
              searchQuery: v3State.teamQuickPickerQuery,
              teamBarId: 'v3-team-picker-team-bar',
              teamChipAttr: 'data-tm-picker-team',
              teamFilter: v3State.teamQuickPickerTeamFilter,
              showTop3AndClear: false,
              listId: 'v3-team-picker-list',
              emptyId: 'v3-team-picker-empty',
              emptyText: 'Không tìm thấy kênh phù hợp',
              isOpen: v3State.teamQuickPickerOpen,
              isMulti: false,
              maxSelect: 5,
              selectedIds: selectedTeam.channels.map(c => c.id),
              rowToggleAttr: 'data-tm-pick-channel-id',
              rowTeamAttr: 'data-tm-pick-team-id',
              items: snap.channelPairs.map(item => ({
                id: item.id,
                title: item.meta.title,
                subtitle: `${item.meta.handle} · PIC: ${item.meta.employeeName}`,
                color: item.meta.channelColor,
                teamId: item.meta.teamId,
                teamName: item.meta.teamName.replace(/^Team\s+/i, ''),
                teamColor: item.meta.teamColor,
                views: item.curr.views,
                searchBlob: `${item.meta.title} ${item.meta.handle} ${item.meta.employeeName} ${item.meta.teamName}`.toLowerCase()
              }))
            })}
            ${snap.win.isPartialQuarter ? `<span class="v3-badge partial">Chưa trọn quý (${snap.win.dayCount}/${snap.win.quarterCalendarDays} ngày)</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:12px;color:var(--text-muted);font-weight:600;">Sắp xếp:</span>
            <div class="v3-preset-group">
              <button type="button" class="v3-preset-btn ${sortMode === 'growth' ? 'active' : ''}" data-tm-sort="growth">Tăng trưởng</button>
              <button type="button" class="v3-preset-btn ${sortMode === 'views' ? 'active' : ''}" data-tm-sort="views">Lượt xem</button>
            </div>
          </div>
        </div>
        <div class="v3-table-wrap">
          <table class="v3-table" id="v3-team-5channel-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Kênh YouTube</th>
                <th>Nhân viên (PIC)</th>
                <th class="num">Views kỳ này</th>
                <th class="num" style="min-width:80px;">Tỷ trọng<br>trong team</th>
                <th class="num">
                  <div>So với ${esc(snap.win.compareModeName)}</div>
                  <div class="v3-th-sub">(${esc(snap.win.compareRangeShort)}${snap.win.isPartialQuarter ? ` · ${snap.win.dayCount} ngày đầu` : ''})</div>
                </th>
                <th class="num v3-col-sub-gap">Sub ròng</th>
                <th class="num v3-col-vid-gap">Video</th>
                <th class="num">Đăng gần nhất</th>
                <th class="num">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const chWithGrowth = teamChannelsSorted.filter(cp => cp.viewsGrowthPct !== null && cp.viewsGrowthPct !== undefined);
                let topChId = null;
                let topChPositive = false;
                let bottomChId = null;
                let bottomChNegative = false;
                if (sortMode === 'views') {
                  if (teamChannelsSorted.length >= 2) {
                    topChId = teamChannelsSorted[0].id;
                    bottomChId = teamChannelsSorted[teamChannelsSorted.length - 1].id;
                  }
                } else if (chWithGrowth.length >= 2) {
                  const byChG = [...chWithGrowth].sort((a, b) => (b.viewsGrowthPct ?? -999) - (a.viewsGrowthPct ?? -999));
                  if (byChG[0].viewsGrowthPct !== byChG[byChG.length - 1].viewsGrowthPct) {
                    topChId = byChG[0].id;
                    topChPositive = (byChG[0].viewsGrowthPct ?? 0) > 0;
                    const lastCh = byChG[byChG.length - 1];
                    if ((lastCh.viewsGrowthPct ?? 0) < 0) {
                      bottomChId = lastCh.id;
                      bottomChNegative = true;
                    }
                  }
                }
                return teamChannelsSorted.map((cp, idx) => {
                  let tagHtml = '';
                  if (sortMode === 'views') {
                    if (cp.id === topChId) tagHtml = `<span class="v3-badge highest">Lớn nhất</span>`;
                    else if (cp.id === bottomChId) tagHtml = `<span class="v3-badge lowest">Nhỏ nhất</span>`;
                  } else {
                    if (cp.id === topChId) {
                      tagHtml = topChPositive
                        ? `<span class="v3-badge highest" data-channel-growth-badge="fastest">Tăng nhanh nhất</span>`
                        : `<span class="v3-badge muted" data-channel-growth-badge="least_drop">Giảm ít nhất</span>`;
                    } else if (cp.id === bottomChId && bottomChNegative) {
                      tagHtml = `<span class="v3-badge lowest" data-channel-growth-badge="steepest_drop">Giảm mạnh nhất</span>`;
                    }
                  }
                  const isSlowUpload = cp.daysSinceLastUpload > 7;
                  const chShare = channelShareMap.get(cp.id) ?? 0;
                  return `
                    <tr class="clickable-row" data-goto-channel="${cp.id}">
                      <td style="white-space:nowrap;">
                        <span class="v3-rank-pill ${idx === 0 ? 'top1' : ''}">#${idx + 1}</span>
                      </td>
                      <td style="white-space:nowrap;">
                        <div style="display:inline-flex;align-items:center;gap:6px;">
                          <strong>${esc(cp.meta.title)}</strong>
                          ${tagHtml}
                        </div>
                      </td>
                      <td style="white-space:nowrap;">
                        <span style="display:inline-flex;align-items:center;gap:6px;">
                          <span class="v3-team-dot" style="background:${cp.meta.employeeColor};flex-shrink:0;" data-emp-color="${cp.meta.employeeColor}"></span>
                          <span>${esc(cp.meta.employeeName)}</span>
                        </span>
                      </td>
                      <td class="num" style="white-space:nowrap;"><strong>${cp.curr.views !== null ? fmtInt(cp.curr.views) : '—'}</strong></td>
                      <td class="v3-bar-cell" style="min-width:78px;" data-channel-team-share="${chShare.toFixed(1)}">
                        <div style="display:flex;justify-content:flex-end;font-family:var(--font-mono);font-size:11.5px;font-weight:700;">
                          <span>${fmtDec(chShare, 1)}%</span>
                        </div>
                        <div class="v3-bar-track">
                          <div class="v3-bar-fill" style="width:${Math.min(100, chShare)}%;min-width:2px;background:${selectedTeam.color};"></div>
                        </div>
                      </td>
                      <td class="num" style="white-space:nowrap;">${fmtDeltaBadge(cp.curr.views, cp.prev.views)}</td>
                      <td class="num v3-col-sub-gap" style="white-space:nowrap;">${cp.curr.netSubs !== null ? (cp.curr.netSubs > 0 ? '+' + fmtInt(cp.curr.netSubs) : fmtInt(cp.curr.netSubs)) : '—'}</td>
                      <td class="num v3-col-vid-gap" style="white-space:nowrap;">${fmtInt(cp.curr.videosPublished)}</td>
                      <td class="num" style="white-space:nowrap;font-family:var(--font-sans);">
                        <span class="${isSlowUpload ? 'v3-slow-upload-pill' : ''}" title="${isSlowUpload ? 'Quá 7 ngày chưa đăng video mới' : 'Lịch đăng bình thường'}">
                          <span style="font-family:var(--font-mono);">${formatIsoToVN(cp.lastPublishedCutoff)}</span>
                          <span style="font-size:10.5px;${isSlowUpload ? '' : 'color:var(--text-muted);'}">(${cp.daysSinceLastUpload} ngày)</span>
                        </span>
                      </td>
                      <td class="num" style="white-space:nowrap;"><strong>${cp.curr.estimatedRevenue !== null ? fmtMoney(cp.curr.estimatedRevenue) : '—'}</strong></td>
                    </tr>
                  `;
                }).join('');
              })()}
            </tbody>
            <tfoot>
              <tr id="v3-team-5channel-total-row">
                <td colspan="3"><strong>Tổng cộng ${esc(selectedTeam.name)} (5 kênh)</strong></td>
                <td class="num" style="white-space:nowrap;"><strong>${selectedTeam.curr.views !== null ? fmtInt(selectedTeam.curr.views) : '—'}</strong></td>
                <td class="num" style="white-space:nowrap;" data-channel-team-share-total="100.0"><strong>100,0%</strong></td>
                <td class="num" style="white-space:nowrap;">${fmtDeltaBadge(selectedTeam.curr.views, selectedTeam.prev.views)}</td>
                <td class="num v3-col-sub-gap" style="white-space:nowrap;"><strong>${selectedTeam.curr.netSubs !== null ? (selectedTeam.curr.netSubs > 0 ? '+' + fmtInt(selectedTeam.curr.netSubs) : fmtInt(selectedTeam.curr.netSubs)) : '—'}</strong></td>
                <td class="num v3-col-vid-gap" style="white-space:nowrap;"><strong>${fmtInt(selectedTeam.curr.videosPublished)}</strong></td>
                <td class="num" style="white-space:nowrap;">—</td>
                <td class="num" style="white-space:nowrap;"><strong>${selectedTeam.curr.estimatedRevenue !== null ? fmtMoney(selectedTeam.curr.estimatedRevenue) : '—'}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;

    // Render 3-Team Line Chart (no legend, Y starts at 0, Vietnamese ticks, shorter end-of-line label "tên team · X", minGap >= 16px, reduced right padding)
    destroyChart('teamTrend');
    const trendCanvas = document.getElementById('v3-team-trend-canvas');
    if (trendCanvas && typeof Chart !== 'undefined') {
      const metric = v3State.teamChartMetric;
      const days = chartWin.days;
      const labels = days.map(d => d.slice(8, 10) + '/' + d.slice(5, 7));
      const datasets = chartTeamsByViews.map(tp => {
        const series = (tp.curr.dailySeries || []).map(d => d[metric]);
        let periodTotalStr = '—';
        if (metric === 'views' && tp.curr.views !== null) {
          periodTotalStr = fmtCompact(tp.curr.views, true);
        } else if (metric === 'watchHours' && tp.curr.watchHours !== null) {
          periodTotalStr = fmtInt(tp.curr.watchHours) + 'h';
        } else if (metric === 'revenue' && tp.curr.estimatedRevenue !== null) {
          periodTotalStr = fmtMoney(tp.curr.estimatedRevenue);
        }
        return {
          label: tp.name,
          endLabel: `${tp.name} · ${periodTotalStr}`,
          data: series,
          borderColor: tp.color,
          backgroundColor: 'transparent',
          borderWidth: 2.6,
          pointRadius: 2.2,
          tension: 0.3
        };
      });

      const directEndLabelsPlugin = {
        id: 'directTeamEndLabels',
        afterDatasetsDraw(chart) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const items = [];
          chart.data.datasets.forEach((ds, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta || meta.hidden || !meta.data || !meta.data.length) return;
            let lastEl = null;
            for (let k = meta.data.length - 1; k >= 0; k--) {
              if (ds.data[k] !== null && ds.data[k] !== undefined) {
                lastEl = meta.data[k];
                break;
              }
            }
            if (!lastEl) return;
            items.push({
              x: lastEl.x,
              y: lastEl.y,
              rawY: lastEl.y,
              color: ds.borderColor,
              text: ds.endLabel || ds.label
            });
          });
          if (!items.length) return;
          items.sort((a, b) => a.rawY - b.rawY);
          // Item 9: Push end-of-line labels apart whenever vertical distance is < 16px (enforce minGap = 18px)
          const minGap = 18;
          const minTop = chartArea.top + 8;
          const maxBottom = chartArea.bottom - 8;
          for (let pass = 0; pass < 4; pass++) {
            for (let i = 1; i < items.length; i++) {
              const diff = items[i].y - items[i - 1].y;
              if (diff < minGap) {
                const push = (minGap - diff) / 2;
                items[i - 1].y -= push;
                items[i].y += push;
              }
            }
            if (items[0].y < minTop) {
              items[0].y = minTop;
              for (let i = 1; i < items.length; i++) {
                if (items[i].y - items[i - 1].y < minGap) {
                  items[i].y = items[i - 1].y + minGap;
                }
              }
            }
            if (items[items.length - 1].y > maxBottom) {
              items[items.length - 1].y = maxBottom;
              for (let i = items.length - 2; i >= 0; i--) {
                if (items[i + 1].y - items[i].y < minGap) {
                  items[i].y = items[i + 1].y - minGap;
                }
              }
            }
          }
          chart._lastEndLabelPositions = items.map(it => ({ text: it.text, y: Number(it.y.toFixed(1)), rawY: Number(it.rawY.toFixed(1)) }));

          ctx.save();
          ctx.font = '700 11px Inter, system-ui, sans-serif';
          ctx.textBaseline = 'middle';
          items.forEach(it => {
            ctx.strokeStyle = it.color;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(it.x + 3, it.rawY);
            ctx.lineTo(chartArea.right + 5, it.y);
            ctx.lineTo(chartArea.right + 10, it.y);
            ctx.stroke();

            ctx.fillStyle = it.color;
            ctx.beginPath();
            ctx.arc(it.x, it.rawY, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = it.color;
            ctx.fillText(it.text, chartArea.right + 13, it.y);
          });
          ctx.restore();
        }
      };

      chartInstances['teamTrend'] = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        plugins: [directEndLabelsPlugin],
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 158, top: 10, bottom: 0 } },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              afterBuildTicks: function (axis) {
                const total = labels.length;
                if (total <= 7) return;
                const stepCount = 5;
                const chosen = [];
                for (let k = 0; k <= stepCount; k++) {
                  const idx = Math.round((k * (total - 1)) / stepCount);
                  if (!chosen.includes(idx)) chosen.push(idx);
                }
                axis.ticks = chosen.map(v => ({ value: v }));
              },
              ticks: {
                color: '#94A3B8',
                maxRotation: 0,
                minRotation: 0,
                autoSkip: false,
                font: { size: 11 }
              },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
              beginAtZero: true,
              min: 0,
              ticks: {
                color: '#94A3B8',
                callback: function (val) {
                  if (metric === 'revenue') return fmtMoney(val);
                  return new Intl.NumberFormat('vi-VN').format(Math.round(val));
                }
              },
              grid: { color: 'rgba(255,255,255,0.06)' }
            }
          }
        }
      });
    }

    // Render Single-Team Comparison Chart ("Xu hướng một team": solid current vs dashed reference on "Ngày thứ N của kỳ")
    destroyChart('teamSingleTrend');
    const singleCanvas = document.getElementById('v3-single-team-canvas');
    if (singleCanvas && typeof Chart !== 'undefined' && selectedTeam) {
      const currSeries = selectedTeam.curr.dailySeries || [];
      const prevSeries = singleTeamPrevAgg.dailySeries || [];
      const maxLen = Math.max(singleWin.days.length, singleRefDays.length);
      const dayLabels = Array.from({ length: maxLen }, (_, idx) => `Ngày ${idx + 1}`);
      const currData = Array.from({ length: maxLen }, (_, idx) => (idx < currSeries.length && currSeries[idx] ? currSeries[idx][singleMetric] : null));
      const prevData = Array.from({ length: maxLen }, (_, idx) => (idx < prevSeries.length && prevSeries[idx] ? prevSeries[idx][singleMetric] : null));

      chartInstances['teamSingleTrend'] = new Chart(singleCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [
            {
              label: `Kỳ này (${currRangeShort})`,
              data: currData,
              borderColor: selectedTeam.color,
              backgroundColor: 'transparent',
              borderWidth: 2.6,
              pointRadius: 2.2,
              tension: 0.3,
              spanGaps: false
            },
            {
              label: `${singleRefModeName} (${singleRefRangeShort})`,
              data: prevData,
              borderColor: '#94A3B8',
              borderDash: [6, 4],
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 1.8,
              tension: 0.3,
              spanGaps: false
            }
          ]
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 8, bottom: 0 } },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: function (items) {
                  const idx = items && items[0] ? items[0].dataIndex : 0;
                  const dCurr = singleWin.days[idx];
                  const dPrev = singleRefDays[idx];
                  const currStr = dCurr ? formatIsoToVN(dCurr) : 'Ngoài phạm vi kỳ này';
                  const prevStr = dPrev ? formatIsoToVN(dPrev) : 'Ngoài phạm vi đối chứng';
                  return `Ngày thứ ${idx + 1} của kỳ (${currStr} vs ${prevStr})`;
                },
                label: function (ctx) {
                  const idx = ctx.dataIndex;
                  const isCurr = ctx.datasetIndex === 0;
                  const realIso = isCurr ? singleWin.days[idx] : singleRefDays[idx];
                  const prefix = isCurr ? 'Kỳ này' : singleRefModeName;
                  if (!realIso || ctx.parsed.y === null || ctx.parsed.y === undefined) {
                    return ` ${prefix}: —`;
                  }
                  return ` ${prefix} (${formatIsoToVN(realIso)}): ${fmtSingleMetricVal(ctx.parsed.y, singleMetric)}`;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Ngày thứ N của kỳ',
                color: '#94A3B8',
                font: { size: 11, weight: '600' },
                padding: { top: 2, bottom: 0 }
              },
              afterBuildTicks: function (axis) {
                const total = dayLabels.length;
                if (total <= 7) return;
                const stepCount = 5;
                const chosen = [];
                for (let k = 0; k <= stepCount; k++) {
                  const idx = Math.round((k * (total - 1)) / stepCount);
                  if (!chosen.includes(idx)) chosen.push(idx);
                }
                axis.ticks = chosen.map(v => ({ value: v }));
              },
              ticks: {
                color: '#94A3B8',
                maxRotation: 0,
                minRotation: 0,
                autoSkip: false,
                font: { size: 11 }
              },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
              beginAtZero: singleMetric !== 'netSubs',
              min: singleMetric !== 'netSubs' ? 0 : undefined,
              ticks: {
                color: '#94A3B8',
                callback: function (val) {
                  if (singleMetric === 'revenue') return fmtMoney(val);
                  return new Intl.NumberFormat('vi-VN').format(Math.round(val));
                }
              },
              grid: { color: 'rgba(255,255,255,0.06)' }
            }
          }
        }
      });
    }

    destroyChart('teamCadence');

    root.querySelectorAll('[data-team-rank-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-team-rank-sort');
        if (v3State.teamRankSortField === field) {
          v3State.teamRankSortAsc = !v3State.teamRankSortAsc;
        } else {
          v3State.teamRankSortField = field;
          v3State.teamRankSortAsc = false;
        }
        renderTeamPage(snap);
      });
    });

    root.querySelectorAll('[data-table-cmp]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        v3State.compareMode = btn.getAttribute('data-table-cmp');
        refreshActiveView();
      });
    });

    root.querySelectorAll('[data-select-team-card]').forEach(card => {
      card.addEventListener('click', () => {
        v3State.selectedTeamId = card.getAttribute('data-select-team-card');
        renderTeamPage(snap);
      });
    });

    bindUnifiedFloatingPicker(root, {
      wrapperId: 'v3-team-channel-quick-picker',
      btnId: 'v3-team-picker-btn',
      menuId: 'v3-team-picker-menu',
      searchId: 'v3-team-picker-search',
      listId: 'v3-team-picker-list',
      emptyId: 'v3-team-picker-empty',
      teamChipAttr: 'data-tm-picker-team',
      rowToggleAttr: 'data-tm-pick-channel-id',
      rowTeamAttr: 'data-tm-pick-team-id',
      getOpenState: () => v3State.teamQuickPickerOpen,
      setOpenState: (v) => { v3State.teamQuickPickerOpen = v; },
      getSearchQuery: () => v3State.teamQuickPickerQuery,
      setSearchQuery: (v) => { v3State.teamQuickPickerQuery = v; },
      getTeamFilter: () => v3State.teamQuickPickerTeamFilter,
      setTeamFilter: (v) => { v3State.teamQuickPickerTeamFilter = v; },
      onRowClick: (chId, rowEl) => {
        const pickedTeamId = rowEl ? rowEl.getAttribute('data-tm-pick-team-id') : null;
        if (pickedTeamId) {
          v3State.selectedTeamId = pickedTeamId;
        }
        v3State.teamQuickPickerOpen = false;
        v3State.teamQuickPickerQuery = '';
        renderTeamPage(snap);
      }
    });

    root.querySelectorAll('[data-tm-chart-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextPreset = btn.getAttribute('data-tm-chart-preset');
        v3State.teamChartCustomPeriod = true;
        v3State.teamChartPreset = nextPreset;
        if (nextPreset === '7d') {
          v3State.teamChartStartDate = '2026-10-20';
          v3State.teamChartEndDate = '2026-10-26';
        } else if (nextPreset === '30d') {
          v3State.teamChartStartDate = '2026-09-27';
          v3State.teamChartEndDate = '2026-10-26';
        }
        renderTeamPage(snap);
      });
    });

    document.getElementById('v3-tm-chart-month-select')?.addEventListener('change', (e) => {
      v3State.teamChartCustomPeriod = true;
      v3State.teamChartPreset = 'month';
      v3State.teamChartMonthKey = e.target.value;
      renderTeamPage(snap);
    });

    document.getElementById('v3-tm-chart-quarter-select')?.addEventListener('change', (e) => {
      v3State.teamChartCustomPeriod = true;
      v3State.teamChartPreset = 'quarter';
      v3State.teamChartQuarterKey = e.target.value;
      renderTeamPage(snap);
    });

    const applyCustomChartDates = () => {
      const s = document.getElementById('v3-tm-chart-start')?.value;
      const e = document.getElementById('v3-tm-chart-end')?.value;
      if (s && e && s <= e) {
        v3State.teamChartCustomPeriod = true;
        v3State.teamChartPreset = 'custom';
        v3State.teamChartStartDate = s;
        v3State.teamChartEndDate = e;
        renderTeamPage(snap);
      } else if (c.showToast) {
        c.showToast('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
      }
    };
    document.getElementById('v3-tm-chart-start')?.addEventListener('change', applyCustomChartDates);
    document.getElementById('v3-tm-chart-end')?.addEventListener('change', applyCustomChartDates);

    document.getElementById('v3-team-chart-reset-btn')?.addEventListener('click', () => {
      v3State.teamChartCustomPeriod = false;
      renderTeamPage(snap);
    });

    root.querySelectorAll('[data-tm-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.teamChartMetric = btn.getAttribute('data-tm-metric');
        renderTeamPage(snap);
      });
    });

    root.querySelectorAll('[data-tm-cmp]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const nextCmp = btn.getAttribute('data-tm-cmp');
        v3State.teamSingleCompareMode = nextCmp;
        v3State.teamSingleRefError = '';
        if (nextCmp === 'custom') {
          if (!v3State.teamSingleRefStartDate || !v3State.teamSingleRefEndDate ||
              (v3State.teamSingleRefStartDate <= singleWin.end && v3State.teamSingleRefEndDate >= singleWin.start)) {
            v3State.teamSingleRefStartDate = singleWin.prevStart;
            v3State.teamSingleRefEndDate = singleWin.prevEnd;
          }
        }
        renderTeamPage(snap);
      });
    });

    const applySingleTeamCustomRefDates = () => {
      const sInput = document.getElementById('v3-tm-ref-start');
      const eInput = document.getElementById('v3-tm-ref-end');
      if (!sInput || !eInput) return;
      let s = sInput.value;
      let e = eInput.value;
      if (!s || !e) return;
      if (s > '2026-10-26' || e > '2026-10-26') {
        v3State.teamSingleRefError = 'Không vượt quá ngày 26/10/2026';
        if (s > '2026-10-26') s = '2026-10-26';
        if (e > '2026-10-26') e = '2026-10-26';
        sInput.value = s;
        eInput.value = e;
        renderTeamPage(snap);
        return;
      }
      if (s > e) {
        v3State.teamSingleRefError = 'Ngày bắt đầu đối chứng phải ≤ ngày kết thúc';
        renderTeamPage(snap);
        return;
      }
      if (s <= singleWin.end && e >= singleWin.start) {
        v3State.teamSingleRefError = `Không được trùng kỳ đang xem (${formatIsoToShortVN(singleWin.start)}–${formatIsoToShortVN(singleWin.end)})`;
        renderTeamPage(snap);
        return;
      }
      v3State.teamSingleRefError = '';
      v3State.teamSingleCompareMode = 'custom';
      v3State.teamSingleRefStartDate = s;
      v3State.teamSingleRefEndDate = e;
      renderTeamPage(snap);
    };
    document.getElementById('v3-tm-ref-start')?.addEventListener('change', applySingleTeamCustomRefDates);
    document.getElementById('v3-tm-ref-end')?.addEventListener('change', applySingleTeamCustomRefDates);

    root.querySelectorAll('[data-tm-unequal-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.teamSingleUnequalMode = btn.getAttribute('data-tm-unequal-mode') || 'avg';
        renderTeamPage(snap);
      });
    });

    root.querySelectorAll('[data-tm-single-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        v3State.teamSingleMetric = btn.getAttribute('data-tm-single-metric');
        renderTeamPage(snap);
      });
    });

    root.querySelectorAll('[data-tm-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.teamTableSort = btn.getAttribute('data-tm-sort');
        renderTeamPage(snap);
      });
    });

    root.querySelectorAll('[data-goto-channel]').forEach(el => {
      el.addEventListener('click', () => {
        v3State.selectedChannelId = el.getAttribute('data-goto-channel');
        v3State.channelMode = 'single';
        if (core().switchView) core().switchView('view-report-channel');
      });
    });
  }

  // =========================================================================
  // PAGE 5: BÁO CÁO THEO DỰ ÁN (#view-report-project)
  // Question: "Dự án nội dung nào đang hiệu quả?"
  // =========================================================================
  function renderProjectPage(snap) {
    const root = document.getElementById('v3-project-root');
    if (!root) return;
    const legacySection = document.getElementById('v3-legacy-project-section');
    if (legacySection) legacySection.style.display = 'none';

    if (!v3State.projectConfigured) {
      root.innerHTML = `
        <section class="v3-panel" style="padding:36px 24px;text-align:center;">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(56,189,248,0.12);color:#38BDF8;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:14px;">
            <i class="ri-folder-settings-line"></i>
          </div>
          <h2 style="font-size:19px;font-weight:800;color:var(--text-main);margin:0 0 8px 0;">
            Chưa cấu hình Dự án / Series nội dung
          </h2>
          <p style="font-size:13.5px;color:var(--text-muted);max-width:620px;margin:0 auto 18px auto;line-height:1.55;">
            YouTube Data API v3 và YouTube Analytics API v2 không có khái niệm "Dự án" mặc định. Để xem báo cáo theo dự án, bạn cần gán danh sách Video hoặc Kênh vào từng Dự án / Series nội dung nội bộ của công ty.
          </p>
          <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
            <button type="button" class="v3-btn primary" id="v3-btn-enable-demo-projects">
              <i class="ri-play-circle-line"></i> Xem cấu hình mẫu (5 Dự án âm nhạc · Kèm danh sách Video chưa gán)
            </button>
            <a href="#view-mgmt-project" class="v3-btn" id="v3-btn-goto-mgmt-project">
              <i class="ri-settings-3-line"></i> Mở trang Quản lý Dự án
            </a>
          </div>
        </section>
      `;
      document.getElementById('v3-btn-enable-demo-projects')?.addEventListener('click', () => {
        v3State.projectConfigured = true;
        renderProjectPage(snap);
      });
      return;
    }

    // Group the 150 sample videos into 5 structured music projects + 1 "Video chưa gán dự án" bucket
    const projectDefs = [
      { id: 'PRJ-01', name: 'Series: Late Night Lo-fi & Jazz Cafe', teamId: 'TEAM-01', channelIndices: [0, 1, 2] },
      { id: 'PRJ-02', name: 'Series: Chill Study Beats & Piano Sessions', teamId: 'TEAM-01', channelIndices: [3, 4] },
      { id: 'PRJ-03', name: 'Series: 80s Synthwave & Retro Groove Mix', teamId: 'TEAM-02', channelIndices: [5, 6, 7] },
      { id: 'PRJ-04', name: 'Series: Electronic Bass & Night Drive', teamId: 'TEAM-02', channelIndices: [8, 9] },
      { id: 'PRJ-05', name: 'Series: Indie Folk & Acoustic Sunset', teamId: 'TEAM-03', channelIndices: [10, 11, 12] }
    ];
    // Channels 13 & 14 represent unassigned videos ("Video chưa gán dự án") so users can audit unassigned content
    const unassignedChannels = snap.channelPairs.filter((_, idx) => idx >= 13);

    const projectsComputed = projectDefs.map(pd => {
      const chPairs = pd.channelIndices.map(i => snap.channelPairs[i]).filter(Boolean);
      const currAgg = aggregateChannelMetricsList(chPairs.map(x => x.curr), snap.win.days);
      const prevAgg = aggregateChannelMetricsList(chPairs.map(x => x.prev), snap.win.prevDays);
      return {
        ...pd,
        color: TEAM_COLORS[pd.teamId] || '#38BDF8',
        chPairs,
        curr: currAgg,
        prev: prevAgg
      };
    });

    const selectedPrj = projectsComputed.find(p => p.id === v3State.selectedProjectId) || projectsComputed[0];
    const unassignedVids = [];
    unassignedChannels.forEach(cp => {
      const vids = (core().DATA_STORE && core().DATA_STORE.getVideos(cp.id)) || [];
      vids.slice(0, 4).forEach(v => unassignedVids.push({ ...v, channelTitle: cp.meta.title, pic: cp.meta.employeeName }));
    });

    root.innerHTML = `
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-folder-chart-line" style="color:#38BDF8;"></i>
              Bảng hiệu suất 5 Dự án / Series nội dung (Nhấn vào dự án để xem danh sách kênh & video thuộc dự án)
            </div>
            <div class="v3-panel-subtitle">
              Tổng hợp từ các kênh/video đã gán mã dự án nội bộ • Tách riêng mục "Video chưa gán dự án" ở cuối trang để đối soát
            </div>
          </div>
          <button type="button" class="v3-btn" id="v3-btn-disable-demo-projects">
            Chuyển về trạng thái "Chưa cấu hình"
          </button>
        </div>

        <div class="v3-table-wrap">
          <table class="v3-table">
            <thead>
              <tr>
                <th>Mã DA</th>
                <th>Tên Dự án / Series</th>
                <th class="num">Số kênh</th>
                <th class="num">Video đăng trong kỳ</th>
                <th class="num">Lượt xem (Views)</th>
                <th class="num">So với kỳ trước</th>
                <th class="num">Giờ xem [Analytics]</th>
                <th class="num">Doanh thu [Analytics]</th>
              </tr>
            </thead>
            <tbody>
              ${projectsComputed.map(p => `
                <tr class="clickable-row" data-select-prj="${p.id}" style="${p.id === selectedPrj.id ? 'background:rgba(56,189,248,0.08);' : ''}">
                  <td><span class="v3-badge analytics">${esc(p.id)}</span></td>
                  <td>
                    <span class="v3-team-dot" style="background:${p.color};"></span>
                    <strong>${esc(p.name)}</strong>
                  </td>
                  <td class="num">${p.chPairs.length} kênh</td>
                  <td class="num">${fmtInt(p.curr.videosPublished)} video</td>
                  <td class="num"><strong>${p.curr.views !== null ? fmtInt(p.curr.views) : '—'}</strong></td>
                  <td class="num">${fmtDeltaBadge(p.curr.views, p.prev.views)}</td>
                  <td class="num">${p.curr.watchHours !== null ? fmtInt(p.curr.watchHours) + 'h' : '—'}</td>
                  <td class="num">${p.curr.estimatedRevenue !== null ? fmtMoney(p.curr.estimatedRevenue) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <div class="v3-grid-2">
        <section class="v3-panel" style="margin-bottom:0;">
          <div class="v3-panel-header">
            <div class="v3-panel-title">Chi tiết kênh thuộc ${esc(selectedPrj.name)}</div>
          </div>
          <div class="v3-table-wrap">
            <table class="v3-table">
              <thead>
                <tr>
                  <th>Kênh</th>
                  <th>PIC</th>
                  <th class="num">Views kỳ này</th>
                  <th class="num">Video mới</th>
                  <th class="num">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                ${selectedPrj.chPairs.map(cp => `
                  <tr class="clickable-row" data-goto-channel="${cp.id}">
                    <td><strong>${esc(cp.meta.title)}</strong></td>
                    <td>${esc(cp.meta.employeeName)}</td>
                    <td class="num">${cp.curr.views !== null ? fmtInt(cp.curr.views) : '—'}</td>
                    <td class="num">${fmtInt(cp.curr.videosPublished)}</td>
                    <td class="num">${cp.curr.estimatedRevenue !== null ? fmtMoney(cp.curr.estimatedRevenue) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <section class="v3-panel" style="margin-bottom:0;">
          <div class="v3-panel-header">
            <div>
              <div class="v3-panel-title">
                <i class="ri-question-line" style="color:#F59E0B;"></i>
                Danh sách Video chưa gán dự án (${unassignedVids.length} video cần phân loại)
              </div>
              <div class="v3-panel-subtitle">Hiển thị minh bạch các video mới chưa được gắn thẻ dự án để tránh bỏ sót sản lượng</div>
            </div>
          </div>
          <div class="v3-table-wrap">
            <table class="v3-table">
              <thead>
                <tr>
                  <th>Video chưa gán</th>
                  <th>Kênh / PIC</th>
                  <th>Ngày đăng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${unassignedVids.map(v => `
                  <tr>
                    <td><strong style="font-size:12px;">${esc(v.title.slice(0, 38))}...</strong></td>
                    <td style="font-size:12px;">${esc(v.channelTitle)} (${esc(v.pic)})</td>
                    <td>${formatIsoToVN(v.publishedAt)}</td>
                    <td><span class="v3-badge warn">[Chưa gán DA]</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;

    document.getElementById('v3-btn-disable-demo-projects')?.addEventListener('click', () => {
      v3State.projectConfigured = false;
      renderProjectPage(snap);
    });

    root.querySelectorAll('[data-select-prj]').forEach(tr => {
      tr.addEventListener('click', () => {
        v3State.selectedProjectId = tr.getAttribute('data-select-prj');
        renderProjectPage(snap);
      });
    });

    root.querySelectorAll('[data-goto-channel]').forEach(tr => {
      tr.addEventListener('click', () => {
        v3State.selectedChannelId = tr.getAttribute('data-goto-channel');
        v3State.channelMode = 'single';
        if (core().switchView) core().switchView('view-report-channel');
      });
    });
  }

  // =========================================================================
  // PAGE 6: BÁO CÁO THEO NETWORK (#view-report-network)
  // Hidden from Sidebar menu by default unless MCN mode is enabled
  // =========================================================================
  function syncNetworkMenuVisibility() {
    const navNet = document.getElementById('nav-sub-network');
    if (navNet) {
      navNet.style.display = v3State.mcnEnabled ? 'flex' : 'none';
    }
  }

  function renderNetworkPage(snap) {
    const root = document.getElementById('v3-network-root');
    if (!root) return;
    const legacySection = document.getElementById('v3-legacy-network-section');
    if (legacySection) legacySection.style.display = 'none';

    root.innerHTML = `
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-global-line" style="color:#38BDF8;"></i>
              Báo cáo Network (MCN / Content Owner)
            </div>
            <div class="v3-panel-subtitle">
              Mục này mặc định ẩn khỏi thanh menu bên trái khi công ty chỉ vận hành 1 mạng lưới nội bộ (3 Team · 15 Kênh).
            </div>
          </div>
          <button type="button" class="v3-btn ${v3State.mcnEnabled ? 'primary' : ''}" id="v3-btn-toggle-mcn-menu">
            ${v3State.mcnEnabled ? 'Đang hiện trên Menu báo cáo (Nhấn để ẩn mặc định)' : 'Hiện mục Network trên Menu báo cáo'}
          </button>
        </div>
        <div style="font-size:13px;color:var(--text-muted);line-height:1.6;">
          Tổng hợp toàn mạng lưới hiện tại: <strong>15 Kênh</strong> •
          Views trong kỳ: <strong>${snap.systemCurr.views !== null ? fmtInt(snap.systemCurr.views) : '—'}</strong> •
          Doanh thu ước tính [Analytics]: <strong>${snap.systemCurr.estimatedRevenue !== null ? fmtMoney(snap.systemCurr.estimatedRevenue) : '—'}</strong>.
        </div>
      </section>
    `;

    document.getElementById('v3-btn-toggle-mcn-menu')?.addEventListener('click', () => {
      v3State.mcnEnabled = !v3State.mcnEnabled;
      localStorage.setItem('bgmedia_mcn_enabled', String(v3State.mcnEnabled));
      syncNetworkMenuVisibility();
      renderNetworkPage(snap);
    });
  }

  // =========================================================================
  // PAGE 7: HƯỚNG DẪN & TỪ ĐIỂN CHỈ SỐ (#view-report-guide)
  // Question: "Con số này nghĩa là gì, lấy từ đâu?"
  // =========================================================================
  function renderGuidePage() {
    const root = document.getElementById('v3-guide-root');
    if (!root) return;
    const legacyGuide = document.getElementById('v3-legacy-guide-section');
    if (legacyGuide) legacyGuide.style.display = 'none';
    const dummyAnchors = document.getElementById('v3-guide-anchors');
    if (dummyAnchors) dummyAnchors.style.display = 'none';

    const sections = [
      {
        id: 'guide-timezone',
        badge: 'Múi giờ & Độ trễ',
        title: '1. Múi giờ Pacific Time (PT), Nhãn ngày Snapshot & Độ trễ 48–72 giờ',
        keywords: 'múi giờ pt pacific time utc-7 utc-8 độ trễ 48h 72h snapshot_date_pt captured_at',
        html: `
          <p style="margin:0 0 10px 0;line-height:1.6;">
            YouTube Analytics API v2 chốt số liệu hằng ngày theo <strong>Múi giờ Thái Bình Dương (Pacific Time — PT, tức <code>America/Los_Angeles</code>)</strong>: mùa hè là <code>PDT (UTC-7)</code> và mùa đông (từ đầu tháng 11) là <code>PST (UTC-8)</code>. Vì vậy thanh phạm vi luôn ghi nhãn <strong>PT</strong> thay vì gắn cứng UTC-7.
          </p>
          <ul style="margin:0 0 10px 0;padding-left:20px;line-height:1.65;">
            <li><strong>Ví dụ thực tế về độ trễ 48–72 giờ của YouTube Analytics:</strong> Vào lúc <strong>14:00 chiều ngày 29/10 theo giờ Việt Nam (UTC+7)</strong> — tức <strong>00:00 sáng ngày 29/10 theo giờ PT</strong> — sau khi trừ độ trễ xử lý & lọc lưu lượng không hợp lệ <strong>48–72 giờ</strong> của YouTube, dữ liệu Analytics đầy đủ mới chốt xong đến hết ngày <strong>25/10 hoặc 26/10 giờ PT</strong>.</li>
            <li><strong>Quy tắc mốc "Dữ liệu đến hết" (<code>MIN(available_end)</code>):</strong> Hệ thống luôn lấy ngày <strong>nhỏ nhất (<code>MIN</code>)</strong> trong số các kênh đang xem (kênh cập nhật chậm nhất), hoặc hiển thị rõ khoảng ngày kèm số kênh đã cập nhật — tuyệt đối không lấy <code>MAX</code> khiến báo cáo trông như đã đủ dữ liệu khi mới chỉ có 1 kênh cập nhật.</li>
            <li><strong>Quy tắc nhãn ngày Snapshot (<code>snapshot_date_pt</code>):</strong> Khi tiến trình thu thập (Cron) chạy lúc <code>00:05 PT</code> sáng hôm sau, số cộng dồn thu được từ Data API v3 là kết quả của <strong>hết ngày hôm trước theo giờ PT</strong>. Hệ thống lưu cả thời điểm thu thập thực tế (<code>captured_at_utc</code>) và gán nhãn <code>snapshot_date_pt = DATE(captured_at_pt) - 1 ngày</code> để khớp 1:1 với cột <code>day</code> của YouTube Analytics.</li>
          </ul>
        `
      },
      {
        id: 'guide-engagement',
        badge: 'Công thức chỉ số',
        title: '2. Tỷ lệ tương tác (Engagement Rate): Khác biệt giữa Data API và [Analytics]',
        keywords: 'tỷ lệ tương tác engagement rate likes comments shares chia sẻ công thức',
        html: `
          <p style="margin:0 0 10px 0;line-height:1.6;">
            YouTube Data API v3 (dữ liệu công khai) chỉ trả về <code>likeCount</code> và <code>commentCount</code>, <strong>không trả về lượt chia sẻ (<code>shares</code>)</strong>. Lượt chia sẻ chỉ tồn tại trong YouTube Analytics API v2 khi chủ kênh đã cấp quyền OAuth.
          </p>
          <ul style="margin:0;padding-left:20px;line-height:1.65;">
            <li><strong>Khi đã kết nối <code>[Analytics]</code>:</strong> <code>Tỷ lệ tương tác (%) = (Likes + Comments + Shares) / Views × 100</code>.</li>
            <li><strong>Khi chỉ có Snapshot công khai (Data API):</strong> <code>Tỷ lệ tương tác (%) = (Likes + Comments) / Views × 100</code> (gắn nhãn rõ <em>Likes + Comments</em>, không tự điền Shares = 0).</li>
            <li><strong>Cờ ẩn tương tác trên từng video:</strong> Nếu chủ kênh ẩn số Like (<code>likes_hidden = true</code>) hoặc tắt bình luận (<code>comments_disabled = true</code>), bảng video gắn nhãn <code>[Ẩn like]</code> / <code>[Tắt bình luận]</code> thay vì coi là 0 lượt thích.</li>
          </ul>
        `
      },
      {
        id: 'guide-rpm',
        badge: 'Tài chính [Analytics]',
        title: '3. Doanh thu ước tính & Công thức RPM duy nhất trên toàn hệ thống',
        keywords: 'doanh thu ước tính estimatedrevenue rpm proxyrpm viewsWithMonetary tiền một phần',
        html: `
          <p style="margin:0 0 10px 0;line-height:1.6;">
            Toàn bộ các trang báo cáo sử dụng <strong>duy nhất một công thức RPM</strong> để đảm bảo đối soát khớp 100% giữa Tổng quan, Team, Kênh và Nhân viên:
          </p>
          <div style="padding:10px 14px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:12.5px;margin-bottom:10px;">
            RPM (Proxy RPM) = (Tổng Doanh thu ước tính / Tổng Views của các kênh-ngày có quyền tiền) × 1.000
          </div>
          <ul style="margin:0;padding-left:20px;line-height:1.65;">
            <li><strong>Không trộn mẫu số:</strong> Khi chỉ có <code>m/15</code> kênh có quyền tiền (kịch bản <code>partial_monetary</code>) hoặc doanh thu về chậm hơn views 2 ngày (<code>delayed_monetary</code>), mẫu số của RPM chỉ cộng lượt xem của đúng các kênh và các ngày đã có dữ liệu tiền (<code>viewsWithMonetary</code>).</li>
            <li><strong>Quy tắc một nguồn mỗi kênh:</strong> Mỗi chỉ số của một kênh trong kỳ chỉ lấy từ một nguồn duy nhất, kèm nhãn phạm vi rõ ràng (ví dụ: <code>[Analytics: 15/15 kênh · Doanh thu: 1/15 kênh]</code>).</li>
          </ul>
        `
      },
      {
        id: 'guide-sub-rounding',
        badge: 'Quy tắc làm tròn YouTube',
        title: '4. Sub ròng (Net Subscribers) & Bước làm tròn 3 chữ số có nghĩa của YouTube',
        keywords: 'sub ròng net subscribers làm tròn 3 chữ số có nghĩa sub_rounding_step data api',
        html: `
          <p style="margin:0 0 10px 0;line-height:1.6;">
            Kể từ năm 2019, YouTube Data API v3 <strong>làm tròn số người đăng ký công khai (<code>subscriberCount</code>) còn đúng 3 chữ số có nghĩa</strong>:
          </p>
          <div class="v3-table-wrap" style="margin-bottom:10px;">
            <table class="v3-table">
              <thead>
                <tr>
                  <th>Quy mô Subscribers công khai</th>
                  <th class="num">Bước nhảy tối thiểu (sub_rounding_step)</th>
                  <th>Hệ quả khi tính Sub ròng từ Data API</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1.000 – 9.990 sub</td><td class="num">10 sub</td><td>Tăng dưới 10 sub công khai chưa đổi số</td></tr>
                <tr><td>10.000 – 99.900 sub</td><td class="num">100 sub</td><td>Tăng dưới 100 sub công khai chưa đổi số</td></tr>
                <tr><td>100.000 – 999.000 sub</td><td class="num">1.000 sub</td><td>Tăng dưới 1.000 sub công khai chưa đổi số</td></tr>
                <tr><td>1.000.000 – 9.990.000 sub</td><td class="num">10.000 sub</td><td>Kênh 1,23M sub phải tăng đủ 10K mới nhích lên 1,24M</td></tr>
              </tbody>
            </table>
          </div>
          <p style="margin:0;line-height:1.6;">
            <strong>Quy tắc hiển thị trung thực:</strong> Ở chế độ chỉ có Snapshot công khai (chưa có <code>[Analytics]</code>), nếu mức thay đổi sub trong kỳ nhỏ hơn <code>sub_rounding_step</code> của kênh, hệ thống hiển thị <strong><code>—</code> (Nhỏ hơn bước làm tròn)</strong> chứ không hiển thị số 0 giả tạo hay tự nội suy. Khi kênh đã kết nối <code>[Analytics]</code>, Sub ròng lấy chính xác từ <code>subscribersGained − subscribersLost</code>.
          </p>
        `
      },
      {
        id: 'guide-views-7d',
        badge: 'So sánh công bằng Video',
        title: '5. Cột "Views 7 ngày đầu" của Video & Tỷ trọng 150 Video mẫu',
        keywords: 'views 7 ngày đầu views_first_7d video mẫu nội dung khác other_content_daily',
        html: `
          <ul style="margin:0;padding-left:20px;line-height:1.65;">
            <li><strong>Định nghĩa <code>views_first_7d</code>:</strong> Là tổng lượt xem của video tính từ ngày phát hành (<code>published_date_pt</code>, ngày thứ 1) đến hết ngày thứ 7 (<code>published_date_pt + 6 ngày</code> theo lịch PT).</li>
            <li><strong>Điều kiện hiển thị:</strong> Chỉ hiển thị con số khi hệ thống có đủ dữ liệu 7 ngày đầu kể từ ngày video lên sóng (nhãn <code>[Đủ 7 ngày]</code>). Nếu video mới đăng chưa đủ 7 ngày sẽ hiện <code>— [Chưa đủ 7 ngày]</code>; nếu video đăng trước ngày hệ thống bắt đầu lưu snapshot và kênh chưa cấp quyền Analytics sẽ hiện <code>— [Trước mốc lịch sử]</code>.</li>
            <li><strong>Tỷ trọng 10 video mẫu / kênh:</strong> 10 video mới nhất của mỗi kênh chiếm khoảng <strong>45%–58%</strong> tổng lượt xem trong kỳ của kênh đó; phần lượt xem còn lại của các video cũ hơn được hạch toán minh bạch vào dòng <strong>Nội dung khác (Video cũ ngoài 10 video mẫu)</strong> để tổng luôn khớp 100% với kênh.</li>
          </ul>
        `
      },
      {
        id: 'guide-data-states',
        badge: 'Trạng thái dữ liệu',
        title: '6. Phân biệt Số 0 hợp lệ, Thiếu dữ liệu (—), và Bất thường Delta âm (Anomaly)',
        keywords: 'trạng thái dữ liệu số 0 thiếu dữ liệu anomaly delta âm xóa video kiểm toán',
        html: `
          <ul style="margin:0;padding-left:20px;line-height:1.65;">
            <li><strong>Số <code>0</code>:</strong> Kênh hoặc video có dữ liệu trả về hợp lệ và giá trị thực tế bằng 0 (ví dụ: 0 video đăng mới, hoặc doanh thu $0 hợp lệ).</li>
            <li><strong>Dấu <code>—</code>:</strong> Chưa kết nối quyền, ngày dữ liệu chưa chốt xong (trễ 48–72h), hoặc mẫu số bằng 0 khiến tỷ số (RPM, AVD, %) không xác định.</li>
            <li><strong>Delta âm (<code>is_negative_anomaly</code>):</strong> Khi bộ đếm tổng lượt xem công khai giảm giữa 2 ngày (do chủ kênh xóa/ẩn video cũ hoặc YouTube quét trừ view không hợp lệ), hệ thống <strong>giữ nguyên số delta âm thực tế trong bản ghi gốc</strong>, loại trừ phần điều chỉnh khỏi tổng lượt xem dương của kỳ và <strong>hiển thị chú thích trực tiếp bên dưới thẻ KPI Tổng lượt xem (“Đã loại điều chỉnh −X views”)</strong>, tuyệt đối không âm thầm ép về 0 làm sai lệch đối soát.</li>
          </ul>
        `
      },
      {
        id: 'guide-oauth',
        badge: 'Kết nối & Vận hành thực tế',
        title: '7. Quy trình 3 bước cấp quyền OAuth & Kiến trúc bảo mật khi chạy thật',
        keywords: 'oauth 2.0 cấp quyền kết nối kiến trúc bảo mật github actions backend cron',
        html: `
          <ol style="margin:0 0 10px 0;padding-left:20px;line-height:1.65;">
            <li><strong>Bước 1 (Tự động hằng ngày):</strong> Hệ thống Backend / GitHub Actions chạy Cron lúc <code>00:05 PT</code> gọi YouTube Data API v3 bằng khóa máy chủ để lưu Snapshot công khai cho toàn bộ 15 kênh.</li>
            <li><strong>Bước 2 (Cấp quyền Analytics):</strong> Chủ kênh đăng nhập qua luồng OAuth 2.0 với quyền <code>yt-analytics.readonly</code> để mở khóa Giờ xem, Sub ròng chính xác, Shares, Nguồn truy cập và Đường cong giữ chân khán giả.</li>
            <li><strong>Bước 3 (Cấp quyền Doanh thu):</strong> Chủ kênh cấp thêm quyền <code>yt-analytics-monetary.readonly</code> để mở khóa Doanh thu ước tính, CPM và Proxy RPM.</li>
          </ol>
          <div style="padding:10px 14px;background:rgba(245,158,11,0.10);border:1px solid rgba(245,158,11,0.3);border-radius:6px;font-size:12.5px;">
            <strong>Nguyên tắc bảo mật bắt buộc:</strong> Không nhập API Key trực tiếp trên trình duyệt công khai; Refresh Token OAuth và dữ liệu doanh thu thật phải được lưu trữ và truy vấn qua Backend có xác thực người dùng nội bộ.
          </div>
        `
      }
    ];

    const q = v3State.guideSearchQuery.trim().toLowerCase();
    const filteredSections = q
      ? sections.filter(s => s.title.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q) || s.html.toLowerCase().includes(q))
      : sections;

    root.innerHTML = `
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-book-read-line" style="color:#38BDF8;"></i>
              Từ điển Chỉ số, Múi giờ PT & Quy chuẩn Dữ liệu BgMedia
            </div>
            <div class="v3-panel-subtitle">
              Giải đáp câu hỏi: "Con số này nghĩa là gì, lấy từ đâu?" — Nhấn vào bất kỳ biểu tượng (?) nào trên các trang báo cáo để nhảy thẳng tới mục tương ứng tại đây.
            </div>
          </div>
          <div style="min-width:280px;">
            <input type="search" id="v3-guide-search-input" class="v3-select" style="width:100%;padding:7px 12px;"
              placeholder="Tìm nhanh: RPM, PT, Sub ròng, 7 ngày, OAuth..." value="${esc(v3State.guideSearchQuery)}">
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
          ${sections.map(s => `
            <a href="#${s.id}" class="v3-btn" data-guide-jump="${s.id}" style="font-size:11.5px;padding:4px 10px;">
              ${esc(s.badge)}
            </a>
          `).join('')}
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${filteredSections.map(s => `
            <div id="${s.id}" class="v3-panel" style="margin-bottom:0;background:rgba(255,255,255,0.015);">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <h3 style="font-size:15px;font-weight:800;color:#38BDF8;margin:0;">${esc(s.title)}</h3>
                <span class="v3-badge analytics">${esc(s.badge)}</span>
              </div>
              <div style="font-size:13px;color:var(--text-main);">
                ${s.html}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    const searchInput = document.getElementById('v3-guide-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const pos = searchInput.selectionStart;
        v3State.guideSearchQuery = searchInput.value;
        renderGuidePage();
        const nextInput = document.getElementById('v3-guide-search-input');
        if (nextInput) {
          nextInput.focus();
          try { nextInput.setSelectionRange(pos, pos); } catch (e) { }
        }
      });
    }

    root.querySelectorAll('[data-guide-jump]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('data-guide-jump');
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.classList.add('v3-guide-highlight');
          setTimeout(() => target.classList.remove('v3-guide-highlight'), 2400);
        }
      });
    });
  }

  // =========================================================================
  // HELP LINK BINDING & CSV EXPORT
  // =========================================================================
  function bindHelpLinks(container) {
    if (!container) return;
    container.querySelectorAll('[data-guide-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const anchor = link.getAttribute('data-guide-link');
        v3State.guideSearchQuery = '';
        if (core().switchView) {
          core().switchView('view-report-guide');
          setTimeout(() => {
            const el = document.getElementById(anchor);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              el.classList.add('v3-guide-highlight');
              setTimeout(() => el.classList.remove('v3-guide-highlight'), 2400);
            }
          }, 80);
        }
      });
    });
  }

  function exportActiveViewCsv(snap, activeViewId) {
    const rows = [
      ['Channel_ID', 'Channel_Title', 'Team_ID', 'Team_Name', 'Employee_ID', 'Employee_Name', 'Period_Start_PT', 'Period_End_PT', 'Views', 'Prev_Views', 'Growth_Pct', 'Net_Subscribers', 'Videos_Published', 'Engagement_Rate_Pct', 'Watch_Hours_Analytics', 'Estimated_Revenue_USD_Analytics', 'Proxy_RPM_USD']
    ];
    snap.channelPairs.forEach(cp => {
      rows.push([
        cp.id,
        `"${String(cp.meta.title).replace(/"/g, '""')}"`,
        cp.meta.teamId,
        `"${String(cp.meta.teamName).replace(/"/g, '""')}"`,
        cp.meta.employeeId,
        `"${String(cp.meta.employeeName).replace(/"/g, '""')}"`,
        snap.win.start,
        snap.win.end,
        cp.curr.views ?? '',
        cp.prev.views ?? '',
        cp.viewsGrowthPct ?? '',
        cp.curr.netSubs ?? '',
        cp.curr.videosPublished ?? 0,
        cp.curr.engagementRate ?? '',
        cp.curr.watchHours ?? '',
        cp.curr.estimatedRevenue ?? '',
        cp.curr.proxyRpm ?? ''
      ]);
    });
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bgmedia_${activeViewId || 'report'}_${snap.win.start}_${snap.win.end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (core().showToast) {
      core().showToast(`Đã xuất file CSV đối soát kỳ ${snap.win.start} → ${snap.win.end}`);
    }
  }

  // =========================================================================
  // ROUTER HOOK & PUBLIC CONTROLLER API
  // =========================================================================
  function onViewSwitch(viewId) {
    syncNetworkMenuVisibility();
    const snap = computeFullDatasetSnapshot();
    renderSharedHeader(snap, viewId);

    if (viewId === 'view-report-overview') {
      renderOverviewPage(snap);
      return true;
    }
    if (viewId === 'view-report-team') {
      renderTeamPage(snap);
      return true;
    }
    if (viewId === 'view-report-channel') {
      renderChannelPage(snap);
      return true;
    }
    if (viewId === 'view-report-staff') {
      const c = core();
      if (c.state && c.state.staffActiveTab) {
        v3State.staffTab = c.state.staffActiveTab;
        c.state.staffActiveTab = null;
      }
      renderStaffPage(snap);
      return true;
    }
    if (viewId === 'view-report-project') {
      renderProjectPage(snap);
      return true;
    }
    if (viewId === 'view-report-network') {
      renderNetworkPage(snap);
      return true;
    }
    if (viewId === 'view-report-guide') {
      renderGuidePage();
      return true;
    }
    return false;
  }

  function refreshActiveView() {
    const c = core();
    const activeView = (c.state && c.state.activeView) || 'view-report-overview';
    onViewSwitch(activeView);
  }

  function setScenario(scenId) {
    const c = core();
    if (c.state) {
      c.state.demoScenario = scenId;
    }
    if (c.DEMO_STORE) {
      c.DEMO_STORE.activeScenario = scenId;
    }
    const sel = document.getElementById('demo-scenario-select');
    if (sel) sel.value = scenId;
    refreshActiveView();
  }

  function setChannelMode(mode) {
    v3State.channelMode = mode === 'compare' ? 'compare' : 'single';
    refreshActiveView();
  }

  function toggleDeepAnalytics(force) {
    v3State.deepAnalyticsOpen = typeof force === 'boolean' ? force : !v3State.deepAnalyticsOpen;
    refreshActiveView();
  }

  function toggleProjectConfigured(force) {
    v3State.projectConfigured = typeof force === 'boolean' ? force : !v3State.projectConfigured;
    refreshActiveView();
  }

  function setStaffTab(tab) {
    v3State.staffTab = tab;
    refreshActiveView();
  }

  function selectChannelDay(dayIdxOrIso, openPanel = true) {
    const snap = computeFullDatasetSnapshot();
    const cp = snap.channelPairs.find(c => c.id === v3State.selectedChannelId) || snap.channelPairs[0];
    const refWin = buildChannelRefWindow(snap.win, cp, snap);
    const currDays = snap.win.days || [];
    let idx = -1;
    if (typeof dayIdxOrIso === 'string') {
      idx = currDays.indexOf(dayIdxOrIso);
    } else if (typeof dayIdxOrIso === 'number') {
      idx = dayIdxOrIso;
    }
    if (idx < 0) idx = resolveChannelSelectedDayIdx(cp, snap.win);
    updateDailyReportSelection(idx, openPanel, cp, snap, refWin, core().DEMO_STORE);
  }

  function openGuideSection(anchorId) {
    const c = core();
    if (c.switchView) {
      c.switchView(anchorId.startsWith('guide-') ? anchorId : 'view-report-guide');
    }
  }

  function init() {
    syncNetworkMenuVisibility();
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.v3-ch-search-picker')) {
        closeAllFloatingPickers();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (v3State.channelPickerOpen || v3State.comparePickerOpen || v3State.staffPickerOpen || v3State.teamQuickPickerOpen || document.querySelector('.v3-ch-picker-menu.open')) {
          e.preventDefault();
          closeAllFloatingPickers();
        }
      }
    });
    window.addEventListener('resize', () => {
      repositionOpenFloatingPickers();
    });
    window.addEventListener('scroll', (e) => {
      if (e.target && e.target.closest && e.target.closest('.v3-ch-picker-menu')) return;
      repositionOpenFloatingPickers();
    }, true);
    // Pre-render Guide page so #guide-... anchors exist in DOM at all times
    renderGuidePage();
    refreshActiveView();
  }

  window.__REPORT_V3__ = {
    init,
    onViewSwitch,
    refreshActiveView,
    computeFullDatasetSnapshot,
    FIXED_EMPLOYEE_COLORS,
    FIXED_CHANNEL_COLORS,
    getState: () => v3State,
    setScenario,
    setChannelMode,
    toggleDeepAnalytics,
    toggleProjectConfigured,
    setStaffTab,
    selectChannelDay,
    openGuideSection
  };

  if (window.__BGMEDIA_CORE__) {
    init();
  }
})();
