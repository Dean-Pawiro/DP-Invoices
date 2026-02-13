# DP-Invoices

A desktop application for managing invoices, clients, and company data. Built with Electron, Node.js (Express backend), and React frontend.

## Features
- Invoice creation, editing, and management
- Client and company management
- PDF generation (Chromium)
- Modern UI with React

## Project Structure
- `backend/` — Node.js Express API and business logic
- `frontend/` — React app (UI)
- `electron/` — Electron main process
- `uploads/` — File uploads (ignored in git)
- `resources/` — App resources (ignored in git)

## Getting Started
1. Install dependencies in each folder (`backend`, `frontend`)
2. Start backend: `cd backend && npm start`
3. Start frontend: `cd frontend && npm start`
4. Start Electron: `cd electron && npm start` (or use `start.bat`)

## License
See [LICENSE](LICENSE).
