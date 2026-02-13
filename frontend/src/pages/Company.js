import React, { useState, useEffect } from "react";
import API from "../api";

function Company() {
  const [company, setCompany] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    bank_info_1: "",
    bank_info_2: "",
  });

  useEffect(() => {
    API.get("/company").then(res => setCompany(res.data || {}));
  }, []);

  const handleChange = (e) => {
    setCompany({ ...company, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    API.post("/company", company).then(res => alert("Saved successfully"));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Company Info</h2>
      <div className="company-form">
        <input name="name" placeholder="Name" value={company.name} onChange={handleChange} />
        <input name="address" placeholder="Address" value={company.address} onChange={handleChange} />
        <input name="email" placeholder="Email" value={company.email} onChange={handleChange} />
        <input name="phone" placeholder="Phone" value={company.phone} onChange={handleChange} />
      </div>
      <h2>Bank Details</h2>
      <div className="company-form">
        <textarea
          name="bank_info_1"
          placeholder="Bank Info 1 (e.g., Bank Name, Account Number, etc.)"
          value={company.bank_info_1}
          onChange={handleChange}
        />
        <textarea
          name="bank_info_2"
          placeholder="Bank Info 2 (e.g., Additional bank details, Swift code, etc.)"
          value={company.bank_info_2}
          onChange={handleChange}
        />
      </div>
      <button onClick={handleSubmit} style={{ marginTop: "20px" }}>Save All</button>
    </div>
  );
}

export default Company;
