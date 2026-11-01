"""
Integration tests for FastAPI endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "AO*" in data["engine"]


def test_api_environment():
    res = client.get("/api/environment")
    assert res.status_code == 200
    data = res.json()
    assert len(data["waypoints"]) >= 7
    assert len(data["corridors"]) >= 10
    assert len(data["buildings"]) >= 10


def test_api_demo_missions():
    res = client.get("/api/missions/demos")
    assert res.status_code == 200
    demos = res.json()
    assert len(demos) == 5
    ids = [d["id"] for d in demos]
    assert "DEMO_1_NORMAL" in ids
    assert "DEMO_2_BATTERY_EMERGENCY" in ids
    assert "DEMO_3_OBSTACLE_REROUTE" in ids
    assert "DEMO_4_WEATHER_STORM" in ids
    assert "DEMO_5_DEST_CLOSED" in ids


def test_api_plan():
    payload = {
        "config": {
            "mission_id": "TEST_PLAN_1",
            "name": "Integration Test Plan",
            "start_waypoint_id": "WP_START",
            "destination_waypoint_id": "WP_DESTINATION",
            "vehicle_config": {
                "initial_battery_pct": 85.0,
                "emergency_reserve_pct": 15.0
            },
            "priority": "BALANCED",
            "risk_tolerance": 0.2,
            "seed": 42
        }
    }
    res = client.post("/api/plan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["route_waypoints"]) >= 3
    assert data["route_waypoints"][0] == "WP_START"
    assert data["route_waypoints"][-1] == "WP_DESTINATION"
    assert data["remaining_soc_pct"] > 15.0
    assert len(data["trace"]) > 0
    assert "explanation" in data


def test_api_counterfactuals():
    payload = {
        "config": {
            "mission_id": "TEST_CF_1",
            "name": "Test CF Mission",
            "start_waypoint_id": "WP_START",
            "destination_waypoint_id": "WP_DESTINATION",
            "vehicle_config": {
                "initial_battery_pct": 85.0
            },
            "priority": "BALANCED",
            "seed": 42
        }
    }
    res = client.post("/api/counterfactuals", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "baseline" in data
    assert "counterfactuals" in data
    assert len(data["counterfactuals"]) >= 5


def test_api_replan():
    payload = {
        "config": {
            "mission_id": "TEST_REPLAN_1",
            "name": "Test Replan",
            "start_waypoint_id": "WP_START",
            "destination_waypoint_id": "WP_DESTINATION",
            "vehicle_config": {
                "initial_battery_pct": 85.0
            },
            "priority": "BALANCED",
            "seed": 42
        },
        "current_waypoint_id": "WP_CENTRAL_CORE",
        "current_soc_pct": 75.0,
        "event": {
            "event_type": "OBSTACLE_BLOCK",
            "target_id": "COR_CENTRAL_NORTH",
            "description": "Corridor blocked test"
        },
        "original_route": ["WP_START", "WP_CENTRAL_CORE", "WP_NORTH_SKYWAY", "WP_DESTINATION"]
    }
    res = client.post("/api/replan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "spliced_full_route" in data
    assert "COR_CENTRAL_NORTH" in data["replan_reason"]


def test_api_evaluation():
    res = client.post("/api/evaluate")
    assert res.status_code == 200
    data = res.json()
    assert data["total_benchmarks"] == 5
    assert "AO* (AND-OR Multi-Conjunct)" in data["algorithms"]
    assert "A* (Single-Agent Projection)" in data["algorithms"]
