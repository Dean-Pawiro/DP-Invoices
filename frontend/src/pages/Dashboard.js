import React, { useState, useEffect } from "react";
import API from "../api";
import "./Dashboard.css";

function Dashboard() {
  const [stats, setStats] = useState({
    total_revenue: 0,
    outstanding_amount: 0,
    unpaid_count: 0
  });
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ratesError, setRatesError] = useState(null);

  useEffect(() => {
    fetchStats();
    const cachedRates = localStorage.getItem("cmeRatesCache");
    if (cachedRates) {
      try {
        const parsedRates = JSON.parse(cachedRates);
        if (parsedRates && parsedRates.usd && parsedRates.eur) {
          setRates(parsedRates);
          setRatesError(null);
        }
      } catch (err) {
        console.warn("Failed to read cached CME rates:", err);
      }
    }
    const hasFetchedRates = localStorage.getItem("cmeRatesFetched") === "true";
    if (!hasFetchedRates) {
      fetchRates().finally(() => {
        localStorage.setItem("cmeRatesFetched", "true");
      });
    }
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await API.get("/invoices/stats/overview");
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRates = async () => {
    try {
      setRatesLoading(true);
      const response = await API.get("/rates/cme");
      setRates(response.data);
      localStorage.setItem("cmeRatesCache", JSON.stringify(response.data));
      setRatesError(null);
    } catch (err) {
      console.error("Failed to fetch CME rates:", err);
      setRatesError("Failed to load daily currency rate");
    } finally {
      setRatesLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <p className="welcome-text">Welcome! Here's an overview of your invoicing activity.</p>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">
            {loading ? "..." : `$${stats.total_revenue.toFixed(2)}`}
          </div>
          <div className="stat-description">All-time paid invoices</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value">
            {loading ? "..." : `$${stats.outstanding_amount.toFixed(2)}`}
          </div>
          <div className="stat-description">Amount awaiting payment</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Unpaid Invoices</div>
          <div className="stat-value">
            {loading ? "..." : stats.unpaid_count}
          </div>
          <div className="stat-description">Invoices pending payment</div>
        </div>

        <div className="stat-card currency-card">
          <div className="currency-header">
            <div className="stat-label">Daily Currency Rate (CME)</div>
            <button
              type="button"
              className="currency-refresh"
              onClick={fetchRates}
              disabled={ratesLoading}
            >
              {ratesLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {ratesError ? (
            <div className="currency-error">{ratesError}</div>
          ) : !rates && !ratesLoading ? (
            <div className="currency-empty">Press Refresh to load rates.</div>
          ) : (
            <div className="currency-rates">
              <div className="currency-row">
                <span className="currency-code">USD</span>
                <span className="currency-value">
                  {ratesLoading || !rates ? "..." : `${rates.usd} SRD`}
                </span>
              </div>
              <div className="currency-row">
                <span className="currency-code">EUR</span>
                <span className="currency-value">
                  {ratesLoading || !rates ? "..." : `${rates.eur} SRD`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
