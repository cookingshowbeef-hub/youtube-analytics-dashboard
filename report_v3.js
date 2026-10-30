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
    'view-report-team':     { tag: 'Trang 2 · Theo Team', question: 'Team nào đang tốt nhất, và vì sao?' },
    'view-report-channel':  { tag: 'Trang 3 · Theo Kênh', question: 'Kênh này đang đi lên hay đi xuống?' },
    'view-report-staff':    { tag: 'Trang 4 · Theo Nhân viên', question: 'Ai đang tăng, ai đang chậm?' },
    'view-report-project':  { tag: 'Trang 5 · Theo Dự án', question: 'Dự án nội dung nào đang hiệu quả?' },
    'view-report-network':  { tag: 'Trang 6 · Network MCN', question: 'Mạng lưới kênh đóng góp thế nào?' },
    'view-report-guide':    { tag: 'Trang 7 · Từ điển & Quy chuẩn', question: 'Con số này nghĩa là gì, lấy từ đâu?' }
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
    teamChartMetric: 'views',
    // Page 3 (Channel)
    channelMode: 'single',  // 'single' | 'compare'
    selectedChannelId: 'UCSJ4gkVC6NrvII8umztf0Ow',
    channelChartMetric: 'views',
    selectedVideoIdForRetention: null,
    deepAnalyticsOpen: true,
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
      try { chartInstances[key].destroy(); } catch (e) {}
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
  function getPeriodWindow() {
    let start = v3State.startDate;
    let end = v3State.endDate;
    let label = '30 ngày (27/09 – 26/10/2026)';
    let isPartialPeriod = false;

    if (v3State.preset === '7d') {
      start = '2026-10-20';
      end = '2026-10-26';
      label = '7 ngày (20/10 – 26/10/2026)';
    } else if (v3State.preset === '30d' || v3State.preset === '28d') {
      start = '2026-09-27';
      end = '2026-10-26';
      label = '30 ngày (27/09 – 26/10/2026)';
    } else if (v3State.preset === 'month') {
      if (v3State.monthKey === '2026-10') {
        start = '2026-10-01'; end = '2026-10-26'; isPartialPeriod = true;
        label = 'Tháng 10/2026 (26/31 ngày · đến 26/10)';
      } else if (v3State.monthKey === '2026-09') {
        start = '2026-09-01'; end = '2026-09-30';
        label = 'Tháng 09/2026 (30/30 ngày)';
      } else {
        start = '2026-08-01'; end = '2026-08-31';
        label = 'Tháng 08/2026 (31/31 ngày)';
      }
    } else if (v3State.preset === 'quarter') {
      if (v3State.quarterKey === '2026-Q4') {
        start = '2026-10-01'; end = '2026-10-26'; isPartialPeriod = true;
        label = 'Quý 4/2026 (26/92 ngày · đến 26/10)';
      } else if (v3State.quarterKey === '2026-Q3') {
        start = '2026-07-01'; end = '2026-09-30';
        label = 'Quý 3/2026 (92/92 ngày)';
      } else {
        start = '2026-04-01'; end = '2026-06-30';
        label = 'Quý 2/2026 (91/91 ngày)';
      }
    } else {
      const customDays = listIsoDays(start, end).length;
      label = `Tùy chỉnh (${customDays} ngày: ${formatIsoToVN(start)} – ${formatIsoToVN(end)})`;
    }

    const days = listIsoDays(start, end);
    const dayCount = Math.max(1, days.length);

    let prevStart, prevEnd, compareLabel;
    if (v3State.compareMode === 'yoy') {
      prevStart = shiftIsoYear(start, -1);
      prevEnd = shiftIsoYear(end, -1);
      compareLabel = `Cùng kỳ năm ngoái (${formatIsoToVN(prevStart)} – ${formatIsoToVN(prevEnd)})`;
    } else {
      prevEnd = shiftIsoDays(start, -1);
      prevStart = shiftIsoDays(prevEnd, -(dayCount - 1));
      compareLabel = `Kỳ liền trước (${formatIsoToVN(prevStart)} – ${formatIsoToVN(prevEnd)})`;
    }

    return { start, end, dayCount, days, prevStart, prevEnd, prevDays: listIsoDays(prevStart, prevEnd), label, compareLabel, isPartialPeriod };
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
      let lastPubIso = snapProfile ? snapProfile.last_video_published_pt : null;
      if (!lastPubIso && rawVids.length) {
        lastPubIso = rawVids.map(v => (v.published_at || '').slice(0, 10)).filter(Boolean).sort().slice(-1)[0];
      }
      const demoSubs = snapProfile ? snapProfile.subscriber_count_public : ((ch.statistics && ch.statistics.subscriberCount) || 0);
      const subStep = snapProfile ? snapProfile.sub_rounding_step : 1000;
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
            revenue: null
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
        viewsWithMon: dayHasMon ? v : 0
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
      chResults.forEach(c => {
        const pt = c.dailyMap.get(dayIso);
        if (pt) {
          dViews += (pt.views || 0);
          dWatchHours += (pt.watchHours || 0);
          dNetSubs += (pt.netSubs || 0);
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
        revenue: dHasRev ? Number((dRevCents / 100).toFixed(2)) : null
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
      const daysSinceLastUpload = Math.max(0, Math.round((new Date('2026-10-26T00:00:00Z') - new Date(curr.meta.lastPublishedPt + 'T00:00:00Z')) / 86400000));
      return {
        id: curr.channelId,
        meta: curr.meta,
        curr,
        prev,
        viewsGrowthPct,
        revGrowthPct,
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
        leader: t.leader || 'Trưởng nhóm',
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

    // Item 1: Hide "Kênh đang xem" picker on all company-level pages (Tổng quan, Team, Nhân viên, Dự án, Network, Hướng dẫn).
    // Only show it on Theo kênh (#view-report-channel) or non-report pages.
    const pickerWrap = document.getElementById('channel-picker-wrapper');
    if (pickerWrap) {
      pickerWrap.style.display = (activeViewId === 'view-report-channel') ? 'block' : 'none';
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

    // Determine active scope channels (15 for company, 5 for team, 1..5 for channel)
    let scopeLabel = '3 Team · 15 kênh';
    let scopeCurr = snap.systemCurr;
    if (activeViewId === 'view-report-team') {
      const tp = snap.teamPairs.find(t => t.id === v3State.selectedTeamId) || snap.teamPairs[0];
      if (tp) {
        scopeLabel = `${tp.name} · 5 kênh`;
        scopeCurr = tp.curr;
      }
    } else if (activeViewId === 'view-report-channel' && v3State.channelMode === 'single') {
      const cp = snap.channelPairs.find(c => c.id === v3State.selectedChannelId) || snap.channelPairs[0];
      if (cp) {
        scopeLabel = `Kênh: ${cp.meta.title} (${cp.meta.teamName})`;
      }
    }

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
            <span class="v3-scope-sep">·</span>
            <span class="v3-scope-text"><strong>${esc(scopeLabel)}</strong></span>
            <span class="v3-scope-sep">·</span>
            <span class="v3-scope-text">${availText} ${helpBadge('guide-timezone', 'Múi giờ báo cáo chuẩn Pacific Time (PT), đồng bộ với YouTube Analytics (trễ 48–72h)')}</span>
          </div>
          <div class="v3-scope-right">
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
            <span class="v3-day-count-tag" title="${esc(snap.win.label)}">${snap.win.dayCount} ngày · ${formatIsoToShortVN(snap.win.start)}–${formatIsoToShortVN(snap.win.end)}</span>
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
              ${!scopeCurr.allHaveYoY ? '<i class="ri-lock-line"></i> ' : ''}Cùng kỳ năm ngoái (${scopeCurr.yoyCount}/${scopeCurr.totalChannels})
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind Shared Header Events
    headerEl.querySelectorAll('[data-v3-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextPreset = btn.getAttribute('data-v3-preset');
        v3State.preset = nextPreset;
        if (nextPreset === '7d') {
          v3State.startDate = '2026-10-20';
          v3State.endDate = '2026-10-26';
        } else if (nextPreset === '30d') {
          v3State.startDate = '2026-09-27';
          v3State.endDate = '2026-10-26';
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
  // Question: "Kênh này đang đi lên hay đi xuống?" (Single Mode & 2-5 Compare Mode)
  // =========================================================================
  function renderChannelPage(snap) {
    const root = document.getElementById('v3-channel-root');
    if (!root) return;

    const c = core();
    const demo = c.DEMO_STORE;
    const cp = snap.channelPairs.find(x => x.id === v3State.selectedChannelId) || snap.channelPairs[0];
    if (cp) v3State.selectedChannelId = cp.id;

    root.innerHTML = `
      <div class="v3-tab-bar">
        <button type="button" class="v3-tab-btn ${v3State.channelMode === 'single' ? 'active' : ''}" data-ch-mode="single">
          <i class="ri-tv-line"></i> Chế độ 1: Xem chi tiết 1 kênh
        </button>
        <button type="button" class="v3-tab-btn ${v3State.channelMode === 'compare' ? 'active' : ''}" data-ch-mode="compare">
          <i class="ri-scales-3-line"></i> Chế độ 2: So sánh 2–5 kênh đối đầu
        </button>
      </div>
      <div id="v3-channel-mode-body"></div>
    `;

    root.querySelectorAll('[data-ch-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.channelMode = btn.getAttribute('data-ch-mode');
        renderSharedHeader(snap, 'view-report-channel');
        renderChannelPage(snap);
      });
    });

    const body = document.getElementById('v3-channel-mode-body');
    if (v3State.channelMode === 'compare') {
      renderChannelCompareMode(body, snap);
    } else {
      renderChannelSingleMode(body, snap, cp, demo);
    }
    bindHelpLinks(root);
  }

  function renderChannelSingleMode(body, snap, cp, demo) {
    const curr = cp.curr;
    const prev = cp.prev;
    const meta = cp.meta;

    // Fetch 10 sample videos for this channel from DEMO_STORE.videoSummaryMap + DATA_STORE
    const rawVids = (core().DATA_STORE && core().DATA_STORE.getVideos(cp.id)) || [];
    const periodType = snap.win.dayCount <= 7 ? 'metrics_7d' : (snap.win.dayCount <= 31 ? 'metrics_28d' : 'metrics');

    const enrichedVideos = rawVids.map(v => {
      const vs = (demo && demo.getVideoSummary) ? demo.getVideoSummary(v.id) : null;
      const pMetrics = vs ? (vs[periodType] || vs.metrics_28d || vs.metrics) : null;
      const periodViews = (curr.hasAnalytics && pMetrics && pMetrics.views !== undefined)
        ? pMetrics.views
        : (curr.views !== null && vs && vs.metrics_28d ? vs.metrics_28d.views : 0);
      const periodHours = (curr.hasAnalytics && pMetrics && pMetrics.estimatedHoursWatched !== undefined)
        ? pMetrics.estimatedHoursWatched
        : null;
      const periodRev = (curr.hasMonetary && pMetrics && pMetrics.estimatedRevenue !== undefined)
        ? pMetrics.estimatedRevenue
        : null;
      return {
        ...v,
        vs,
        periodViews,
        periodHours,
        periodRev,
        viewsFirst7d: vs ? vs.views_first_7d : null,
        viewsFirst7dStatus: vs ? vs.views_first_7d_status : 'before_snapshot_start',
        likesHidden: vs ? vs.likes_hidden : false,
        commentsDisabled: vs ? vs.comments_disabled : false
      };
    }).sort((a, b) => (b.periodViews || 0) - (a.periodViews || 0));

    const sampleViewsSum = enrichedVideos.reduce((s, v) => s + (v.periodViews || 0), 0);
    const otherContentViews = curr.views !== null ? Math.max(0, curr.views - sampleViewsSum) : null;
    const sampleSharePct = (curr.views && curr.views > 0) ? ((sampleViewsSum / curr.views) * 100).toFixed(1) : '0.0';

    if (!v3State.selectedVideoIdForRetention || !enrichedVideos.some(v => v.id === v3State.selectedVideoIdForRetention)) {
      const firstActive = enrichedVideos.find(v => demo && demo.getVideoRetention && demo.getVideoRetention(v.id));
      v3State.selectedVideoIdForRetention = firstActive ? firstActive.id : (enrichedVideos[0] ? enrichedVideos[0].id : null);
    }

    // Channel MoM & QoQ rollups
    const rollups = (demo && demo.periodRollups) || [];
    const chRollupsMonth = ['2026-10', '2026-09', '2026-08', '2026-07']
      .map(pk => rollups.find(r => r.entity_type === 'channel' && r.entity_id === cp.id && r.period_key === pk))
      .filter(Boolean);
    const chRollupsQuarter = ['2026-Q4', '2026-Q3', '2026-Q2', '2026-Q1']
      .map(pk => rollups.find(r => r.entity_type === 'channel' && r.entity_id === cp.id && r.period_key === pk))
      .filter(Boolean);

    // Breakdowns
    const bdKey = snap.win.dayCount <= 7 ? 'last_7_days' : 'last_28_days';
    const breakdowns = (demo && demo.getChannelBreakdowns) ? demo.getChannelBreakdowns(cp.id, bdKey) : null;

    body.innerHTML = `
      <!-- 1. CHANNEL PROFILE HEADER -->
      <section class="v3-panel" style="padding:14px 18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <img src="${esc(meta.avatar)}" alt="${esc(meta.title)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid ${meta.teamColor};" onerror="this.style.display='none'">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <h2 style="font-size:18px;font-weight:800;color:var(--text-main);margin:0;">${esc(meta.title)}</h2>
                <span style="font-size:12.5px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;">${esc(meta.handle)}</span>
                <span class="v3-badge" style="background:${meta.teamColor}22;color:${meta.teamColor};border:1px solid ${meta.teamColor}55;">
                  <span class="v3-team-dot" style="background:${meta.teamColor};"></span> ${esc(meta.teamName)}
                </span>
                <span class="v3-badge ${curr.hasAnalytics ? 'analytics' : 'warn'}">
                  ${curr.hasAnalytics ? '[Đã kết nối Analytics]' : `[Trạng thái: ${curr.analyticsStatus}]`}
                </span>
              </div>
              <div style="font-size:12.5px;color:var(--text-muted);margin-top:4px;">
                Người phụ trách (PIC): <strong style="color:var(--text-main);">${esc(meta.employeeName)} (${esc(meta.employeeId)})</strong> •
                Lần đăng gần nhất: <strong>${formatIsoToVN(meta.lastPublishedPt)} (${cp.daysSinceLastUpload} ngày trước)</strong> •
                Quy mô kênh: <strong>${fmtInt(meta.subscribers)} subscribers</strong> (bước làm tròn: ${fmtInt(meta.subRoundingStep)})
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <label for="v3-single-channel-select" style="font-size:12px;color:var(--text-muted);font-weight:600;">Đổi kênh:</label>
            <select id="v3-single-channel-select" class="v3-select">
              ${snap.channelPairs.map(item => `
                <option value="${item.id}" ${item.id === cp.id ? 'selected' : ''}>
                  ${esc(item.meta.title)} — ${esc(item.meta.employeeName)} (${esc(item.meta.teamName)})
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </section>

      <!-- 2. 5 CHANNEL KPIs -->
      <section class="v3-kpi-grid">
        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Lượt xem kênh (Views)</span>
            <span class="v3-badge ${curr.hasAnalytics ? 'analytics' : 'muted'}">${curr.hasAnalytics ? '[Analytics]' : '[Snapshot]'}</span>
          </div>
          <div class="v3-kpi-value">${curr.views !== null ? fmtInt(curr.views) : '—'}</div>
          <div class="v3-kpi-delta-row">${fmtDeltaBadge(curr.views, prev.views)}</div>
          <div class="v3-kpi-sub">Kỳ so sánh: ${prev.views !== null ? fmtInt(prev.views) : '—'} views</div>
        </div>

        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Sub ròng (Net Subs) ${helpBadge('guide-sub-rounding', 'YouTube làm tròn sub công khai còn 3 chữ số có nghĩa. Khi mức tăng nhỏ hơn bước làm tròn, chế độ Snapshot hiện —')}</span>
            <span class="v3-badge muted">Bước: ${fmtInt(meta.subRoundingStep)}</span>
          </div>
          <div class="v3-kpi-value">${curr.netSubs !== null ? (curr.netSubs > 0 ? '+' + fmtInt(curr.netSubs) : fmtInt(curr.netSubs)) : '—'}</div>
          <div class="v3-kpi-delta-row">
            ${curr.netSubs !== null ? fmtDeltaBadge(curr.netSubs, prev.netSubs) : `<span class="v3-delta flat">— Nhỏ hơn bước ${fmtInt(meta.subRoundingStep)}</span>`}
          </div>
          <div class="v3-kpi-sub">Tổng sub hiện tại: <strong>${fmtInt(meta.subscribers)}</strong></div>
        </div>

        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Video đăng & Lịch đăng</span>
            <span class="v3-badge ${cp.daysSinceLastUpload > v3State.alertUploadCycleDays ? 'warn' : 'ready'}">
              ${cp.daysSinceLastUpload > v3State.alertUploadCycleDays ? '[Chậm lịch đăng]' : '[Đúng nhịp]'}
            </span>
          </div>
          <div class="v3-kpi-value">${fmtInt(curr.videosPublished)} video</div>
          <div class="v3-kpi-delta-row">${fmtDeltaBadge(curr.videosPublished, prev.videosPublished)}</div>
          <div class="v3-kpi-sub">Đăng gần nhất: <strong>${formatIsoToVN(meta.lastPublishedPt)}</strong> (${cp.daysSinceLastUpload} ngày trước)</div>
        </div>

        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Tỷ lệ tương tác ${helpBadge('guide-engagement', 'Tỷ lệ tương tác trên tổng lượt xem trong kỳ')}</span>
            <span class="v3-badge ${curr.engagementIncludesShares ? 'analytics' : 'muted'}">${curr.engagementIncludesShares ? 'Có Shares' : 'Likes+Comments'}</span>
          </div>
          <div class="v3-kpi-value">${curr.engagementRate !== null ? curr.engagementRate.toFixed(2) + '%' : '—'}</div>
          <div class="v3-kpi-delta-row">${fmtDeltaBadge(curr.engagementRate, prev.engagementRate, false, true)}</div>
          <div class="v3-kpi-sub">Likes: ${fmtInt(curr.likes)} • Comments: ${fmtInt(curr.comments)}${curr.engagementIncludesShares ? ` • Shares: ${fmtInt(curr.shares)}` : ''}</div>
        </div>

        <div class="v3-kpi-card">
          <div class="v3-kpi-top">
            <span class="v3-kpi-label">Doanh thu & Giờ xem ${helpBadge('guide-rpm', 'Doanh thu ước tính và Thời lượng xem trung bình (AVD) từ YouTube Analytics')}</span>
            <span class="v3-badge analytics">[Analytics]</span>
          </div>
          <div class="v3-kpi-value">${curr.estimatedRevenue !== null ? fmtMoney(curr.estimatedRevenue) : '—'}</div>
          <div class="v3-kpi-delta-row">${fmtDeltaBadge(curr.estimatedRevenue, prev.estimatedRevenue, true)}</div>
          <div class="v3-kpi-sub">
            Giờ xem: <strong>${curr.watchHours !== null ? fmtInt(curr.watchHours) + 'h' : '—'}</strong> •
            AVD: <strong>${curr.avdSeconds !== null ? Math.floor(curr.avdSeconds / 60) + 'p' + String(Math.round(curr.avdSeconds % 60)).padStart(2, '0') + 's' : '—'}</strong> •
            RPM: <strong>${curr.proxyRpm !== null ? '$' + curr.proxyRpm.toFixed(2) : '—'}</strong>
          </div>
        </div>
      </section>

      <!-- 3. CHANNEL TREND CHART (Current vs Previous) -->
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-line-chart-line" style="color:${meta.teamColor};"></i>
              Biểu đồ xu hướng kênh: Kỳ này vs ${v3State.compareMode === 'yoy' ? 'Cùng kỳ năm ngoái' : 'Kỳ trước'}
            </div>
            <div class="v3-panel-subtitle">Theo dõi biến động từng ngày của kênh ${esc(meta.title)}</div>
          </div>
          <div class="v3-preset-group">
            <button type="button" class="v3-preset-btn ${v3State.channelChartMetric === 'views' ? 'active' : ''}" data-ch-metric="views">Lượt xem</button>
            <button type="button" class="v3-preset-btn ${v3State.channelChartMetric === 'watchHours' ? 'active' : ''}" data-ch-metric="watchHours" ${!curr.hasAnalytics ? 'disabled' : ''}>Giờ xem [Analytics]</button>
            <button type="button" class="v3-preset-btn ${v3State.channelChartMetric === 'revenue' ? 'active' : ''}" data-ch-metric="revenue" ${!curr.hasMonetary ? 'disabled' : ''}>Doanh thu [Analytics]</button>
          </div>
        </div>
        <div style="height: 270px; position: relative;">
          <canvas id="v3-channel-single-canvas"></canvas>
        </div>
      </section>

      <!-- 4. TOP VIDEOS IN PERIOD + VIEWS FIRST 7 DAYS -->
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-video-line" style="color:#38BDF8;"></i>
              Top Video mẫu trong kỳ & Views 7 ngày đầu (So sánh công bằng) ${helpBadge('guide-views-7d', 'Views 7 ngày đầu được chốt tại ngày thứ 7 sau ngày đăng (published_date_pt + 6 ngày). Video đăng trước khi hệ thống lưu snapshot hoặc chưa đủ 7 ngày sẽ hiển thị —')}
            </div>
            <div class="v3-panel-subtitle">
              10 video mẫu chiếm <strong>${sampleSharePct}%</strong> tổng views kỳ của kênh (${fmtInt(sampleViewsSum)} / ${fmtInt(curr.views)} views); phần còn lại thuộc danh mục video cũ (Nội dung khác: ${fmtInt(otherContentViews)} views).
            </div>
          </div>
        </div>
        <div class="v3-table-wrap">
          <table class="v3-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tiêu đề Video</th>
                <th>Ngày đăng</th>
                <th class="num">Thời lượng</th>
                <th class="num">Views kỳ</th>
                <th class="num">Views 7 ngày đầu ${helpBadge('guide-views-7d', 'Chỉ hiện số khi video có đủ 7 ngày snapshot kể từ lúc đăng')}</th>
                <th class="num">Giờ xem</th>
                <th class="num">Doanh thu</th>
                <th>Retention</th>
              </tr>
            </thead>
            <tbody>
              ${enrichedVideos.map((v, idx) => {
                let first7dHtml = '—';
                if (v.viewsFirst7d !== null && v.viewsFirst7d !== undefined) {
                  first7dHtml = `<strong>${fmtInt(v.viewsFirst7d)}</strong> <span class="v3-badge ready">[Đủ 7 ngày]</span>`;
                } else if (v.viewsFirst7dStatus === 'pending_7d') {
                  first7dHtml = `<span style="color:var(--text-muted);">—</span> <span class="v3-badge partial">[Chưa đủ 7 ngày]</span>`;
                } else if (v.viewsFirst7dStatus === 'before_snapshot_start') {
                  first7dHtml = `<span style="color:var(--text-muted);">—</span> <span class="v3-badge muted" title="Video đăng trước ngày bắt đầu lưu snapshot 31/07/2026">[Trước mốc lịch sử]</span>`;
                } else {
                  first7dHtml = `<span style="color:var(--text-muted);">—</span> <span class="v3-badge muted">[Live / 0s]</span>`;
                }
                const flags = [];
                if (v.likesHidden) flags.push(`<span class="v3-badge warn">[Ẩn like]</span>`);
                if (v.commentsDisabled) flags.push(`<span class="v3-badge warn">[Tắt bình luận]</span>`);
                const isSelectedRet = v.id === v3State.selectedVideoIdForRetention;
                return `
                  <tr class="clickable-row" data-select-retention-vid="${v.id}" style="${isSelectedRet ? 'background:rgba(56,189,248,0.08);' : ''}">
                    <td>${idx + 1}</td>
                    <td>
                      <div style="font-weight:700;color:var(--text-main);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(v.title)}">
                        ${esc(v.title)}
                      </div>
                      <div style="font-size:10.5px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;">ID: ${esc(v.id)} ${flags.join(' ')}</div>
                    </td>
                    <td>${formatIsoToVN(v.publishedAt)}</td>
                    <td class="num">${esc(v.duration)}</td>
                    <td class="num"><strong>${curr.views !== null ? fmtInt(v.periodViews) : '—'}</strong></td>
                    <td class="num">${first7dHtml}</td>
                    <td class="num">${v.periodHours !== null ? fmtInt(v.periodHours) + 'h' : '—'}</td>
                    <td class="num">${v.periodRev !== null ? fmtMoney(v.periodRev) : '—'}</td>
                    <td>
                      <button type="button" class="v3-btn ${isSelectedRet ? 'primary' : ''}" data-select-retention-vid="${v.id}" style="padding:3px 7px;font-size:10.8px;">
                        <i class="ri-pulse-line"></i> ${isSelectedRet ? 'Đang xem' : 'Retention'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">
                  Tổng 10 video mẫu (${sampleSharePct}% kênh) + Nội dung khác (${fmtInt(otherContentViews)} views = ${(100 - Number(sampleSharePct)).toFixed(1)}% kênh)
                </td>
                <td class="num">${curr.views !== null ? fmtInt(curr.views) : '—'}</td>
                <td class="num">—</td>
                <td class="num">${curr.watchHours !== null ? fmtInt(curr.watchHours) + 'h' : '—'}</td>
                <td class="num">${curr.estimatedRevenue !== null ? fmtMoney(curr.estimatedRevenue) : '—'}</td>
                <td>Khớp 100% tổng kênh</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- 5. CHANNEL MoM & QoQ TABLES -->
      <div class="v3-grid-2">
        <section class="v3-panel" style="margin-bottom:0;">
          <div class="v3-panel-header" style="margin-bottom:10px;">
            <div class="v3-panel-title"><i class="ri-calendar-line" style="color:#38BDF8;"></i> Bảng Tháng với Tháng (MoM) của kênh</div>
            <span class="v3-badge analytics">[Analytics]</span>
          </div>
          <div class="v3-table-wrap">
            <table class="v3-table">
              <thead>
                <tr>
                  <th>Tháng</th>
                  <th class="num">Views</th>
                  <th class="num">Sub ròng</th>
                  <th class="num">Giờ xem</th>
                  <th class="num">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                ${chRollupsMonth.map(r => `
                  <tr>
                    <td><strong>${esc(r.period_key)}</strong> ${!r.is_complete_period ? `<span class="v3-badge partial">[Chưa trọn kỳ]</span>` : ''}</td>
                    <td class="num">${fmtInt(r.metrics.views)}</td>
                    <td class="num">${r.metrics.netSubscribers > 0 ? '+' + fmtInt(r.metrics.netSubscribers) : fmtInt(r.metrics.netSubscribers)}</td>
                    <td class="num">${curr.hasAnalytics ? fmtInt(r.metrics.estimatedHoursWatched) + 'h' : '—'}</td>
                    <td class="num">${curr.hasMonetary ? fmtMoney(r.metrics.estimatedRevenue) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <section class="v3-panel" style="margin-bottom:0;">
          <div class="v3-panel-header" style="margin-bottom:10px;">
            <div class="v3-panel-title"><i class="ri-calendar-todo-line" style="color:#F59E0B;"></i> Bảng Quý với Quý (QoQ) của kênh</div>
            <span class="v3-badge analytics">[Analytics]</span>
          </div>
          <div class="v3-table-wrap">
            <table class="v3-table">
              <thead>
                <tr>
                  <th>Quý</th>
                  <th class="num">Views</th>
                  <th class="num">Sub ròng</th>
                  <th class="num">Giờ xem</th>
                  <th class="num">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                ${chRollupsQuarter.map(r => `
                  <tr>
                    <td><strong>${esc(r.period_key)}</strong> ${!r.is_complete_period ? `<span class="v3-badge partial">[Chưa trọn quý]</span>` : ''}</td>
                    <td class="num">${fmtInt(r.metrics.views)}</td>
                    <td class="num">${r.metrics.netSubscribers > 0 ? '+' + fmtInt(r.metrics.netSubscribers) : fmtInt(r.metrics.netSubscribers)}</td>
                    <td class="num">${curr.hasAnalytics ? fmtInt(r.metrics.estimatedHoursWatched) + 'h' : '—'}</td>
                    <td class="num">${curr.hasMonetary ? fmtMoney(r.metrics.estimatedRevenue) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- 6. COLLAPSIBLE DEEP ANALYTICS SECTION (Audience Retention + Geo/Traffic/Device) -->
      <section class="v3-panel">
        <div class="v3-panel-header" style="margin-bottom:${v3State.deepAnalyticsOpen ? '14px' : '0'};">
          <div>
            <div class="v3-panel-title">
              <i class="ri-compass-3-line" style="color:#38BDF8;"></i>
              Phân tích sâu: Giữ chân khán giả theo từng video · Địa lý · Nguồn truy cập · Thiết bị
              <span class="v3-badge analytics">[Analytics]</span>
            </div>
            <div class="v3-panel-subtitle">
              Phần chuyên sâu từ YouTube Analytics API v2 (chỉ áp dụng cho kênh đã cấp quyền OAuth Analytics)
            </div>
          </div>
          <button type="button" class="v3-btn" id="v3-btn-toggle-deep-analytics">
            ${v3State.deepAnalyticsOpen ? 'Thu gọn phân tích sâu ▲' : 'Mở phân tích sâu [Analytics] ▼'}
          </button>
        </div>

        ${v3State.deepAnalyticsOpen ? (
          !curr.hasAnalytics ? `
            <div style="padding:20px;border:1px dashed var(--border-medium);border-radius:8px;text-align:center;color:var(--text-muted);">
              Kênh <strong>${esc(meta.title)}</strong> hiện đang ở chế độ <code>${esc(curr.analyticsStatus)}</code> (chưa có dữ liệu YouTube Analytics API v2).
              Vui lòng cấp quyền OAuth hoặc chọn kịch bản <code>all_demo_ready</code> để xem đường cong Giữ chân khán giả (Retention) và phân rã Địa lý / Thiết bị.
            </div>
          ` : `
            <div class="v3-grid-2" style="margin-bottom:0;">
              <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;flex-wrap:wrap;">
                  <strong style="font-size:13px;">Đường cong Giữ chân khán giả (Audience Retention)</strong>
                  <select id="v3-retention-video-select" class="v3-select" style="max-width:280px;">
                    ${enrichedVideos.map(v => `
                      <option value="${v.id}" ${v.id === v3State.selectedVideoIdForRetention ? 'selected' : ''}>
                        ${esc(v.title.slice(0, 42))} (${formatIsoToVN(v.publishedAt)})
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div style="height:230px;position:relative;">
                  <canvas id="v3-channel-retention-canvas"></canvas>
                </div>
              </div>

              <div>
                <strong style="font-size:13px;display:block;margin-bottom:8px;">Phân rã Địa lý (Top Quốc gia) & Nguồn truy cập [Analytics]</strong>
                <div class="v3-table-wrap">
                  <table class="v3-table">
                    <thead>
                      <tr>
                        <th>Quốc gia / Nguồn</th>
                        <th class="num">Lượt xem</th>
                        <th class="num">Giờ xem</th>
                        <th class="num">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(breakdowns && breakdowns.country ? breakdowns.country.slice(0, 5) : []).map(row => `
                        <tr>
                          <td><span class="v3-badge analytics">[Quốc gia]</span> <strong>${esc(row.value)}</strong></td>
                          <td class="num">${fmtInt(row.views)}</td>
                          <td class="num">${fmtInt(row.estimatedHoursWatched)}h</td>
                          <td class="num">${curr.hasMonetary && row.estimatedRevenue !== null ? fmtMoney(row.estimatedRevenue) : '—'}</td>
                        </tr>
                      `).join('')}
                      ${(breakdowns && breakdowns.insightTrafficSourceType ? breakdowns.insightTrafficSourceType.slice(0, 3) : []).map(row => `
                        <tr>
                          <td><span class="v3-badge muted">[Nguồn]</span> ${esc(row.value)}</td>
                          <td class="num">${fmtInt(row.views)}</td>
                          <td class="num">${fmtInt(row.estimatedHoursWatched)}h</td>
                          <td class="num">—</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `
        ) : ''}
      </section>
    `;

    // Render Single Channel Trend Chart & Retention Chart
    renderSingleChannelChart(cp, snap);
    if (v3State.deepAnalyticsOpen && curr.hasAnalytics) {
      renderSingleChannelRetentionChart(v3State.selectedVideoIdForRetention, demo);
    }

    // Bind Single Channel Events
    const chSel = document.getElementById('v3-single-channel-select');
    if (chSel) {
      chSel.addEventListener('change', () => {
        v3State.selectedChannelId = chSel.value;
        v3State.selectedVideoIdForRetention = null;
        renderSharedHeader(snap, 'view-report-channel');
        renderChannelPage(snap);
      });
    }

    body.querySelectorAll('[data-ch-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        v3State.channelChartMetric = btn.getAttribute('data-ch-metric');
        renderChannelPage(snap);
      });
    });

    body.querySelectorAll('[data-select-retention-vid]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        v3State.selectedVideoIdForRetention = el.getAttribute('data-select-retention-vid');
        v3State.deepAnalyticsOpen = true;
        renderChannelPage(snap);
      });
    });

    const retSel = document.getElementById('v3-retention-video-select');
    if (retSel) {
      retSel.addEventListener('change', () => {
        v3State.selectedVideoIdForRetention = retSel.value;
        renderSingleChannelRetentionChart(v3State.selectedVideoIdForRetention, demo);
      });
    }

    const btnDeep = document.getElementById('v3-btn-toggle-deep-analytics');
    if (btnDeep) {
      btnDeep.addEventListener('click', () => {
        v3State.deepAnalyticsOpen = !v3State.deepAnalyticsOpen;
        renderChannelPage(snap);
      });
    }
  }

  function renderSingleChannelChart(cp, snap) {
    destroyChart('channelSingle');
    const canvas = document.getElementById('v3-channel-single-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const metric = v3State.channelChartMetric;
    const days = snap.win.days;
    const prevDays = snap.win.prevDays;

    const labels = days.map(d => d.slice(8, 10) + '/' + d.slice(5, 7));
    const currData = days.map(d => {
      const pt = cp.curr.dailyMap.get(d);
      return pt ? pt[metric] : null;
    });
    const prevData = days.map((_, idx) => {
      const pd = prevDays[idx];
      const pt = pd ? cp.prev.dailyMap.get(pd) : null;
      return pt ? pt[metric] : null;
    });

    chartInstances['channelSingle'] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${cp.meta.title} (Kỳ này)`,
            data: currData,
            borderColor: cp.meta.teamColor,
            backgroundColor: cp.meta.teamColor + '22',
            borderWidth: 2.5,
            pointRadius: 2.5,
            tension: 0.3,
            fill: true
          },
          {
            label: v3State.compareMode === 'yoy' ? 'Cùng kỳ năm ngoái' : 'Kỳ trước',
            data: prevData,
            borderColor: '#94A3B8',
            borderDash: [5, 4],
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
        plugins: { legend: { labels: { color: '#CBD5E1' } } },
        scales: {
          x: { ticks: { color: '#94A3B8', maxTicksLimit: 14 }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });
  }

  function renderSingleChannelRetentionChart(videoId, demo) {
    destroyChart('channelRetention');
    const canvas = document.getElementById('v3-channel-retention-canvas');
    if (!canvas || typeof Chart === 'undefined' || !demo) return;

    const points = demo.getVideoRetention(videoId) || [];
    if (!points.length) return;

    const labels = points.map(p => Math.round(p.elapsedVideoTimeRatio * 100) + '%');
    const watchData = points.map(p => Number((p.audienceWatchRatio * 100).toFixed(1)));
    const relData = points.map(p => Number((p.relativeRetentionPerformance * 100).toFixed(1)));

    chartInstances['channelRetention'] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '% Khán giả còn xem (Audience Watch Ratio)',
            data: watchData,
            borderColor: '#38BDF8',
            backgroundColor: 'rgba(56, 189, 248, 0.14)',
            borderWidth: 2.4,
            pointRadius: 0,
            tension: 0.25,
            fill: true
          },
          {
            label: 'Hiệu suất giữ chân tương đối (%)',
            data: relData,
            borderColor: '#F59E0B',
            borderDash: [4, 4],
            borderWidth: 1.6,
            pointRadius: 0,
            tension: 0.25,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#CBD5E1', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#94A3B8', maxTicksLimit: 11 }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { min: 0, max: 110, ticks: { color: '#94A3B8', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.06)' } }
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
                      <div style="font-size:11px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;">${esc(cp.meta.employeeId)}</div>
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
  // Question: "Team nào đang tốt nhất, và vì sao?"
  // =========================================================================
  function renderTeamPage(snap) {
    const root = document.getElementById('v3-team-root');
    if (!root) return;
    const legacySection = document.getElementById('v3-legacy-team-section');
    if (legacySection) legacySection.style.display = 'none';

    const sortedTeams = [...snap.teamPairs].sort((a, b) => (b.curr.views || 0) - (a.curr.views || 0));
    const bestTeamId = sortedTeams[0]?.id;
    const selectedTeam = snap.teamPairs.find(t => t.id === v3State.selectedTeamId) || sortedTeams[0];
    if (selectedTeam) v3State.selectedTeamId = selectedTeam.id;

    // Sort the 5 channels inside selectedTeam by viewsGrowthPct descending (per reviewer requirement #2.5)
    const teamChannelsByGrowth = [...(selectedTeam ? selectedTeam.channels : [])].sort((a, b) => (b.viewsGrowthPct ?? -999) - (a.viewsGrowthPct ?? -999));

    // Team-specific alerts
    const teamAlerts = (selectedTeam ? selectedTeam.channels : []).filter(cp => {
      const drop = cp.prev && (cp.prev.views || 0) >= 5000 && cp.viewsGrowthPct !== null && cp.viewsGrowthPct <= v3State.alertDropThreshold;
      const slow = cp.daysSinceLastUpload > v3State.alertUploadCycleDays;
      const perm = cp.curr.analyticsStatus !== 'demo_ready' || cp.curr.monetaryStatus !== 'demo_ready';
      return drop || slow || perm;
    });

    root.innerHTML = `
      <!-- 1. 3 TEAM CARDS -->
      <div class="v3-grid-3">
        ${snap.teamPairs.map(tp => {
          const isSelected = tp.id === selectedTeam.id;
          const isBest = tp.id === bestTeamId;
          return `
            <div class="v3-panel clickable-row" data-select-team-card="${tp.id}" style="margin-bottom:0;border:2px solid ${isSelected ? tp.color : 'var(--border-subtle)'};background:${isSelected ? tp.color + '10' : 'var(--bg-card)'};">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="v3-team-dot" style="width:12px;height:12px;background:${tp.color};"></span>
                  <strong style="font-size:15px;">${esc(tp.name)}</strong>
                </div>
                <div style="display:flex;gap:5px;">
                  ${isBest ? `<span class="v3-badge highest">[Dẫn đầu công ty]</span>` : ''}
                  <span class="v3-badge muted">${tp.shareOfCompanyViews}% views</span>
                </div>
              </div>

              <div class="v3-kpi-value" style="margin-bottom:6px;">${tp.curr.views !== null ? fmtInt(tp.curr.views) + ' views' : '—'}</div>
              <div style="margin-bottom:10px;">${fmtDeltaBadge(tp.curr.views, tp.prev.views)}</div>

              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:12px;padding-top:10px;border-top:1px solid var(--border-subtle);">
                <div>Sub ròng: <strong>${tp.curr.netSubs !== null ? (tp.curr.netSubs > 0 ? '+' + fmtInt(tp.curr.netSubs) : fmtInt(tp.curr.netSubs)) : '—'}</strong></div>
                <div>Số video đăng: <strong>${fmtInt(tp.curr.videosPublished)} video</strong></div>
                <div>Tỷ lệ tương tác: <strong>${tp.curr.engagementRate !== null ? tp.curr.engagementRate.toFixed(2) + '%' : '—'}</strong></div>
                <div>Doanh thu [Analytics]: <strong>${tp.curr.estimatedRevenue !== null ? fmtMoney(tp.curr.estimatedRevenue) : '—'}</strong></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- 2. 3-TEAM TREND CHART -->
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <i class="ri-line-chart-line" style="color:#38BDF8;"></i>
              Biểu đồ đường 3 Team theo thời gian (Nhãn trực tiếp cuối đường · Màu cố định từng Team)
            </div>
            <div class="v3-panel-subtitle">
              Jazz & Lo-fi (#38BDF8 Sky) • Retro & Electronic (#F59E0B Amber) • Indie & Chill (#EC4899 Magenta)
            </div>
          </div>
          <div class="v3-preset-group">
            <button type="button" class="v3-preset-btn ${v3State.teamChartMetric === 'views' ? 'active' : ''}" data-tm-metric="views">Lượt xem</button>
            <button type="button" class="v3-preset-btn ${v3State.teamChartMetric === 'watchHours' ? 'active' : ''}" data-tm-metric="watchHours">Giờ xem [Analytics]</button>
            <button type="button" class="v3-preset-btn ${v3State.teamChartMetric === 'revenue' ? 'active' : ''}" data-tm-metric="revenue">Doanh thu [Analytics]</button>
          </div>
        </div>
        <div style="height: 280px; position: relative;">
          <canvas id="v3-team-trend-canvas"></canvas>
        </div>
      </section>

      <!-- 3. 100% STACKED MEMBER CONTRIBUTION BAR & 4. 30-DAY UPLOAD CADENCE -->
      <div class="v3-grid-2">
        <section class="v3-panel" style="margin-bottom:0;">
          <div class="v3-panel-header">
            <div>
              <div class="v3-panel-title">
                <i class="ri-pie-chart-box-line" style="color:#38BDF8;"></i>
                Tỷ trọng đóng góp của 5 nhân viên trong từng Team (Thanh xếp chồng 100%)
              </div>
              <div class="v3-panel-subtitle">Giúp nhận diện nhanh team đang tăng đồng đều hay phụ thuộc vào 1 cá nhân</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${snap.teamPairs.map(tp => {
              const tViews = Math.max(1, tp.curr.views || 1);
              const shades = ['#38BDF8', '#0EA5E9', '#6366F1', '#F59E0B', '#EC4899'];
              return `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;margin-bottom:6px;">
                    <span><span class="v3-team-dot" style="background:${tp.color};"></span> ${esc(tp.name)}</span>
                    <span style="font-family:'JetBrains Mono',monospace;">${tp.curr.views !== null ? fmtInt(tp.curr.views) + ' views' : '—'}</span>
                  </div>
                  <div style="display:flex;height:24px;border-radius:6px;overflow:hidden;border:1px solid var(--border-subtle);">
                    ${tp.channels.map((cp, cIdx) => {
                      const pct = tp.curr.views ? ((cp.curr.views || 0) / tViews) * 100 : 20;
                      const bg = shades[cIdx % shades.length];
                      return `<div style="width:${pct.toFixed(1)}%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#0B0F19;overflow:hidden;white-space:nowrap;" title="${esc(cp.meta.employeeName)} (${esc(cp.meta.title)}): ${fmtInt(cp.curr.views)} views (${pct.toFixed(1)}%)">${pct >= 12 ? pct.toFixed(0) + '%' : ''}</div>`;
                    }).join('')}
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;font-size:11px;color:var(--text-muted);">
                    ${tp.channels.map((cp, cIdx) => {
                      const pct = tp.curr.views ? ((cp.curr.views || 0) / tViews) * 100 : 0;
                      return `<span><span class="v3-team-dot" style="width:7px;height:7px;background:${shades[cIdx % shades.length]};"></span> ${esc(cp.meta.employeeName)}: <strong>${pct.toFixed(1)}%</strong></span>`;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <section class="v3-panel" style="margin-bottom:0;">
          <div class="v3-panel-header">
            <div>
              <div class="v3-panel-title">
                <i class="ri-calendar-event-line" style="color:#F59E0B;"></i>
                Nhịp đăng video của 3 Team trong kỳ
              </div>
              <div class="v3-panel-subtitle">Tổng số video phát hành và mật độ kênh hoạt động của từng Team</div>
            </div>
          </div>
          <div style="height: 235px; position: relative;">
            <canvas id="v3-team-cadence-canvas"></canvas>
          </div>
        </section>
      </div>

      <!-- 5. 5-CHANNEL TABLE IN SELECTED TEAM (SORTED BY % GROWTH) & 6. TEAM ALERTS -->
      <section class="v3-panel">
        <div class="v3-panel-header">
          <div>
            <div class="v3-panel-title">
              <span class="v3-team-dot" style="width:11px;height:11px;background:${selectedTeam.color};"></span>
              Bảng 5 Kênh thuộc ${esc(selectedTeam.name)} (Xếp theo % tăng trưởng cao xuống thấp)
            </div>
            <div class="v3-panel-subtitle">
              Trưởng nhóm: <strong>${esc(selectedTeam.leader)}</strong> • Nhấn vào thẻ Team phía trên để chuyển đổi giữa 3 Team
            </div>
          </div>
        </div>
        <div class="v3-table-wrap">
          <table class="v3-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Kênh YouTube</th>
                <th>Nhân viên (PIC)</th>
                <th class="num">Views kỳ này</th>
                <th class="num">So với kỳ trước</th>
                <th class="num">Sub ròng</th>
                <th class="num">Video</th>
                <th class="num">Đăng gần nhất</th>
                <th class="num">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              ${teamChannelsByGrowth.map((cp, idx) => `
                <tr class="clickable-row" data-goto-channel="${cp.id}">
                  <td>
                    <span class="v3-badge ${idx === 0 ? 'highest' : (idx === teamChannelsByGrowth.length - 1 ? 'lowest' : 'muted')}">
                      #${idx + 1}${idx === 0 ? ' [Tăng nhanh nhất]' : (idx === teamChannelsByGrowth.length - 1 ? ' [Chậm nhất team]' : '')}
                    </span>
                  </td>
                  <td><strong>${esc(cp.meta.title)}</strong></td>
                  <td>${esc(cp.meta.employeeName)} (${esc(cp.meta.employeeId)})</td>
                  <td class="num"><strong>${cp.curr.views !== null ? fmtInt(cp.curr.views) : '—'}</strong></td>
                  <td class="num">${fmtDeltaBadge(cp.curr.views, cp.prev.views)}</td>
                  <td class="num">${cp.curr.netSubs !== null ? (cp.curr.netSubs > 0 ? '+' + fmtInt(cp.curr.netSubs) : fmtInt(cp.curr.netSubs)) : '—'}</td>
                  <td class="num">${fmtInt(cp.curr.videosPublished)}</td>
                  <td class="num">${formatIsoToVN(cp.meta.lastPublishedPt)} (${cp.daysSinceLastUpload} ngày)</td>
                  <td class="num">${cp.curr.estimatedRevenue !== null ? fmtMoney(cp.curr.estimatedRevenue) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:14px;padding:12px 14px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);">
          <strong style="font-size:12.5px;display:block;margin-bottom:8px;">
            <i class="ri-Notification-badge-line" style="color:#F59E0B;"></i> Cảnh báo riêng của ${esc(selectedTeam.name)} (${teamAlerts.length} cảnh báo):
          </strong>
          ${teamAlerts.length === 0 ? `
            <span style="font-size:12.5px;color:#10B981;">Tất cả 5 kênh trong ${esc(selectedTeam.name)} đều tăng trưởng ổn định, đúng lịch đăng và đủ quyền dữ liệu.</span>
          ` : `
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${teamAlerts.map(cp => {
                const reasons = [];
                if (cp.prev && (cp.prev.views || 0) >= 5000 && cp.viewsGrowthPct !== null && cp.viewsGrowthPct <= v3State.alertDropThreshold) {
                  reasons.push(`[Giảm sâu ${cp.viewsGrowthPct.toFixed(1)}%]`);
                }
                if (cp.daysSinceLastUpload > v3State.alertUploadCycleDays) {
                  reasons.push(`[Chậm lịch đăng: ${cp.daysSinceLastUpload} ngày]`);
                }
                if (cp.curr.analyticsStatus !== 'demo_ready' || cp.curr.monetaryStatus !== 'demo_ready') {
                  reasons.push(`[Thiếu quyền: ${cp.curr.monetaryStatus}]`);
                }
                return `
                  <span class="v3-scope-pill clickable-row" data-goto-channel="${cp.id}" style="border-color:rgba(245,158,11,0.4);">
                    <strong>${esc(cp.meta.title)}</strong> (${esc(cp.meta.employeeName)}):
                    <span style="color:#F59E0B;font-weight:700;">${esc(reasons.join(' · '))}</span>
                  </span>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </section>
    `;

    // Render 3-Team Line Chart & Upload Cadence Chart
    destroyChart('teamTrend');
    const trendCanvas = document.getElementById('v3-team-trend-canvas');
    if (trendCanvas && typeof Chart !== 'undefined') {
      const metric = v3State.teamChartMetric;
      const days = snap.win.days;
      const labels = days.map(d => d.slice(8, 10) + '/' + d.slice(5, 7));
      const datasets = snap.teamPairs.map(tp => {
        const series = (tp.curr.dailySeries || []).map(d => d[metric]);
        const lastVal = series.slice().reverse().find(v => v !== null && v !== undefined);
        return {
          label: `${tp.name} (${lastVal !== undefined ? fmtCompact(lastVal) : '—'})`,
          data: series,
          borderColor: tp.color,
          backgroundColor: 'transparent',
          borderWidth: 2.6,
          pointRadius: 2.2,
          tension: 0.3
        };
      });
      chartInstances['teamTrend'] = new Chart(trendCanvas.getContext('2d'), {
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

    destroyChart('teamCadence');
    const cadCanvas = document.getElementById('v3-team-cadence-canvas');
    if (cadCanvas && typeof Chart !== 'undefined') {
      chartInstances['teamCadence'] = new Chart(cadCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: snap.teamPairs.map(tp => tp.name),
          datasets: [
            {
              label: 'Video đăng trong kỳ',
              data: snap.teamPairs.map(tp => tp.curr.videosPublished),
              backgroundColor: snap.teamPairs.map(tp => tp.color + 'CC'),
              borderColor: snap.teamPairs.map(tp => tp.color),
              borderWidth: 1.5,
              borderRadius: 6
            },
            {
              label: 'Video đăng 7 ngày gần nhất',
              data: snap.teamPairs.map(tp => tp.curr.videosLast7d),
              backgroundColor: 'rgba(148, 163, 184, 0.35)',
              borderColor: '#94A3B8',
              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#CBD5E1' } } },
          scales: {
            x: { ticks: { color: '#CBD5E1' }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#94A3B8', stepSize: 5 }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      });
    }

    root.querySelectorAll('[data-select-team-card]').forEach(card => {
      card.addEventListener('click', () => {
        v3State.selectedTeamId = card.getAttribute('data-select-team-card');
        renderSharedHeader(snap, 'view-report-team');
        renderTeamPage(snap);
      });
    });

    root.querySelectorAll('[data-tm-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        v3State.teamChartMetric = btn.getAttribute('data-tm-metric');
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
          try { nextInput.setSelectionRange(pos, pos); } catch (e) {}
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
