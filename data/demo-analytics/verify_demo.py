"""Independent checks of the emitted fixture files, without importing the generator."""
import csv
import datetime as dt
import hashlib
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8-sig"))


def cents(value):
    return int(Decimal(str(value)) * 100)


def main():
    manifest = load("manifest.json")
    source = HERE.parent / "mock-hierarchy/dataset.json"
    baseline = json.loads(source.read_text(encoding="utf-8-sig"))
    daily = load("channel_daily.json")["rows"]
    videos = load("video_daily.json")["rows"]
    remainders = load("other_content_daily.json")["rows"]
    summaries = load("summaries.json")["rows"]
    rollups = load("period_rollups.json")["rows"]
    video_summary = load("video_summaries.json")["rows"]
    checks = []

    def check(name, passed):
        checks.append(dict(name=name, passed=bool(passed)))
        if not passed:
            raise AssertionError(name)

    ids = {c["id"] for c in baseline["channels"]}
    video_links = {v["id"]: v["channel_id"] for v in baseline["videos"]}
    check("manifest_hashes_match_all_listed_files", all(hashlib.sha256((HERE / f["path"]).read_bytes()).hexdigest() == f["sha256"] for f in manifest["files"]))
    check("public_snapshot_hash_unchanged", hashlib.sha256(source.read_bytes()).hexdigest() == manifest["source_public_snapshot"]["sha256"])
    check("public_bundle_hash_unchanged", hashlib.sha256((HERE.parent / "mock-hierarchy/dataset.js").read_bytes()).hexdigest() == load("validation.json")["public_bundle_sha256"])
    check("public_analytics_still_unconnected_and_null", all(c["analytics"]["status"] == "not_connected" and c["analytics"]["estimatedRevenue"] is None and c["analytics"]["rpm"] is None for c in baseline["channels"]))
    check("actual_file_row_counts_match_manifest", all(len(load(f["path"])["rows"]) == f["row_count"] for f in manifest["files"] if f["path"].endswith(".json")))
    check("all_data_files_explicitly_demo_not_authorized", all((lambda m: m["source_kind"] == "synthetic_demo" and m["is_demo"] and m["source_api"] is None and m["oauth_authorized"] is False)(load(f["path"])["meta"]) for f in manifest["files"] if f["path"].endswith(".json")))
    index = {(r["channel_id"], r["day"]): r for r in daily}
    check("unique_channel_days_and_valid_fk", len(index) == len(daily) == 9990 and {r["channel_id"] for r in daily} == ids)
    check("video_days_unique_and_channel_fk_valid", len({(r["video_id"], r["day"]) for r in videos}) == len(videos) and all(video_links.get(r["video_id"]) == r["channel_id"] for r in videos))
    additive = ["views", "engagedViews", "estimatedMinutesWatched", "likes", "comments", "shares", "subscribersGained", "subscribersLost", "adImpressions", "monetizedPlaybacks"]
    money = ["estimatedRevenue", "estimatedAdRevenue", "estimatedRedPartnerRevenue", "grossRevenue"]

    def aggregate(rows):
        result = {f: sum(r[f] for r in rows) for f in additive}
        result.update({f: sum(cents(r[f]) for r in rows) / 100 for f in money})
        basis = sum(r["aggregation_components"]["view_percentage_basis_sum"] for r in rows)
        result.update(estimatedHoursWatched=round(result["estimatedMinutesWatched"] / 60, 6),
                      netSubscribers=result["subscribersGained"] - result["subscribersLost"],
                      averageViewDuration=round(result["estimatedMinutesWatched"] * 60 / result["views"], 2) if result["views"] else None,
                      averageViewPercentage=round(basis / result["views"] / 100, 2) if result["views"] else None,
                      proxyRpm=round(result["estimatedRevenue"] / result["views"] * 1000, 4) if result["views"] else None,
                      cpm=round(result["grossRevenue"] / result["adImpressions"] * 1000, 4) if result["adImpressions"] else None,
                      playbackBasedCpm=round(result["grossRevenue"] / result["monetizedPlaybacks"] * 1000, 4) if result["monetizedPlaybacks"] else None)
        return result

    channel_rows = defaultdict(list)
    for row in daily:
        channel_rows[row["channel_id"]].append(row)
    all_aggregates_match = True
    for row in summaries + rollups:
        start = row.get("available_start", row["period_start"])
        end = row.get("available_end", row["period_end"])
        selected = [r for cid in row["channel_ids"] for r in channel_rows[cid] if start <= r["day"] <= end]
        calculated = aggregate(selected)
        all_aggregates_match &= all(calculated[f] == row["metrics"][f] for f in calculated)
    check("all_1292_summaries_rollups_and_custom_rate_aggregations_exact", all_aggregates_match and len(summaries) + len(rollups) == 1292)

    channel_to_employee = {a["channel_id"]: a["employee_id"] for a in baseline["assignments"]}
    employee_to_team = {e["id"]: e["team_id"] for e in baseline["employees"]}
    check("employee_team_summary_membership_matches_original_assignments", all(
        all(channel_to_employee[cid] == r["entity_id"] for cid in r["channel_ids"]) if r["entity_type"] == "employee" else
        all(employee_to_team[channel_to_employee[cid]] == r["entity_id"] for cid in r["channel_ids"]) if r["entity_type"] == "team" else True
        for r in summaries + rollups))
    check("historical_employee_view_labeled_current_portfolio_only", all(r["attribution_mode"] == "demo_current_portfolio" for r in summaries + rollups) and all(a["valid_from"] == "2026-10-29" for a in baseline["assignments"]))

    by_video_day = defaultdict(list)
    for row in videos:
        by_video_day[row["channel_id"], row["day"]].append(row)
    check("sample_and_other_reconcile_all_emitted_additive_metrics", all(
        all(aggregate(by_video_day[r["channel_id"], r["day"]] + [r])[f] == index[r["channel_id"], r["day"]][f] for f in additive + money)
        for r in remainders))
    vs = {v["video_id"]: v for v in video_summary}
    check("video_activity_not_before_pacific_publication", all(r["day"] >= vs[r["video_id"]]["published_day_pacific"] for r in videos))
    check("video_watch_time_within_duration_capacity", all(r["estimatedMinutesWatched"] * 60 <= r["views"] * vs[r["video_id"]]["duration_seconds"] for r in videos))
    retention_ok = True
    for row in load("retention.json")["rows"]:
        summary = vs[row["video_id"]]
        metric = summary["metrics"]
        points = row["points"]
        integral = sum((points[i]["audienceWatchRatio"] + points[i + 1]["audienceWatchRatio"]) / 2 * (points[i + 1]["elapsedVideoTimeRatio"] - points[i]["elapsedVideoTimeRatio"]) for i in range(len(points) - 1))
        target = metric["estimatedMinutesWatched"] * 60 / metric["views"] / summary["duration_seconds"]
        retention_ok &= abs(integral - target) < 0.0001
    check("retention_curves_reconcile_with_demo_video_watch_fraction", retention_ok)
    check("150_video_summaries_145_active_5_no_activity", len(vs) == 150 and sum(v["status"] == "demo_ready" for v in vs.values()) == 145 and sum(v["status"] == "no_activity_in_demo_period" and v["metrics"] is None for v in vs.values()) == 5)

    partitions = defaultdict(list)
    for row in load("breakdown_daily.json")["rows"]:
        partitions[row["channel_id"], row["day"], row["dimension"]].append(row)
    check("country_device_traffic_independent_partitions_match", len(partitions) == 15 * 90 * 3 and all(
        sum(r["views"] for r in rows) == index[cid, day]["views"] and
        sum(r["estimatedMinutesWatched"] for r in rows) == index[cid, day]["estimatedMinutesWatched"] and
        (dimension != "country" or sum(cents(r["estimatedRevenue"]) for r in rows) == cents(index[cid, day]["estimatedRevenue"]))
        for (cid, day, dimension), rows in partitions.items()))
    check("daily_values_and_rates_are_valid", all(r["views"] >= r["monetizedPlaybacks"] >= 0 and all(isinstance(r[f], int) and r[f] >= 0 for f in additive) and (r["views"] != 0 or (r["proxyRpm"] is None and r["averageViewDuration"] is None)) for r in daily + videos + remainders))

    scenarios = load("scenarios.json")["rows"]
    check("9_scenario_coverage_counts_match_states", len(scenarios) == 9 and all(
        sum(s["analytics_status"] == "demo_ready" for s in scenario["channel_states"]) == scenario["expected_coverage"]["analytics_channels"] and
        sum(s["monetary_status"] == "demo_ready" for s in scenario["channel_states"]) == scenario["expected_coverage"]["monetary_channels"] for scenario in scenarios))
    zero_case = next(s for s in scenarios if s["scenario_id"] == "zero_revenue_positive_views")["metric_overrides"][0]
    check("zero_revenue_override_also_zeros_exact_cent_components", zero_case["metrics"]["proxyRpm"] == 0 and all(v == 0 for v in zero_case["aggregation_component_overrides"].values()))
    csv_rows = list(csv.DictReader((HERE / "channel_summary_28d.csv").open(encoding="utf-8-sig", newline="")))
    expected = {r["entity_id"]: r for r in summaries if r["period_key"] == "last_28_days" and r["entity_type"] == "channel"}
    check("csv_15_channels_matches_json_and_labels_demo", len(csv_rows) == 15 and all(r["source_kind"] == "synthetic_demo" and r["is_demo"] == "True" and cents(r["estimatedRevenue"]) == cents(expected[r["channel_id"]]["metrics"]["estimatedRevenue"]) for r in csv_rows))

    # Phase 0 additional normalization & reconciliation checks
    sample_28d_by_ch = defaultdict(int)
    for v in video_summary:
        if v.get("metrics_28d") and v["metrics_28d"].get("views"):
            sample_28d_by_ch[v["channel_id"]] += v["metrics_28d"]["views"]
    check("sample_video_share_28d_between_40_and_65_percent_for_all_15_channels",
          len(expected) == 15 and all(0.40 <= (sample_28d_by_ch[cid] / row["metrics"]["views"]) <= 0.65 for cid, row in expected.items()))

    check("avd_and_rpm_within_realistic_music_channel_bounds",
          all(180 <= row["metrics"]["averageViewDuration"] <= 900 and 0.80 <= row["metrics"]["proxyRpm"] <= 3.50 for row in expected.values()))

    reconcile_periods_ok = True
    for pkey in {r["period_key"] for r in summaries}:
        p_rows = [r for r in summaries if r["period_key"] == pkey]
        sys_row = next(r for r in p_rows if r["entity_type"] == "system")
        team_rows = [r for r in p_rows if r["entity_type"] == "team"]
        emp_rows = [r for r in p_rows if r["entity_type"] == "employee"]
        ch_rows = [r for r in p_rows if r["entity_type"] == "channel"]
        for f in additive + ["netSubscribers"]:
            reconcile_periods_ok &= (sum(r["metrics"][f] for r in team_rows) == sum(r["metrics"][f] for r in emp_rows) == sum(r["metrics"][f] for r in ch_rows) == sys_row["metrics"][f])
        for f in money:
            reconcile_periods_ok &= (sum(cents(r["metrics"][f]) for r in team_rows) == sum(cents(r["metrics"][f]) for r in emp_rows) == sum(cents(r["metrics"][f]) for r in ch_rows) == cents(sys_row["metrics"][f]))
    check("cross_page_reconciliation_teams_employees_channels_equal_system_kpis", reconcile_periods_ok)

    snaps = load("channel_snapshot_daily.json")["rows"]
    latest_snaps = [s for s in snaps if s["snapshot_date_pt"] == "2026-10-28"]
    total_demo_subs = sum(s["subscriber_count_public"] for s in latest_snaps)
    check("snapshot_daily_schema_timezone_rounding_and_anomalies_valid",
          len(snaps) == 1350 and len(latest_snaps) == 15 and 1000000 <= total_demo_subs <= 5000000 and
          all(dt.date.fromisoformat(s["captured_at_utc"][:10]) == dt.date.fromisoformat(s["snapshot_date_pt"]) + dt.timedelta(days=1) and
              s["sub_delta_below_step"] == (abs(s["public_sub_delta"]) < s["sub_rounding_step"]) for s in snaps) and
          sum(1 for s in snaps if s["is_negative_anomaly"] and s["raw_daily_views_delta"] < 0 and s["anomaly_reason"] is not None) >= 1)

    video_daily_index = defaultdict(int)
    for r in videos:
        video_daily_index[r["video_id"], r["day"]] += r["views"]
    first_7d_ok = True
    for v in video_summary:
        pub_d = dt.date.fromisoformat(v["published_day_pacific"])
        if v["status"] != "demo_ready":
            first_7d_ok &= (v["views_first_7d"] is None)
        elif pub_d < dt.date(2026, 7, 31):
            first_7d_ok &= (v["has_snapshot_since_publish"] is False and v["views_first_7d"] is None and v["views_first_7d_status"] == "before_snapshot_start")
        elif pub_d + dt.timedelta(days=6) > dt.date(2026, 10, 28):
            first_7d_ok &= (v["has_snapshot_since_publish"] is True and v["views_first_7d"] is None and v["views_first_7d_status"] == "pending_7d")
        else:
            exp_7d = sum(video_daily_index[v["video_id"], (pub_d + dt.timedelta(days=k)).isoformat()] for k in range(7))
            first_7d_ok &= (v["has_snapshot_since_publish"] is True and v["views_first_7d"] == exp_7d and v["views_first_7d_status"] == "ready")
    check("views_first_7d_honors_snapshot_start_and_7d_maturity", first_7d_ok)

    partial_sc = next(s for s in scenarios if s["scenario_id"] == "partial_monetary")
    mon_cids = [c["channel_id"] for c in partial_sc["channel_states"] if c["monetary_status"] == "demo_ready"]
    partial_rows = [r for r in daily if r["channel_id"] in mon_cids and "2026-09-27" <= r["day"] <= "2026-10-26"]
    partial_agg = aggregate(partial_rows)
    delayed_sc = next(s for s in scenarios if s["scenario_id"] == "delayed_monetary")
    delayed_rows = [r for r in daily if "2026-09-27" <= r["day"] <= "2026-10-24"]
    delayed_agg = aggregate(delayed_rows)
    check("partial_and_delayed_monetary_scenarios_reconcile_views_with_monetary",
          len(mon_cids) == 1 and partial_sc["period_end"] == "2026-10-26" and
          partial_agg["proxyRpm"] == round(partial_agg["estimatedRevenue"] / partial_agg["views"] * 1000, 4) and
          delayed_agg["proxyRpm"] == round(delayed_agg["estimatedRevenue"] / delayed_agg["views"] * 1000, 4))

    vids_30d_cur = sum(r.get("daily_videos_published", 0) for r in daily if "2026-09-27" <= r["day"] <= "2026-10-26")
    vids_30d_prev = sum(r.get("daily_videos_published", 0) for r in daily if "2026-08-28" <= r["day"] <= "2026-09-26")
    check("daily_videos_published_present_and_30d_reconciles",
          all("daily_videos_published" in r and isinstance(r["daily_videos_published"], int) and r["daily_videos_published"] >= 0 for r in daily) and
          all("daily_videos_published" in s for s in snaps) and
          vids_30d_cur > 50 and vids_30d_prev > 50)

    result = dict(meta=manifest["meta"], passed=True, check_count=len(checks), checks=checks,
                  counts=manifest["counts"], verified_at=dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat())
    (HERE / "independent_validation.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(dict(passed=True, checks=len(checks), rows_checked=len(daily) + len(videos), aggregation_rows_checked=len(summaries) + len(rollups))))


if __name__ == "__main__":
    main()
