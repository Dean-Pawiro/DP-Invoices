import React from "react";

export default function InvoiceItemRow({ item, index, onChange, onRemove }) {
  return (
    <tr>
      <td>
        <input
          type="text"
          placeholder="Title"
          value={item.title}
          onChange={(e) => onChange(index, "title", e.target.value)}
        />
        <textarea
          placeholder="Description"
          value={item.description}
          onChange={(e) => onChange(index, "description", e.target.value)}
          rows={3}
          style={{ width: "100%" }}
        />
      </td>
      <td>
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onChange(index, "quantity", e.target.value)}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.unit_price}
          onChange={(e) => onChange(index, "unit_price", e.target.value)}
        />
      </td>
      <td>{(item.quantity * item.unit_price).toFixed(2)}</td>
      <td>
        <button onClick={() => onRemove(index)}>Remove</button>
      </td>
    </tr>
  );
}
