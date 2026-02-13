import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import InvoiceItemRow from "../components/InvoiceItemRow";

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [project, setProject] = useState("");
  const [items, setItems] = useState([
    { title: "", description: "", quantity: 1, unit_price: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [submittedInvoice, setSubmittedInvoice] = useState(null);

  useEffect(() => {
    API.get("/clients").then((res) => setClients(res.data));
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === "quantity" || field === "unit_price") value = parseFloat(value) || 0;
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { title: "", description: "", quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedClient) return alert("Select a client");
    API.post("/invoices", {
      client_id: selectedClient,
      project,
      items,
      notes,
      status: "Unpaid",
      created_at: new Date().toISOString(),
    }).then((res) => {
      alert("Invoice created: " + res.data.invoice_number);
      setInvoiceNumber(res.data.invoice_number);
      setSubmittedInvoice(res.data.invoice_id);
      setTimeout(() => navigate("/invoices"), 1500);
    });
  };

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  return (
    <div style={{ padding: 20 }}>
      <h2>Create Invoice</h2>

      <div>
        <label>Client:</label>
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
          <option value="">Select Client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.contact_person}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Project:</label>
        <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Enter project name" />
      </div>

      <h3>Invoice Items</h3>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <InvoiceItemRow
              key={index}
              item={item}
              index={index}
              onChange={handleItemChange}
              onRemove={handleRemoveItem}
            />
          ))}
        </tbody>
      </table>
      <button onClick={handleAddItem}>Add Item</button>

      <div>
        <label>Notes:</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}></textarea>
      </div>

      <h3>Total: ${totalAmount.toFixed(2)}</h3>
      <button onClick={handleSubmit}>Submit Invoice</button>

      {submittedInvoice && (
        <div style={{ marginTop: 30 }}>
          <h3>Invoice Preview</h3>
          <iframe
            src={`/api/invoices/${submittedInvoice}/preview`}
            title="Invoice Preview"
            width="100%"
            height="600px"
          ></iframe>
        </div>
      )}
    </div>
  );
}
