import React from 'react';
import { NavLink } from 'react-router-dom'; // if using react-router

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="logo">DP Invoices</div>
      <ul>
        <li><NavLink to="/" className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink></li>
        <li><NavLink to="/invoices" className={({isActive}) => isActive ? "active" : ""}>Invoices</NavLink></li>
        <li><NavLink to="/clients" className={({isActive}) => isActive ? "active" : ""}>Clients</NavLink></li>
        <li><NavLink to="/company" className={({isActive}) => isActive ? "active" : ""}>Company</NavLink></li>
        <li><NavLink to="/invoice/create" className={({isActive}) => isActive ? "active" : ""}>Create Invoice</NavLink></li>
        <NavLink to="/settings" className={({isActive}) => isActive ? "active" : ""}>
          <img src="./settings.png" alt="Settings" style={{ width: "20px", height: "20px" }} />
        </NavLink>
      </ul>
    </nav>
  );
};

export default Navbar;
