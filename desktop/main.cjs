const { app, BrowserWindow, Menu, Notification, Tray, globalShortcut, shell, utilityProcess } = require("electron");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

const isDevelopment = !app.isPackaged;

// Electron otherwise derives this from package.json's lowercase `name`, while
// Product Studio's credentials and persistent data live under the human-facing
// application name. Set it before the app is ready so every desktop service
// uses one stable location across updates.
if (!isDevelopment) {
  app.setPath("userData", path.join(app.getPath("appData"), "Product Studio"));
}

let mainWindow;
let serverProcess;
let tray;
let appUrl;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function loadDesktopEnvironment() {
  if (isDevelopment) return;
  // Personal credentials live in Application Support, never inside the signed app.
  const environmentFile = path.join(app.getPath("userData"), ".env.local");
  if (fs.existsSync(environmentFile)) {
    require("dotenv").config({ path: environmentFile, override: false });
  }
  if (!process.env.PRODUCT_STUDIO_DATA_DIR?.trim()) {
    process.env.PRODUCT_STUDIO_DATA_DIR = app.getPath("userData");
  }
}

async function startNextServer() {
  loadDesktopEnvironment();
  const port = await getFreePort();
  const serverEntry = isDevelopment
    ? path.join(app.getAppPath(), "node_modules", "next", "dist", "bin", "next")
    : path.join(process.resourcesPath, "server", "server.js");
  serverProcess = utilityProcess.fork(serverEntry, isDevelopment ? ["dev"] : [], {
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      NODE_ENV: isDevelopment ? "development" : "production",
      PORT: String(port),
    },
    cwd: isDevelopment ? app.getAppPath() : path.dirname(serverEntry),
    stdio: "pipe",
    serviceName: "Product Studio local server",
  });
  serverProcess.stderr?.on("data", (data) => console.error(String(data).trim()));
  serverProcess.on("exit", (code) => {
    if (code && !app.isQuitting) console.error(`Product Studio server exited with code ${code}.`);
  });

  appUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(appUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Product Studio's local server did not start within 30 seconds.");
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1040,
    minHeight: 700,
    title: "Product Studio",
    backgroundColor: "#09090b",
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(appUrl);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const trayIcon = isDevelopment
    ? path.join(app.getAppPath(), "public", "images", "app-icon.png")
    : path.join(process.resourcesPath, "tray-icon.png");
  tray = new Tray(trayIcon);
  tray.setToolTip("Product Studio");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Product Studio", click: showMainWindow },
    { type: "separator" },
    { label: "Quit", click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on("click", showMainWindow);
}

app.whenReady().then(async () => {
  try {
    await startNextServer();
    createWindow();
    createTray();
    globalShortcut.register("CommandOrControl+Shift+Space", showMainWindow);
  } catch (error) {
    console.error(error);
    app.quit();
  }
});

app.on("activate", showMainWindow);
app.on("before-quit", () => { app.isQuitting = true; });
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (serverProcess?.pid) serverProcess.kill();
});

// Native notifications are available when attention signals become alerts.
function notify(title, body) {
  if (Notification.isSupported()) new Notification({ title, body }).show();
}

module.exports = { notify };
