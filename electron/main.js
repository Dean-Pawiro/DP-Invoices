const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
// Better dev detection: check if we're running from source or packaged
const isDev = !app.isPackaged;

let backendProcess;

function startBackend() {
  let backendPath;
  let backendDir;
  
  if (isDev) {
    backendPath = path.join(__dirname, "..", "backend", "backend.exe");
    backendDir = path.join(__dirname, "..", "backend");
  } else {
    // In production, backend is in resources/backend/backend.exe
    backendDir = path.join(process.resourcesPath, "backend");
    backendPath = path.join(backendDir, "backend.exe");
  }

  console.log("=== BACKEND STARTUP ===");
  console.log("[Electron] Starting backend from:", backendPath);
  console.log("[Electron] Backend working directory:", backendDir);
  console.log("[Electron] process.resourcesPath:", process.resourcesPath);
  console.log("[Electron] isDev:", isDev);

  // Check if file exists
  const fs = require("fs");
  if (!fs.existsSync(backendPath)) {
    console.error("[Electron] ERROR: backend.exe not found at:", backendPath);
    console.log("[Electron] Directory contents:");
    if (fs.existsSync(backendDir)) {
      console.log(fs.readdirSync(backendDir));
    } else {
      console.log("Backend directory doesn't exist!");
    }
    return;
  }

  backendProcess = spawn(backendPath, [], { 
    cwd: backendDir,  // Run from backend directory
    windowsHide: !isDev,  // Hide console in production, show in dev
    stdio: ['ignore', 'pipe', 'pipe'],  // capture stdout and stderr
    detached: false,
    shell: false
  });

  console.log("[Electron] Backend process spawned with PID:", backendProcess.pid);

  const backendPort = process.env.BACKEND_PORT || 5000;
  const maxWaitMs = 15000;
  const startTime = Date.now();

  const waitForBackend = () => {
    const req = http.get(`http://localhost:${backendPort}/api/health`, (res) => {
      if (res.statusCode === 200) {
        console.log("[Electron] Backend health check OK. Loading frontend...");
        loadFrontend();
        return;
      }

      res.resume();
      retry();
    });

    req.on("error", retry);
  };

  const retry = () => {
    if (Date.now() - startTime >= maxWaitMs) {
      console.log("[Electron] Timeout waiting for backend, loading frontend anyway...");
      loadFrontend();
      return;
    }
    setTimeout(waitForBackend, 500);
  };

  waitForBackend();

  backendProcess.stdout.on("data", (data) => {
    const msg = data.toString();
    console.log("[Backend STDOUT]", msg);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error("[Backend STDERR]", data.toString());
  });

  backendProcess.on("error", (err) => {
    console.error("[Backend SPAWN ERROR]", err.message);
    console.error("[Backend] Full error:", err);
    console.error("[Backend] Path was:", backendPath);
    clearTimeout(fallbackTimer);
    loadFrontend(); // Try to load anyway
  });

  backendProcess.on("exit", (code, signal) => {
    console.log(`[Backend] Process exited with code ${code}, signal ${signal}`);
    if (code !== 0 && code !== null) {
      console.error("[Backend] Backend crashed or failed to start!");
    }
  });

  backendProcess.on("close", (code) => {
    console.log(`[Backend] Process closed with code ${code}`);
  });
}

let mainWindow;

function loadFrontend() {
  if (mainWindow) return; // already loaded

  let frontendPath;
  if (isDev) {
    frontendPath = path.join(__dirname, "../frontend/build/index.html");
  } else {
    frontendPath = path.join(process.resourcesPath, "frontend", "build", "index.html");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(frontendPath);
  
  // Open DevTools only in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  console.log("[Electron] Frontend loaded from:", frontendPath);
}

app.whenReady().then(startBackend);

// Quit backend when app closes
app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== "darwin") app.quit();
});
