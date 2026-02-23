import React, { useState, useEffect } from "react";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from './components/Navbar';
import Dashboard from "./pages/Dashboard";
import Company from "./pages/Company";
import Clients from "./pages/Clients";
import InvoiceCreate from "./pages/InvoiceCreate";
import InvoiceEdit from "./pages/InvoiceEdit";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

function App() {
  const isFileProtocol = typeof window !== "undefined" && window.location.protocol === "file:";
  const Router = isFileProtocol ? HashRouter : BrowserRouter;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      {user && <Navbar />}
      <Routes>
        {!user && <Route path="*" element={<Login onLogin={() => window.location.reload()} />} />}
        {user && <>
          <Route path="/" element={<Dashboard />} />
          <Route path="/company" element={<Company />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/invoice/create" element={<InvoiceCreate />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/InvoiceEdit/:id" element={<InvoiceEdit />} />
          <Route path="/settings" element={<Settings onLogout={() => setUser(null)} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>}
      </Routes>
    </Router>
  );
}

export default App;
