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
    teamSingleCompareMode: 'prev',// 'prev' | 'prev_quarter' | 'yoy'
    teamTableSort: 'growth',      // 'growth' | 'views'
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
    deepAnalyticsOpen: false,
    compareChannelIds: ['UCJhjE7wbdYAae1G25m0tHAA', 'UCM9KEEuzacwVlkt9JfJad7g', 'UCSJ4gkVC6NrvII8umztf0Ow'],
    compareChannelMetric: 'views',
    // Page 4 (Staff)
    staffTab: 'ranking',    // 'ranking' | 'compare' | 'matrix'
    staffSortField: 'views',
    staffSortAsc: false,
    staffTeamFilter: 'ALL',
    staffCompareMetric1: 'views',
    staffCompareMetric2: 'none',
    staffCompareChartType: 'bar', // 'bar' | 'line'
    staffMatrixGranularity: 'month', // 'month' | 'quarter' | 'day'
    staffMatrixMetric: 'views',
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
    // Item 12: Small |Δ%| (under 2%, or under 0.2 percentage points) shows neutral color ('flat')
    const isSmallChange = isPercentPoint
      ? Math.abs(diff) < 0.20
      : (pct !== null ? Math.abs(pct) < 2.0 : Math.abs(diff) < 0.0001);
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
    const isSmall = Math.abs(v) < 2.0;
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
          viewsSum += (r.views || 0);
          likesSum += (r.likes || 0);
          commentsSum += (r.comments || 0);
          dailyMap.set(r.day, {
            views: r.views || 0,
            watchHours: null,
            netSubs: null,
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

      dailyMap.set(r.day, {
        views: v,
        watchHours: Number((m / 60).toFixed(2)),
        netSubs: sg - sl,
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
    const modeSwitcher = document.getElementById('mode-switcher-container');
    if (modeSwitcher) {
      modeSwitcher.style.display = (activeViewId && activeViewId.startsWith('view-report-')) ? 'none' : 'flex';
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

    // Determine active scope channels (Always "3 Team · 15 kênh" on company/team pages; omit redundant channel label on Page 3)
    const isCompactHeaderPage = (activeViewId === 'view-report-team' || activeViewId === 'view-report-channel');
    let scopeLabel = activeViewId === 'view-report-channel' ? '' : '3 Team · 15 kênh';
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
                ${v3State.preset === 'month' ? `
                  <select id="v3-month-select" class="v3-select v3-select-sm">
                    <option value="2026-10" ${v3State.monthKey === '2026-10' ? 'selected' : ''}>Tháng 10/2026 (26/31 ngày)</option>
                    <option value="2026-09" ${v3State.monthKey === '2026-09' ? 'selected' : ''}>Tháng 09/2026 (30 ngày)</option>
                    <option value="2026-08" ${v3State.monthKey === '2026-08' ? 'selected' : ''}>Tháng 08/2026 (31 ngày)</option>
                  </select>
                ` : v3State.preset === 'quarter' ? `
                  <select id="v3-quarter-select" class="v3-select v3-select-sm">
                    <option value="2026-Q4" ${v3State.quarterKey === '2026-Q4' ? 'selected' : ''}>Quý 4/2026 (26/92 ngày)</option>
                    <option value="2026-Q3" ${v3State.quarterKey === '2026-Q3' ? 'selected' : ''}>Quý 3/2026 (92 ngày)</option>
                    <option value="2026-Q2" ${v3State.quarterKey === '2026-Q2' ? 'selected' : ''}>Quý 2/2026 (91 ngày)</option>
                  </select>
                ` : v3State.preset === 'custom' ? `
                  <div class="v3-date-inputs-wrap">
                    <input type="date" id="v3-custom-start" class="v3-select v3-select-sm" value="${snap.win.start}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày">
                    <span style="color:var(--text-dim);font-size:11px;">→</span>
                    <input type="date" id="v3-custom-end" class="v3-select v3-select-sm" value="${snap.win.end}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày">
                  </div>
                ` : `
                  <span class="v3-select v3-select-sm" style="display:inline-flex;align-items:center;font-family:var(--font-mono);color:var(--text-muted);cursor:default;" title="Khoảng ngày của kỳ đang chọn">${formatIsoToShortVN(snap.win.start)}–${formatIsoToVN(snap.win.end)}</span>
                `}
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
        if (nextPreset === '7d') {
          v3State.startDate = '2026-10-20';
          v3State.endDate = '2026-10-26';
          if (v3State.channelCompareMode === 'prev_quarter') v3State.channelCompareMode = 'prev';
        } else if (nextPreset === '30d') {
          v3State.startDate = '2026-09-27';
          v3State.endDate = '2026-10-26';
          if (v3State.channelCompareMode === 'prev_quarter') v3State.channelCompareMode = 'prev';
        } else if (nextPreset === 'month') {
          if (v3State.channelCompareMode === 'prev_quarter') v3State.channelCompareMode = 'prev';
        } else if (nextPreset === 'quarter') {
          v3State.teamSingleCompareMode = 'prev_quarter';
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

  function buildChannelHealthConclusion(cp, win, refWin) {
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

    // 10-day recent trajectory (compare last 5 days vs preceding 5 days within the window, or last half vs first half if < 10 days)
    const days = win.days || [];
    const recentSlice = days.slice(-10);
    const half = Math.max(1, Math.floor(recentSlice.length / 2));
    const firstHalfDays = recentSlice.slice(0, half);
    const secondHalfDays = recentSlice.slice(-half);
    const sumViewsForDays = (dList) => dList.reduce((s, d) => {
      const pt = curr.dailyMap.get(d);
      return s + (pt && pt.views ? pt.views : 0);
    }, 0);
    const vFirstHalf = sumViewsForDays(firstHalfDays);
    const vSecondHalf = sumViewsForDays(secondHalfDays);
    const recentPct = vFirstHalf > 0 ? ((vSecondHalf - vFirstHalf) / vFirstHalf) * 100 : 0;

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
    const windowTag = recentSlice.length >= 10 ? '10 ngày gần nhất' : `${recentSlice.length} ngày trong kỳ`;
    if (Math.abs(recentPct) < 2.0) {
      part2 = `${windowTag} giữ nhịp ổn định (${fmtPct(recentPct)})`;
    } else if (recentPct > 0) {
      part2 = `${windowTag} đang ${viewsPct !== null && viewsPct < 0 ? 'hồi phục' : 'đi lên'} (${fmtPct(recentPct)})`;
    } else {
      part2 = `${windowTag} đang chững lại (${fmtPct(recentPct)})`;
    }

    return `${part1}; ${part2}.`;
  }

  function renderChannelPage(snap) {
    const root = document.getElementById('v3-channel-root');
    if (!root) return;

    const c = core();
    const demo = c.DEMO_STORE;
    // Item 18: Always use single channel mode on Page 3; hide "Chế độ 2: So sánh 2–5 kênh đối đầu"
    v3State.channelMode = 'single';
    const cp = snap.channelPairs.find(x => x.id === v3State.selectedChannelId) || snap.channelPairs[0];
    if (cp) v3State.selectedChannelId = cp.id;

    root.innerHTML = `<div id="v3-channel-mode-body"></div>`;
    const body = document.getElementById('v3-channel-mode-body');
    renderChannelSingleMode(body, snap, cp, demo);
    bindHelpLinks(root);
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
    const rawVids = (core().DATA_STORE && core().DATA_STORE.getVideos(cp.id)) || [];
    const periodType = win.dayCount <= 7 ? 'metrics_7d' : (win.dayCount <= 28 ? 'metrics_28d' : 'metrics');
    const enrichedVideos = rawVids.map(v => {
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

    const TRAFFIC_VN_ITEMS = [
      { key: 'PLAYLIST', label: 'Danh sách phát' },
      { key: 'SUBSCRIBER', label: 'Người đăng ký' },
      { key: 'YT_SEARCH', label: 'Tìm kiếm YouTube' }
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
    });
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
    const engTooltip = `Likes: ${fmtInt(curr.likes)} • Comments: ${fmtInt(curr.comments)}${curr.engagementIncludesShares ? ` • Shares: ${fmtInt(curr.shares)}` : ''} (Thẻ này không đổi biểu đồ theo ngày)`;
    const revTooltip = `Giờ xem: ${curr.watchHours !== null ? fmtInt(curr.watchHours) + 'h' : '—'} • AVD: ${avdStr} • RPM: ${curr.proxyRpm !== null ? fmtMoney(curr.proxyRpm) : '—'}`;

    const healthConclusion = buildChannelHealthConclusion(cp, win, refWin);

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
      <!-- 1. KHỐI NHẬN DIỆN KÊNH + HÀNG TOÀN THỜI GIAN + KẾT LUẬN XU HƯỚNG -->
      <section class="v3-panel" id="v3-channel-identity-panel" style="padding:14px 18px;">
        <div class="v3-ch-identity-top">
          <div style="display:flex;align-items:center;gap:14px;min-width:0;">
            <img src="${esc(meta.avatar)}" alt="${esc(meta.title)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid ${meta.teamColor};flex-shrink:0;" onerror="this.style.display='none'">
            <div style="min-width:0;">
              <div style="display:flex;align-items:center;gap:7px;flex-wrap:nowrap;white-space:nowrap;height:24px;">
                <h2 style="font-size:17.5px;font-weight:800;color:var(--text-main);margin:0;white-space:nowrap;">${esc(meta.title)}</h2>
                <span style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);white-space:nowrap;">${esc(meta.handle)}</span>
                <span class="v3-badge" style="background:${meta.teamColor}22;color:${meta.teamColor};border:1px solid ${meta.teamColor}55;">
                  <span class="v3-team-dot" style="background:${meta.teamColor};"></span> ${esc(meta.teamName)}
                </span>
                <span class="v3-badge ${curr.hasAnalytics ? 'analytics' : 'warn'}" id="v3-channel-oauth-status-badge">
                  ${curr.hasAnalytics ? '[Đã kết nối Analytics]' : 'Chưa cấp quyền Analytics'}
                </span>
              </div>
              <div style="font-size:12.2px;color:var(--text-muted);margin-top:5px;height:22px;min-height:22px;max-height:22px;display:flex;align-items:center;white-space:nowrap;">
                <span>Người phụ trách (PIC): <strong style="color:var(--text-main);" id="v3-channel-pic-name">${esc(meta.employeeName)}</strong></span>
                <span style="margin:0 6px;color:var(--text-dim);">·</span>
                <span>Kỳ đang xem: <strong style="color:var(--text-main);font-family:var(--font-mono);">${currRangeFullVN}</strong></span>
                <span style="margin:0 6px;color:var(--text-dim);">·</span>
                <span class="v3-badge muted" id="v3-channel-analytics-delay-note">Dữ liệu Analytics có độ trễ 2–3 ngày</span>
                <span class="v3-badge partial" style="margin-left:6px;visibility:${win.isPartialQuarter ? 'visible' : 'hidden'};">Chưa trọn quý (${win.dayCount}/${win.quarterCalendarDays} ngày)</span>
              </div>
            </div>
          </div>

          <!-- BỘ CHỌN KÊNH DUY NHẤT CÓ TÌM KIẾM (Không có nhãn "Đổi kênh") -->
          <div class="v3-ch-search-picker" id="v3-channel-search-picker">
            <button type="button" class="v3-ch-picker-btn" id="v3-channel-picker-btn" aria-haspopup="listbox" aria-expanded="${v3State.channelPickerOpen ? 'true' : 'false'}" title="Chọn hoặc tìm kiếm kênh YouTube">
              <span class="v3-team-dot" style="background:${meta.teamColor};"></span>
              <span class="v3-ch-picker-btn-text">
                <strong>${esc(meta.title)}</strong>
                <span style="color:var(--text-muted);font-weight:500;">· ${esc(meta.employeeName)} · ${esc(meta.teamName)}</span>
              </span>
              <i class="ri-search-eye-line" style="color:#38BDF8;font-size:14px;margin-left:4px;"></i>
              <i class="ri-arrow-down-s-line" style="color:var(--text-muted);font-size:15px;"></i>
            </button>
            <div class="v3-ch-picker-menu ${v3State.channelPickerOpen ? 'open' : ''}" id="v3-channel-picker-menu" role="listbox">
              <div class="v3-ch-picker-search-wrap">
                <i class="ri-search-line"></i>
                <input type="text" id="v3-channel-picker-search" placeholder="Tìm tên kênh, @handle, PIC, team..." value="${esc(v3State.channelPickerQuery)}" autocomplete="off" aria-label="Tìm kiếm kênh">
              </div>
              <div class="v3-ch-picker-list" id="v3-channel-picker-list">
                ${snap.channelPairs.map(item => {
                  const searchBlob = `${item.meta.title} ${item.meta.handle} ${item.meta.employeeName} ${item.meta.teamName}`.toLowerCase();
                  const isSelected = item.id === cp.id;
                  return `
                    <button type="button" class="v3-ch-picker-item ${isSelected ? 'active' : ''}" data-pick-channel-id="${item.id}" data-search-text="${esc(searchBlob)}" role="option" aria-selected="${isSelected ? 'true' : 'false'}">
                      <span class="v3-team-dot" style="background:${item.meta.teamColor};"></span>
                      <span class="v3-ch-picker-item-main">
                        <strong>${esc(item.meta.title)}</strong>
                        <span class="v3-ch-picker-item-sub">${esc(item.meta.handle)} · PIC: ${esc(item.meta.employeeName)}</span>
                      </span>
                      <span class="v3-badge" style="background:${item.meta.teamColor}18;color:${item.meta.teamColor};border:1px solid ${item.meta.teamColor}44;font-size:10px;">${esc(item.meta.teamName)}</span>
                    </button>
                  `;
                }).join('')}
                <div id="v3-channel-picker-empty" style="display:none;padding:12px;text-align:center;color:var(--text-muted);font-size:12px;">
                  Không tìm thấy kênh phù hợp
                </div>
              </div>
            </div>
            <select id="v3-single-channel-select" style="display:none;" aria-hidden="true">
              ${snap.channelPairs.map(item => `
                <option value="${item.id}" ${item.id === cp.id ? 'selected' : ''}>${esc(item.meta.title)}</option>
              `).join('')}
            </select>
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

        <!-- DÒNG KẾT LUẬN TỰ ĐỘNG: "Kênh này đang đi lên hay đi xuống?" (Mục 9) -->
        <div class="v3-ch-health-bar" id="v3-channel-health-bar">
          <span class="v3-ch-health-q">Kênh này đang đi lên hay đi xuống?</span>
          <span class="v3-ch-health-text" id="v3-channel-health-conclusion">${esc(healthConclusion)}</span>
        </div>
      </section>

      <!-- 2. KHỐI 5 THẺ KPI TRONG KỲ (Kiêm bộ chọn chỉ số cho biểu đồ xu hướng · Mục 10 & 11) -->
      <section class="v3-panel" id="v3-channel-kpi-panel" style="padding:12px 18px 14px 18px;">
        <div class="v3-chart-a-header-row1" style="margin-bottom:10px;">
          <div class="v3-panel-title" style="font-size:14.5px;white-space:nowrap;">
            <i class="ri-dashboard-3-line" style="color:${meta.teamColor};"></i>
            <span>Chỉ số kênh trong kỳ</span>
            <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
          </div>
          <div style="font-size:11.2px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            Nhấn thẻ <strong>Views / Sub ròng / Video đăng / Doanh thu</strong> để đổi biểu đồ · Rê chuột xem chi tiết
          </div>
        </div>

        <div class="v3-kpi-grid" id="v3-channel-kpi-grid" style="margin-bottom:0;">
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

          <!-- Card 4: Tỷ lệ tương tác (NOT clickable for chart) -->
          <div class="v3-kpi-card v3-ch-kpi-card is-chart-disabled"
               data-ch-kpi-disabled="true"
               data-kpi-tooltip="${esc(engTooltip)}"
               title="${esc(engTooltip)}">
            <div class="v3-kpi-top">
              <span class="v3-kpi-label">Tỷ lệ tương tác</span>
              <i class="ri-information-line v3-kpi-info-icon"></i>
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

      <!-- 3. KHỐI BIỂU ĐỒ XU HƯỚNG KÊNH + DÒNG TÓM TẮT VIDEO (Mục 12 & 13) -->
      <section class="v3-panel" id="v3-channel-trend-panel" style="padding-bottom:12px;">
        <div class="v3-chart-a-header" id="v3-channel-chart-header">
          <div class="v3-chart-a-header-row1" id="v3-channel-chart-header-row1">
            <div class="v3-panel-title" style="white-space:nowrap;">
              <i class="ri-line-chart-line" style="color:${meta.teamColor};"></i>
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
                <div class="v3-chart-custom-dates" id="v3-ch-ref-custom-dates">
                  <input type="date" id="v3-ch-ref-start" class="v3-select v3-select-sm v3-chart-date-input" value="${refWin.refStart}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày đối chứng">
                  <span class="v3-chart-date-sep">→</span>
                  <input type="date" id="v3-ch-ref-end" class="v3-select v3-select-sm v3-chart-date-input" value="${refWin.refEnd}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày đối chứng">
                </div>
              ` : `
                <select id="v3-ch-ref-fixed-select" class="v3-select v3-select-sm v3-chart-slot-control" disabled aria-label="Khoảng ngày kỳ đối chứng">
                  <option>${refWin.refRangeFullVN} (${refWin.refDayCount} ngày)</option>
                </select>
              `}
            </div>

            <div class="v3-preset-group" id="v3-ch-unequal-mode-group" style="visibility:${refWin.isUnequalLength ? 'visible' : 'hidden'};pointer-events:${refWin.isUnequalLength ? 'auto' : 'none'};" role="group" aria-label="Chế độ tính delta khi kỳ đối chứng khác số ngày">
              <button type="button" class="v3-preset-btn ${v3State.channelUnequalMode === 'avg' ? 'active' : ''}" data-ch-unequal-mode="avg">Trung bình/ngày</button>
              <button type="button" class="v3-preset-btn ${v3State.channelUnequalMode === 'total' ? 'active' : ''}" data-ch-unequal-mode="total">Tổng</button>
            </div>
          </div>
        </div>

        <div class="v3-chart-a-canvas-wrap" id="v3-channel-chart-canvas-wrap" style="height:225px;min-height:225px;max-height:225px;">
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

    // Bind Single Searchable Channel Picker Events
    const pickerBtn = document.getElementById('v3-channel-picker-btn');
    const pickerMenu = document.getElementById('v3-channel-picker-menu');
    const pickerSearch = document.getElementById('v3-channel-picker-search');
    const pickerEmpty = document.getElementById('v3-channel-picker-empty');

    const filterPickerList = (q) => {
      const norm = String(q || '').trim().toLowerCase();
      let visibleCount = 0;
      body.querySelectorAll('.v3-ch-picker-item').forEach(item => {
        const blob = item.getAttribute('data-search-text') || '';
        const match = !norm || blob.includes(norm);
        item.style.display = match ? 'flex' : 'none';
        if (match) visibleCount++;
      });
      if (pickerEmpty) {
        pickerEmpty.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    };

    if (pickerSearch) {
      filterPickerList(v3State.channelPickerQuery);
      pickerSearch.addEventListener('input', (e) => {
        v3State.channelPickerQuery = e.target.value;
        filterPickerList(v3State.channelPickerQuery);
      });
      pickerSearch.addEventListener('click', (e) => e.stopPropagation());
    }

    if (pickerBtn && pickerMenu) {
      pickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        v3State.channelPickerOpen = !v3State.channelPickerOpen;
        pickerMenu.classList.toggle('open', v3State.channelPickerOpen);
        pickerBtn.setAttribute('aria-expanded', v3State.channelPickerOpen ? 'true' : 'false');
        if (v3State.channelPickerOpen && pickerSearch) {
          setTimeout(() => pickerSearch.focus(), 10);
        }
      });
    }

    body.querySelectorAll('[data-pick-channel-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextId = item.getAttribute('data-pick-channel-id');
        v3State.selectedChannelId = nextId;
        v3State.channelPickerOpen = false;
        v3State.channelPickerQuery = '';
        renderSharedHeader(snap, 'view-report-channel');
        renderChannelPage(snap);
      });
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
          // Initialize custom reference dates to non-overlapping previous window if needed
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

    chartInstances['channelSingle'] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Kỳ này (${currRangeShort})`,
            data: currData,
            borderColor: cp.meta.teamColor,
            backgroundColor: cp.meta.teamColor + '1F',
            borderWidth: 2.6,
            pointRadius: 2.3,
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
            tension: 0.3,
            fill: false
          }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 4, bottom: 0 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#CBD5E1',
              boxWidth: 24,
              boxHeight: 2,
              font: { size: 11.5, weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              title: function (items) {
                const idx = items && items[0] ? items[0].dataIndex : 0;
                const dCurr = currDays[idx];
                const dRef = refDays[idx];
                return `Ngày thứ ${idx + 1} của kỳ (${dCurr ? formatIsoToVN(dCurr) : '—'} vs ${dRef ? formatIsoToVN(dRef) : '—'})`;
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
              text: 'Ngày thứ N của kỳ',
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
  }

  function renderChannelCompareMode(body, snap) {
    // Ensure 2..5 valid channels
    const validIds = v3State.compareChannelIds.filter(id => snap.channelPairs.some(c => c.id === id));
    if (validIds.length < 2) {
      v3State.compareChannelIds = snap.channelPairs.slice(0, 3).map(c => c.id);
    }
    const selectedPairs = v3State.compareChannelIds
      .map(id => snap.channelPairs.find(c => c.id === id))
      .filter(Boolean);

    // Helper to find highest and lowest channel ID for a numeric metric
    function hiLo(getter) {
      const vals = selectedPairs
        .map(cp => ({ id: cp.id, val: getter(cp) }))
        .filter(x => x.val !== null && x.val !== undefined && !Number.isNaN(Number(x.val)));
      if (vals.length < 2) return { hi: null, lo: null };
      vals.sort((a, b) => b.val - a.val);
      return { hi: vals[0].id, lo: vals[vals.length - 1].id };
    }

    const hlViews = hiLo(cp => cp.curr.views);
    const hlGrowth = hiLo(cp => cp.viewsGrowthPct);
    const hlSubs = hiLo(cp => cp.curr.netSubs);
    const hlVids = hiLo(cp => cp.curr.videosPublished);
    const hlEng = hiLo(cp => cp.curr.engagementRate);
    const hlHours = hiLo(cp => cp.curr.watchHours);
    const hlRev = hiLo(cp => cp.curr.estimatedRevenue);
    const hlRpm = hiLo(cp => cp.curr.proxyRpm);

    function markBadge(id, hl) {
      if (hl.hi === id && hl.hi !== hl.lo) return ` <span class="v3-badge highest">[Cao nhất]</span>`;
      if (hl.lo === id && hl.hi !== hl.lo) return ` <span class="v3-badge lowest">[Thấp nhất]</span>`;
      return '';
    }

    body.innerHTML = `
      <!-- Channel Selector Pills (2-5 channels) -->
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-scales-3-line" style="color:#38BDF8;"></i>
              So sánh đối đầu 2–5 kênh (Đánh dấu tự động [Cao nhất] và [Thấp nhất])
            </div>
            <div class="v3-panel-subtitle">
              Chọn từ 2 đến 5 kênh để đối chiếu xu hướng theo ngày và bảng chỉ số ngang hàng
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <select id="v3-compare-add-select" class="v3-select">
              <option value="">+ Thêm kênh vào so sánh (${selectedPairs.length}/5)...</option>
              ${snap.channelPairs.filter(cp => !v3State.compareChannelIds.includes(cp.id)).map(cp => `
                <option value="${cp.id}">${esc(cp.meta.title)} (${esc(cp.meta.teamName)})</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
          ${selectedPairs.map((cp, idx) => {
      const color = COMPARE_LINE_COLORS[idx % COMPARE_LINE_COLORS.length];
      return `
              <span class="v3-scope-pill" style="border-color:${color};background:${color}18;padding:5px 11px;font-weight:700;">
                <span class="v3-team-dot" style="background:${color};"></span>
                <span>${esc(cp.meta.title)}</span>
                <span style="color:var(--text-muted);font-weight:500;">(${esc(cp.meta.teamName)})</span>
                <button type="button" data-remove-cmp-ch="${cp.id}" style="background:none;border:none;color:var(--text-main);cursor:pointer;font-size:14px;margin-left:4px;" title="Gỡ kênh này">×</button>
              </span>
            `;
    }).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <strong style="font-size:13px;">Biểu đồ đường đa kênh (Gắn nhãn trực tiếp ở cuối đường)</strong>
          <div class="v3-preset-group">
            <button type="button" class="v3-preset-btn ${v3State.compareChannelMetric === 'views' ? 'active' : ''}" data-cmp-metric="views">Lượt xem</button>
            <button type="button" class="v3-preset-btn ${v3State.compareChannelMetric === 'watchHours' ? 'active' : ''}" data-cmp-metric="watchHours">Giờ xem [Analytics]</button>
            <button type="button" class="v3-preset-btn ${v3State.compareChannelMetric === 'revenue' ? 'active' : ''}" data-cmp-metric="revenue">Doanh thu [Analytics]</button>
          </div>
        </div>
        <div style="height: 290px; position: relative;">
          <canvas id="v3-channel-compare-canvas"></canvas>
        </div>
      </section>

      <!-- Side-by-Side Comparison Table -->
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div class="v3-panel-title">Bảng đối chiếu chỉ số cùng kỳ (${selectedPairs.length} kênh đang chọn)</div>
        </div>
        <div class="v3-table-wrap">
          <table class="v3-table">
            <thead>
              <tr>
                <th>Chỉ số đối chiếu</th>
                ${selectedPairs.map((cp, idx) => {
      const color = COMPARE_LINE_COLORS[idx % COMPARE_LINE_COLORS.length];
      return `
                    <th class="num">
                      <span class="v3-team-dot" style="background:${color};"></span>
                      ${esc(cp.meta.title)}
                      <div style="font-size:10.5px;color:var(--text-muted);font-weight:500;">${esc(cp.meta.employeeName)} · ${esc(cp.meta.teamName)}</div>
                    </th>
                  `;
    }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Lượt xem trong kỳ (Views)</strong></td>
                ${selectedPairs.map(cp => `<td class="num"><strong>${cp.curr.views !== null ? fmtInt(cp.curr.views) : '—'}</strong>${markBadge(cp.id, hlViews)}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>% Tăng trưởng vs kỳ trước</strong></td>
                ${selectedPairs.map(cp => `<td class="num">${fmtDeltaBadge(cp.curr.views, cp.prev.views)}${markBadge(cp.id, hlGrowth)}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Sub ròng (Net Subscribers)</strong></td>
                ${selectedPairs.map(cp => `<td class="num">${cp.curr.netSubs !== null ? (cp.curr.netSubs > 0 ? '+' + fmtInt(cp.curr.netSubs) : fmtInt(cp.curr.netSubs)) : '—'}${markBadge(cp.id, hlSubs)}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Số video đăng trong kỳ</strong></td>
                ${selectedPairs.map(cp => `<td class="num">${fmtInt(cp.curr.videosPublished)}${markBadge(cp.id, hlVids)}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Tỷ lệ tương tác (%)</strong></td>
                ${selectedPairs.map(cp => `<td class="num">${cp.curr.engagementRate !== null ? cp.curr.engagementRate.toFixed(2) + '%' : '—'}${markBadge(cp.id, hlEng)}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Giờ xem [Analytics]</strong></td>
                ${selectedPairs.map(cp => `<td class="num">${cp.curr.watchHours !== null ? fmtInt(cp.curr.watchHours) + 'h' : '—'}${markBadge(cp.id, hlHours)}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Doanh thu ước tính [Analytics]</strong></td>
                ${selectedPairs.map(cp => `<td class="num">${cp.curr.estimatedRevenue !== null ? fmtMoney(cp.curr.estimatedRevenue) : '—'}${markBadge(cp.id, hlRev)}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>RPM (Doanh thu / 1K views) [Analytics]</strong></td>
                ${selectedPairs.map(cp => `<td class="num">${cp.curr.proxyRpm !== null ? '$' + cp.curr.proxyRpm.toFixed(2) : '—'}${markBadge(cp.id, hlRpm)}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Lần đăng gần nhất</strong></td>
                ${selectedPairs.map(cp => `<td class="num">${formatIsoToVN(cp.meta.lastPublishedPt)} (${cp.daysSinceLastUpload} ngày trước)</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `;

    // Render Multi-Channel Line Chart with end-of-line direct labels
    destroyChart('channelCompare');
    const canvas = document.getElementById('v3-channel-compare-canvas');
    if (canvas && typeof Chart !== 'undefined') {
      const metric = v3State.compareChannelMetric;
      const days = snap.win.days;
      const labels = days.map(d => d.slice(8, 10) + '/' + d.slice(5, 7));
      const datasets = selectedPairs.map((cp, idx) => {
        const color = COMPARE_LINE_COLORS[idx % COMPARE_LINE_COLORS.length];
        const series = days.map(d => {
          const pt = cp.curr.dailyMap.get(d);
          return pt ? pt[metric] : null;
        });
        const lastVal = series.slice().reverse().find(v => v !== null && v !== undefined);
        const endTag = lastVal !== undefined ? ` (${fmtCompact(lastVal)})` : '';
        return {
          label: `${cp.meta.title}${endTag}`,
          data: series,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 2.3,
          pointRadius: 2,
          tension: 0.3
        };
      });

      chartInstances['channelCompare'] = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#CBD5E1', font: { weight: '700' } } } },
          scales: {
            x: { ticks: { color: '#94A3B8', maxTicksLimit: 14 }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      });
    }

    // Bind Compare Mode Events
    const addSel = document.getElementById('v3-compare-add-select');
    if (addSel) {
      addSel.addEventListener('change', () => {
        const addId = addSel.value;
        if (!addId) return;
        if (v3State.compareChannelIds.length >= 5) {
          if (core().showToast) core().showToast('Chỉ so sánh tối đa 5 kênh cùng lúc để biểu đồ dễ đọc');
          return;
        }
        v3State.compareChannelIds.push(addId);
        renderChannelPage(snap);
      });
    }

    body.querySelectorAll('[data-remove-cmp-ch]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rmId = btn.getAttribute('data-remove-cmp-ch');
        if (v3State.compareChannelIds.length <= 2) {
          if (core().showToast) core().showToast('Cần giữ tối thiểu 2 kênh để so sánh');
          return;
        }
        v3State.compareChannelIds = v3State.compareChannelIds.filter(x => x !== rmId);
        renderChannelPage(snap);
      });
    });

    body.querySelectorAll('[data-cmp-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.compareChannelMetric = btn.getAttribute('data-cmp-metric');
        renderChannelPage(snap);
      });
    });
  }

  // =========================================================================
  // PAGE 4: BÁO CÁO THEO NHÂN VIÊN (#view-report-staff)
  // Question: "Ai đang tăng, ai đang chậm?" (Consolidated 3 Tabs)
  // =========================================================================
  function renderStaffPage(snap) {
    const root = document.getElementById('v3-staff-root');
    if (!root) return;

    const c = core();
    if (c.state && c.state.staffActiveTab) {
      v3State.staffTab = c.state.staffActiveTab;
      delete c.state.staffActiveTab;
    }

    root.innerHTML = `
      <div class="v3-tab-bar">
        <button type="button" class="v3-tab-btn ${v3State.staffTab === 'ranking' ? 'active' : ''}" data-staff-tab="ranking">
          <i class="ri-trophy-line"></i> Tab 1: Bảng xếp hạng 15 Nhân viên
        </button>
        <button type="button" class="v3-tab-btn ${v3State.staffTab === 'compare' ? 'active' : ''}" data-staff-tab="compare">
          <i class="ri-bar-chart-horizontal-line"></i> Tab 2: Biểu đồ so sánh (1–2 chỉ số)
        </button>
        <button type="button" class="v3-tab-btn ${v3State.staffTab === 'matrix' ? 'active' : ''}" data-staff-tab="matrix">
          <i class="ri-grid-line"></i> Tab 3: Ma trận đối soát (Nhân viên × Thời gian)
        </button>
      </div>
      <div id="v3-staff-tab-body"></div>
    `;

    root.querySelectorAll('[data-staff-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.staffTab = btn.getAttribute('data-staff-tab');
        renderStaffPage(snap);
      });
    });

    const body = document.getElementById('v3-staff-tab-body');
    if (v3State.staffTab === 'compare') {
      renderStaffCompareTab(body, snap);
    } else if (v3State.staffTab === 'matrix') {
      renderStaffMatrixTab(body, snap);
    } else {
      renderStaffRankingTab(body, snap);
    }
    bindHelpLinks(root);
  }

  function renderStaffRankingTab(body, snap) {
    const c = core();
    const filtered = snap.channelPairs.filter(cp => v3State.staffTeamFilter === 'ALL' || cp.meta.teamId === v3State.staffTeamFilter);

    const fieldGetter = (cp, f) => {
      if (f === 'views') return cp.curr.views ?? -1;
      if (f === 'growth') return cp.viewsGrowthPct ?? -9999;
      if (f === 'netSubs') return cp.curr.netSubs ?? -999999;
      if (f === 'videos') return cp.curr.videosPublished ?? 0;
      if (f === 'engagement') return cp.curr.engagementRate ?? -1;
      if (f === 'revenue') return cp.curr.estimatedRevenue ?? -1;
      return cp.curr.views ?? -1;
    };

    const sorted = [...filtered].sort((a, b) => {
      const va = fieldGetter(a, v3State.staffSortField);
      const vb = fieldGetter(b, v3State.staffSortField);
      return v3State.staffSortAsc ? (va - vb) : (vb - va);
    });

    const maxViews = Math.max(1, ...sorted.map(cp => cp.curr.views || 0));

    function sortHeader(field, label, isNum = true) {
      const active = v3State.staffSortField === field;
      const arrow = active ? (v3State.staffSortAsc ? ' ▲' : ' ▼') : '';
      return `<th class="${isNum ? 'num' : ''}" data-staff-sort="${field}" style="cursor:pointer;user-select:none;${active ? 'color:#38BDF8;' : ''}">${label}${arrow}</th>`;
    }

    body.innerHTML = `
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-user-star-line" style="color:#38BDF8;"></i>
              Xếp hạng 15 Nhân viên phụ trách kênh (Nhấn tiêu đề cột để sắp xếp · Nhấn vào dòng để mở chi tiết kênh)
            </div>
            <div class="v3-panel-subtitle">
              Thanh dữ liệu (Data-bar) thể hiện quy mô Views; ô % tăng trưởng tô màu theo hiệu suất so với kỳ trước
            </div>
          </div>
          <div class="v3-preset-group">
            <button type="button" class="v3-preset-btn ${v3State.staffTeamFilter === 'ALL' ? 'active' : ''}" data-staff-team="ALL">Tất cả (15 NV)</button>
            ${snap.teamPairs.map(tp => `
              <button type="button" class="v3-preset-btn ${v3State.staffTeamFilter === tp.id ? 'active' : ''}" data-staff-team="${tp.id}">
                <span class="v3-team-dot" style="background:${tp.color};"></span> ${esc(tp.name)} (5)
              </button>
            `).join('')}
          </div>
        </div>

        <div class="v3-table-wrap">
          <table class="v3-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Nhân viên (PIC)</th>
                <th>Team</th>
                <th>Kênh phụ trách</th>
                ${sortHeader('views', 'Views kỳ này (Data-bar)', false)}
                ${sortHeader('growth', 'So với kỳ trước')}
                ${sortHeader('netSubs', 'Sub ròng')}
                ${sortHeader('videos', 'Video')}
                ${sortHeader('engagement', 'Tương tác')}
                ${sortHeader('revenue', 'Doanh thu')}
              </tr>
            </thead>
            <tbody>
              ${sorted.map((cp, idx) => {
      const pctBar = cp.curr.views ? Math.max(3, Math.round((cp.curr.views / maxViews) * 100)) : 0;
      const g = cp.viewsGrowthPct;
      const gBg = g === null ? 'transparent' : (g >= 0 ? 'rgba(16, 185, 129, 0.10)' : 'rgba(239, 68, 68, 0.12)');
      return `
                  <tr class="clickable-row" data-staff-open-channel="${cp.id}" title="Nhấn để mở Báo cáo theo kênh: ${esc(cp.meta.title)}">
                    <td>
                      <span class="v3-badge ${idx === 0 ? 'highest' : (idx === sorted.length - 1 && sorted.length > 2 ? 'lowest' : 'muted')}">
                        #${idx + 1}${idx === 0 ? ' [Cao nhất]' : (idx === sorted.length - 1 && sorted.length > 2 ? ' [Thấp nhất]' : '')}
                      </span>
                    </td>
                    <td>
                      <strong>${esc(cp.meta.employeeName)}</strong>
                    </td>
                    <td>
                      <span class="v3-badge" style="background:${cp.meta.teamColor}20;color:${cp.meta.teamColor};border:1px solid ${cp.meta.teamColor}55;">
                        <span class="v3-team-dot" style="background:${cp.meta.teamColor};"></span> ${esc(cp.meta.teamName)}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:7px;">
                        <img src="${esc(cp.meta.avatar)}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">
                        <span style="font-weight:600;">${esc(cp.meta.title)}</span>
                      </div>
                    </td>
                    <td class="v3-bar-cell">
                      <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:12.5px;">
                        <strong>${cp.curr.views !== null ? fmtInt(cp.curr.views) : '—'}</strong>
                        <span style="color:var(--text-muted);font-size:11px;">Kỳ trước: ${cp.prev.views !== null ? fmtCompact(cp.prev.views) : '—'}</span>
                      </div>
                      <div class="v3-bar-track">
                        <div class="v3-bar-fill" style="width:${pctBar}%;background:${cp.meta.teamColor};"></div>
                      </div>
                    </td>
                    <td class="num" style="background:${gBg};">${fmtDeltaBadge(cp.curr.views, cp.prev.views)}</td>
                    <td class="num">${cp.curr.netSubs !== null ? (cp.curr.netSubs > 0 ? '+' + fmtInt(cp.curr.netSubs) : fmtInt(cp.curr.netSubs)) : '—'}</td>
                    <td class="num">${fmtInt(cp.curr.videosPublished)}</td>
                    <td class="num">${cp.curr.engagementRate !== null ? cp.curr.engagementRate.toFixed(2) + '%' : '—'}</td>
                    <td class="num">${cp.curr.estimatedRevenue !== null ? fmtMoney(cp.curr.estimatedRevenue) : '—'}</td>
                  </tr>
                `;
    }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">TỔNG CỘNG (${sorted.length} NHÂN VIÊN ĐANG HIỂN THỊ)</td>
                <td class="num">${snap.systemCurr.views !== null ? fmtInt(sorted.reduce((s, x) => s + (x.curr.views || 0), 0)) : '—'}</td>
                <td class="num">${v3State.staffTeamFilter === 'ALL' ? fmtDeltaBadge(snap.systemCurr.views, snap.systemPrev.views) : '—'}</td>
                <td class="num">${snap.systemCurr.netSubs !== null ? fmtInt(sorted.reduce((s, x) => s + (x.curr.netSubs || 0), 0)) : '—'}</td>
                <td class="num">${fmtInt(sorted.reduce((s, x) => s + (x.curr.videosPublished || 0), 0))}</td>
                <td class="num">${snap.systemCurr.engagementRate !== null ? snap.systemCurr.engagementRate.toFixed(2) + '%' : '—'}</td>
                <td class="num">${snap.systemCurr.estimatedRevenue !== null ? fmtMoney(sorted.reduce((s, x) => s + (x.curr.estimatedRevenue || 0), 0)) : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;

    body.querySelectorAll('[data-staff-sort]').forEach(th => {
      th.addEventListener('click', () => {
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

    body.querySelectorAll('[data-staff-team]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.staffTeamFilter = btn.getAttribute('data-staff-team');
        renderStaffPage(snap);
      });
    });

    body.querySelectorAll('[data-staff-open-channel]').forEach(tr => {
      tr.addEventListener('click', () => {
        v3State.selectedChannelId = tr.getAttribute('data-staff-open-channel');
        v3State.channelMode = 'single';
        if (c.switchView) c.switchView('view-report-channel');
      });
    });
  }

  function renderStaffCompareTab(body, snap) {
    const filtered = snap.channelPairs.filter(cp => v3State.staffTeamFilter === 'ALL' || cp.meta.teamId === v3State.staffTeamFilter);

    body.innerHTML = `
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-bar-chart-horizontal-line" style="color:#38BDF8;"></i>
              Biểu đồ so sánh hiệu suất nhân sự (Thay thế 5 biểu đồ rời rạc bằng 1 biểu đồ tự chọn 1–2 chỉ số)
            </div>
            <div class="v3-panel-subtitle">
              Chọn 1 hoặc 2 chỉ số, lọc theo Team và chuyển đổi giữa Biểu đồ Cột xếp hạng hoặc Biểu đồ Đường theo thời gian
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <select id="v3-staff-cmp-team" class="v3-select">
              <option value="ALL" ${v3State.staffTeamFilter === 'ALL' ? 'selected' : ''}>Phạm vi: Tất cả 15 Nhân viên</option>
              ${snap.teamPairs.map(tp => `<option value="${tp.id}" ${v3State.staffTeamFilter === tp.id ? 'selected' : ''}>Team: ${esc(tp.name)} (5 NV)</option>`).join('')}
            </select>

            <select id="v3-staff-cmp-m1" class="v3-select">
              <option value="views" ${v3State.staffCompareMetric1 === 'views' ? 'selected' : ''}>Chỉ số 1: Lượt xem (Views)</option>
              <option value="growth" ${v3State.staffCompareMetric1 === 'growth' ? 'selected' : ''}>Chỉ số 1: % Tăng trưởng Views</option>
              <option value="netSubs" ${v3State.staffCompareMetric1 === 'netSubs' ? 'selected' : ''}>Chỉ số 1: Sub ròng (Net Subs)</option>
              <option value="watchHours" ${v3State.staffCompareMetric1 === 'watchHours' ? 'selected' : ''}>Chỉ số 1: Giờ xem [Analytics]</option>
              <option value="revenue" ${v3State.staffCompareMetric1 === 'revenue' ? 'selected' : ''}>Chỉ số 1: Doanh thu [Analytics]</option>
            </select>

            <select id="v3-staff-cmp-m2" class="v3-select">
              <option value="none" ${v3State.staffCompareMetric2 === 'none' ? 'selected' : ''}>Chỉ số 2: Không chọn (1 trục)</option>
              <option value="revenue" ${v3State.staffCompareMetric2 === 'revenue' ? 'selected' : ''}>Chỉ số 2: Doanh thu [Analytics]</option>
              <option value="watchHours" ${v3State.staffCompareMetric2 === 'watchHours' ? 'selected' : ''}>Chỉ số 2: Giờ xem [Analytics]</option>
              <option value="netSubs" ${v3State.staffCompareMetric2 === 'netSubs' ? 'selected' : ''}>Chỉ số 2: Sub ròng</option>
              <option value="videos" ${v3State.staffCompareMetric2 === 'videos' ? 'selected' : ''}>Chỉ số 2: Số video đăng</option>
            </select>

            <div class="v3-preset-group">
              <button type="button" class="v3-preset-btn ${v3State.staffCompareChartType === 'bar' ? 'active' : ''}" data-staff-chart-type="bar">Biểu đồ Cột</button>
              <button type="button" class="v3-preset-btn ${v3State.staffCompareChartType === 'line' ? 'active' : ''}" data-staff-chart-type="line">Biểu đồ Đường (Theo ngày)</button>
            </div>
          </div>
        </div>
        <div style="height: 360px; position: relative;">
          <canvas id="v3-staff-compare-canvas"></canvas>
        </div>
      </section>
    `;

    destroyChart('staffCompare');
    const canvas = document.getElementById('v3-staff-compare-canvas');
    if (canvas && typeof Chart !== 'undefined') {
      const m1 = v3State.staffCompareMetric1;
      const m2 = v3State.staffCompareMetric2;
      const valOf = (cp, m) => {
        if (m === 'views') return cp.curr.views || 0;
        if (m === 'growth') return cp.viewsGrowthPct || 0;
        if (m === 'netSubs') return cp.curr.netSubs || 0;
        if (m === 'watchHours') return cp.curr.watchHours || 0;
        if (m === 'revenue') return cp.curr.estimatedRevenue || 0;
        if (m === 'videos') return cp.curr.videosPublished || 0;
        return 0;
      };
      const labelOf = {
        views: 'Lượt xem (Views)',
        growth: '% Tăng trưởng Views',
        netSubs: 'Sub ròng',
        watchHours: 'Giờ xem [Analytics]',
        revenue: 'Doanh thu USD [Analytics]',
        videos: 'Video đăng'
      };

      if (v3State.staffCompareChartType === 'line') {
        const days = snap.win.days;
        const labels = days.map(d => d.slice(8, 10) + '/' + d.slice(5, 7));
        const topStaff = [...filtered].sort((a, b) => valOf(b, m1) - valOf(a, m1)).slice(0, 5);
        const datasets = topStaff.map((cp, idx) => {
          const color = COMPARE_LINE_COLORS[idx % COMPARE_LINE_COLORS.length];
          const dKey = (m1 === 'watchHours' || m1 === 'revenue' || m1 === 'netSubs') ? m1 : 'views';
          const series = days.map(d => {
            const pt = cp.curr.dailyMap.get(d);
            return pt ? pt[dKey] : 0;
          });
          return {
            label: `${cp.meta.employeeName} — ${cp.meta.title}`,
            data: series,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 2.2,
            pointRadius: 2,
            tension: 0.3
          };
        });
        chartInstances['staffCompare'] = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#CBD5E1' } } },
            scales: {
              x: { ticks: { color: '#94A3B8', maxTicksLimit: 14 }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.06)' } }
            }
          }
        });
      } else {
        const sortedStaff = [...filtered].sort((a, b) => valOf(b, m1) - valOf(a, m1));
        const labels = sortedStaff.map(cp => `${cp.meta.employeeName} (${cp.meta.title.slice(0, 14)})`);
        const datasets = [
          {
            label: labelOf[m1] || m1,
            data: sortedStaff.map(cp => valOf(cp, m1)),
            backgroundColor: sortedStaff.map(cp => cp.meta.teamColor + 'CC'),
            borderColor: sortedStaff.map(cp => cp.meta.teamColor),
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: 'y'
          }
        ];
        if (m2 && m2 !== 'none' && m2 !== m1) {
          datasets.push({
            label: labelOf[m2] || m2,
            data: sortedStaff.map(cp => valOf(cp, m2)),
            type: 'line',
            borderColor: '#F8FAFC',
            backgroundColor: '#F8FAFC',
            borderWidth: 2,
            pointRadius: 3.5,
            yAxisID: 'y1'
          });
        }
        chartInstances['staffCompare'] = new Chart(canvas.getContext('2d'), {
          type: 'bar',
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#CBD5E1' } } },
            scales: {
              x: { ticks: { color: '#CBD5E1', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { position: 'left', ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.06)' } },
              ...(m2 && m2 !== 'none' && m2 !== m1 ? {
                y1: { position: 'right', ticks: { color: '#F8FAFC' }, grid: { drawOnChartArea: false } }
              } : {})
            }
          }
        });
      }
    }

    document.getElementById('v3-staff-cmp-team')?.addEventListener('change', e => {
      v3State.staffTeamFilter = e.target.value;
      renderStaffPage(snap);
    });
    document.getElementById('v3-staff-cmp-m1')?.addEventListener('change', e => {
      v3State.staffCompareMetric1 = e.target.value;
      renderStaffPage(snap);
    });
    document.getElementById('v3-staff-cmp-m2')?.addEventListener('change', e => {
      v3State.staffCompareMetric2 = e.target.value;
      renderStaffPage(snap);
    });
    body.querySelectorAll('[data-staff-chart-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.staffCompareChartType = btn.getAttribute('data-staff-chart-type');
        renderStaffPage(snap);
      });
    });
  }

  function renderStaffMatrixTab(body, snap) {
    const demo = core().DEMO_STORE;
    const rollups = (demo && demo.periodRollups) || [];
    const gran = v3State.staffMatrixGranularity;
    const metric = v3State.staffMatrixMetric;

    let timeKeys = [];
    if (gran === 'month') {
      timeKeys = ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05'];
    } else if (gran === 'quarter') {
      timeKeys = ['2026-Q4', '2026-Q3', '2026-Q2', '2026-Q1', '2025-Q4'];
    } else {
      timeKeys = snap.win.days.slice(-10).reverse();
    }

    // Build cell values per (channelId, tKey)
    const matrixRows = snap.channelPairs.map(cp => {
      const cells = timeKeys.map(tk => {
        if (gran === 'day') {
          const pt = cp.curr.dailyMap.get(tk);
          if (!pt) return null;
          if (metric === 'views') return pt.views;
          if (metric === 'watchHours') return pt.watchHours;
          if (metric === 'netSubs') return pt.netSubs;
          if (metric === 'revenue') return pt.revenue;
          return pt.views;
        } else {
          const r = rollups.find(x => x.entity_type === 'channel' && x.entity_id === cp.id && x.period_key === tk);
          if (!r || !r.metrics) return null;
          if (metric === 'views') return cp.curr.views !== null ? r.metrics.views : null;
          if (metric === 'watchHours') return cp.curr.hasAnalytics ? r.metrics.estimatedHoursWatched : null;
          if (metric === 'netSubs') return cp.curr.netSubs !== null ? r.metrics.netSubscribers : null;
          if (metric === 'revenue') return cp.curr.hasMonetary ? r.metrics.estimatedRevenue : null;
          return r.metrics.views;
        }
      });
      const rowTotal = cells.some(v => v !== null)
        ? cells.reduce((s, v) => s + (v || 0), 0)
        : null;
      return { cp, cells, rowTotal };
    });

    // Column min/max for column-normalized heatmap
    const colStats = timeKeys.map((_, colIdx) => {
      const vals = matrixRows.map(r => r.cells[colIdx]).filter(v => v !== null && v !== undefined);
      if (!vals.length) return { min: 0, max: 0 };
      return { min: Math.min(...vals), max: Math.max(...vals) };
    });

    function fmtCell(val) {
      if (val === null || val === undefined) return '—';
      if (metric === 'revenue') return fmtMoney(val);
      if (metric === 'watchHours') return fmtInt(val) + 'h';
      return fmtInt(val);
    }

    body.innerHTML = `
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-grid-line" style="color:#38BDF8;"></i>
              Ma trận đối soát 15 Nhân viên × Thời gian (Chuẩn hóa Heatmap theo từng cột kỳ)
            </div>
            <div class="v3-panel-subtitle">
              Ô đậm nhất trong mỗi cột là người dẫn đầu kỳ đó; hàng cuối đối soát chính xác tổng 15 Nhân viên = Tổng công ty
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <div class="v3-preset-group">
              <button type="button" class="v3-preset-btn ${gran === 'month' ? 'active' : ''}" data-mat-gran="month">Theo Tháng</button>
              <button type="button" class="v3-preset-btn ${gran === 'quarter' ? 'active' : ''}" data-mat-gran="quarter">Theo Quý</button>
              <button type="button" class="v3-preset-btn ${gran === 'day' ? 'active' : ''}" data-mat-gran="day">Theo Ngày (10 ngày)</button>
            </div>
            <select id="v3-mat-metric-select" class="v3-select">
              <option value="views" ${metric === 'views' ? 'selected' : ''}>Chỉ số: Lượt xem (Views)</option>
              <option value="netSubs" ${metric === 'netSubs' ? 'selected' : ''}>Chỉ số: Sub ròng (Net Subs)</option>
              <option value="watchHours" ${metric === 'watchHours' ? 'selected' : ''}>Chỉ số: Giờ xem [Analytics]</option>
              <option value="revenue" ${metric === 'revenue' ? 'selected' : ''}>Chỉ số: Doanh thu [Analytics]</option>
            </select>
          </div>
        </div>

        <div class="v3-table-wrap">
          <table class="v3-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nhân viên</th>
                <th>Team</th>
                <th>Kênh</th>
                <th class="num">Tổng các cột</th>
                ${timeKeys.map(tk => `
                  <th class="num">
                    ${esc(tk)}
                    ${(tk === '2026-10' || tk === '2026-Q4') ? `<div style="font-size:9.5px;color:#F59E0B;">[Chưa trọn kỳ]</div>` : ''}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${matrixRows.map((row, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${esc(row.cp.meta.employeeName)}</strong></td>
                  <td>
                    <span class="v3-team-dot" style="background:${row.cp.meta.teamColor};"></span>
                    <span style="font-size:12px;">${esc(row.cp.meta.teamName)}</span>
                  </td>
                  <td>${esc(row.cp.meta.title)}</td>
                  <td class="num"><strong>${fmtCell(row.rowTotal)}</strong></td>
                  ${row.cells.map((val, cIdx) => {
      const st = colStats[cIdx];
      let bg = 'transparent';
      if (val !== null && st.max > st.min) {
        const ratio = (val - st.min) / (st.max - st.min);
        const alpha = (0.04 + ratio * 0.22).toFixed(2);
        bg = `rgba(56, 189, 248, ${alpha})`;
      }
      const isMax = val !== null && val === st.max && st.max > st.min;
      return `<td class="num" style="background:${bg};${isMax ? 'font-weight:800;color:#38BDF8;' : ''}">${fmtCell(val)}</td>`;
    }).join('')}
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">TỔNG CỘNG ĐỐI SOÁT (15 NHÂN VIÊN = TOÀN CÔNG TY)</td>
                <td class="num">
                  ${fmtCell(matrixRows.some(r => r.rowTotal !== null) ? matrixRows.reduce((s, r) => s + (r.rowTotal || 0), 0) : null)}
                </td>
                ${timeKeys.map((_, cIdx) => {
      const vals = matrixRows.map(r => r.cells[cIdx]).filter(v => v !== null);
      const colSum = vals.length ? vals.reduce((s, v) => s + v, 0) : null;
      return `<td class="num">${fmtCell(colSum)}</td>`;
    }).join('')}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;

    body.querySelectorAll('[data-mat-gran]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.staffMatrixGranularity = btn.getAttribute('data-mat-gran');
        renderStaffPage(snap);
      });
    });

    document.getElementById('v3-mat-metric-select')?.addEventListener('change', e => {
      v3State.staffMatrixMetric = e.target.value;
      renderStaffPage(snap);
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

    // Item 4 & 6: Block 3 ("Xu hướng một team") has its own reference period toggle (prev / prev_quarter / yoy)
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
      compareMode: activeSingleCmp === 'prev' ? 'prev_exact' : activeSingleCmp
    });
    const selTeamChannelsMeta = snap.channelsMeta.filter(m => m.teamId === selectedTeam.id);
    const singlePrevChMetrics = selTeamChannelsMeta.map(m => computeChannelWindowMetrics(m, singleWin.prevStart, singleWin.prevEnd, snap.scenarioId));
    const singleTeamPrevAgg = aggregateChannelMetricsList(singlePrevChMetrics, singleWin.prevDays);

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
      if (m === 'netSubs') return val > 0 ? '+' + fmtInt(val) : (val < 0 ? '−' + fmtInt(Math.abs(val)) : '0');
      return fmtInt(val);
    };
    const singleCurrTotal = getTeamMetricVal(selectedTeam.curr, singleMetric);
    const singlePrevTotal = getTeamMetricVal(singleTeamPrevAgg, singleMetric);
    const singleDiffVal = (singleCurrTotal !== null && singlePrevTotal !== null) ? (singleCurrTotal - singlePrevTotal) : null;
    const singleDiffFormatted = singleDiffVal === null
      ? '—'
      : (singleDiffVal > 0 ? '+' : (singleDiffVal < 0 ? '−' : '')) +
      (singleMetric === 'revenue' ? fmtMoney(Math.abs(singleDiffVal)) : fmtInt(Math.abs(singleDiffVal)));
    const singleDiffPct = (singleDiffVal !== null && singlePrevTotal && Math.abs(singlePrevTotal) > 0)
      ? ((singleDiffVal / Math.abs(singlePrevTotal)) * 100)
      : null;
    const singleDiffColorClass = singleDiffPct === null || Math.abs(singleDiffPct) < 2
      ? 'flat'
      : (singleDiffVal > 0 ? 'up' : 'down');

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
                  <div style="display:inline-flex;flex-direction:column;align-items:flex-end;gap:3px;">
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
                } else if (tp.id === slowestTeamId) {
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

      <!-- 2. TABLE/CHART A: FULL-WIDTH 3-TEAM TREND CHART (With its own independent period selector) -->
      <section class="v3-panel" id="v3-team-chart-a-panel" style="padding-bottom:10px;" data-chart-period-mode="${isCustomChartPeriod ? 'custom' : 'global'}" data-chart-team-views='${esc(JSON.stringify(chartTeamViewsSummary))}'>
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
                <div class="v3-chart-custom-dates" id="v3-tm-chart-custom-wrap">
                  <input type="date" id="v3-tm-chart-start" class="v3-select v3-select-sm v3-chart-date-input" value="${chartWin.start}" min="2025-01-01" max="2026-10-26" aria-label="Từ ngày">
                  <span class="v3-chart-date-sep">→</span>
                  <input type="date" id="v3-tm-chart-end" class="v3-select v3-select-sm v3-chart-date-input" value="${chartWin.end}" min="2025-01-01" max="2026-10-26" aria-label="Đến ngày">
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

      <!-- 3. TABLE/CHART B: SINGLE-TEAM PERIOD COMPARISON ("Xu hướng một team") -->
      <section class="v3-panel" id="v3-single-team-card" style="padding-bottom:10px;">
        <div class="v3-panel-header" style="margin-bottom:8px;gap:6px;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap;">
            <div class="v3-panel-title" style="white-space:nowrap;">
              <i class="ri-focus-2-line" style="color:${selectedTeam.color};"></i>
              Xu hướng một team <span class="v3-panel-date-tag">(${currRangeFullVN})</span>
            </div>
            ${renderTeamSelectorChips('v3-single-team-selector', 'Chọn team cho Xu hướng một team')}
            ${singleWin.isPartialQuarter ? `<span class="v3-badge partial">Chưa trọn quý (${singleWin.dayCount}/${singleWin.quarterCalendarDays} ngày) · So với ${singleWin.dayCount} ngày đầu của quý đối chứng</span>` : ''}
          </div>

          <div style="display:flex;align-items:center;gap:5px;flex-wrap:nowrap;">
            <div class="v3-preset-group" role="group" aria-label="Kỳ đối chứng Xu hướng một team">
              <button type="button" class="v3-preset-btn ${activeSingleCmp === 'prev' ? 'active' : ''}" data-tm-cmp="prev">Kỳ trước</button>
              <button type="button" class="v3-preset-btn ${activeSingleCmp === 'prev_quarter' ? 'active' : ''}" data-tm-cmp="prev_quarter">Quý trước</button>
              <button type="button" class="v3-preset-btn ${activeSingleCmp === 'yoy' ? 'active' : ''}" data-tm-cmp="yoy" ${!snap.systemCurr.allHaveYoY ? 'disabled' : ''}>Cùng kỳ năm ngoái</button>
            </div>
            <div class="v3-preset-group" role="group" aria-label="Chỉ số xu hướng 1 team">
              <button type="button" class="v3-preset-btn ${singleMetric === 'views' ? 'active' : ''}" data-tm-single-metric="views">Views</button>
              <button type="button" class="v3-preset-btn ${singleMetric === 'netSubs' ? 'active' : ''}" data-tm-single-metric="netSubs" ${selectedTeam.curr.netSubs === null ? 'disabled' : ''}>Sub ròng</button>
              <button type="button" class="v3-preset-btn ${singleMetric === 'revenue' ? 'active' : ''}" data-tm-single-metric="revenue" ${selectedTeam.curr.monetaryCount === 0 ? 'disabled' : ''}>Doanh thu</button>
            </div>
          </div>
        </div>

        <!-- Summary Strip: Tổng kỳ này, Tổng kỳ đối chứng, Chênh lệch và % -->
        <div class="v3-single-team-summary-strip" id="v3-single-team-summary">
          <div class="v3-st-summary-item">
            <span class="v3-st-summary-label">
              Tổng kỳ này (${currRangeShort}${singleWin.isPartialQuarter ? ` · Chưa trọn quý (${singleWin.dayCount}/${singleWin.quarterCalendarDays} ngày)` : ''})
            </span>
            <strong class="v3-st-summary-val" data-st-curr-total="${singleCurrTotal ?? ''}" style="color:${selectedTeam.color};">
              ${fmtSingleMetricVal(singleCurrTotal, singleMetric)}
            </strong>
          </div>
          <div class="v3-st-summary-item">
            <span class="v3-st-summary-label">
              Tổng kỳ đối chứng (${esc(singleWin.compareModeName)}: ${esc(singleWin.compareRangeShort)}${(singleWin.isPartialQuarter || activeSingleCmp === 'prev_quarter') ? ` · ${singleWin.dayCount} ngày đầu` : ''})
            </span>
            <strong class="v3-st-summary-val" data-st-prev-total="${singlePrevTotal ?? ''}">
              ${fmtSingleMetricVal(singlePrevTotal, singleMetric)}
            </strong>
          </div>
          <div class="v3-st-summary-item">
            <span class="v3-st-summary-label">Chênh lệch (${esc(singleMetricLabelMap[singleMetric])})</span>
            <strong class="v3-st-summary-val v3-st-diff ${singleDiffColorClass}">
              ${singleDiffFormatted}
            </strong>
          </div>
          <div class="v3-st-summary-item">
            <span class="v3-st-summary-label">% Thay đổi (${esc(singleWin.compareShortTag)})</span>
            <div>${fmtDeltaBadge(singleCurrTotal, singlePrevTotal, singleMetric === 'revenue')}</div>
          </div>
        </div>

        <div style="height:190px;position:relative;">
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
                    bottomChId = byChG[byChG.length - 1].id;
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
                    } else if (cp.id === bottomChId) {
                      tagHtml = `<span class="v3-badge lowest" data-channel-growth-badge="slowest">Chậm nhất</span>`;
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
                      <td style="white-space:nowrap;">${esc(cp.meta.employeeName)}</td>
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

    // Render 3-Team Line Chart (no legend, Y starts at 0, Vietnamese ticks, direct end-of-line label "tên team · tổng kỳ X", minGap >= 16px)
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
          endLabel: `${tp.name} · tổng kỳ ${periodTotalStr}`,
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
          ctx.font = '700 11.5px Inter, system-ui, sans-serif';
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
          layout: { padding: { right: 205, top: 10, bottom: 0 } },
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
      const dayLabels = singleWin.days.map((_, idx) => `Ngày ${idx + 1}`);
      const currData = singleWin.days.map((_, idx) => (currSeries[idx] ? currSeries[idx][singleMetric] : null));
      const prevData = singleWin.days.map((_, idx) => (prevSeries[idx] ? prevSeries[idx][singleMetric] : null));

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
              tension: 0.3
            },
            {
              label: `${singleWin.compareModeName} (${singleWin.compareRangeShort})`,
              data: prevData,
              borderColor: '#94A3B8',
              borderDash: [6, 4],
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 1.8,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 4, bottom: 0 } },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'end',
              labels: {
                color: '#CBD5E1',
                boxWidth: 24,
                boxHeight: 2,
                usePointStyle: false,
                font: { size: 11.5, weight: '600' }
              }
            },
            tooltip: {
              callbacks: {
                title: function (items) {
                  const idx = items && items[0] ? items[0].dataIndex : 0;
                  const dCurr = singleWin.days[idx];
                  const dPrev = singleWin.prevDays[idx];
                  return `Ngày thứ ${idx + 1} của kỳ (${formatIsoToVN(dCurr)} vs ${formatIsoToVN(dPrev)})`;
                },
                label: function (ctx) {
                  const idx = ctx.dataIndex;
                  const isCurr = ctx.datasetIndex === 0;
                  const realIso = isCurr ? singleWin.days[idx] : singleWin.prevDays[idx];
                  const prefix = isCurr ? 'Kỳ này' : singleWin.compareModeName;
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
        v3State.teamSingleCompareMode = btn.getAttribute('data-tm-cmp');
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

  function openGuideSection(anchorId) {
    const c = core();
    if (c.switchView) {
      c.switchView(anchorId.startsWith('guide-') ? anchorId : 'view-report-guide');
    }
  }

  function init() {
    syncNetworkMenuVisibility();
    document.addEventListener('click', (e) => {
      if (v3State.channelPickerOpen && !e.target.closest('#v3-channel-search-picker')) {
        v3State.channelPickerOpen = false;
        const menu = document.getElementById('v3-channel-picker-menu');
        const btn = document.getElementById('v3-channel-picker-btn');
        if (menu) menu.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
    // Pre-render Guide page so #guide-... anchors exist in DOM at all times
    renderGuidePage();
    refreshActiveView();
  }

  window.__REPORT_V3__ = {
    init,
    onViewSwitch,
    refreshActiveView,
    computeFullDatasetSnapshot,
    getState: () => v3State,
    setScenario,
    setChannelMode,
    toggleDeepAnalytics,
    toggleProjectConfigured,
    setStaffTab,
    openGuideSection
  };

  if (window.__BGMEDIA_CORE__) {
    init();
  }
})();
