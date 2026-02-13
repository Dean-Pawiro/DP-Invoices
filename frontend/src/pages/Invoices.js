import React, { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
// Get backend URL for PDF/preview links
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/api";


export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = () => {
    API.get("/invoices")
      .then((res) => setInvoices(res.data))
      .catch((err) => {
        console.error(err);
        alert("Failed to fetch invoices");
      });
  };

  const handleStatusChange = (id, newStatus) => {
    API.patch(`/invoices/${id}`, { status: newStatus })
      .then(() => fetchInvoices())
      .catch((err) => {
        console.error(err);
        const msg = err?.response?.data?.error || err?.message || "Failed to update status";
        alert(msg);
      });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      API.delete(`/invoices/${id}`)
        .then(() => fetchInvoices())
        .catch((err) => {
          console.error(err);
          const msg = err?.response?.data?.error || err?.message || "Failed to delete invoice";
          alert(msg);
        });
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    let compareResult = 0;
    if (sortKey === "date") compareResult = new Date(b.invoice_date) - new Date(a.invoice_date);
    if (sortKey === "client") compareResult = (a.contact_person || "").localeCompare(b.contact_person || "");
    if (sortKey === "project") compareResult = (a.project || "").localeCompare(b.project || "");
    if (sortKey === "id") compareResult = a.id - b.id;
    if (sortKey === "invoice") compareResult = (a.invoice_number || "").localeCompare(b.invoice_number || "");
    
    return sortOrder === "asc" ? compareResult : -compareResult;
  });

  // Filter invoices based on search term (3+ characters)
  const filteredInvoices = searchTerm.length >= 3 
    ? sortedInvoices.filter((inv) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (inv.invoice_number || "").toLowerCase().includes(searchLower) ||
          (inv.contact_person || "").toLowerCase().includes(searchLower) ||
          (inv.project || "").toLowerCase().includes(searchLower)
        );
      })
    : sortedInvoices;

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExportCsv = () => {
    const headers = ["ID", "Invoice #", "Client", "Project", "Date", "Status", "Total", "Paid Date", "Advance Date"];
    const rows = filteredInvoices.map((inv) => [
      inv.id,
      inv.invoice_number || "",
      inv.contact_person || "",
      inv.project || "",
      inv.invoice_date || "",
      inv.status || "",
      typeof inv.subtotal === "number" ? inv.subtotal.toFixed(2) : (inv.subtotal || ""),
      inv.paid_at || "",
      inv.advance_paid_at || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>All Invoices</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleExportCsv} style={{
            background: "#0f172a",
            color: "#ffffff",
            border: "1px solid #1e293b",
            padding: "10px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600"
          }}>
            Export CSV
          </button>
          <Link to="/invoice/create" style={{ textDecoration: "none" }}>
            <button style={{
              background: "#1a2a52",
              color: "#ffffff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              + Create Invoice
            </button>
          </Link>
        </div>
      </div>
      <div className="filter-container">
        <div style={{ marginBottom: 15 }}>
          <input
            type="text"
            placeholder="Search (Invoice #, Client, Project)... (min 3 letters)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <span style={{ color: "#999", fontSize: "12px" }}>
              Type at least {3 - searchTerm.length} more character(s)
            </span>
          )}
        </div>

        <div style={{ marginBottom: 10, marginLeft: "auto" }}>
          <label>Sort by: </label>
          <select style={{width: "150px" }} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="date">Date</option>
            <option value="client">Client</option>
            <option value="project">Project</option>
            <option value="id">ID</option>
            <option value="invoice">Invoice #</option>
          </select>
          <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} style={{marginLeft: "10px"}}>
            {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
          </button>
        </div>
      </div>

      <table border="1" cellPadding="5" style={{ width: "100%", marginTop: 10 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Project</th>
            <th>Date</th>
            <th>Status</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredInvoices.map((inv) => (
            <tr key={inv.id} className={`${inv.status}`}>
              <td>{inv.id}</td>
              <td>{inv.invoice_number || "N/A"}</td>
              <td>{inv.contact_person || "N/A"}</td>
              <td>{inv.project || "N/A"}</td>
              <td>{inv.invoice_date || "N/A"}</td>
              <td>
                <select
                  value={inv.status || "Unpaid"}
                  onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                >
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Advance">Advance</option>
                </select>
              </td>
              <td>${(inv.subtotal || 0).toFixed(2)}</td>
              <td>
                   <button className="action" title="Preview invoice"><a href={`${BACKEND_URL}/invoices/${inv.id}/preview`} target="_blank" rel="noreferrer"><img src="./view.png" alt="View" /></a></button>
                   <button className="action" title="Download PDF"><a href={`${BACKEND_URL}/invoices/${inv.id}/pdf/${inv.invoice_number}`} target="_blank" rel="noreferrer"><img src="./pdf.png" alt="Download PDF" /></a></button>
                   <button className="action" title="Edit invoice"><Link to={`/InvoiceEdit/${inv.id}`}><img src="./edit.png" alt="Edit" /></Link></button>
                   <button className="action" title="Delete invoice" onClick={() => handleDelete(inv.id)}><img src="./bin.png" alt="Delete" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
