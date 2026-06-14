#!/usr/bin/env python3
"""CLI utility to execute the Vanguard multi-agent LangGraph workflow."""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
for path in (ROOT, SCRIPTS):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Vanguard Multi-Agent workflow.")
    parser.add_argument("--query", type=str, required=True, help="User query describing the situation.")
    parser.add_argument("--telemetry", type=str, help="JSON-encoded telemetry string.")

    args = parser.parse_args()

    # Parse telemetry JSON
    telemetry_data = {}
    if args.telemetry:
        try:
            telemetry_data = json.loads(args.telemetry)
        except Exception as e:
            # Print JSON error and exit 0 so Node.js can parse the response
            print(json.dumps({
                "success": False,
                "error": f"Failed to parse telemetry JSON: {str(e)}"
            }))
            sys.exit(0)

    print("PYTHON RECEIVED QUERY:", args.query)
    print("PYTHON RECEIVED TELEMETRY:", telemetry_data)

    try:
        from graph import run_vanguard

        # Run the workflow
        result = run_vanguard(args.query, telemetry_data)

        # Build clean JSON response payload
        output = {
            "success": True,
            "query": result.get("query", ""),
            "retrieved_sources": result.get("retrieved_sources", []),
            "retrieval_results": result.get("retrieval_results", ""),
            "sensor_evidence": result.get("sensor_evidence", ""),
            "historical_incidents": result.get("historical_incidents", ""),
            "rdso_guidance": result.get("rdso_guidance", ""),
            "root_causes": result.get("root_causes", ""),
            "mitigation_actions": result.get("mitigation_actions", ""),
            "executive_summary": result.get("executive_summary", ""),
            "risk_level": result.get("risk_level", "LOW"),
            "escalation_level": result.get("escalation_level", "LOW"),
            "alerts": result.get("alerts", [])
        }
        print(json.dumps(output, ensure_ascii=True, indent=2))

    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        # Always print valid JSON and exit 0 so Node.js can parse the error
        print(json.dumps({
            "success": False,
            "error": f"Multi-Agent execution failed: {str(e)}"
        }))
        sys.exit(0)


if __name__ == "__main__":
    # Outer safety net: guarantee JSON output on ANY failure (import errors, syntax errors, etc.)
    try:
        main()
    except SystemExit:
        # Allow sys.exit(0) to pass through
        pass
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Fatal script error: {str(e)}"
        }))
        sys.exit(0)
