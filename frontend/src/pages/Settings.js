import React, { useEffect, useState } from "react";
import API from "../api";
import "./Settings.css";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("data");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState("");
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [deletingBackups, setDeletingBackups] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [dbStatus, setDbStatus] = useState({
    loading: true,
    ok: null,
    path: "",
    checkedAt: null,
    error: "",
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    setDarkMode(isDark);
    document.body.classList.toggle("dark-mode", isDark);
  }, []);

  useEffect(() => {
    fetchDbStatus();
    fetchBackups();
  }, []);

  const fetchDbStatus = async () => {
    try {
      setDbStatus((prev) => ({ ...prev, loading: true, error: "" }));
      const response = await API.get("/database/status");
      setDbStatus({
        loading: false,
        ok: response.data?.ok === true,
        path: response.data?.path || "",
        checkedAt: new Date().toISOString(),
        error: response.data?.error || "",
      });
    } catch (err) {
      setDbStatus({
        loading: false,
        ok: false,
        path: "",
        checkedAt: new Date().toISOString(),
        error: err?.response?.data?.error || err?.message || "Failed to check database status",
      });
    }
  };

  const handleExportDatabase = async () => {
    try {
      setExporting(true);
      const response = await API.get("/database/export", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoices-backup-${new Date().toISOString().split("T")[0]}.db`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert("Database exported successfully");
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export database");
    } finally {
      setExporting(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const response = await API.get("/database/backups");
      const list = response.data?.backups || [];
      setBackups(list);
      if (list.length === 0) {
        setSelectedBackup("");
      } else if (!list.includes(selectedBackup)) {
        setSelectedBackup(list[0]);
      }
    } catch (err) {
      console.error("Failed to load backups:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleImportDatabase = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".db")) {
      alert("Please select a valid .db file");
      return;
    }

    const confirmed = window.confirm(
      "Importing a database will replace your current data and restart the database connection. A backup will be created. Continue?"
    );
    
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("database", file);

      const response = await API.post("/database/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(response.data.message || "Database imported and restarted successfully.");
      event.target.value = "";
    } catch (err) {
      console.error("Import failed:", err);
      alert(err?.response?.data?.error || "Failed to import database");
      event.target.value = "";
    } finally {
      setImporting(false);
    }
  };

  const handleRestartDatabase = async () => {
    const confirmed = window.confirm(
      "This will restart the database connection. Continue?"
    );
    
    if (!confirmed) return;

    try {
      setRestarting(true);
      const response = await API.post("/database/restart");
      alert(response.data.message || "Database restarted successfully");
      await fetchDbStatus();
    } catch (err) {
      console.error("Restart failed:", err);
      alert(err?.response?.data?.error || "Failed to restart database");
    } finally {
      setRestarting(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    const confirmed = window.confirm(
      "This will replace your current database with the selected backup and restart the database connection. Continue?"
    );

    if (!confirmed) return;

    try {
      setRestoringBackup(true);
      const response = await API.post("/database/backups/use", {
        filename: selectedBackup,
      });
      alert(response.data.message || "Backup restored successfully");
      await fetchDbStatus();
    } catch (err) {
      console.error("Restore failed:", err);
      alert(err?.response?.data?.error || "Failed to restore backup");
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleDeleteAllBackups = async () => {
    const confirmed = window.confirm(
      "This will permanently delete all backup files. Continue?"
    );

    if (!confirmed) return;

    try {
      setDeletingBackups(true);
      const response = await API.post("/database/backups/delete-all");
      alert(`Deleted ${response.data.deleted || 0} backups`);
      setSelectedBackup("");
      await fetchBackups();
    } catch (err) {
      console.error("Delete backups failed:", err);
      alert(err?.response?.data?.error || "Failed to delete backups");
    } finally {
      setDeletingBackups(false);
    }
  };

  const handleToggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.body.classList.toggle("dark-mode", nextMode);
    localStorage.setItem("theme", nextMode ? "dark" : "light");
  };


  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        <h3>Settings</h3>
        <nav className="settings-nav">
            <button
            className={`settings-nav-item ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            Account General
          </button>
          <button
            className={`settings-nav-item ${activeTab === "data" ? "active" : ""}`}
            onClick={() => setActiveTab("data")}
          >
            Data
          </button>
          <button
            className={`settings-nav-item ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            Appearance
          </button>
        </nav>
      </div>

      <div className="settings-content">
        {activeTab === "data" && (
          <div className="settings-section">
            <h2>Data Management</h2>
            <div className="settings-item">
              <div className="settings-item-stack">
                <div>
                  <h3>Database Status</h3>
                  <p>Check if the database is running</p>
                </div>
                <div className="db-status-row">
                  <span
                    className={`status-pill ${
                      dbStatus.loading
                        ? "status-loading"
                        : dbStatus.ok
                        ? "status-ok"
                        : "status-error"
                    }`}
                  >
                    {dbStatus.loading ? "Checking..." : dbStatus.ok ? "Running" : "Offline"}
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={fetchDbStatus}
                    disabled={dbStatus.loading}
                  >
                    Refresh
                  </button>
                </div>
                {dbStatus.path && (
                  <p className="db-meta">DB Path: {dbStatus.path}</p>
                )}
                {dbStatus.checkedAt && (
                  <p className="db-meta">
                    Last Checked: {new Date(dbStatus.checkedAt).toLocaleString()}
                  </p>
                )}
                {dbStatus.error && <p className="db-error">{dbStatus.error}</p>}
              </div>
            </div>
            <div className="settings-item">
              <div>
                <h3>Export Database</h3>
                <p>Download a backup of your invoices database</p>
              </div>
              <button
                onClick={handleExportDatabase}
                disabled={exporting}
                className="btn-export"
              >
                {exporting ? "Exporting..." : "Export Database"}
              </button>
            </div>
            <div className="settings-item">
              <div>
                <h3>Import Database</h3>
                <p>Replace current database with a backup file</p>
              </div>
              <label className="btn-import">
                <input
                  type="file"
                  accept=".db"
                  onChange={handleImportDatabase}
                  disabled={importing}
                  style={{ display: "none" }}
                />
                {importing ? "Importing..." : "Import Database"}
              </label>
            </div>
            <div className="settings-item">
              <div>
                <h3>Restart Database</h3>
                <p>Restart the database connection</p>
              </div>
              <button
                onClick={handleRestartDatabase}
                disabled={restarting}
                className="btn-secondary"
              >
                {restarting ? "Restarting..." : "Restart Database"}
              </button>
            </div>
            <div className="settings-item">
              <div>
                <h3>Backup Database</h3>
                <p>Select a backup to restore, or delete all backups</p>
              </div>
              <div className="backup-actions">
                <select
                  className="backup-select"
                  value={selectedBackup}
                  onChange={(e) => setSelectedBackup(e.target.value)}
                  disabled={loadingBackups || backups.length === 0}
                >
                  {backups.length === 0 ? (
                    <option value="">No backups found</option>
                  ) : (
                    backups.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))
                  )}
                </select>
                <button
                  onClick={fetchBackups}
                  disabled={loadingBackups}
                  className="btn-secondary"
                >
                  {loadingBackups ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  onClick={handleRestoreBackup}
                  disabled={!selectedBackup || restoringBackup}
                  className="btn-export"
                >
                  {restoringBackup ? "Restoring..." : "Use Backup"}
                </button>
                <button
                  onClick={handleDeleteAllBackups}
                  disabled={backups.length === 0 || deletingBackups}
                  className="btn-danger"
                >
                  {deletingBackups ? "Deleting..." : "Delete All"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="settings-section">
            <h2>Appearance</h2>
            <div className="settings-item">
              <div>
                <h3>Dark Mode</h3>
                <p>Reduce glare with a darker color scheme</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={handleToggleDarkMode}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
