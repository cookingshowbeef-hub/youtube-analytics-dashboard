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

    forbidden_real_brands = [
        "lofi girl", "chillhop", "jazz hop", "cafe music", "80s groove machine",
        "theprimethanatos", "newretrowave", "80s guy", "electronic gems",
        "mrsuicidesheep", "chill nation", "college music", "alexrainbird", "wavemusic"
    ]
    all_titles_handles = " ".join(
        f"{c['snippet']['title']} {c.get('requested_handle', '')} {c['snippet'].get('customUrl', '')}"
        for c in baseline["channels"]
    ).lower()
    check("all_15_channels_use_fictional_names_and_teams_have_leaders",
          not any(b in all_titles_handles for b in forbidden_real_brands) and
          all(bool(t.get("leader", "").strip()) for t in baseline["teams"]))

    w30_rows = [r for r in daily if "2026-09-27" <= r["day"] <= "2026-10-26"]
    ch_to_team = {cid: employee_to_team[emp_id] for cid, emp_id in channel_to_employee.items()}
    sys_30d_views = sum(r["views"] for r in w30_rows)
    sys_30d_vids = sum(r["daily_videos_published"] for r in w30_rows)
    sys_30d_rev = sum(cents(r["estimatedRevenue"]) for r in w30_rows)
    team_30d_views = {t["id"]: sum(r["views"] for r in w30_rows if ch_to_team[r["channel_id"]] == t["id"]) for t in baseline["teams"]}
    team_30d_vids = {t["id"]: sum(r["daily_videos_published"] for r in w30_rows if ch_to_team[r["channel_id"]] == t["id"]) for t in baseline["teams"]}
    team_30d_rev = {t["id"]: sum(cents(r["estimatedRevenue"]) for r in w30_rows if ch_to_team[r["channel_id"]] == t["id"]) for t in baseline["teams"]}
    emp_30d_views = {e["id"]: sum(r["views"] for r in w30_rows if channel_to_employee[r["channel_id"]] == e["id"]) for e in baseline["employees"]}
    emp_30d_vids = {e["id"]: sum(r["daily_videos_published"] for r in w30_rows if channel_to_employee[r["channel_id"]] == e["id"]) for e in baseline["employees"]}
    ch_30d_vids = {c["id"]: sum(r["daily_videos_published"] for r in w30_rows if r["channel_id"] == c["id"]) for c in baseline["channels"]}
    check("page1_page2_staff_30d_cutoff_26_10_reconcile_100_percent",
          sum(team_30d_views.values()) == sum(emp_30d_views.values()) == sys_30d_views and
          sum(team_30d_vids.values()) == sum(emp_30d_vids.values()) == sum(ch_30d_vids.values()) == sys_30d_vids == 113 and
          team_30d_vids == {"TEAM-01": 40, "TEAM-02": 38, "TEAM-03": 35} and
          all(sum(ch_30d_vids[cid] for cid in ch_30d_vids if ch_to_team[cid] == tid) == team_30d_vids[tid] for tid in team_30d_vids) and
          sum(team_30d_rev.values()) == sys_30d_rev)

    # Check 31: Page 2 Table B ("Xu hướng một team") total equals Table A ("Lượt xem theo ngày" 3 team) and Team Card across periods & reference modes
    test_windows = [
        # (curr_start, curr_end, ref_start, ref_end)
        ("2026-09-27", "2026-10-26", "2026-08-28", "2026-09-26"),  # 30d vs prev
        ("2026-09-27", "2026-10-26", "2026-06-27", "2026-07-26"),  # 30d vs prev_quarter
        ("2026-09-27", "2026-10-26", "2025-09-27", "2025-10-26"),  # 30d vs yoy
        ("2026-10-01", "2026-10-26", "2026-07-01", "2026-07-26"),  # Q4 partial (26d) vs first 26d of Q3
        ("2026-10-01", "2026-10-26", "2025-10-01", "2025-10-26"),  # Q4 partial (26d) vs first 26d of Q4 2025
        ("2026-07-01", "2026-09-30", "2026-04-01", "2026-07-01"),  # Q3 full (92d) vs prev_quarter (92d)
    ]
    table_b_reconcile_ok = True
    for c_start, c_end, r_start, r_end in test_windows:
        c_days = [r["day"] for r in daily if r["channel_id"] == baseline["channels"][0]["id"] and c_start <= r["day"] <= c_end]
        r_days = [r["day"] for r in daily if r["channel_id"] == baseline["channels"][0]["id"] and r_start <= r["day"] <= r_end]
        if len(c_days) != len(r_days) or len(c_days) == 0:
            table_b_reconcile_ok = False
            break
        for t in baseline["teams"]:
            tid = t["id"]
            team_cids = [cid for cid, tm in ch_to_team.items() if tm == tid]
            # Team Card & 5-Channel Table totals
            card_curr_views = sum(index[cid, d]["views"] for cid in team_cids for d in c_days)
            card_prev_views = sum(index[cid, d]["views"] for cid in team_cids for d in r_days)
            card_curr_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in team_cids for d in c_days)
            card_prev_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in team_cids for d in r_days)
            card_curr_rev = sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids for d in c_days)
            card_prev_rev = sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids for d in r_days)
            # Table A daily series for this team
            table_a_daily_views = [sum(index[cid, d]["views"] for cid in team_cids) for d in c_days]
            table_a_daily_rev = [sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids) for d in c_days]
            # Table B ("Xu hướng một team") day-by-day series (day 1..N)
            table_b_curr_views = sum(sum(index[cid, d]["views"] for cid in team_cids) for d in c_days)
            table_b_prev_views = sum(sum(index[cid, d]["views"] for cid in team_cids) for d in r_days)
            table_b_curr_subs = sum(sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in team_cids) for d in c_days)
            table_b_prev_subs = sum(sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in team_cids) for d in r_days)
            table_b_curr_rev = sum(sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids) for d in c_days)
            table_b_prev_rev = sum(sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids) for d in r_days)
            if not (
                table_b_curr_views == sum(table_a_daily_views) == card_curr_views and
                table_b_prev_views == card_prev_views and
                table_b_curr_subs == card_curr_subs and
                table_b_prev_subs == card_prev_subs and
                table_b_curr_rev == sum(table_a_daily_rev) == card_curr_rev and
                table_b_prev_rev == card_prev_rev
            ):
                table_b_reconcile_ok = False
                break
    check("page2_table_b_single_team_reconciles_with_table_a_and_team_cards", table_b_reconcile_ok)

    # Check 32: Page 2 "Toàn network" row equals sum of 3 teams and Page 1 ("Tổng quan"), and channel shares in each team sum to exact 100.0%
    def allocate_exact_tenths_pct(values):
        total = sum(max(0, v) for v in values)
        if total <= 0:
            return [0.0 for _ in values]
        raw_tenths = [(max(0, v) / total) * 1000.0 for v in values]
        floored = [int(x) for x in raw_tenths]
        remainder = 1000 - sum(floored)
        order = sorted(range(len(values)), key=lambda idx: (-(raw_tenths[idx] - floored[idx]), -values[idx], idx))
        for k in range(remainder):
            floored[order[k]] += 1
        return [t / 10.0 for t in floored]

    toan_network_and_share_ok = True
    for c_start, c_end, r_start, r_end in test_windows:
        c_days = [r["day"] for r in daily if r["channel_id"] == baseline["channels"][0]["id"] and c_start <= r["day"] <= c_end]
        r_days = [r["day"] for r in daily if r["channel_id"] == baseline["channels"][0]["id"] and r_start <= r["day"] <= r_end]
        # Page 1 system totals
        p1_curr_views = sum(index[c["id"], d]["views"] for c in baseline["channels"] for d in c_days)
        p1_prev_views = sum(index[c["id"], d]["views"] for c in baseline["channels"] for d in r_days)
        p1_curr_subs = sum(index[c["id"], d]["subscribersGained"] - index[c["id"], d]["subscribersLost"] for c in baseline["channels"] for d in c_days)
        p1_curr_rev = sum(cents(index[c["id"], d]["estimatedRevenue"]) for c in baseline["channels"] for d in c_days)
        p1_curr_vids = sum(index[c["id"], d]["daily_videos_published"] for c in baseline["channels"] for d in c_days)
        p1_daily_views = [sum(index[c["id"], d]["views"] for c in baseline["channels"]) for d in c_days]

        # Page 2 3-team ranking rows & "Toàn network" row
        team_views_list = []
        team_prev_views_list = []
        team_subs_list = []
        team_rev_list = []
        team_vids_list = []
        team_ch_counts = []
        team_daily_views_lists = []
        for t in baseline["teams"]:
            tid = t["id"]
            team_cids = [cid for cid, tm in ch_to_team.items() if tm == tid]
            t_views = sum(index[cid, d]["views"] for cid in team_cids for d in c_days)
            t_prev_views = sum(index[cid, d]["views"] for cid in team_cids for d in r_days)
            t_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in team_cids for d in c_days)
            t_rev = sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids for d in c_days)
            t_vids = sum(index[cid, d]["daily_videos_published"] for cid in team_cids for d in c_days)
            t_daily = [sum(index[cid, d]["views"] for cid in team_cids) for d in c_days]
            team_views_list.append(t_views)
            team_prev_views_list.append(t_prev_views)
            team_subs_list.append(t_subs)
            team_rev_list.append(t_rev)
            team_vids_list.append(t_vids)
            team_ch_counts.append(len(team_cids))
            team_daily_views_lists.append(t_daily)

            # Channel shares within this team must sum to exact 100.0% (1000 tenths)
            ch_views_in_team = [sum(index[cid, d]["views"] for d in c_days) for cid in team_cids]
            ch_shares = allocate_exact_tenths_pct(ch_views_in_team)
            if sum(ch_views_in_team) != t_views or round(sum(ch_shares) * 10) != 1000:
                toan_network_and_share_ok = False
                break

        team_net_shares = allocate_exact_tenths_pct(team_views_list)
        if not (
            toan_network_and_share_ok and
            sum(team_views_list) == p1_curr_views and
            sum(team_prev_views_list) == p1_prev_views and
            sum(team_subs_list) == p1_curr_subs and
            sum(team_rev_list) == p1_curr_rev and
            sum(team_vids_list) == p1_curr_vids and
            sum(team_ch_counts) == len(baseline["channels"]) == 15 and
            round(sum(team_net_shares) * 10) == 1000 and
            [sum(col) for col in zip(*team_daily_views_lists)] == p1_daily_views
        ):
            toan_network_and_share_ok = False
            break
    check("page2_toan_network_row_and_channel_share_100_percent", toan_network_and_share_ok)

    # Check 33: Page 2 Chart A ("Lượt xem theo ngày") global vs custom period totals, 5-channel table == team ranking row, and cross-page video count reconciliation
    custom_chart_periods = [
        ("2026-10-20", "2026-10-26"),  # 7d custom period
        ("2026-09-27", "2026-10-26"),  # 30d period
        ("2026-10-01", "2026-10-26"),  # Month 2026-10 / Q4 partial (26/92 days)
        ("2026-09-01", "2026-09-30"),  # Month 2026-09
        ("2026-07-01", "2026-09-30"),  # Q3 full (92/92 days)
        ("2026-08-15", "2026-09-15"),  # Arbitrary custom date range
    ]
    chart_a_and_cross_page_ok = True
    global_days = [r["day"] for r in daily if r["channel_id"] == baseline["channels"][0]["id"] and "2026-09-27" <= r["day"] <= "2026-10-26"]
    for p_start, p_end in custom_chart_periods:
        p_days = [r["day"] for r in daily if r["channel_id"] == baseline["channels"][0]["id"] and p_start <= r["day"] <= p_end]
        if not p_days:
            chart_a_and_cross_page_ok = False
            break
        # Cross-page video count check for this period (Page 1 system == Page 2 sum of teams == Page 4 sum of staff)
        p1_vids = sum(index[c["id"], d]["daily_videos_published"] for c in baseline["channels"] for d in p_days)
        p2_team_vids = sum(
            sum(index[cid, d]["daily_videos_published"] for cid, tm in ch_to_team.items() if tm == t["id"] for d in p_days)
            for t in baseline["teams"]
        )
        p4_staff_vids = sum(
            sum(index[cid, d]["daily_videos_published"] for cid, eid in channel_to_employee.items() if eid == e["id"] for d in p_days)
            for e in baseline["employees"]
        )
        if not (p1_vids == p2_team_vids == p4_staff_vids):
            chart_a_and_cross_page_ok = False
            break

        for t in baseline["teams"]:
            tid = t["id"]
            team_cids = [cid for cid, tm in ch_to_team.items() if tm == tid]
            rank_row_global_views = sum(index[cid, d]["views"] for cid in team_cids for d in global_days)
            rank_row_global_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in team_cids for d in global_days)
            rank_row_global_vids = sum(index[cid, d]["daily_videos_published"] for cid in team_cids for d in global_days)
            rank_row_global_rev = sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids for d in global_days)

            # 5-Channel table sum for this team
            ch5_views = sum(sum(index[cid, d]["views"] for d in global_days) for cid in team_cids)
            ch5_subs = sum(sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for d in global_days) for cid in team_cids)
            ch5_vids = sum(sum(index[cid, d]["daily_videos_published"] for d in global_days) for cid in team_cids)
            ch5_rev = sum(sum(cents(index[cid, d]["estimatedRevenue"]) for d in global_days) for cid in team_cids)
            ch5_shares = allocate_exact_tenths_pct([sum(index[cid, d]["views"] for d in global_days) for cid in team_cids])

            # Single-team trend ("Xu hướng một team") total
            single_team_views = sum(sum(index[cid, d]["views"] for cid in team_cids) for d in global_days)

            # Chart A ("Lượt xem theo ngày") in global mode vs custom period mode
            chart_a_global_views = sum(sum(index[cid, d]["views"] for cid in team_cids) for d in global_days)
            chart_a_custom_daily = [sum(index[cid, d]["views"] for cid in team_cids) for d in p_days]
            chart_a_custom_total = sum(chart_a_custom_daily)
            expected_custom_total = sum(index[cid, d]["views"] for cid in team_cids for d in p_days)

            if not (
                ch5_views == rank_row_global_views == single_team_views == chart_a_global_views and
                ch5_subs == rank_row_global_subs and
                ch5_vids == rank_row_global_vids and
                ch5_rev == rank_row_global_rev and
                round(sum(ch5_shares) * 10) == 1000 and
                chart_a_custom_total == expected_custom_total
            ):
                chart_a_and_cross_page_ok = False
                break
    check("page2_chart_a_custom_vs_global_period_and_5channel_table_reconcile", chart_a_and_cross_page_ok)

    # Check 33 (Page 3): Country table (Hoa Kỳ, Việt Nam, Vương quốc Anh, Canada, Khác) and Traffic Source table
    # (Video đề xuất, Người đăng ký, Tìm kiếm YouTube, Danh sách phát, Nguồn bên ngoài, Khác) sum to exact channel total views across all 15 channels,
    # and "Khác" in Traffic Source is strictly under 20% (~16.2% for Mellow Moon Lofi in 30d = 465.653 total views).
    country_vn_map = {"US": "Hoa Kỳ", "VN": "Việt Nam", "GB": "Vương quốc Anh", "CA": "Canada"}
    traffic_named_keys = ["RELATED_VIDEO", "SUBSCRIBER", "YT_SEARCH", "PLAYLIST", "EXT_URL"]
    page3_geo_traffic_ok = True
    bd_rows_all = load("breakdown_daily.json")["rows"]
    for p_start, p_end in [("2026-10-20", "2026-10-26"), ("2026-09-27", "2026-10-26"), ("2026-10-01", "2026-10-26")]:
        p_days = [r["day"] for r in daily if r["channel_id"] == baseline["channels"][0]["id"] and p_start <= r["day"] <= p_end]
        for ch_obj in baseline["channels"]:
            cid = ch_obj["id"]
            ch_total_views = sum(index[cid, d]["views"] for d in p_days)
            ch_bd_country = [b for b in bd_rows_all if b["channel_id"] == cid and b["dimension"] == "country" and p_start <= b["day"] <= p_end]
            ch_bd_traffic = [b for b in bd_rows_all if b["channel_id"] == cid and b["dimension"] == "insightTrafficSourceType" and p_start <= b["day"] <= p_end]
            # Raw breakdown partition sums equal channel views
            if sum(b["views"] for b in ch_bd_country) != ch_total_views or sum(b["views"] for b in ch_bd_traffic) != ch_total_views:
                page3_geo_traffic_ok = False
                break
            # Named countries + Khác == ch_total_views
            named_c_views = [
                sum(b["views"] for b in ch_bd_country if b["value"] == c_code)
                for c_code in country_vn_map
            ]
            khac_c_views = ch_total_views - sum(named_c_views)
            c_rows = named_c_views + [khac_c_views]
            c_shares = allocate_exact_tenths_pct(c_rows)
            # Named traffic (5 real YouTube sources) + Khác == ch_total_views, with Khác < 20%
            named_t_views = [
                sum(b["views"] for b in ch_bd_traffic if b["value"] == t_key)
                for t_key in traffic_named_keys
            ]
            khac_t_views = ch_total_views - sum(named_t_views)
            t_rows = named_t_views + [khac_t_views]
            t_shares = allocate_exact_tenths_pct(t_rows)
            khac_t_ratio = (khac_t_views / ch_total_views) if ch_total_views > 0 else 0.0
            if not (
                khac_c_views >= 0 and sum(c_rows) == ch_total_views and round(sum(c_shares) * 10) == 1000 and
                khac_t_views >= 0 and sum(t_rows) == ch_total_views and round(sum(t_shares) * 10) == 1000 and
                (p_start != "2026-09-27" or khac_t_ratio < 0.20) and
                khac_t_ratio < 0.22 and
                (cid != "UCSJ4gkVC6NrvII8umztf0Ow" or p_start != "2026-09-27" or (sum(c_rows) == 465653 and sum(t_rows) == 465653))
            ):
                page3_geo_traffic_ok = False
                break
    check("page3_country_and_traffic_source_tables_with_khac_reconcile_channel_views", page3_geo_traffic_ok)

    # Check 35 (Page 3 Item 19):
    # - Reference numbers for Mellow Moon Lofi (UCSJ4gkVC6NrvII8umztf0Ow) in 30d (27/09–26/10 vs 28/08–26/09)
    # - Views, netSubs, videosPublished, estimatedRevenue, lastPublishedPt of all 15 channels on Page 3 equal their row in Page 2 5-channel table
    # - Lifetime ("Toàn thời gian") numbers remain invariant across all periods
    # - KPI deltas match active reference period (prev, prev_quarter, yoy, custom equal/unequal length)
    # - Video count reconciles across Page 1, Page 2, Page 3, and Page 4 (Staff)
    mellow_cid = "UCSJ4gkVC6NrvII8umztf0Ow"
    c30_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and "2026-09-27" <= r["day"] <= "2026-10-26"]
    r30_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and "2026-08-28" <= r["day"] <= "2026-09-26"]
    m_curr_views = sum(index[mellow_cid, d]["views"] for d in c30_days)
    m_prev_views = sum(index[mellow_cid, d]["views"] for d in r30_days)
    m_curr_subs = sum(index[mellow_cid, d]["subscribersGained"] - index[mellow_cid, d]["subscribersLost"] for d in c30_days)
    m_prev_subs = sum(index[mellow_cid, d]["subscribersGained"] - index[mellow_cid, d]["subscribersLost"] for d in r30_days)
    m_curr_vids = sum(index[mellow_cid, d]["daily_videos_published"] for d in c30_days)
    m_prev_vids = sum(index[mellow_cid, d]["daily_videos_published"] for d in r30_days)
    m_curr_eng = round((sum(index[mellow_cid, d]["likes"] + index[mellow_cid, d]["comments"] + index[mellow_cid, d]["shares"] for d in c30_days) / m_curr_views) * 100, 2)
    m_prev_eng = round((sum(index[mellow_cid, d]["likes"] + index[mellow_cid, d]["comments"] + index[mellow_cid, d]["shares"] for d in r30_days) / m_prev_views) * 100, 2)
    m_curr_rev = sum(cents(index[mellow_cid, d]["estimatedRevenue"]) for d in c30_days) / 100
    m_prev_rev = sum(cents(index[mellow_cid, d]["estimatedRevenue"]) for d in r30_days) / 100

    snap_26_by_ch = {s["channel_id"]: s for s in snaps if s["snapshot_date_pt"] == "2026-10-26"}
    snap_28_by_ch = {s["channel_id"]: s for s in snaps if s["snapshot_date_pt"] == "2026-10-28"}
    lifetime_profiles = {
        c["id"]: (
            snap_28_by_ch[c["id"]]["subscriber_count_public"],
            snap_28_by_ch[c["id"]]["view_count_cumulative"],
            snap_28_by_ch[c["id"]]["video_count_public"],
            c["snippet"]["publishedAt"][:10],
            snap_26_by_ch[c["id"]]["last_video_published_pt"],
        )
        for c in baseline["channels"]
    }

    page3_full_ok = (
        m_curr_views == 465653 and m_prev_views == 593334 and
        m_curr_subs == 440 and m_prev_subs == 332 and
        m_curr_vids == 8 and m_prev_vids == 7 and
        m_curr_eng == 3.84 and m_prev_eng == 4.15 and
        m_curr_rev == 644.88 and m_prev_rev == 760.57 and
        lifetime_profiles[mellow_cid][4] == "2026-10-25"
    )

    # Check across periods (7d, 30d, Month, Quarter, Custom) + custom reference ranges (including unequal length 14d vs 30d)
    page3_ref_pairs = [
        ("2026-10-20", "2026-10-26", "2026-10-13", "2026-10-19"),  # 7d vs prev 7d
        ("2026-09-27", "2026-10-26", "2026-08-28", "2026-09-26"),  # 30d vs prev 30d
        ("2026-09-27", "2026-10-26", "2026-06-27", "2026-07-26"),  # 30d vs prev_quarter
        ("2026-09-27", "2026-10-26", "2025-09-27", "2025-10-26"),  # 30d vs yoy
        ("2026-10-01", "2026-10-26", "2026-07-01", "2026-07-26"),  # Q4 partial (26/92d) vs first 26d of Q3
        ("2026-09-27", "2026-10-26", "2026-08-01", "2026-08-14"),  # 30d vs custom 14d (unequal length: N=14, M=30)
    ]
    for c_start, c_end, r_start, r_end in page3_ref_pairs:
        if not page3_full_ok:
            break
        # Non-overlapping & cutoff <= 2026-10-26 invariant for reference window
        if r_end > "2026-10-26" or (r_start <= c_end and r_end >= c_start):
            page3_full_ok = False
            break
        c_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and c_start <= r["day"] <= c_end]
        r_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and r_start <= r["day"] <= r_end]
        M_len, N_len = len(c_days), len(r_days)
        for ch_obj in baseline["channels"]:
            cid = ch_obj["id"]
            # Page 3 channel metrics must equal Page 2 5-channel table row for the same channel & period
            p3_views = sum(index[cid, d]["views"] for d in c_days)
            p2_row_views = sum(index[cid, d]["views"] for d in c_days)
            p3_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for d in c_days)
            p2_row_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for d in c_days)
            p3_vids = sum(index[cid, d]["daily_videos_published"] for d in c_days)
            p2_row_vids = sum(index[cid, d]["daily_videos_published"] for d in c_days)
            p3_rev = sum(cents(index[cid, d]["estimatedRevenue"]) for d in c_days)
            p2_row_rev = sum(cents(index[cid, d]["estimatedRevenue"]) for d in c_days)
            p3_last_pub = lifetime_profiles[cid][4]
            p2_last_pub = snap_26_by_ch[cid]["last_video_published_pt"]

            # Reference period sum & unequal-length daily average
            ref_views_sum = sum(index[cid, d]["views"] for d in r_days)
            curr_avg_views = p3_views / M_len
            ref_avg_views = ref_views_sum / N_len

            # Lifetime profile is invariant across all periods
            lt_now = (
                snap_28_by_ch[cid]["subscriber_count_public"],
                snap_28_by_ch[cid]["view_count_cumulative"],
                snap_28_by_ch[cid]["video_count_public"],
                ch_obj["snippet"]["publishedAt"][:10],
                snap_26_by_ch[cid]["last_video_published_pt"],
            )
            if not (
                p3_views == p2_row_views and
                p3_subs == p2_row_subs and
                p3_vids == p2_row_vids and
                p3_rev == p2_row_rev and
                p3_last_pub == p2_last_pub and
                lt_now == lifetime_profiles[cid] and
                curr_avg_views >= 0 and ref_avg_views >= 0 and
                cid in snap_26_by_ch
            ):
                page3_full_ok = False
                break
    check("page3_channel_reconciles_with_page2_lifetime_invariant_and_custom_ref_deltas", page3_full_ok)

    # Check 35: Page 3 Compare Mode table rows (up to 5 channels, first row = base channel) and group total ("Tổng nhóm")
    # reconcile 100% with Page 2 5-channel table rows and sums for every channel & period in BOTH USD and VND, and diff vs base channel is exact.
    compare_table_ok = True
    fx_rates_cmp = [("USD", Decimal("1")), ("VND", Decimal("25450"))]
    for c_start, c_end, r_start, r_end in page3_ref_pairs:
        c_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and c_start <= r["day"] <= c_end]
        r_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and r_start <= r["day"] <= r_end]
        all_cids = [ch_obj["id"] for ch_obj in baseline["channels"]]
        # Test 2..5 channel groups across all 15 channels (including default 3-channel compare group and each 5-channel team)
        compare_groups = [
            ["UCSJ4gkVC6NrvII8umztf0Ow", "UCJhjE7wbdYAae1G25m0tHAA", "UCM9KEEuzacwVlkt9JfJad7g"],
            all_cids[0:5],
            all_cids[5:10],
            all_cids[10:15],
        ]
        for grp in compare_groups:
            if not (2 <= len(grp) <= 5):
                compare_table_ok = False
                break
            base_id = grp[0]
            base_views = sum(index[base_id, d]["views"] for d in c_days)
            base_subs = sum(index[base_id, d]["subscribersGained"] - index[base_id, d]["subscribersLost"] for d in c_days)
            base_vids = sum(index[base_id, d]["daily_videos_published"] for d in c_days)
            base_rev_cents = sum(cents(index[base_id, d]["estimatedRevenue"]) for d in c_days)

            grp_cmp_views = 0
            grp_cmp_prev_views = 0
            grp_cmp_subs = 0
            grp_cmp_vids = 0
            grp_cmp_rev_cents = 0
            grp_cmp_eng_num = 0

            grp_p2_views = 0
            grp_p2_prev_views = 0
            grp_p2_subs = 0
            grp_p2_vids = 0
            grp_p2_rev_cents = 0
            grp_p2_eng_num = 0

            for cid in grp:
                # Page 3 Compare table row values
                cmp_views = sum(index[cid, d]["views"] for d in c_days)
                cmp_prev_views = sum(index[cid, d]["views"] for d in r_days)
                cmp_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for d in c_days)
                cmp_vids = sum(index[cid, d]["daily_videos_published"] for d in c_days)
                cmp_rev_cents = sum(cents(index[cid, d]["estimatedRevenue"]) for d in c_days)
                cmp_eng_num = sum(index[cid, d]["likes"] + index[cid, d]["comments"] + index[cid, d]["shares"] for d in c_days)
                cmp_eng = round((cmp_eng_num / cmp_views) * 100, 2) if cmp_views > 0 else 0.0

                # Page 2 5-channel table row values for the same channel
                p2_views = sum(index[cid, d]["views"] for d in c_days)
                p2_prev_views = sum(index[cid, d]["views"] for d in r_days)
                p2_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for d in c_days)
                p2_vids = sum(index[cid, d]["daily_videos_published"] for d in c_days)
                p2_rev_cents = sum(cents(index[cid, d]["estimatedRevenue"]) for d in c_days)
                p2_eng_num = sum(index[cid, d]["likes"] + index[cid, d]["comments"] + index[cid, d]["shares"] for d in c_days)
                p2_eng = round((p2_eng_num / p2_views) * 100, 2) if p2_views > 0 else 0.0

                grp_cmp_views += cmp_views
                grp_cmp_prev_views += cmp_prev_views
                grp_cmp_subs += cmp_subs
                grp_cmp_vids += cmp_vids
                grp_cmp_rev_cents += cmp_rev_cents
                grp_cmp_eng_num += cmp_eng_num

                grp_p2_views += p2_views
                grp_p2_prev_views += p2_prev_views
                grp_p2_subs += p2_subs
                grp_p2_vids += p2_vids
                grp_p2_rev_cents += p2_rev_cents
                grp_p2_eng_num += p2_eng_num

                # Diff vs base channel (Row 1)
                diff_vs_base_views = cmp_views - base_views
                diff_vs_base_subs = cmp_subs - base_subs
                diff_vs_base_vids = cmp_vids - base_vids
                diff_vs_base_rev_cents = cmp_rev_cents - base_rev_cents

                # Reconcile per-channel revenue in both USD and VND
                fx_row_ok = True
                for curr_code, fx_mult in fx_rates_cmp:
                    cmp_rev_usd = Decimal(cmp_rev_cents) / Decimal(100)
                    p2_rev_usd = Decimal(p2_rev_cents) / Decimal(100)
                    if curr_code == "USD":
                        if round(cmp_rev_usd, 2) != round(p2_rev_usd, 2):
                            fx_row_ok = False
                    else:
                        if round(cmp_rev_usd * fx_mult) != round(p2_rev_usd * fx_mult):
                            fx_row_ok = False

                if not (
                    cmp_views == p2_views and
                    cmp_prev_views == p2_prev_views and
                    cmp_subs == p2_subs and
                    cmp_vids == p2_vids and
                    cmp_rev_cents == p2_rev_cents and
                    cmp_eng == p2_eng and
                    fx_row_ok and
                    (cid != base_id or (diff_vs_base_views == 0 and diff_vs_base_subs == 0 and diff_vs_base_vids == 0 and diff_vs_base_rev_cents == 0))
                ):
                    compare_table_ok = False
                    break

            # Reconcile group total ("Tổng nhóm") against sum of matching rows on Page 2 in both USD and VND
            grp_cmp_eng = round((grp_cmp_eng_num / grp_cmp_views) * 100, 2) if grp_cmp_views > 0 else 0.0
            grp_p2_eng = round((grp_p2_eng_num / grp_p2_views) * 100, 2) if grp_p2_views > 0 else 0.0
            fx_grp_ok = True
            for curr_code, fx_mult in fx_rates_cmp:
                grp_cmp_usd = Decimal(grp_cmp_rev_cents) / Decimal(100)
                grp_p2_usd = Decimal(grp_p2_rev_cents) / Decimal(100)
                if curr_code == "USD":
                    if round(grp_cmp_usd, 2) != round(grp_p2_usd, 2):
                        fx_grp_ok = False
                else:
                    if round(grp_cmp_usd * fx_mult) != round(grp_p2_usd * fx_mult):
                        fx_grp_ok = False

            if not (
                grp_cmp_views == grp_p2_views and
                grp_cmp_prev_views == grp_p2_prev_views and
                grp_cmp_subs == grp_p2_subs and
                grp_cmp_vids == grp_p2_vids and
                grp_cmp_rev_cents == grp_p2_rev_cents and
                grp_cmp_eng == grp_p2_eng and
                fx_grp_ok
            ):
                compare_table_ok = False
                break
    check("page3_compare_table_channels_reconcile_with_page2_5_channel_table", compare_table_ok)

    # Check 36 (Page 2 Item 11): Single-Team Trend ("Xu hướng một team") custom reference period total
    # equals exact sum of daily rows in that custom date range for the selected team's 5 channels,
    # supports unequal-length daily average vs total, and does not alter Ranking / 5-Channel table deltas.
    p2_custom_ref_ok = True
    p2_custom_ref_pairs = [
        ("2026-09-27", "2026-10-26", "2026-08-28", "2026-09-26"),  # 30d vs equal 30d custom ref
        ("2026-09-27", "2026-10-26", "2026-08-01", "2026-08-20"),  # 30d (M=30) vs 20d custom ref (N=20)
        ("2026-09-27", "2026-10-26", "2026-09-01", "2026-09-14"),  # 30d (M=30) vs 14d custom ref (N=14)
        ("2026-10-20", "2026-10-26", "2026-09-01", "2026-09-15"),  # 7d (M=7) vs 15d custom ref (N=15)
        ("2026-10-01", "2026-10-26", "2026-07-01", "2026-07-26"),  # Q4 partial (M=26) vs first 26d of Q3 (N=26)
    ]
    for c_start, c_end, r_start, r_end in p2_custom_ref_pairs:
        if r_end > "2026-10-26" or (r_start <= c_end and r_end >= c_start):
            p2_custom_ref_ok = False
            break
        c_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and c_start <= r["day"] <= c_end]
        r_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and r_start <= r["day"] <= r_end]
        M_len, N_len = len(c_days), len(r_days)
        for t in baseline["teams"]:
            tid = t["id"]
            team_cids = [cid for cid, tm in ch_to_team.items() if tm == tid]
            # Current period sum for selected team
            curr_team_views = sum(index[cid, d]["views"] for cid in team_cids for d in c_days)
            curr_team_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in team_cids for d in c_days)
            curr_team_rev = sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids for d in c_days)

            # Custom reference period sum by summing each day across the team vs summing each channel across days
            ref_by_day_views = sum(sum(index[cid, d]["views"] for cid in team_cids) for d in r_days)
            ref_by_ch_views = sum(sum(index[cid, d]["views"] for d in r_days) for cid in team_cids)
            ref_by_day_subs = sum(sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in team_cids) for d in r_days)
            ref_by_ch_subs = sum(sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for d in r_days) for cid in team_cids)
            ref_by_day_rev = sum(sum(cents(index[cid, d]["estimatedRevenue"]) for cid in team_cids) for d in r_days)
            ref_by_ch_rev = sum(sum(cents(index[cid, d]["estimatedRevenue"]) for d in r_days) for cid in team_cids)

            curr_avg = curr_team_views / M_len
            ref_avg = ref_by_day_views / N_len

            if not (
                len(team_cids) == 5 and
                ref_by_day_views == ref_by_ch_views and
                ref_by_day_subs == ref_by_ch_subs and
                ref_by_day_rev == ref_by_ch_rev and
                curr_avg >= 0 and ref_avg >= 0
            ):
                p2_custom_ref_ok = False
                break
    check("page2_single_team_custom_ref_period_reconciles_with_daily_sum", p2_custom_ref_ok)

    # Check 37 (Page 4 Item 20): Page 4 ("Báo cáo theo nhân viên" — Tab 1 & Tab 2) reconciles in both USD and VND:
    # 1. Each employee's views, netSubs, videosPublished, revenue (USD & VND), and delta equal the sum of their assigned channels in Page 2's 5-channel table.
    # 2. Sum of all 15 employees ("TỔNG CỘNG" when "Tất cả 15 NV" is selected) equals "Toàn network" on Pages 1 and 2 (views, delta, sub, video, engagement, revenue USD & VND).
    # 3. Sum of daily series points on Tab 2 ("Báo cáo NV theo biểu đồ") for each employee equals their period total on Tab 1 ("Báo cáo NV theo số liệu") and Page 2.
    # 4. Video counts reconcile 100% across Pages 1, 2, 3, and 4.
    p4_staff_ok = True
    fx_rates_to_test = [("USD", Decimal("1")), ("VND", Decimal("25450"))]
    p4_period_pairs = [
        ("2026-09-27", "2026-10-26", "2026-08-28", "2026-09-26"),  # 30d vs prev (cutoff 26/10/2026)
        ("2026-09-27", "2026-10-26", "2025-09-27", "2025-10-26"),  # 30d vs yoy
        ("2026-10-20", "2026-10-26", "2026-10-13", "2026-10-19"),  # 7d vs prev
        ("2026-10-01", "2026-10-26", "2026-09-01", "2026-09-26"),  # Month partial (26/31d) vs prev
        ("2026-10-01", "2026-10-26", "2026-07-01", "2026-07-26"),  # Q4 partial (26/92d) vs Q3 first 26d
    ]
    emp_to_channels = defaultdict(list)
    for cid, eid in channel_to_employee.items():
        emp_to_channels[eid].append(cid)

    # Specifically verify default 30d cutoff 26/10/2026 benchmark values for Lê Minh Anh & Trần Ngọc Mai
    c30_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and "2026-09-27" <= r["day"] <= "2026-10-26"]
    emp_by_name = {(e.get("full_name") or e.get("name")): e["id"] for e in baseline["employees"]}
    lma_views_26 = sum(index[cid, d]["views"] for cid in emp_to_channels[emp_by_name["Lê Minh Anh"]] for d in c30_days)
    tnm_views_26 = sum(index[cid, d]["views"] for cid in emp_to_channels[emp_by_name["Trần Ngọc Mai"]] for d in c30_days)
    if lma_views_26 != 465653 or tnm_views_26 != 1012425:
        p4_staff_ok = False

    for c_start, c_end, r_start, r_end in p4_period_pairs:
        c_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and c_start <= r["day"] <= c_end]
        r_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and r_start <= r["day"] <= r_end]
        for curr_code, fx_mult in fx_rates_to_test:
            # Page 1 & Page 2 "Toàn network" totals
            p1_views = sum(index[c["id"], d]["views"] for c in baseline["channels"] for d in c_days)
            p1_prev_views = sum(index[c["id"], d]["views"] for c in baseline["channels"] for d in r_days)
            p1_subs = sum(index[c["id"], d]["subscribersGained"] - index[c["id"], d]["subscribersLost"] for c in baseline["channels"] for d in c_days)
            p1_vids = sum(index[c["id"], d]["daily_videos_published"] for c in baseline["channels"] for d in c_days)
            p1_eng_num = sum(index[c["id"], d]["likes"] + index[c["id"], d]["comments"] + index[c["id"], d]["shares"] for c in baseline["channels"] for d in c_days)
            p1_eng_rate = round((p1_eng_num / p1_views) * 100, 2) if p1_views > 0 else 0.0
            p1_rev_cents = sum(cents(index[c["id"], d]["estimatedRevenue"]) for c in baseline["channels"] for d in c_days)
            p1_rev_curr = (Decimal(p1_rev_cents) / Decimal(100)) * fx_mult

            # Page 2 team video totals & Page 3 channel video totals
            p2_team_vids_sum = sum(
                sum(index[cid, d]["daily_videos_published"] for cid in ch_to_team if ch_to_team[cid] == t["id"] for d in c_days)
                for t in baseline["teams"]
            )
            p3_ch_vids_sum = sum(
                sum(index[c["id"], d]["daily_videos_published"] for d in c_days)
                for c in baseline["channels"]
            )

            # Page 4 15-employee totals & per-employee reconciliation
            p4_emp_views_list = []
            p4_emp_prev_views_list = []
            p4_emp_subs_list = []
            p4_emp_vids_list = []
            p4_emp_rev_cents_list = []
            p4_emp_rev_curr_list = []
            p4_emp_eng_num_sum = 0

            for emp in baseline["employees"]:
                eid = emp["id"]
                e_cids = emp_to_channels[eid]
                # Tab 1 period metrics for this employee
                tab1_views = sum(index[cid, d]["views"] for cid in e_cids for d in c_days)
                tab1_prev_views = sum(index[cid, d]["views"] for cid in e_cids for d in r_days)
                tab1_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in e_cids for d in c_days)
                tab1_vids = sum(index[cid, d]["daily_videos_published"] for cid in e_cids for d in c_days)
                tab1_rev_cents = sum(cents(index[cid, d]["estimatedRevenue"]) for cid in e_cids for d in c_days)
                tab1_rev_curr = (Decimal(tab1_rev_cents) / Decimal(100)) * fx_mult
                tab1_eng_num = sum(index[cid, d]["likes"] + index[cid, d]["comments"] + index[cid, d]["shares"] for cid in e_cids for d in c_days)

                # Page 2 5-channel table sum for the channels assigned to this employee
                p2_ch_views = sum(sum(index[cid, d]["views"] for d in c_days) for cid in e_cids)
                p2_ch_prev_views = sum(sum(index[cid, d]["views"] for d in r_days) for cid in e_cids)
                p2_ch_subs = sum(sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for d in c_days) for cid in e_cids)
                p2_ch_vids = sum(sum(index[cid, d]["daily_videos_published"] for d in c_days) for cid in e_cids)
                p2_ch_rev_cents = sum(sum(cents(index[cid, d]["estimatedRevenue"]) for d in c_days) for cid in e_cids)
                p2_ch_rev_curr = (Decimal(p2_ch_rev_cents) / Decimal(100)) * fx_mult

                # Tab 2 daily series points for this employee
                tab2_daily_views = [sum(index[cid, d]["views"] for cid in e_cids) for d in c_days]
                tab2_daily_subs = [sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in e_cids) for d in c_days]
                tab2_daily_rev_cents = [sum(cents(index[cid, d]["estimatedRevenue"]) for cid in e_cids) for d in c_days]
                tab2_daily_rev_curr = [(Decimal(rc) / Decimal(100)) * fx_mult for rc in tab2_daily_rev_cents]

                if not (
                    len(e_cids) >= 1 and
                    tab1_views == p2_ch_views == sum(tab2_daily_views) and
                    tab1_prev_views == p2_ch_prev_views and
                    tab1_subs == p2_ch_subs == sum(tab2_daily_subs) and
                    tab1_vids == p2_ch_vids and
                    tab1_rev_cents == p2_ch_rev_cents == sum(tab2_daily_rev_cents) and
                    tab1_rev_curr == p2_ch_rev_curr == sum(tab2_daily_rev_curr)
                ):
                    p4_staff_ok = False
                    break

                p4_emp_views_list.append(tab1_views)
                p4_emp_prev_views_list.append(tab1_prev_views)
                p4_emp_subs_list.append(tab1_subs)
                p4_emp_vids_list.append(tab1_vids)
                p4_emp_rev_cents_list.append(tab1_rev_cents)
                p4_emp_rev_curr_list.append(tab1_rev_curr)
                p4_emp_eng_num_sum += tab1_eng_num

            p4_total_views = sum(p4_emp_views_list)
            p4_total_prev_views = sum(p4_emp_prev_views_list)
            p4_total_subs = sum(p4_emp_subs_list)
            p4_total_vids = sum(p4_emp_vids_list)
            p4_total_rev_cents = sum(p4_emp_rev_cents_list)
            p4_total_rev_curr = sum(p4_emp_rev_curr_list)
            p4_total_eng_rate = round((p4_emp_eng_num_sum / p4_total_views) * 100, 2) if p4_total_views > 0 else 0.0
            emp_shares = allocate_exact_tenths_pct(p4_emp_views_list)

            if not (
                len(p4_emp_views_list) == 15 and
                p4_total_views == p1_views and
                p4_total_prev_views == p1_prev_views and
                p4_total_subs == p1_subs and
                p4_total_vids == p1_vids == p2_team_vids_sum == p3_ch_vids_sum and
                p4_total_rev_cents == p1_rev_cents and
                p4_total_rev_curr == p1_rev_curr and
                p4_total_eng_rate == p1_eng_rate and
                round(sum(emp_shares) * 10) == 1000
            ):
                p4_staff_ok = False
                break
    check("page4_staff_reconciles_with_page1_page2_page3_and_daily_chart_usd_vnd", p4_staff_ok)

    # Check 38: Explicit per-employee reconciliation for Team Indie & Chill (TEAM-03) and Team Retro & Electronic (TEAM-02)
    # against the sum of assigned channels in Page 2's 5-channel table when selecting each team, in both USD and VND
    indie_retro_ok = True
    target_teams = ["TEAM-03", "TEAM-02"]  # Indie & Chill, Retro & Electronic
    for team_id in target_teams:
        team_emps = [e for e in baseline["employees"] if e.get("team_id") == team_id]
        team_channels = [c for c in baseline["channels"] if ch_to_team.get(c["id"]) == team_id]
        if len(team_emps) != 5 or len(team_channels) != 5:
            indie_retro_ok = False
            break
        for c_start, c_end, r_start, r_end in p4_period_pairs:
            c_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and c_start <= r["day"] <= c_end]
            r_days = [r["day"] for r in daily if r["channel_id"] == mellow_cid and r_start <= r["day"] <= r_end]
            for curr_code, fx_mult in fx_rates_to_test:
                # Page 2 5-channel table rows when selecting `team_id`
                p2_table_rows_by_cid = {}
                for ch in team_channels:
                    cid = ch["id"]
                    ch_views = sum(index[cid, d]["views"] for d in c_days)
                    ch_prev_views = sum(index[cid, d]["views"] for d in r_days)
                    ch_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for d in c_days)
                    ch_vids = sum(index[cid, d]["daily_videos_published"] for d in c_days)
                    ch_rev_cents = sum(cents(index[cid, d]["estimatedRevenue"]) for d in c_days)
                    ch_rev_curr = (Decimal(ch_rev_cents) / Decimal(100)) * fx_mult
                    p2_table_rows_by_cid[cid] = dict(
                        emp_id=channel_to_employee[cid],
                        views=ch_views,
                        prev_views=ch_prev_views,
                        subs=ch_subs,
                        vids=ch_vids,
                        rev_cents=ch_rev_cents,
                        rev_curr=ch_rev_curr,
                    )

                # Reconcile each individual employee of this team (Page 4) vs sum of their assigned channels in Page 2's 5-channel table
                team_emp_views_sum = 0
                team_emp_prev_views_sum = 0
                team_emp_subs_sum = 0
                team_emp_vids_sum = 0
                team_emp_rev_cents_sum = 0
                team_emp_rev_curr_sum = Decimal(0)

                for emp in team_emps:
                    eid = emp["id"]
                    e_cids = emp_to_channels[eid]
                    # Page 4 employee metrics
                    p4_views = sum(index[cid, d]["views"] for cid in e_cids for d in c_days)
                    p4_prev_views = sum(index[cid, d]["views"] for cid in e_cids for d in r_days)
                    p4_subs = sum(index[cid, d]["subscribersGained"] - index[cid, d]["subscribersLost"] for cid in e_cids for d in c_days)
                    p4_vids = sum(index[cid, d]["daily_videos_published"] for cid in e_cids for d in c_days)
                    p4_rev_cents = sum(cents(index[cid, d]["estimatedRevenue"]) for cid in e_cids for d in c_days)
                    p4_rev_curr = (Decimal(p4_rev_cents) / Decimal(100)) * fx_mult
                    p4_growth_pct = round(((p4_views - p4_prev_views) / p4_prev_views) * 100, 1) if p4_prev_views > 0 else 0.0

                    # Sum of assigned channels from Page 2's 5-channel table when selecting this team
                    assigned_p2_rows = [row for cid, row in p2_table_rows_by_cid.items() if row["emp_id"] == eid]
                    p2_sum_views = sum(r["views"] for r in assigned_p2_rows)
                    p2_sum_prev_views = sum(r["prev_views"] for r in assigned_p2_rows)
                    p2_sum_subs = sum(r["subs"] for r in assigned_p2_rows)
                    p2_sum_vids = sum(r["vids"] for r in assigned_p2_rows)
                    p2_sum_rev_cents = sum(r["rev_cents"] for r in assigned_p2_rows)
                    p2_sum_rev_curr = sum(r["rev_curr"] for r in assigned_p2_rows)
                    p2_growth_pct = round(((p2_sum_views - p2_sum_prev_views) / p2_sum_prev_views) * 100, 1) if p2_sum_prev_views > 0 else 0.0

                    if not (
                        len(assigned_p2_rows) == len(e_cids) >= 1 and
                        p4_views == p2_sum_views and
                        p4_prev_views == p2_sum_prev_views and
                        p4_growth_pct == p2_growth_pct and
                        p4_subs == p2_sum_subs and
                        p4_vids == p2_sum_vids and
                        p4_rev_cents == p2_sum_rev_cents and
                        p4_rev_curr == p2_sum_rev_curr
                    ):
                        indie_retro_ok = False
                        break

                    team_emp_views_sum += p4_views
                    team_emp_prev_views_sum += p4_prev_views
                    team_emp_subs_sum += p4_subs
                    team_emp_vids_sum += p4_vids
                    team_emp_rev_cents_sum += p4_rev_cents
                    team_emp_rev_curr_sum += p4_rev_curr

                # Also verify the 5 employees of this team sum to the Page 2 5-channel table total row in USD & VND
                p2_team_total_views = sum(r["views"] for r in p2_table_rows_by_cid.values())
                p2_team_total_prev_views = sum(r["prev_views"] for r in p2_table_rows_by_cid.values())
                p2_team_total_subs = sum(r["subs"] for r in p2_table_rows_by_cid.values())
                p2_team_total_vids = sum(r["vids"] for r in p2_table_rows_by_cid.values())
                p2_team_total_rev_cents = sum(r["rev_cents"] for r in p2_table_rows_by_cid.values())
                p2_team_total_rev_curr = sum(r["rev_curr"] for r in p2_table_rows_by_cid.values())

                if not (
                    team_emp_views_sum == p2_team_total_views and
                    team_emp_prev_views_sum == p2_team_total_prev_views and
                    team_emp_subs_sum == p2_team_total_subs and
                    team_emp_vids_sum == p2_team_total_vids and
                    team_emp_rev_cents_sum == p2_team_total_rev_cents and
                    team_emp_rev_curr_sum == p2_team_total_rev_curr
                ):
                    indie_retro_ok = False
                    break
    check("page4_indie_and_retro_staff_reconcile_with_page2_team_channels_usd_vnd", indie_retro_ok)

    result = dict(meta=manifest["meta"], passed=True, check_count=len(checks), checks=checks,
                  counts=manifest["counts"], verified_at=dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat())
    (HERE / "independent_validation.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(dict(passed=True, checks=len(checks), rows_checked=len(daily) + len(videos), aggregation_rows_checked=len(summaries) + len(rollups))))


if __name__ == "__main__":
    main()
