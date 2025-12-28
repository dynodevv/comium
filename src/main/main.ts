import { app, BrowserWindow, BrowserView, ipcMain, session, globalShortcut, Menu, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Types
interface TabInfo {
  id: number;
  url: string;
  title: string;
  favicon?: string;
}

interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
}

interface AppState {
  tabs: TabInfo[];
  activeTabId: number | null;
  bookmarks: Bookmark[];
  zoom: number;
}

// Constants
const DATA_DIR = path.join(app.getPath('userData'), 'comium-data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=';
const DEFAULT_HOME_PAGE = 'about:newtab';
const TOOLBAR_HEIGHT = 90; // Height of the browser toolbar in pixels

// Global state
let mainWindow: BrowserWindow | null = null;
let tabs: Map<number, BrowserView> = new Map();
let activeTabId: number | null = null;
let tabCounter = 0;
let bookmarks: Bookmark[] = [];
let currentZoom = 1.0;

// Get path to renderer files
function getRendererPath(file: string): string {
  return path.join(__dirname, '../../src/renderer', file);
}

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load app state
function loadState(): AppState | null {
  try {
    ensureDataDir();
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
  return null;
}

// Save app state
function saveState(): void {
  try {
    ensureDataDir();
    const tabInfos: TabInfo[] = [];
    tabs.forEach((view, id) => {
      tabInfos.push({
        id,
        url: view.webContents.getURL(),
        title: view.webContents.getTitle()
      });
    });
    
    const state: AppState = {
      tabs: tabInfos,
      activeTabId,
      bookmarks,
      zoom: currentZoom
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

// Check if URL is valid
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:', 'file:', 'about:'].includes(url.protocol);
  } catch {
    return false;
  }
}

// Process address bar input
function processAddressInput(input: string): string {
  const trimmed = input.trim();
  
  // Check for about: pages
  if (trimmed === 'about:newtab' || trimmed === '') {
    return 'about:newtab';
  }
  
  // Check if it's already a valid URL
  if (isValidUrl(trimmed)) {
    return trimmed;
  }
  
  // Check if it looks like a URL (has domain-like structure)
  if (/^[\w-]+\.[a-z]{2,}/i.test(trimmed) && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }
  
  // Treat as search query
  return DEFAULT_SEARCH_ENGINE + encodeURIComponent(trimmed);
}

// Create a new tab
function createTab(url: string = DEFAULT_HOME_PAGE, restoreId?: number): number {
  if (!mainWindow) return -1;
  
  const tabId = restoreId ?? ++tabCounter;
  if (!restoreId) {
    tabCounter = Math.max(tabCounter, tabId);
  }
  
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  
  tabs.set(tabId, view);
  
  // Handle navigation events
  view.webContents.on('did-navigate', () => {
    updateTabInfo(tabId);
  });
  
  view.webContents.on('did-navigate-in-page', () => {
    updateTabInfo(tabId);
  });
  
  view.webContents.on('page-title-updated', () => {
    updateTabInfo(tabId);
  });
  
  view.webContents.on('page-favicon-updated', (_event: any, favicons: string[]) => {
    if (favicons.length > 0) {
      mainWindow?.webContents.send('tab-favicon-updated', { tabId, favicon: favicons[0] });
    }
  });
  
  view.webContents.on('did-start-loading', () => {
    mainWindow?.webContents.send('tab-loading', { tabId, loading: true });
  });
  
  view.webContents.on('did-stop-loading', () => {
    mainWindow?.webContents.send('tab-loading', { tabId, loading: false });
  });
  
  view.webContents.on('did-fail-load', (_event: any, errorCode: number, errorDescription: string, validatedURL: string) => {
    if (errorCode !== -3) { // -3 is aborted, ignore it
      const errorPage = getErrorPageHtml(errorCode, errorDescription, validatedURL);
      view.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorPage)}`);
    }
  });
  
  // Load the URL
  if (url === 'about:newtab') {
    view.webContents.loadFile(getRendererPath('newtab.html'));
  } else {
    view.webContents.loadURL(processAddressInput(url));
  }
  
  // Notify renderer
  mainWindow?.webContents.send('tab-created', { 
    tabId, 
    title: 'New Tab',
    url: url
  });
  
  return tabId;
}

// Get error page HTML
function getErrorPageHtml(errorCode: number, errorDescription: string, url: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Error</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .error-container {
          text-align: center;
          padding: 40px;
          max-width: 500px;
        }
        .error-icon {
          font-size: 64px;
          margin-bottom: 20px;
          opacity: 0.8;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 12px;
          font-weight: 500;
        }
        p {
          color: rgba(255,255,255,0.7);
          margin-bottom: 8px;
          font-size: 14px;
        }
        .error-code {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          margin-top: 20px;
        }
        .url {
          word-break: break-all;
          background: rgba(255,255,255,0.1);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          margin-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h1>This page can't be reached</h1>
        <p>${errorDescription || 'The webpage could not be loaded'}</p>
        <div class="url">${url}</div>
        <p class="error-code">Error code: ${errorCode}</p>
      </div>
    </body>
    </html>
  `;
}

// Switch to a tab
function switchToTab(tabId: number): void {
  if (!mainWindow) return;
  
  const view = tabs.get(tabId);
  if (!view) return;
  
  // Remove current view
  if (activeTabId !== null) {
    const currentView = tabs.get(activeTabId);
    if (currentView) {
      mainWindow.removeBrowserView(currentView);
    }
  }
  
  // Add new view
  mainWindow.addBrowserView(view);
  activeTabId = tabId;
  
  // Update view bounds
  updateViewBounds();
  
  // Notify renderer
  updateTabInfo(tabId);
  mainWindow.webContents.send('tab-activated', { tabId });
}

// Close a tab
function closeTab(tabId: number): void {
  if (!mainWindow) return;
  
  const view = tabs.get(tabId);
  if (!view) return;
  
  // Remove view
  mainWindow.removeBrowserView(view);
  view.webContents.close();
  tabs.delete(tabId);
  
  // If this was the active tab, switch to another
  if (activeTabId === tabId) {
    const remainingTabs = Array.from(tabs.keys());
    if (remainingTabs.length > 0) {
      switchToTab(remainingTabs[remainingTabs.length - 1]);
    } else {
      activeTabId = null;
      // Create a new tab if all tabs are closed
      const newTabId = createTab();
      switchToTab(newTabId);
    }
  }
  
  mainWindow.webContents.send('tab-closed', { tabId });
  saveState();
}

// Update tab info in renderer
function updateTabInfo(tabId: number): void {
  const view = tabs.get(tabId);
  if (!view || !mainWindow) return;
  
  const info: TabInfo = {
    id: tabId,
    url: view.webContents.getURL(),
    title: view.webContents.getTitle() || 'New Tab'
  };
  
  mainWindow.webContents.send('tab-updated', info);
  
  // Update navigation state
  mainWindow.webContents.send('navigation-state', {
    canGoBack: view.webContents.canGoBack(),
    canGoForward: view.webContents.canGoForward()
  });
}

// Update view bounds based on window size
function updateViewBounds(): void {
  if (!mainWindow || activeTabId === null) return;
  
  const view = tabs.get(activeTabId);
  if (!view) return;
  
  const bounds = mainWindow.getBounds();
  
  view.setBounds({
    x: 0,
    y: TOOLBAR_HEIGHT,
    width: bounds.width,
    height: bounds.height - TOOLBAR_HEIGHT
  });
}

// Navigate in active tab
function navigate(direction: 'back' | 'forward' | 'reload'): void {
  if (activeTabId === null) return;
  
  const view = tabs.get(activeTabId);
  if (!view) return;
  
  switch (direction) {
    case 'back':
      if (view.webContents.canGoBack()) {
        view.webContents.goBack();
      }
      break;
    case 'forward':
      if (view.webContents.canGoForward()) {
        view.webContents.goForward();
      }
      break;
    case 'reload':
      view.webContents.reload();
      break;
  }
}

// Navigate to URL in active tab
function navigateToUrl(url: string): void {
  if (activeTabId === null) return;
  
  const view = tabs.get(activeTabId);
  if (!view) return;
  
  const processedUrl = processAddressInput(url);
  
  if (processedUrl === 'about:newtab') {
    view.webContents.loadFile(getRendererPath('newtab.html'));
  } else {
    view.webContents.loadURL(processedUrl);
  }
}

// Add bookmark
function addBookmark(url: string, title: string, favicon?: string): Bookmark {
  const bookmark: Bookmark = {
    id: Date.now().toString(),
    url,
    title,
    favicon,
    createdAt: Date.now()
  };
  bookmarks.push(bookmark);
  saveState();
  return bookmark;
}

// Remove bookmark
function removeBookmark(id: string): void {
  bookmarks = bookmarks.filter(b => b.id !== id);
  saveState();
}

// Zoom
function setZoom(direction: 'in' | 'out' | 'reset'): void {
  if (activeTabId === null) return;
  
  const view = tabs.get(activeTabId);
  if (!view) return;
  
  switch (direction) {
    case 'in':
      currentZoom = Math.min(currentZoom + 0.1, 3.0);
      break;
    case 'out':
      currentZoom = Math.max(currentZoom - 0.1, 0.3);
      break;
    case 'reset':
      currentZoom = 1.0;
      break;
  }
  
  view.webContents.setZoomFactor(currentZoom);
  mainWindow?.webContents.send('zoom-changed', { zoom: currentZoom });
}

// Find in page
function findInPage(text: string, options?: { forward?: boolean; findNext?: boolean }): void {
  if (activeTabId === null) return;
  
  const view = tabs.get(activeTabId);
  if (!view) return;
  
  if (text) {
    view.webContents.findInPage(text, options);
  } else {
    view.webContents.stopFindInPage('clearSelection');
  }
}

// Toggle DevTools
function toggleDevTools(): void {
  if (activeTabId === null) return;
  
  const view = tabs.get(activeTabId);
  if (!view) return;
  
  view.webContents.toggleDevTools();
}

// Create main window
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  
  mainWindow.loadFile(getRendererPath('index.html'));
  
  // Handle window resize
  mainWindow.on('resize', () => {
    updateViewBounds();
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Restore state
  mainWindow.webContents.on('did-finish-load', () => {
    const state = loadState();
    
    if (state && state.bookmarks) {
      bookmarks = state.bookmarks;
      mainWindow?.webContents.send('bookmarks-updated', bookmarks);
    }
    
    if (state && state.zoom) {
      currentZoom = state.zoom;
    }
    
    // Restore tabs or create a new one
    if (state && state.tabs && state.tabs.length > 0) {
      state.tabs.forEach((tabInfo: TabInfo, index: number) => {
        const tabId = createTab(tabInfo.url, tabInfo.id);
        tabCounter = Math.max(tabCounter, tabInfo.id);
        if (index === 0 || (state.activeTabId && tabInfo.id === state.activeTabId)) {
          switchToTab(tabId);
        }
      });
    } else {
      const tabId = createTab();
      switchToTab(tabId);
    }
  });
  
  // Save state periodically
  setInterval(saveState, 30000);
}

// Register global shortcuts
function registerShortcuts(): void {
  const isMac = process.platform === 'darwin';
  
  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            const tabId = createTab();
            switchToTab(tabId);
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (activeTabId !== null) {
              closeTab(activeTabId);
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
        { type: 'separator' as const },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow?.webContents.send('toggle-find-bar');
          }
        }
      ]
    },
    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => navigate('reload')
        },
        { type: 'separator' as const },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => setZoom('in')
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => setZoom('out')
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => setZoom('reset')
        },
        { type: 'separator' as const },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Cmd+I' : 'F12',
          click: () => toggleDevTools()
        }
      ]
    },
    // Navigate Menu
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => navigate('back')
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => navigate('forward')
        },
        { type: 'separator' as const },
        {
          label: 'Focus Address Bar',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow?.webContents.send('focus-address-bar');
          }
        }
      ]
    },
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const }
        ] : [
          { role: 'close' as const }
        ])
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Setup IPC handlers
function setupIPC(): void {
  // Tab management
  ipcMain.on('create-tab', (_event, url?: string) => {
    const tabId = createTab(url);
    switchToTab(tabId);
  });
  
  ipcMain.on('switch-tab', (_event, tabId: number) => {
    switchToTab(tabId);
  });
  
  ipcMain.on('close-tab', (_event, tabId: number) => {
    closeTab(tabId);
  });
  
  // Navigation
  ipcMain.on('navigate', (_event, direction: 'back' | 'forward' | 'reload') => {
    navigate(direction);
  });
  
  ipcMain.on('navigate-to-url', (_event, url: string) => {
    navigateToUrl(url);
  });
  
  // Bookmarks
  ipcMain.handle('add-bookmark', (_event, { url, title, favicon }) => {
    const bookmark = addBookmark(url, title, favicon);
    mainWindow?.webContents.send('bookmarks-updated', bookmarks);
    return bookmark;
  });
  
  ipcMain.handle('remove-bookmark', (_event, id: string) => {
    removeBookmark(id);
    mainWindow?.webContents.send('bookmarks-updated', bookmarks);
    return true;
  });
  
  ipcMain.handle('get-bookmarks', () => {
    return bookmarks;
  });
  
  ipcMain.handle('is-bookmarked', (_event, url: string) => {
    return bookmarks.some(b => b.url === url);
  });
  
  // Zoom
  ipcMain.on('zoom', (_event, direction: 'in' | 'out' | 'reset') => {
    setZoom(direction);
  });
  
  // Find in page
  ipcMain.on('find-in-page', (_event, { text, options }) => {
    findInPage(text, options);
  });
  
  ipcMain.on('stop-find-in-page', () => {
    if (activeTabId === null) return;
    const view = tabs.get(activeTabId);
    if (view) {
      view.webContents.stopFindInPage('clearSelection');
    }
  });
  
  // DevTools
  ipcMain.on('toggle-devtools', () => {
    toggleDevTools();
  });
  
  // Window controls
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });
  
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  
  ipcMain.on('window-close', () => {
    saveState();
    mainWindow?.close();
  });
  
  // Get current tab info
  ipcMain.handle('get-current-tab-info', () => {
    if (activeTabId === null) return null;
    const view = tabs.get(activeTabId);
    if (!view) return null;
    
    return {
      id: activeTabId,
      url: view.webContents.getURL(),
      title: view.webContents.getTitle()
    };
  });
}

// App event handlers
app.whenReady().then(() => {
  // Note: We don't override CSP for web content in BrowserViews
  // as that would interfere with websites' own security policies.
  // The main renderer window uses CSP defined in the HTML meta tag.
  
  registerShortcuts();
  setupIPC();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  saveState();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  saveState();
});
