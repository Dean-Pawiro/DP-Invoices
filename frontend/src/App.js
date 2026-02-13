import React from "react";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import Navbar from './components/Navbar';
import Dashboard from "./pages/Dashboard";
import Company from "./pages/Company";
import Clients from "./pages/Clients";
import InvoiceCreate from "./pages/InvoiceCreate";
import InvoiceEdit from "./pages/InvoiceEdit";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";

function App() {
  const isFileProtocol = typeof window !== "undefined" && window.location.protocol === "file:";
  const Router = isFileProtocol ? HashRouter : BrowserRouter;

  return (
    <Router>
      <Navbar /> {/* Navbar stays outside of Routes */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/company" element={<Company />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/invoice/create" element={<InvoiceCreate />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/InvoiceEdit/:id" element={<InvoiceEdit />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
