"""
Tests for restocking order API endpoints.
"""
import pytest

import main


@pytest.fixture(autouse=True)
def reset_restock_orders():
    """Clear the in-memory restocking orders so each test starts empty."""
    main.restock_orders.clear()
    yield
    main.restock_orders.clear()


def _forecasts(client):
    return {f["item_sku"]: f for f in client.get("/api/demand").json()}


class TestDemandForecastCostFields:
    """Test the cost and lead-time fields the Restocking tab depends on."""

    def test_demand_forecast_cost_fields_types(self, client):
        """Test that every forecast has a positive unit cost and lead time."""
        response = client.get("/api/demand")
        assert response.status_code == 200

        data = response.json()
        assert len(data) > 0
        for forecast in data:
            assert isinstance(forecast["unit_cost"], (int, float))
            assert isinstance(forecast["lead_time_days"], int)
            assert forecast["unit_cost"] > 0
            assert forecast["lead_time_days"] > 0


class TestRestockingOrdersEndpoints:
    """Test suite for restocking-order endpoints."""

    def test_get_all_restocking_orders_empty(self, client):
        """Test that no restocking orders exist before any are submitted."""
        response = client.get("/api/restocking-orders")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_restocking_order(self, client):
        """Test submitting a restocking order and reading it back."""
        payload = {
            "budget": 10000,
            "items": [{"sku": "WDG-001", "name": "Industrial Widget Type A", "quantity": 10, "unit_cost": 42.5}],
        }
        response = client.post("/api/restocking-orders", json=payload)
        assert response.status_code == 201

        order = response.json()
        assert order["status"] == "Submitted"
        assert order["order_number"].startswith("RST-")
        assert order["budget"] == 10000
        assert len(order["items"]) == 1
        assert "T" in order["submitted_date"]
        assert "T" in order["expected_delivery"]

        listed = client.get("/api/restocking-orders").json()
        assert len(listed) == 1
        assert listed[0]["id"] == order["id"]

    def test_restocking_orders_newest_first(self, client):
        """Test that submitted orders are listed newest first."""
        item = {"sku": "GSK-203", "name": "Gasket", "quantity": 1, "unit_cost": 1}
        first = client.post("/api/restocking-orders", json={"budget": 1000, "items": [item]}).json()
        second = client.post("/api/restocking-orders", json={"budget": 1000, "items": [item]}).json()

        listed = client.get("/api/restocking-orders").json()
        assert [o["id"] for o in listed] == [second["id"], first["id"]]
        assert first["order_number"] != second["order_number"]

    def test_restocking_order_lead_time_calculation(self, client):
        """Test that the order lead time is the slowest item's lead time."""
        forecasts = _forecasts(client)
        skus = ["FLT-405", "MTR-304", "GSK-203"]
        items = [{"sku": s, "name": "x", "quantity": 1, "unit_cost": 1} for s in skus]

        response = client.post("/api/restocking-orders", json={"budget": 10000, "items": items})
        assert response.status_code == 201

        expected = max(forecasts[s]["lead_time_days"] for s in skus)
        assert response.json()["lead_time_days"] == expected

    def test_restocking_order_total_cost_calculation(self, client):
        """Test that totals use server-side prices, not client-sent ones."""
        forecasts = _forecasts(client)
        items = [
            {"sku": "WDG-001", "name": "x", "quantity": 5, "unit_cost": 0.01},
            {"sku": "CTL-330", "name": "x", "quantity": 2, "unit_cost": 0.01},
        ]
        response = client.post("/api/restocking-orders", json={"budget": 10000, "items": items})
        assert response.status_code == 201

        order = response.json()
        expected = 5 * forecasts["WDG-001"]["unit_cost"] + 2 * forecasts["CTL-330"]["unit_cost"]
        assert order["total_cost"] == round(expected, 2)
        for line in order["items"]:
            assert line["unit_cost"] == forecasts[line["sku"]]["unit_cost"]
            assert line["name"] == forecasts[line["sku"]]["item_name"]

    def test_restocking_order_over_budget(self, client):
        """Test that an order costing more than the budget is rejected."""
        # Client claims a tiny unit cost; server pricing must still push it over budget.
        items = [{"sku": "MTR-304", "name": "x", "quantity": 10, "unit_cost": 0.01}]
        response = client.post("/api/restocking-orders", json={"budget": 100, "items": items})
        assert response.status_code == 400
        assert "budget" in response.json()["detail"].lower()
        assert client.get("/api/restocking-orders").json() == []

    def test_restocking_order_exactly_at_budget(self, client):
        """Test that a total exactly equal to the budget is accepted.

        GSK-203 costs 3.20, and 3 * 3.2 is 9.600000000000001 in float dollars,
        so this guards against a float comparison rejecting an exact fit.
        """
        unit_cost = _forecasts(client)["GSK-203"]["unit_cost"]
        items = [{"sku": "GSK-203", "name": "x", "quantity": 3, "unit_cost": unit_cost}]
        response = client.post("/api/restocking-orders", json={"budget": round(3 * unit_cost, 2), "items": items})
        assert response.status_code == 201
        assert response.json()["total_cost"] == round(3 * unit_cost, 2)

    def test_restocking_order_one_cent_over_budget(self, client):
        """Test that a total one cent above the budget is rejected."""
        unit_cost = _forecasts(client)["GSK-203"]["unit_cost"]
        items = [{"sku": "GSK-203", "name": "x", "quantity": 3, "unit_cost": unit_cost}]
        response = client.post("/api/restocking-orders", json={"budget": round(3 * unit_cost - 0.01, 2), "items": items})
        assert response.status_code == 400
        assert client.get("/api/restocking-orders").json() == []

    def test_restocking_order_duplicate_sku(self, client):
        """Test that the same SKU twice in one order is rejected."""
        item = {"sku": "WDG-001", "name": "x", "quantity": 1, "unit_cost": 1}
        response = client.post("/api/restocking-orders", json={"budget": 1000, "items": [item, item]})
        assert response.status_code == 400
        assert "duplicate" in response.json()["detail"].lower()
        assert client.get("/api/restocking-orders").json() == []

    @pytest.mark.parametrize("budget", [0, -100])
    def test_restocking_order_invalid_budget(self, client, budget):
        """Test that a zero or negative budget is rejected."""
        items = [{"sku": "WDG-001", "name": "x", "quantity": 1, "unit_cost": 1}]
        response = client.post("/api/restocking-orders", json={"budget": budget, "items": items})
        assert response.status_code == 400
        assert client.get("/api/restocking-orders").json() == []

    def test_restocking_order_missing_budget(self, client):
        """Test that a request without a budget fails Pydantic validation."""
        items = [{"sku": "WDG-001", "name": "x", "quantity": 1, "unit_cost": 1}]
        response = client.post("/api/restocking-orders", json={"items": items})
        assert response.status_code == 422

    def test_restocking_order_unknown_sku(self, client):
        """Test that an unknown SKU returns 404."""
        items = [{"sku": "NOPE-999", "name": "x", "quantity": 1, "unit_cost": 1}]
        response = client.post("/api/restocking-orders", json={"budget": 1000, "items": items})
        assert response.status_code == 404
        assert "NOPE-999" in response.json()["detail"]

    def test_restocking_order_empty_items(self, client):
        """Test that an order with no items is rejected."""
        response = client.post("/api/restocking-orders", json={"budget": 1000, "items": []})
        assert response.status_code == 400
        assert client.get("/api/restocking-orders").json() == []

    @pytest.mark.parametrize("quantity", [0, -5])
    def test_restocking_order_invalid_quantity(self, client, quantity):
        """Test that zero or negative quantities are rejected."""
        items = [{"sku": "WDG-001", "name": "x", "quantity": quantity, "unit_cost": 1}]
        response = client.post("/api/restocking-orders", json={"budget": 1000, "items": items})
        assert response.status_code == 400
        assert client.get("/api/restocking-orders").json() == []
