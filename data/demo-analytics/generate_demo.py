"""Build deterministic, explicitly fictional Analytics fixtures; never call an API."""
from __future__ import annotations

import argparse
import calendar
import csv
import datetime as dt
import hashlib
import json
import math
import random
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PUBLIC = ROOT / "data/mock-hierarchy/dataset.json"
SEED = "antigravity-analytics-demo-v1-20261029"
START = dt.date(2025, 1, 1)
END = dt.date(2026, 10, 28)
DETAIL_START = END - dt.timedelta(days=89)
DEFAULT_START = END - dt.timedelta(days=27)
INT_FIELDS = ("views", "engagedViews", "estimatedMinutesWatched", "likes", "comments",
              "shares", "subscribersGained", "subscribersLost", "adImpressions", "monetizedPlaybacks")
CENT_FIELDS = ("ad_cents", "premium_cents", "gross_cents")
RAW_FIELDS = INT_FIELDS + CENT_FIELDS + ("view_percent_basis",)
LABEL = "Dữ liệu Analytics minh họa"
DISCLAIMER = ("Toàn bộ chỉ số Analytics, doanh thu, phân rã và tỷ giá trong bộ này là giả lập; "
              "không phải hiệu suất, doanh thu hay quyền truy cập thực của các kênh YouTube được tham chiếu.")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dates(start, end):
    return [start + dt.timedelta(days=i) for i in range((end - start).days + 1)]


def rng(key):
    return random.Random(int.from_bytes(hashlib.sha256(f"{SEED}:{key}".encode()).digest()[:8], "big"))


def rounded(value, digits=2):
    return round(value, digits)


def zero_raw():
    return {field: 0 for field in RAW_FIELDS}


def summed(items):
    result = zero_raw()
    for item in items:
        for field in RAW_FIELDS:
            result[field] += item.get(field, 0)
    return result


def metrics(raw):
    result = {field: raw[field] for field in INT_FIELDS}
    revenue_cents = raw["ad_cents"] + raw["premium_cents"]
    result.update({
        "estimatedRevenue": revenue_cents / 100,
        "estimatedAdRevenue": raw["ad_cents"] / 100,
        "estimatedRedPartnerRevenue": raw["premium_cents"] / 100,
        "grossRevenue": raw["gross_cents"] / 100,
        "estimatedHoursWatched": rounded(raw["estimatedMinutesWatched"] / 60, 6),
        "netSubscribers": raw["subscribersGained"] - raw["subscribersLost"],
        "averageViewDuration": rounded(raw["estimatedMinutesWatched"] * 60 / raw["views"]) if raw["views"] else None,
        "averageViewPercentage": rounded(raw["view_percent_basis"] / raw["views"] / 100) if raw["views"] else None,
        "proxyRpm": rounded(revenue_cents * 10 / raw["views"], 4) if raw["views"] else None,
        "cpm": rounded(raw["gross_cents"] * 10 / raw["adImpressions"], 4) if raw["adImpressions"] else None,
        "playbackBasedCpm": rounded(raw["gross_cents"] * 10 / raw["monetizedPlaybacks"], 4) if raw["monetizedPlaybacks"] else None,
        "aggregation_components": {
            "view_percentage_basis_sum": raw["view_percent_basis"],
            "estimated_ad_revenue_cents": raw["ad_cents"],
            "premium_revenue_cents": raw["premium_cents"],
            "gross_revenue_cents": raw["gross_cents"],
        },
    })
    return result


def allocate(total, weights):
    if not sum(weights):
        return [0] * len(weights)
    exact = [total * weight / sum(weights) for weight in weights]
    result = [math.floor(value) for value in exact]
    order = sorted(range(len(weights)), key=lambda i: (-(exact[i] - result[i]), i))
    for index in order[:total - sum(result)]:
        result[index] += 1
    return result


def duration_seconds(value):
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value or "")
    return sum(int(v or 0) * unit for v, unit in zip(match.groups(), (3600, 60, 1))) if match else 0


def pacific_day(timestamp):
    instant = dt.datetime.fromisoformat(timestamp.replace("Z", "+00:00")).astimezone(dt.timezone.utc)
    try:
        from zoneinfo import ZoneInfo
        return instant.astimezone(ZoneInfo("America/Los_Angeles")).date()
    except (ImportError, KeyError):
        # Windows Python may lack tzdata. US Pacific DST rules since 2007,
        # calculated in UTC; this fixture only contains 2025/2026 timestamps.
        if not 2007 <= instant.year <= 2100:
            raise ValueError("Pacific fallback is limited to years 2007..2100")
        march = dt.date(instant.year, 3, 1)
        november = dt.date(instant.year, 11, 1)
        second_sunday = 1 + (6 - march.weekday()) % 7 + 7
        first_sunday = 1 + (6 - november.weekday()) % 7
        begin = dt.datetime(instant.year, 3, second_sunday, 10, tzinfo=dt.timezone.utc)
        finish = dt.datetime(instant.year, 11, first_sunday, 9, tzinfo=dt.timezone.utc)
        return (instant + dt.timedelta(hours=-7 if begin <= instant < finish else -8)).date()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generated-at", help="UTC timestamp; reuse it for byte-identical regeneration")
    args = parser.parse_args()
    generated_at = args.generated_at or dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    public_hash = digest(PUBLIC)
    bundle_path = ROOT / "data/mock-hierarchy/dataset.js"
    bundle_hash = digest(bundle_path) if bundle_path.exists() else None
    public = json.loads(PUBLIC.read_text(encoding="utf-8-sig"))
    channels, videos = public["channels"], public["videos"]
    channel_ids = [c["id"] for c in channels]
    assignments = {a["channel_id"]: a for a in public["assignments"]}
    employee_map = {e["id"]: e for e in public["employees"]}
    team_map = {t["id"]: t for t in public["teams"]}
    by_channel = defaultdict(list)
    for video in videos:
        by_channel[video["channel_id"]].append(video)

    def meta(**extra):
        return dict(schema_version="1.0.0", source_kind="synthetic_demo", is_demo=True,
                    oauth_authorized=False, source_api=None, label=LABEL, disclaimer=DISCLAIMER,
                    currency="USD", report_timezone="America/Los_Angeles", generated_at=generated_at,
                    seed=SEED, **extra)

    written = []

    def write(name, rows=None, **extra):
        payload = {"meta": meta(**extra)}
        if rows is not None:
            payload["rows"] = rows
        path = OUT / name
        path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")
        written.append((name, len(rows) if rows is not None else None))
        return payload

    # Synthetic scenarios are assigned by fixture order, never fitted to the real
    # channels' public views/subscribers; none of these figures estimate real money.
    baseline = [850, 18000, 13500, 3600, 24000, 950, 9800, 12500, 5000, 6400, 21000, 16800, 5400, 4600, 14000]
    channel_raw = {}
    all_days = dates(START, END)
    for ci, channel_id in enumerate(channel_ids):
        for di, day in enumerate(all_days):
            r = rng(f"channel:{ci}:{day}")
            weekly = 1.18 if day.weekday() >= 5 else 0.94
            trend = 0.82 + (di / len(all_days)) * (0.16 + (ci % 5) * 0.12)
            seasonal = 1 + 0.16 * math.sin(di / 29 + ci) + 0.08 * math.cos(di / 9 + ci * 0.6)
            spike = 1.7 if (di + ci * 13) % 83 in (0, 1) else 1
            views = max(20, round(baseline[ci] * weekly * trend * seasonal * spike * r.uniform(0.86, 1.14)))
            avg_seconds = (550 + (ci % 6) * 280) * r.uniform(0.86, 1.14)
            ad_impressions = round(views * r.uniform(0.32, 1.05))
            monetized = min(views, round(ad_impressions / r.uniform(1.3, 2.0)))
            gross_cents = round(ad_impressions * (2.2 + ci % 6 * 0.9) * r.uniform(0.78, 1.24) / 10)
            ad_cents = round(gross_cents * r.uniform(0.48, 0.66))
            premium_cents = round(views * r.uniform(0.006, 0.025))
            raw = dict(views=views, engagedViews=views,
                       estimatedMinutesWatched=round(views * avg_seconds / 60),
                       likes=round(views * r.uniform(0.018, 0.047)),
                       comments=round(views * r.uniform(0.001, 0.005)),
                       shares=round(views * r.uniform(0.002, 0.008)),
                       subscribersGained=round(views * r.uniform(0.001, 0.003)),
                       subscribersLost=round(views * r.uniform(0.0004, 0.0022)),
                       adImpressions=ad_impressions, monetizedPlaybacks=monetized,
                       ad_cents=ad_cents, premium_cents=premium_cents, gross_cents=gross_cents,
                       view_percent_basis=views * r.randint(2400, 5800))
            if ci == 0 and day == dt.date(2026, 10, 14):
                raw = zero_raw()  # Explicit, confirmed zero-activity example.
            if ci == 0 and day == dt.date(2026, 10, 7):
                raw.update(ad_cents=0, premium_cents=0, gross_cents=0)
            channel_raw[channel_id, day] = raw

    # Modeled sample activity + one explicitly non-video aggregate bucket.
    video_raw, residual_raw = {}, {}
    publication = {v["id"]: pacific_day(v["published_at"]) for v in videos}
    durations = {v["id"]: duration_seconds(v["duration_iso8601"]) for v in videos}
    for ci, channel_id in enumerate(channel_ids):
        for day in dates(DETAIL_START, END):
            raw = channel_raw[channel_id, day]
            eligible = [v for v in by_channel[channel_id] if publication[v["id"]] <= day and durations[v["id"]] > 0]
            r = rng(f"sample:{ci}:{day}")
            target = round(raw["views"] * r.uniform(0.32, 0.69)) if eligible else 0
            weights = [(1 + rng(v["id"]).random()) / (1 + (day - publication[v["id"]]).days / 22) for v in eligible]
            sample_views = allocate(target, weights) if eligible else []
            split_weights = sample_views + [raw["views"] - sum(sample_views)]
            buckets = [zero_raw() for _ in split_weights]
            for field in RAW_FIELDS:
                if field == "view_percent_basis":
                    continue
                parts = allocate(raw[field], split_weights)
                for bucket, value in zip(buckets, parts):
                    bucket[field] = value
            for i, video in enumerate(eligible):
                bucket = buckets[i]
                duration = durations[video["id"]]
                maximum_minutes = math.floor(bucket["views"] * duration * 0.9 / 60)
                if bucket["estimatedMinutesWatched"] > maximum_minutes:
                    buckets[-1]["estimatedMinutesWatched"] += bucket["estimatedMinutesWatched"] - maximum_minutes
                    bucket["estimatedMinutesWatched"] = maximum_minutes
                bucket["view_percent_basis"] = round(bucket["estimatedMinutesWatched"] * 60 / duration * 10000)
                video_raw[video["id"], day] = bucket
            # Other content has a modeled average percentage; no fake video ID.
            buckets[-1]["view_percent_basis"] = buckets[-1]["views"] * (raw["view_percent_basis"] // raw["views"] if raw["views"] else 0)
            raw["view_percent_basis"] = sum(b["view_percent_basis"] for b in buckets)
            residual_raw[channel_id, day] = buckets[-1]

    channel_rows = [dict(channel_id=cid, day=day.isoformat(), content_type="VIDEO", **metrics(raw))
                    for (cid, day), raw in channel_raw.items()]
    write("channel_daily.json", channel_rows, period_start=str(START), period_end=str(END),
          content_types=["VIDEO"], revenue_components=["estimatedAdRevenue", "estimatedRedPartnerRevenue"],
          modeling_notice="Independent fictional profiles; not calibrated to public channel counters.")
    video_rows = [dict(video_id=vid, channel_id=next(v["channel_id"] for v in videos if v["id"] == vid),
                       day=str(day), content_type="VIDEO", **metrics(raw)) for (vid, day), raw in video_raw.items()]
    write("video_daily.json", video_rows, period_start=str(DETAIL_START), period_end=str(END),
          coverage="Only the 150 public sample IDs; rows start at each video's Pacific publication day.")
    write("other_content_daily.json", [dict(channel_id=cid, day=str(day), bucket="outside_sample", **metrics(raw))
          for (cid, day), raw in residual_raw.items()], period_start=str(DETAIL_START), period_end=str(END),
          notice="Synthetic reconciliation bucket, not a YouTube video ID or deleted-video claim.")

    video_summaries = []
    retention = []
    for video in videos:
        vid = video["id"]
        parts = [raw for (video_id, _), raw in video_raw.items() if video_id == vid]
        aggregate = summed(parts)
        active = aggregate["views"] > 0
        video_summaries.append(dict(video_id=vid, channel_id=video["channel_id"],
            period_start=str(DETAIL_START), period_end=str(END), published_day_pacific=str(publication[vid]),
            duration_seconds=durations[vid], status="demo_ready" if active else "no_activity_in_demo_period",
            metrics=metrics(aggregate) if active else None))
        if not active:
            continue
        r = rng(f"retention:{vid}")
        shape = [math.exp(-(0.9 + r.random() * 0.5) * i / 50) + 0.10 * math.exp(-((i / 50 - 0.55) / 0.10) ** 2)
                 for i in range(51)]
        integral = sum((shape[i] + shape[i + 1]) / 2 / 50 for i in range(50))
        target = aggregate["estimatedMinutesWatched"] * 60 / aggregate["views"] / durations[vid]
        points = [dict(elapsedVideoTimeRatio=round(i / 50, 2), audienceWatchRatio=round(y / integral * target, 5),
                       relativeRetentionPerformance=round(max(0, min(1, 0.55 + 0.13 * math.sin(i / 7) + r.uniform(-0.08, 0.08))), 4))
                  for i, y in enumerate(shape)]
        retention.append(dict(video_id=vid, channel_id=video["channel_id"], points=points))
    write("video_summaries.json", video_summaries, period_start=str(DETAIL_START), period_end=str(END), sample_size=150)
    write("retention.json", retention, period_start=str(DETAIL_START), period_end=str(END),
          coverage="Per-video synthetic curves for sample videos with demo activity; never aggregate retention across channels.")

    breakdowns = []
    dimension_values = {
        "country": ["US", "VN", "GB", "CA", "OTHER"],
        "deviceType": ["DESKTOP", "MOBILE", "TABLET", "TV", "OTHER"],
        "insightTrafficSourceType": ["RELATED_VIDEO", "YT_SEARCH", "SUBSCRIBER", "EXT_URL", "PLAYLIST", "NO_LINK_OTHER"],
    }
    for (cid, day), raw in residual_raw.items():
        raw = channel_raw[cid, day]
        for dimension, values in dimension_values.items():
            r = rng(f"breakdown:{cid}:{day}:{dimension}")
            weights = [r.uniform(1, 5) for _ in values]
            if dimension == "country":
                weights[0] *= 1.8
            allocated = {field: allocate(raw[field], weights) for field in ("views", "estimatedMinutesWatched")}
            money = allocate(raw["ad_cents"] + raw["premium_cents"], weights)
            for i, value in enumerate(values):
                row = dict(channel_id=cid, day=str(day), dimension=dimension, value=value,
                           **{field: parts[i] for field, parts in allocated.items()})
                if dimension == "country":
                    row["estimatedRevenue"] = money[i] / 100
                breakdowns.append(row)
    write("breakdown_daily.json", breakdowns, period_start=str(DETAIL_START), period_end=str(END),
          dimensions=dimension_values, notice="Independent modeled partitions; not a promise that arbitrary API metric/dimension combinations are supported.")

    entities = [("system", "ALL", channel_ids)]
    entities += [("channel", cid, [cid]) for cid in channel_ids]
    entities += [("team", t["id"], [cid for cid in channel_ids if employee_map[assignments[cid]["employee_id"]]["team_id"] == t["id"]]) for t in public["teams"]]
    entities += [("employee", e["id"], [a["channel_id"] for a in public["assignments"] if a["employee_id"] == e["id"]]) for e in public["employees"]]

    def aggregate(ids, begin, finish):
        return summed(channel_raw[cid, day] for cid in ids for day in dates(max(begin, START), min(finish, END)))

    summaries = []
    named = [("last_7_days", END - dt.timedelta(days=6), END),
             ("last_28_days", DEFAULT_START, END), ("last_30_days", END - dt.timedelta(days=29), END),
             ("last_90_days", DETAIL_START, END), ("month_to_date", dt.date(2026, 10, 1), END),
             ("last_full_month", dt.date(2026, 9, 1), dt.date(2026, 9, 30)),
             ("year_to_date", dt.date(2026, 1, 1), END), ("year_2025", START, dt.date(2025, 12, 31))]
    for key, begin, finish in named:
        if key == "month_to_date":
            previous = dt.date(2026, 9, 1), dt.date(2026, 9, 28)
        elif key == "last_full_month":
            previous = dt.date(2026, 8, 1), dt.date(2026, 8, 31)
        elif key in ("year_to_date", "year_2025"):
            previous = begin.replace(year=begin.year - 1), finish.replace(year=finish.year - 1)
        else:
            previous = begin - dt.timedelta(days=(finish - begin).days + 1), begin - dt.timedelta(days=1)
        for entity_type, entity_id, ids in entities:
            values = metrics(aggregate(ids, begin, finish))
            prior = metrics(aggregate(ids, *previous)) if previous[0] >= START else None
            changes = {field: round((values[field] - prior[field]) / prior[field] * 100, 2)
                       if prior and prior[field] else None for field in ("views", "estimatedRevenue", "estimatedMinutesWatched")}
            summaries.append(dict(period_key=key, period_start=str(begin), period_end=str(finish),
                entity_type=entity_type, entity_id=entity_id, channel_ids=ids,
                attribution_mode="demo_current_portfolio", metrics=values,
                previous_period={"start": str(previous[0]), "end": str(previous[1]), "is_available": prior is not None},
                previous_metrics=prior, change_percent=changes))
    attribution_notice = "Team/employee totals are fictional current-portfolio views, not historical employee achievements; original assignments remain effective 2026-10-29."
    write("summaries.json", summaries, named_periods=[x[0] for x in named], attribution_notice=attribution_notice)

    rollups = []
    for year in (2025, 2026):
        for grain, months in (("month", list(range(1, 13))), ("quarter", [1, 4, 7, 10])):
            for month in months:
                begin = dt.date(year, month, 1)
                last_month = month if grain == "month" else month + 2
                finish = dt.date(year, last_month, calendar.monthrange(year, last_month)[1])
                if begin > END:
                    continue
                key = f"{year}-{month:02}" if grain == "month" else f"{year}-Q{(month - 1) // 3 + 1}"
                for entity_type, entity_id, ids in entities:
                    rollups.append(dict(grain=grain, period_key=key, period_start=str(begin), period_end=str(finish),
                        available_start=str(max(begin, START)), available_end=str(min(finish, END)),
                        is_complete_period=finish <= END and begin >= START,
                        covered_days=(min(finish, END) - max(begin, START)).days + 1,
                        entity_type=entity_type, entity_id=entity_id, channel_ids=ids,
                        attribution_mode="demo_current_portfolio", metrics=metrics(aggregate(ids, begin, finish))))
    write("period_rollups.json", rollups, attribution_notice=attribution_notice)

    fx_rows = [dict(day=str(day), base_currency="USD", quote_currency="VND",
                    rate=round(25300 + 320 * math.sin(i / 41) + rng(f"fx:{day}").uniform(-95, 95), 2))
               for i, day in enumerate(all_days)]
    write("daily_fx.json", fx_rows,
          rate_label="Tỷ giá minh họa, không phải tỷ giá thị trường", is_real_exchange_rate=False,
          conversion_rule="For demo only: convert each day's USD money using that day's rate, round VND, then sum. Do not multiply an entire period by one fixed rate.")

    full_states = [dict(channel_id=cid, analytics_status="demo_ready", monetary_status="demo_ready",
                        analytics_available_end=str(END), monetary_available_end=str(END)) for cid in channel_ids]
    scenarios = []
    definitions = [
        ("all_demo_ready", "Đủ dữ liệu minh họa", 15, 15),
        ("public_only", "Chỉ có public, chưa kết nối Analytics", 0, 0),
        ("analytics_without_monetary", "Có Analytics, thiếu quyền tiền", 15, 0),
        ("partial_monetary", "Tổng tiền một phần · 1/15 kênh", 15, 1),
        ("revoked", "Một kênh bị thu hồi quyền", 14, 14),
        ("empty_report", "API không có hàng, không coi là 0", 0, 0),
        ("zero_revenue_positive_views", "Doanh thu 0 hợp lệ, proxy bằng 0", 15, 15),
        ("zero_denominator", "Views bằng 0, proxy không xác định", 15, 15),
        ("delayed_monetary", "Tiền trễ hơn views hai ngày", 15, 15),
    ]
    null_fields = list(metrics(zero_raw()))
    for key, label, analytics_count, monetary_count in definitions:
        states = [dict(x) for x in full_states]
        overrides = []
        for i, state in enumerate(states):
            if key in ("public_only", "empty_report"):
                state.update(analytics_status="not_connected" if key == "public_only" else "no_rows",
                             monetary_status="not_connected" if key == "public_only" else "no_rows",
                             analytics_available_end=None, monetary_available_end=None)
            elif key in ("analytics_without_monetary", "partial_monetary") and (key != "partial_monetary" or i != 0):
                state.update(monetary_status="missing_permission", monetary_available_end=None)
            elif key == "revoked" and i == 0:
                state.update(analytics_status="revoked", monetary_status="revoked", analytics_available_end=None, monetary_available_end=None)
            elif key == "delayed_monetary":
                state["monetary_available_end"] = str(END - dt.timedelta(days=2))
        if key == "zero_revenue_positive_views":
            overrides = [dict(channel_id=channel_ids[0], period_key="last_28_days",
                              metrics=dict(estimatedRevenue=0, estimatedAdRevenue=0, estimatedRedPartnerRevenue=0, grossRevenue=0,
                                           proxyRpm=0, cpm=0, playbackBasedCpm=0),
                              aggregation_component_overrides=dict(estimated_ad_revenue_cents=0, premium_revenue_cents=0,
                                                                   gross_revenue_cents=0), expected_proxy=0)]
        if key == "zero_denominator":
            overrides = [dict(channel_id=channel_ids[0], period_key="last_28_days", metrics=metrics(zero_raw()), expected_proxy=None)]
        scenarios.append(dict(scenario_id=key, label=label, period_start=str(DEFAULT_START), period_end=str(END),
            channel_states=states, metric_overrides=overrides,
            expected_coverage={"selected_channels": 15, "analytics_channels": analytics_count,
                               "monetary_channels": monetary_count, "is_partial_monetary": 0 < monetary_count < 15},
            null_metric_fields_when_missing=null_fields,
            common_ratio_end=str(END - dt.timedelta(days=2)) if key == "delayed_monetary" else str(END)))
    write("scenarios.json", scenarios, application_rule="Explicit demo-state overlays only; missing/revoked/no-row metrics become null. Never change real OAuth status.")

    csv_path = OUT / "channel_summary_28d.csv"
    selected = [r for r in summaries if r["period_key"] == "last_28_days" and r["entity_type"] == "channel"]
    csv_fields = ["source_kind", "is_demo", "label", "channel_id", "channel_title", "team_id", "employee_id", "employee_name",
                  "period_start", "period_end", "report_timezone", "currency"] + [f for f in metrics(zero_raw()) if f != "aggregation_components"]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_fields)
        writer.writeheader()
        for row in selected:
            channel = next(c for c in channels if c["id"] == row["entity_id"])
            employee = employee_map[assignments[channel["id"]]["employee_id"]]
            writer.writerow(dict(source_kind="synthetic_demo", is_demo=True, label=LABEL,
                channel_id=channel["id"], channel_title=channel["snippet"]["title"], team_id=employee["team_id"],
                employee_id=employee["id"], employee_name=employee["full_name"], period_start=str(DEFAULT_START), period_end=str(END),
                report_timezone="America/Los_Angeles", currency="USD", **{k: v for k, v in row["metrics"].items() if k != "aggregation_components"}))
    written.append((csv_path.name, 15))

    # Validation uses raw integer counters/cents to avoid float rounding drift.
    checks = []

    def check(name, condition):
        checks.append({"name": name, "passed": bool(condition)})
        if not condition:
            raise AssertionError(name)

    check("hierarchy_3_teams_15_employees_15_unique_channels_150_sample_videos",
          len(public["teams"]) == 3 and len(public["employees"]) == 15 and len(set(channel_ids)) == 15 and len(videos) == 150)
    check("channel_daily_9990_unique_continuous_days", len(channel_raw) == 9990 and all(sum(1 for cid, _ in channel_raw if cid == x) == 666 for x in channel_ids))
    check("all_additive_values_are_nonnegative_integers", all(isinstance(raw[f], int) and raw[f] >= 0 for raw in channel_raw.values() for f in RAW_FIELDS))
    check("video_foreign_keys_and_no_activity_before_publication", all(vid in publication and day >= publication[vid] for vid, day in video_raw))
    check("video_views_fit_duration_watch_time", all(raw["estimatedMinutesWatched"] * 60 <= raw["views"] * durations[vid] for (vid, _), raw in video_raw.items()))
    reconciles = True
    for (cid, day), residual in residual_raw.items():
        parts = [video_raw[v["id"], day] for v in by_channel[cid] if (v["id"], day) in video_raw]
        combined = summed(parts + [residual])
        reconciles = reconciles and all(combined[f] == channel_raw[cid, day][f] for f in RAW_FIELDS)
    check("sample_plus_other_content_exactly_reconciles_90_day_channel_metrics", reconciles)
    check("revenue_components_add_exactly_in_cents", all(round(r["estimatedRevenue"] * 100) == round(r["estimatedAdRevenue"] * 100) + round(r["estimatedRedPartnerRevenue"] * 100) for r in channel_rows))
    check("hours_and_net_subscribers_derive_from_base_units", all(r["estimatedHoursWatched"] == round(r["estimatedMinutesWatched"] / 60, 6) and r["netSubscribers"] == r["subscribersGained"] - r["subscribersLost"] for r in channel_rows))
    check("proxy_is_ratio_of_matching_totals", all(r["proxyRpm"] == (round(r["estimatedRevenue"] / r["views"] * 1000, 4) if r["views"] else None) for r in channel_rows))
    check("rollups_and_named_summaries_reconcile_with_daily_raw_values", all(row["metrics"] == metrics(aggregate(row["channel_ids"], dt.date.fromisoformat(row.get("available_start", row["period_start"])), dt.date.fromisoformat(row.get("available_end", row["period_end"])))) for row in rollups + summaries))
    grouped = defaultdict(lambda: defaultdict(int))
    for row in breakdowns:
        key = row["channel_id"], dt.date.fromisoformat(row["day"]), row["dimension"]
        grouped[key]["views"] += row["views"]
        grouped[key]["estimatedMinutesWatched"] += row["estimatedMinutesWatched"]
        if row["dimension"] == "country":
            grouped[key]["money_cents"] += round(row["estimatedRevenue"] * 100)
    check("all_breakdown_partitions_match_daily_totals", all(values["views"] == channel_raw[cid, day]["views"] and values["estimatedMinutesWatched"] == channel_raw[cid, day]["estimatedMinutesWatched"] and (dimension != "country" or values["money_cents"] == channel_raw[cid, day]["ad_cents"] + channel_raw[cid, day]["premium_cents"]) for (cid, day, dimension), values in grouped.items()))
    check("retention_axes_and_relative_scores_valid", all(len(row["points"]) == 51 and row["points"][0]["elapsedVideoTimeRatio"] == 0 and row["points"][-1]["elapsedVideoTimeRatio"] == 1 and all(p["audienceWatchRatio"] >= 0 and 0 <= p["relativeRetentionPerformance"] <= 1 for p in row["points"]) for row in retention))
    check("all_150_video_summary_ids_unique", len({v["video_id"] for v in video_summaries}) == 150)
    check("zero_revenue_positive_views_retains_zero_proxy", metrics(channel_raw[channel_ids[0], dt.date(2026, 10, 7)])["proxyRpm"] == 0)
    check("zero_views_undefined_rates_remain_null", metrics(zero_raw())["proxyRpm"] is None and metrics(zero_raw())["averageViewDuration"] is None)
    check("october_and_q4_explicitly_partial", all(not row["is_complete_period"] for row in rollups if row["period_key"] in ("2026-10", "2026-Q4")))
    check("foreign_keys_in_entity_summaries_valid", all(set(row["channel_ids"]) <= set(channel_ids) for row in summaries + rollups))
    check("fx_is_positive_and_explicitly_fictional", len(fx_rows) == 666 and all(row["rate"] > 0 for row in fx_rows))
    check("public_snapshot_and_js_bundle_unchanged", digest(PUBLIC) == public_hash and (not bundle_hash or digest(bundle_path) == bundle_hash))
    check("public_analytics_null_and_original_assignments_preserved", all(c["analytics"]["estimatedRevenue"] is None and c["analytics"]["status"] == "not_connected" for c in public["channels"]) and all(a["valid_from"] == "2026-10-29" for a in public["assignments"]))
    check("every_generated_json_carries_demo_provenance", all(json.loads((OUT / name).read_text(encoding="utf-8"))["meta"]["is_demo"] and not json.loads((OUT / name).read_text(encoding="utf-8"))["meta"]["oauth_authorized"] for name, _ in written if name.endswith(".json")))

    files = [dict(path=name, row_count=count, bytes=(OUT / name).stat().st_size, sha256=digest(OUT / name)) for name, count in written]
    manifest = dict(meta=meta(), integration_status="data_only_not_wired_to_template",
        available_period={"start": str(START), "end": str(END), "days": 666},
        detail_period={"start": str(DETAIL_START), "end": str(END), "days": 90},
        default_period={"start": str(DEFAULT_START), "end": str(END), "key": "last_28_days"},
        counts={"teams": 3, "employees": 15, "channels": 15, "sample_videos": 150,
                "channel_daily": len(channel_rows), "video_daily": len(video_rows), "breakdown_daily": len(breakdowns),
                "retention_videos": len(retention), "summary_entities_per_period": len(entities)},
        source_public_snapshot={"path": "../mock-hierarchy/dataset.json", "sha256": public_hash, "unchanged": True},
        content_types=["VIDEO"], missing_content_types=["SHORTS", "LIVE"],
        attribution_mode="demo_current_portfolio", attribution_notice=attribution_notice,
        data_model_notes=["Synthetic metrics are not inferred real earnings of public channels.",
            "Revenue model includes only fictional ad + Premium components.",
            "AverageViewPercentage uses a fictional view-weighted model; not a substitute for Google's aggregate reporting.",
            "Country/device/traffic partitions are independent; never sum them together.",
            "No projects, networks, costs, OAuth grants, or real YPP status were created."], files=files)
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    validation = dict(meta=meta(), passed=True, check_count=len(checks), checks=checks, counts=manifest["counts"],
                      public_snapshot_sha256=public_hash, public_bundle_sha256=bundle_hash)
    (OUT / "validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": True, "checks": len(checks), "counts": manifest["counts"], "generated_at": generated_at,
                      "total_data_bytes": sum(file["bytes"] for file in files)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
