"""
Tests for reports API endpoints (quarterly performance and monthly trends).
"""
import pytest


def _orders(client, query=""):
    """Raw orders for the same filters, used to cross-check report aggregates."""
    response = client.get(f"/api/orders{query}")
    assert response.status_code == 200
    return response.json()


class TestQuarterlyReportsEndpoints:
    """Test suite for /api/reports/quarterly."""

    def test_get_quarterly_reports(self, client):
        """Test getting quarterly reports without filters."""
        response = client.get("/api/reports/quarterly")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        for quarter in data:
            for field in [
                "quarter",
                "total_orders",
                "total_revenue",
                "delivered_orders",
                "avg_order_value",
                "fulfillment_rate",
            ]:
                assert field in quarter

    def test_quarterly_reports_types(self, client):
        """Test that quarterly numeric fields have correct types and ranges."""
        data = client.get("/api/reports/quarterly").json()

        for quarter in data:
            assert isinstance(quarter["total_orders"], int)
            assert isinstance(quarter["delivered_orders"], int)
            assert isinstance(quarter["total_revenue"], (int, float))
            assert isinstance(quarter["avg_order_value"], (int, float))
            assert isinstance(quarter["fulfillment_rate"], (int, float))
            assert quarter["total_orders"] > 0
            assert 0 <= quarter["delivered_orders"] <= quarter["total_orders"]
            assert 0 <= quarter["fulfillment_rate"] <= 100

    def test_quarterly_reports_sorted(self, client):
        """Test that quarters are returned in chronological order."""
        data = client.get("/api/reports/quarterly").json()

        keys = [(int(q["quarter"][3:]), int(q["quarter"][1])) for q in data]
        assert keys == sorted(keys)

    def test_quarterly_totals_match_orders(self, client):
        """Test that quarterly totals add up to the raw orders."""
        data = client.get("/api/reports/quarterly").json()
        all_orders = _orders(client)

        assert sum(q["total_orders"] for q in data) == len(all_orders)
        expected_revenue = sum(order["total_value"] for order in all_orders)
        assert abs(sum(q["total_revenue"] for q in data) - expected_revenue) < 0.05

    def test_quarterly_calculations(self, client):
        """Test average order value and fulfillment rate per quarter."""
        data = client.get("/api/reports/quarterly").json()

        for quarter in data:
            expected_avg = quarter["total_revenue"] / quarter["total_orders"]
            assert abs(quarter["avg_order_value"] - expected_avg) < 0.01

            expected_rate = quarter["delivered_orders"] / quarter["total_orders"] * 100
            assert abs(quarter["fulfillment_rate"] - expected_rate) < 0.1

    def test_get_quarterly_reports_by_warehouse(self, client):
        """Test filtering quarterly reports by warehouse."""
        data = client.get("/api/reports/quarterly?warehouse=Tokyo").json()
        tokyo_orders = _orders(client, "?warehouse=Tokyo")

        assert sum(q["total_orders"] for q in data) == len(tokyo_orders)
        assert len(tokyo_orders) < len(_orders(client))

    def test_get_quarterly_reports_by_quarter(self, client):
        """Test that a quarter filter returns only that quarter."""
        data = client.get("/api/reports/quarterly?month=Q2-2025").json()

        assert [q["quarter"] for q in data] == ["Q2-2025"]
        assert data[0]["total_orders"] == len(_orders(client, "?month=Q2-2025"))

    def test_get_quarterly_reports_by_status(self, client):
        """Test that a Delivered status filter yields 100% fulfillment."""
        data = client.get("/api/reports/quarterly?status=delivered").json()

        assert len(data) > 0
        for quarter in data:
            assert quarter["delivered_orders"] == quarter["total_orders"]
            assert quarter["fulfillment_rate"] == 100.0

    def test_get_quarterly_reports_multiple_filters(self, client):
        """Test combining warehouse, category and month filters."""
        query = "?warehouse=London&category=sensors&month=Q1-2025"
        data = client.get(f"/api/reports/quarterly{query}").json()

        assert sum(q["total_orders"] for q in data) == len(_orders(client, query))
        for quarter in data:
            assert quarter["quarter"] == "Q1-2025"

    def test_quarterly_reports_all_filter_values(self, client):
        """Test that 'all' filter values are ignored."""
        unfiltered = client.get("/api/reports/quarterly").json()
        all_values = client.get(
            "/api/reports/quarterly?warehouse=all&category=all&status=all&month=all"
        ).json()

        assert all_values == unfiltered

    def test_quarterly_reports_no_matches(self, client):
        """Test that filters matching no orders return an empty list."""
        response = client.get("/api/reports/quarterly?warehouse=Nowhere")
        assert response.status_code == 200
        assert response.json() == []


class TestMonthlyTrendsEndpoints:
    """Test suite for /api/reports/monthly-trends."""

    def test_get_monthly_trends(self, client):
        """Test getting monthly trends without filters."""
        response = client.get("/api/reports/monthly-trends")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        for month in data:
            for field in ["month", "order_count", "revenue", "delivered_count"]:
                assert field in month

    def test_monthly_trends_types(self, client):
        """Test monthly field types, format and ranges."""
        data = client.get("/api/reports/monthly-trends").json()

        for month in data:
            assert len(month["month"]) == 7 and month["month"][4] == "-"
            assert isinstance(month["order_count"], int)
            assert isinstance(month["delivered_count"], int)
            assert isinstance(month["revenue"], (int, float))
            assert month["order_count"] >= 0
            assert 0 <= month["delivered_count"] <= month["order_count"]
            # Revenue is rounded to cents
            assert round(month["revenue"], 2) == month["revenue"]

    def test_monthly_trends_sorted(self, client):
        """Test that months are returned in chronological order."""
        data = client.get("/api/reports/monthly-trends").json()

        months = [m["month"] for m in data]
        assert months == sorted(months)

    def test_monthly_trends_match_orders(self, client):
        """Test that monthly counts and revenue match the raw orders."""
        data = client.get("/api/reports/monthly-trends").json()

        for month in data:
            month_orders = _orders(client, f"?month={month['month']}")
            assert month["order_count"] == len(month_orders)
            expected_revenue = sum(order["total_value"] for order in month_orders)
            assert abs(month["revenue"] - expected_revenue) < 0.01

    def test_monthly_trends_match_quarterly(self, client):
        """Test that both report endpoints agree on totals."""
        monthly = client.get("/api/reports/monthly-trends").json()
        quarterly = client.get("/api/reports/quarterly").json()

        assert sum(m["order_count"] for m in monthly) == sum(q["total_orders"] for q in quarterly)

    def test_get_monthly_trends_by_month(self, client):
        """Test that a month filter returns only that month."""
        data = client.get("/api/reports/monthly-trends?month=2025-03").json()

        assert [m["month"] for m in data] == ["2025-03"]

    def test_get_monthly_trends_by_quarter(self, client):
        """Test that a quarter filter returns its three months."""
        data = client.get("/api/reports/monthly-trends?month=Q3-2025").json()

        assert [m["month"] for m in data] == ["2025-07", "2025-08", "2025-09"]

    @pytest.mark.parametrize(
        "query",
        [
            "?warehouse=San Francisco",
            "?category=power supplies",
            "?status=backordered",
            "?warehouse=Tokyo&category=controllers&status=shipped",
        ],
    )
    def test_get_monthly_trends_filtered(self, client, query):
        """Test that each filter (and combinations) scopes the trends like /api/orders."""
        data = client.get(f"/api/reports/monthly-trends{query}").json()
        filtered_orders = _orders(client, query)

        assert sum(m["order_count"] for m in data) == len(filtered_orders)
        assert len(filtered_orders) < len(_orders(client))

    def test_monthly_trends_filtered_months_are_contiguous(self, client):
        """Test that months without matching orders are filled with zero rows.

        The client computes month-over-month change from adjacent rows, so a gap
        (e.g. no February orders) must not make March compare against January.
        """
        found_gap_fill = False
        for warehouse in ["San Francisco", "London", "Tokyo"]:
            for status in ["delivered", "shipped", "processing", "backordered"]:
                query = f"?warehouse={warehouse}&category=sensors&status={status}"
                data = client.get(f"/api/reports/monthly-trends{query}").json()

                months = [int(m["month"][:4]) * 12 + int(m["month"][5:]) for m in data]
                assert all(b - a == 1 for a, b in zip(months, months[1:])), query

                for month in data:
                    if month["order_count"] == 0:
                        found_gap_fill = True
                        assert month["revenue"] == 0
                        assert month["delivered_count"] == 0

        # The data set has gaps for these combinations; make sure filling actually ran.
        assert found_gap_fill

    def test_monthly_trends_no_matches(self, client):
        """Test that filters matching no orders return an empty list."""
        response = client.get("/api/reports/monthly-trends?category=nonexistent")
        assert response.status_code == 200
        assert response.json() == []
