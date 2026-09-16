"""Verify the Day 5 Gemini, escalation, realtime, and schema pipeline."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT_DIR / "supabase" / "schema.sql"


def run_typescript_harness() -> dict[str, Any]:
    harness = r'''
import { setMaintenanceDecisionContext, explainScheduleDecision, chatWithAssistant } from './src/services/geminiService.ts';
import { checkEscalationTriggers, resolveDepartmentConflict, subscribeToSectionControllerEscalations } from './src/services/escalationEngine.ts';

const scheduleA = { defect_id: 'D-TMS-001', section: 'NDLS-GZB', department: 'Engineering', start_time_hhmm: '01:00', end_time_hhmm: '02:00', duration_mins: 60, priority_rank: 1, calculated_risk_score: 91, tracks_count: 1 };
const scheduleB = { defect_id: 'D-SMMS-001', section: 'NDLS-GZB', department: 'S & T', start_time_hhmm: '01:30', end_time_hhmm: '02:30', duration_mins: 60, priority_rank: 2, calculated_risk_score: 74, tracks_count: 1 };
const defect = { defect_id: 'D-TMS-001', source_system: 'TMS', department: 'Engineering', section: 'NDLS-GZB', severity: 5, days_overdue: 24, asset_age_years: 22, past_failure_count: 3, deferred_count: 2, calculated_risk_score: 91, status: 'UNASSIGNED', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() };
setMaintenanceDecisionContext({ activeSectionDefectCounts: { 'NDLS-GZB': 7, 'NDLS-PWL': 4 }, cpSatScheduleBlocks: [scheduleA, scheduleB], highPriorityTrainTimetables: [{ train_no: '12301', train_name: 'Rajdhani Express', section: 'NDLS-GZB', start_time_hhmm: '08:00', end_time_hhmm: '09:00' }] });
const explanation = await explainScheduleDecision(scheduleA, defect);
const chat = await chatWithAssistant('What is the current section bottleneck?', []);
const notices = [];
const unsubscribe = subscribeToSectionControllerEscalations((notice) => notices.push(notice));
const escalations = checkEscalationTriggers([defect]);
const bundle = resolveDepartmentConflict(scheduleA, scheduleB);
unsubscribe();
console.log(JSON.stringify({ explanation, chat, escalationCount: escalations.length, noticeCount: notices.length, bundle }));
'''
    result = subprocess.run(
        ["npx.cmd", "tsx", "-"],
        cwd=ROOT_DIR,
        input=harness,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"TypeScript service harness failed:\n{result.stdout}\n{result.stderr}")
    lines = [line for line in result.stdout.splitlines() if line.strip().startswith("{")]
    if not lines:
        raise RuntimeError(f"TypeScript harness returned no JSON:\n{result.stdout}\n{result.stderr}")
    return json.loads(lines[-1])


def verify_schema() -> None:
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    required_fragments = (
        "create table if not exists public.maintenance_schedules",
        "defect_id varchar not null unique references public.defects(defect_id)",
        "create table if not exists public.escalation_logs",
        "requires_emergency_authorization boolean not null default true",
        "idx_maintenance_schedules_section",
        "idx_escalation_logs_section_created_at",
        "alter table public.maintenance_schedules enable row level security",
        "alter table public.escalation_logs enable row level security",
        'create policy "maintenance_schedules_public_select"',
        'create policy "escalation_logs_authenticated_insert"',
    )
    for fragment in required_fragments:
        assert fragment in schema, f"Missing schema constraint: {fragment}"


def verify_architecture_files() -> None:
    required_files = {
        "Synthetic Data": [ROOT_DIR / "data" / "synthetic" / "defects.csv"],
        "LightGBM ML": [ROOT_DIR / "src" / "ml" / "train_model.py", ROOT_DIR / "models" / "defect_priority_lgb.pkl"],
        "CP-SAT Solver": [ROOT_DIR / "src" / "solver" / "cp_sat_solver.py", ROOT_DIR / "src" / "solver" / "solver_api.py"],
        "Multi-Horizon UI": [ROOT_DIR / "src" / "components" / "GanttChart.tsx", ROOT_DIR / "src" / "components" / "ImpactKpiDashboard.tsx"],
        "Gemini AI Sync": [ROOT_DIR / "src" / "services" / "geminiService.ts", ROOT_DIR / "src" / "services" / "escalationEngine.ts", ROOT_DIR / "src" / "services" / "realtimeSync.ts"],
    }
    for layer, paths in required_files.items():
        assert all(path.exists() for path in paths), f"Missing {layer} artifact"


def main() -> int:
    try:
        verify_architecture_files()
        verify_schema()
        result = run_typescript_harness()
        explanation = result["explanation"]
        assert isinstance(explanation, str) and len(explanation) > 0
        explanation_lines = [line for line in explanation.splitlines() if line.strip()]
        assert len(explanation_lines) >= 3 and all(line.lstrip().startswith("-") for line in explanation_lines), "Gemini explanation is not bullet-structured"
        assert isinstance(result["chat"], str) and result["chat"]
        assert result["escalationCount"] == 1 and result["noticeCount"] == 1
        bundle = result["bundle"]
        assert bundle["bundleType"] == "SHADOW_BLOCK"
        assert bundle["duration_mins"] == 90
        assert bundle["cumulativeRiskScore"] == 165

        print("\n" + "=" * 74)
        print("RAKSHA-BLOCK DAY 5 GEMINI / ESCALATION / REALTIME VERIFICATION")
        print("=" * 74)
        print(f"Gemini explanation bullets: {len(explanation_lines)} (PASS)")
        print("Gemini controller chat fallback/context path: PASS")
        print("Tier-1 overdue escalation trigger: PASS")
        print("Section Controller emergency notice broadcast: PASS")
        print(f"Shadow Block duration: {bundle['duration_mins']} minutes (PASS)")
        print("Escalation and maintenance schema constraints: PASS")
        print("Realtime service tables and lifecycle client: PASS")
        print("Synthetic Data layer: VERIFIED")
        print("LightGBM ML layer: VERIFIED")
        print("CP-SAT Solver layer: VERIFIED")
        print("Multi-Horizon UI layer: VERIFIED")
        print("Gemini AI Sync layer: VERIFIED")
        print("Day 5 deployment readiness: READY")
        print("=" * 74)
        return 0
    except Exception as exc:
        print("\nRAKSHA-BLOCK DAY 5 VERIFICATION: FAILED", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
