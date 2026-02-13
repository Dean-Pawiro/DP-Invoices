const express = require("express");
const router = express.Router();
const db = require("../db");


/**
 * Helper: generate invoice number
 * Format: Invoice-YYMMDD + Letter (A-Z)
 */
function generateInvoiceNumber(callback) {
  const today = new Date();
  const yy = today.getFullYear().toString().slice(-2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;

  db.all(
    "SELECT invoice_number FROM invoices WHERE invoice_date = ?",
    [today.toISOString().split("T")[0]],
    (err, rows) => {
      if (err) return callback(err);

      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const seq = rows.length < letters.length ? letters[rows.length] : "Z";
      const invoiceNumber = `Invoice-${datePart}${seq}`;
      callback(null, invoiceNumber);
    }
  );
}

/**
 * CREATE a new invoice
 * Body: { client_id, status, notes, items: [ {title, description, quantity, unit_price} ] }
 */
router.post("/", (req, res) => {
  const { client_id, project = "", status = "Unpaid", notes = "", items = [] } = req.body;

  generateInvoiceNumber((err, invoice_number) => {
    if (err) return res.status(500).json({ error: err.message });

    const invoiceDate = new Date().toISOString().split("T")[0];
    const createdAt = new Date().toISOString();
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    // Insert invoice
    const sqlInvoice = `
      INSERT INTO invoices (invoice_number, client_id, project, status, invoice_date, subtotal, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(sqlInvoice, [invoice_number, client_id, project, status, invoiceDate, subtotal, notes, createdAt], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const invoice_id = this.lastID;

      // Insert items
      const stmt = db.prepare(`
        INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const total = item.quantity * item.unit_price;
        stmt.run(invoice_id, item.title, item.description, item.quantity, item.unit_price, total);
      }

      stmt.finalize(err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, invoice_number, invoice_id });
      });
    });
  });
});

/**
 * GET all invoices
 */
router.get("/", (req, res) => {
  const sql = `
    SELECT i.*, c.company_name, c.contact_person
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    ORDER BY invoice_date ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * GET single invoice with items
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM invoices WHERE id = ?", [id], (err, invoice) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    db.all("SELECT * FROM invoice_items WHERE invoice_id = ?", [id], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      invoice.items = items;
      res.json(invoice);
    });
  });
});

module.exports = router;

router.get("/", (req, res) => {
  const sql = `
    SELECT i.id, i.invoice_number, i.invoice_date, i.status,
           c.company_name AS client_name, com.name AS company_name,
           i.subtotal AS total
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN company com ON com.id = 1
    ORDER BY i.invoice_date DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { status, paid_at, advance_paid_at, created_at } = req.body;
  const timestamp = new Date().toISOString();

  let updateSql = "UPDATE invoices SET";
  let params = [];
  let updates = [];

  // Update status if provided
  if (status !== undefined) {
    updates.push("status = ?");
    params.push(status);

    // Auto-set timestamps based on status if not manually provided
    if (status === "Paid" && paid_at === undefined) {
      updates.push("paid_at = ?");
      params.push(timestamp);
    } else if (status === "Advance" && advance_paid_at === undefined) {
      updates.push("advance_paid_at = ?");
      params.push(timestamp);
    }
  }

  // Manual timestamp overrides
  if (paid_at !== undefined) {
    updates.push("paid_at = ?");
    params.push(paid_at);
  }

  if (advance_paid_at !== undefined) {
    updates.push("advance_paid_at = ?");
    params.push(advance_paid_at);
  }

  if (created_at !== undefined) {
    updates.push("created_at = ?");
    params.push(created_at);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  updateSql += " " + updates.join(", ") + " WHERE id = ?";
  params.push(id);

  db.run(updateSql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});


router.get("/:id/preview", (req, res) => {
  const { id } = req.params;

  // Get invoice, client, company info
  db.get(
    `SELECT i.*, 
            c.company_name AS client_name, 
            c.contact_person AS contact_person, 
            com.name AS company_name, 
            com.address AS company_address,
            com.bank_info_1,
            com.bank_info_2
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN company com ON com.id = 1
    WHERE i.id = ?`,
    [id],
    (err, invoice) => {
      if (err) return res.status(500).send(err.message);
      if (!invoice) return res.status(404).send("Invoice not found");

      db.all(
        "SELECT * FROM invoice_items WHERE invoice_id = ?", 
        [id], 
        (err2, items) => {
          if (err2) return res.status(500).send(err2.message);

          const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

          const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${invoice.invoice_number}</title>

<style>
/* ---------- Global ---------- */
body {
position:relative;
z-index:1;
  margin:0; 
  padding:40px; 
  background:#f0f2f5; 
  font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
  color:#2c3e50;
  min-height:100vh;
}

.invoice-wrapper {
position:relative;
  z-index:1;
  max-width:900px;
  margin:auto;
  background:#ffffff;
  padding:40px 50px;
  border-radius:16px;
  box-shadow:0 10px 25px rgba(0,0,0,0.08);
}

/* ---------- Buttons ---------- */
.btn {
  background: #1a2a52;
  color: #ffffff;
  border: none;
  padding: 12px 28px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 20px;
}

/* ---------- Header ---------- */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
}

.header h1 {
  margin: 0 0 10px 0;
  font-size: 34px;
  color: #1a2a52;
}

.company-info {
  font-size: 14px;
  line-height: 1.6;
  color: #7f8c8d;
}

.company-info strong {
  color: #2c3e50;
}

.invoice-total {
  text-align: right;
  font-size: 18px;
  font-weight: 700;
  color: #e84118;
}

/* ---------- Info ---------- */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
  font-size: 14px;
}

/* ---------- Table ---------- */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  background: #1a2a52;
  color: #ffffff;
  padding: 14px 15px;
  text-align: left;
}

th.right,
td.right {
  text-align: right;
}

td {
  padding: 14px 15px;
  border-bottom: 1px solid #e0e0e0;
}

.item-description {
  font-size: 13px;
  color: #7f8c8d;
}

/* ---------- Totals ---------- */
.totals {
  max-width: 360px;
  margin-left: auto;
  margin-top: 30px;
  font-size: 16px;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.totals-final {
  font-weight: 700;
  color: #1a2a52;
  border-bottom: none;
}

/* ---------- Bank ---------- */
.banks {
  margin-top: 40px;
  padding-top: 20px;
  display: flex;
  gap: 20px;
  border-top: 2px solid #e0e0e0;
}

.bank-info {
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
  color: #2c3e50;
}

.bank-info strong {
  color: #1a2a52;
  font-size: 15px;
}

/* ---------- Footer ---------- */
.footer {
  margin-top: 50px;
  text-align: center;
  font-weight: 600;
  color: #95a5a6;
}

@media print {
  .btn {
    display: none;
  }
  body {
    margin:0; 
    padding:0; 
    background:#ffffff;
  }
  .invoice-wrapper {
    padding:0;
    border-radius:0;
    box-shadow:unset;
  }

}
</style>
</head>

<body class="invoice-page ${invoice.status}">
${invoice.status === "Paid" ? `
<div style="
  position:fixed;
  top:50%;
  left:50%;
  transform:translate(-50%, -50%) rotate(-30deg);
  font-size:240px;
  font-weight:800;
  color:#1a2a52;
  opacity:0.08;
  z-index:2;
  pointer-events:none;
  user-select:none;
  white-space:nowrap;
">
  PAID
</div>
` : ""}
<body class="invoice-page ${invoice.status}">
${invoice.status === "Unpaid" ? `
<div style="
  position:fixed;
  top:50%;
  left:50%;
  transform:translate(-50%, -50%) rotate(-30deg);
  font-size:200px;
  font-weight:800;
  color:#1a2a52;
  opacity:0.08;
  z-index:2;
  pointer-events:none;
  user-select:none;
  white-space:nowrap;
">
  UNPAID
</div>
` : ""}
<div class="invoice-wrapper">

<button class="btn" onclick="printInvoice()">Print</button>
<button class="btn" onclick="window.open('/api/invoices/${invoice.id}/pdf/${invoice.invoice_number}')">Download PDF</button>

<!-- Header -->
<div class="header">
  <div>
    <h1>Invoice</h1>
    <div class="company-info">
      <strong>${invoice.company_name}</strong><br>
      ${invoice.company_address || ""}
    </div>
  </div>
  <div class="invoice-total">
    Invoice Due<br>$${total.toFixed(2)}
  </div>
</div>

<!-- Info -->
<div class="info-grid">
  <div>
    <strong>Bill To:</strong><br>
    ${invoice.client_name}<br>
    ${invoice.contact_person || ""}
  </div>
  <div>
    <strong>Invoice #:</strong> ${invoice.invoice_number}<br>
    <strong>Date:</strong> ${invoice.invoice_date}<br>
  </div>
</div>

<!-- Table -->
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th class="right">Qty</th>
      <th class="right">Price</th>
      <th class="right">Total</th>
    </tr>
  </thead>
  <tbody>
    ${items.map(item => `
      <tr>
        <td>
          ${item.title}<br>
          ${item.description
            ? `<span class="item-description">- ${item.description.replace(/\n/g, "<br>- ")}</span>`
            : ""}
        </td>
        <td class="right">${item.quantity}</td>
        <td class="right">$${item.unit_price.toFixed(2)}</td>
        <td class="right">$${(item.quantity * item.unit_price).toFixed(2)}</td>
      </tr>
    `).join("")}
  </tbody>
</table>

<!-- Totals -->
<div class="totals">
  <div class="totals-row">
    <span>Total</span>
    <strong>$${total.toFixed(2)}</strong>
  </div>
  <div class="totals-row">
    <span>Deposit (50%)</span>
    <span>$${(total / 2).toFixed(2)}</span>
  </div>
  <div class="totals-row totals-final">
    <span>Remaining Balance</span>
    <span>$${(total / 2).toFixed(2)}</span>
  </div>
</div>

<!-- Bank -->
<div class="banks">
  ${invoice.bank_info_1 ? `
  <div class="bank-info">
    ${invoice.bank_info_1.split('\n').map((line, idx) => 
      idx === 0 ? `<strong>${line}</strong>` : line
    ).join('<br>')}
  </div>
  ` : ''}
  ${invoice.bank_info_2 ? `
  <div class="bank-info">
    ${invoice.bank_info_2.split('\n').map((line, idx) => 
      idx === 0 ? `<strong>${line}</strong>` : line
    ).join('<br>')}
  </div>
  ` : ''}
</div>

<div class="footer">
  Thank you for your business!
</div>

</div>

<script>
function printInvoice() {
  window.print();
}
</script>

</body>
</html>



  `;

          res.send(html);
        }
      );
    }
  );

});

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

router.get("/:id/pdf/:invoice", async (req, res) => {
  const { id } = req.params;
  const invoiceParam = req.params.invoice;

  try {
    // Determine Chromium path for pkg portability
    let chromiumPath;
    if (process.pkg) {
      // Running inside pkg executable
      const baseDir = path.dirname(process.execPath);
      
      // First: try bundled chromium in backend folder (for Electron resources/backend/.local-chromium)
      let chromiumBaseDir = path.join(baseDir, '.local-chromium', 'chrome');
      
      // Check if we're in Electron's resources folder structure
      if (!fs.existsSync(chromiumBaseDir)) {
        chromiumBaseDir = path.join(baseDir, '..', 'resources', 'backend', '.local-chromium', 'chrome');
      }
      
      if (fs.existsSync(chromiumBaseDir)) {
        const chromiumFolder = fs.readdirSync(chromiumBaseDir).find(f => f.startsWith('win64-'));
        if (chromiumFolder) {
          chromiumPath = path.join(chromiumBaseDir, chromiumFolder, 'chrome-win64', 'chrome.exe');
        }
      }
      
      // Fallback: use system Chrome if bundled chromium not found
      if (!chromiumPath || !fs.existsSync(chromiumPath)) {
        // Only fallback to puppeteer's bundled version, not system Chrome
        chromiumPath = puppeteer.executablePath();
      }
      
      if (!chromiumPath) {
        throw new Error('Chrome/Chromium not found. PDF generation requires Chrome to be installed.');
      }
    } else {
      // Dev environment: check for bundled chromium first
      const bundledChromium = path.join(__dirname, '..', '.local-chromium', 'chrome');
      if (fs.existsSync(bundledChromium)) {
        const chromiumFolder = fs.readdirSync(bundledChromium).find(f => f.startsWith('win64-'));
        if (chromiumFolder) {
          chromiumPath = path.join(bundledChromium, chromiumFolder, 'chrome-win64', 'chrome.exe');
        }
      }
      
      // Fallback to puppeteer's default
      if (!chromiumPath || !fs.existsSync(chromiumPath)) {
        chromiumPath = puppeteer.executablePath();
      }
    }

    console.log('[PDF] Using Chromium at:', chromiumPath);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromiumPath
    });

    const page = await browser.newPage();

    // Load your preview page
    const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
    await page.goto(`http://localhost:${BACKEND_PORT}/api/invoices/${id}/preview`, {
      waitUntil: "networkidle0"
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm"
      }
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${invoiceParam}.pdf`,
      "Content-Length": pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (err) {
    console.error('[PDF Error]', err);
    res.status(500).send("Failed to generate PDF: " + err.message);
  }
});


/**
 * UPDATE an invoice (PUT)
 * Body: { client_id, status, notes, items: [ {title, description, quantity, unit_price} ] }
 */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { 
    client_id, 
    invoice_number, 
    invoice_date, 
    project = "", 
    status = "Unpaid", 
    notes = "", 
    items = [],
    created_at,
    paid_at,
    advance_paid_at
  } = req.body;

  // Calculate new subtotal
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  // Build dynamic update query to handle optional timestamp fields
  let sqlInvoice = `
    UPDATE invoices 
    SET client_id = ?, invoice_number = ?, invoice_date = ?, project = ?, status = ?, notes = ?, subtotal = ?
  `;
  let params = [client_id, invoice_number, invoice_date, project, status, notes, subtotal];

  if (created_at !== undefined) {
    sqlInvoice += ", created_at = ?";
    params.push(created_at);
  }
  
  if (paid_at !== undefined) {
    sqlInvoice += ", paid_at = ?";
    params.push(paid_at);
  }
  
  if (advance_paid_at !== undefined) {
    sqlInvoice += ", advance_paid_at = ?";
    params.push(advance_paid_at);
  }

  sqlInvoice += " WHERE id = ?";
  params.push(id);
  
  db.run(sqlInvoice, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // Delete existing items
    db.run("DELETE FROM invoice_items WHERE invoice_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Insert new items
      const stmt = db.prepare(`
        INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const total = item.quantity * item.unit_price;
        stmt.run(id, item.title, item.description, item.quantity, item.unit_price, total);
      }

      stmt.finalize(err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Invoice updated successfully" });
      });
    });
  });
});

/**
 * DELETE an invoice
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // Delete items first (foreign key constraint)
  db.run("DELETE FROM invoice_items WHERE invoice_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Delete invoice
    db.run("DELETE FROM invoices WHERE id = ?", [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "Invoice deleted successfully" });
    });
  });
});

/**
 * GET dashboard statistics
 * Accounts for: Paid invoices, 50% of Advance invoices
 */
router.get("/stats/overview", (req, res) => {
  // Total Revenue (all paid invoices + 50% of advance invoices)
  db.get(
    "SELECT COALESCE(SUM(CASE WHEN status = 'Paid' THEN subtotal WHEN status = 'Advance' THEN subtotal * 0.5 ELSE 0 END), 0) as total_revenue FROM invoices",
    [],
    (err, revenueRow) => {
      if (err) return res.status(500).json({ error: err.message });

      // Outstanding Invoices (sum of unpaid + 50% of advance)
      db.get(
        "SELECT COALESCE(SUM(CASE WHEN status = 'Unpaid' THEN subtotal WHEN status = 'Advance' THEN subtotal * 0.5 ELSE 0 END), 0) as outstanding_amount FROM invoices",
        [],
        (err, outstandingRow) => {
          if (err) return res.status(500).json({ error: err.message });

          // Unpaid Count (both Unpaid and Advance statuses)
          db.get(
            "SELECT COUNT(*) as unpaid_count FROM invoices WHERE status = 'Unpaid' OR status = 'Advance'",
            [],
            (err, countRow) => {
              if (err) return res.status(500).json({ error: err.message });

              res.json({
                total_revenue: revenueRow.total_revenue,
                outstanding_amount: outstandingRow.outstanding_amount,
                unpaid_count: countRow.unpaid_count
              });
            }
          );
        }
      );
    }
  );
});
