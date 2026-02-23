# DP-Invoices

A desktop application for managing invoices, clients, and company data. Built with Electron, Node.js (Express backend), and React frontend.


## Features
- User login and authentication (multi-user support)
- Each user can only see and manage their own invoices and clients
- Invoice creation, editing, and management
- Invoice calculation and totals update dynamically based on status (Unpaid, Advance, Paid)
- Client and company management
- PDF generation (Chromium)
- Modern UI with React

## Default User

The following user is created automatically on first run if no users exist:

| Username | Password |
|----------|----------|
| master   | master   |

You can add more users via the registration screen.


## Project Structure
- `backend/` — Node.js Express API and business logic
- `frontend/` — React app (UI)
- `electron/` — Electron main process
- `uploads/` — File uploads (ignored in git)
- `resources/` — App resources (ignored in git)


## Getting Started
1. Install dependencies: `npm install`
2. Start both backend and frontend: `npm start`
3. For Electron desktop app: `cd electron && npm start` (or use `start.bat`)

## Authentication
You must log in to access your invoices and clients. Each user only sees their own data. The default user is listed above.

## Invoice Calculation
Invoice totals, deposit, paid, and remaining balance are dynamically calculated and displayed based on the invoice status:

- **Unpaid**: No payment received. Remaining balance = total.
- **Advance**: 50% deposit received. Paid = 50% of total, Remaining = 50% of total.
- **Paid**: Fully paid. Remaining = 0.

PDF filenames and invoice preview titles include the invoice status for clarity.

## License
See [LICENSE](LICENSE).
