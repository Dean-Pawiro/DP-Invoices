import React, { useState, useEffect } from "react";
import API from "../api";

function Clients() {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newClient, setNewClient] = useState({
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = () => {
    API.get("/clients").then(res => setClients(res.data));
  };

  const handleChange = (e) => {
    setNewClient({ ...newClient, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    API.post("/clients", newClient).then(res => {
      alert("Client added");
      setNewClient({ contact_person: "", email: "", phone: "", address: "" });
      fetchClients();
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      API.delete(`/clients/${id}`)
      .then(res => {
        alert("Client deleted");
        fetchClients();
      })
      .catch((err) => {
        console.error(err);
        const msg = err?.response?.data?.error || err?.message || "Failed to delete client";
        alert(msg);
      });
    }
  };

  const [editClient, setEditClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = (client) => {
    setEditClient(client);
    setIsEditing(true);
  };

  const handleUpdate = () => {
    API.put(`/clients/${editClient.id}`, editClient).then(res => {
      alert("Client updated");
      setEditClient(null);
      setIsEditing(false);
      fetchClients();
    });
  };

  // Filter clients based on search term (3+ characters)
  const filteredClients = searchTerm.length >= 3 
    ? clients.filter((client) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (client.contact_person || "").toLowerCase().includes(searchLower) ||
          (client.email || "").toLowerCase().includes(searchLower)
        );
      })
    : clients;

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExportCsv = () => {
    const headers = ["Contact Person", "Email", "Phone", "Address"];
    const rows = filteredClients.map((client) => [
      client.contact_person || "",
      client.email || "",
      client.phone || "",
      client.address || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Clients</h2>
      <div className="client-form">
        <input name="contact_person" placeholder="Contact Person" value={newClient.contact_person} onChange={handleChange} />
        <input name="email" placeholder="Email" value={newClient.email} onChange={handleChange} />
        <input name="phone" placeholder="Phone" value={newClient.phone} onChange={handleChange} />
        <input name="address" placeholder="Address" value={newClient.address} onChange={handleChange} />
        <button onClick={handleAdd}>Add Client</button>
      </div>

      {isEditing && (
      <div className="popup-overlay">
        <div className="edit-popup">
          <h3>Edit Client</h3>
          <div className="client-edit-form">
            <input name="contact_person" placeholder="Contact Person" value={editClient.contact_person} onChange={(e) => setEditClient({ ...editClient, contact_person: e.target.value })} />
            <input name="email" placeholder="Email" value={editClient.email} onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} />
            <input name="phone" placeholder="Phone" value={editClient.phone} onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })} />
            <input name="address" placeholder="Address" value={editClient.address} onChange={(e) => setEditClient({ ...editClient, address: e.target.value })} />

            <button onClick={handleUpdate}>Update Client</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      </div>
    )}


      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Existing Clients</h3>
        <button onClick={handleExportCsv} style={{ padding: "8px 14px" }}>
          Export CSV
        </button>
      </div>
      <div style={{ marginBottom: 15 }}>
        <input
          type="text"
          placeholder="Search (Contact, Email)... (min 3 letters)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 12px",
            width: "300px",
            fontSize: "14px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            marginRight: "15px"
          }}
        />
        {searchTerm.length > 0 && searchTerm.length < 3 && (
          <span style={{ color: "#999", fontSize: "12px" }}>
            Type at least {3 - searchTerm.length} more character(s)
          </span>
        )}
      </div>
      <table className="client-table">
        <thead>
          <tr>
            <th>Contact Person</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredClients.map((client) => (
            <tr key={client.id}>
              <td>{client.contact_person}</td>
              <td>{client.email}</td>
              <td>{client.phone}</td>
              <td>{client.address}</td>
              <td>
                <button className="delete-button action" title="Delete client" onClick={() => handleDelete(client.id)}><img src="./bin.png" alt="Delete" /></button>
                <button className="action" title="Edit client" style={{ marginLeft: 10 }} onClick={() => handleEdit(client)}><img src="./edit.png" alt="Edit" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Clients;
