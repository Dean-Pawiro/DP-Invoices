import React, { useEffect, useState } from "react";
import API from "../api";
import { Link, useParams, useNavigate } from "react-router-dom";
import InvoiceItemRow from "../components/InvoiceItemRow";

export default function InvoiceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [project, setProject] = useState("");
  const [items, setItems] = useState([
    { title: "", description: "", quantity: 1, unit_price: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Unpaid");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch clients
    API.get("/clients")
      .then((res) => setClients(res.data))
      .catch((err) => {
        console.error(err);
        alert("Failed to fetch clients");
      });

    // Fetch invoice data
    API.get(`/invoices/${id}`)
      .then((res) => {
        const invoice = res.data;
        setSelectedClient(invoice.client_id || "");
        setProject(invoice.project || "");
        setNotes(invoice.notes || "");
        setStatus(invoice.status || "Unpaid");
        setInvoiceNumber(invoice.invoice_number || "");
        setInvoiceDate(invoice.invoice_date || "");
        
        // Set items if they exist
        if (invoice.items && invoice.items.length > 0) {
          setItems(invoice.items.map(item => ({
            title: item.title || "",
            description: item.description || "",
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
          })));
        }
        
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to fetch invoice: " + (err?.response?.data?.error || err?.message));
        setLoading(false);
      });
  }, [id]);

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
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      alert("Invoice must have at least one item");
    }
  };

  const handleSubmit = () => {
    if (!selectedClient) return alert("Please select a client");
    
    API.put(`/invoices/${id}`, {
      client_id: selectedClient,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      project,
      items,
      notes,
      status,
    })
      .then((res) => {
        alert("Invoice updated successfully!");
        navigate("/Invoices");
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to update invoice: " + (err?.response?.data?.error || err?.message));
      });
  };

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading invoice...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Edit Invoice: {invoiceNumber}</h2>
      <div className="invoice-info">
      <div style={{ marginBottom: 15 }}>
        <label>Client:</label>
        <select 
          value={selectedClient} 
          onChange={(e) => setSelectedClient(e.target.value)}
        >
          <option value="">Select Client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.contact_person}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>Project:</label>
        <input 
          type="text"
          value={project} 
          onChange={(e) => setProject(e.target.value)}
          placeholder="Enter project name"
        />
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>Invoice Number:</label>
        <input 
          type="text"
          value={invoiceNumber} 
          onChange={(e) => setInvoiceNumber(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>Invoice Date:</label>
        <input 
          type="date"
          value={invoiceDate} 
          onChange={(e) => setInvoiceDate(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>Status:</label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Advance">Advance</option>
        </select>
      </div>
      </div>

      <h3>Invoice Items</h3>
      <table border="1" cellPadding="5" style={{ width: "100%", marginBottom: 15 }}>
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

      <div style={{ marginTop: 20, marginBottom: 15 }}>
        <label>Notes:</label>
        <textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          rows={3}
          style={{ width: "100%", marginTop: 5, padding: 5 }}
        ></textarea>
      </div>

      <h3>Total: ${totalAmount.toFixed(2)}</h3>
      
      <div style={{ marginTop: 20 }}>
        <button onClick={handleSubmit} style={{ marginRight: 10, padding: "10px 20px" }}>
          Update Invoice
        </button>
        <Link to="/Invoices">
          <button style={{ padding: "10px 20px" }}>Cancel</button>
        </Link>
      </div>
    </div>
  );
}


