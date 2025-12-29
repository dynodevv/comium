import { contextBridge, ipcRenderer } from 'electron';

// Types for the exposed API
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

interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  visitedAt: number;
}

interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
}

interface FindOptions {
  forward?: boolean;
  findNext?: boolean;
}

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('comiumAPI', {
  // Tab management
  createTab: (url?: string) => ipcRenderer.send('create-tab', url),
  switchTab: (tabId: number) => ipcRenderer.send('switch-tab', tabId),
  closeTab: (tabId: number) => ipcRenderer.send('close-tab', tabId),
  
  // Navigation
  navigate: (direction: 'back' | 'forward' | 'reload') => ipcRenderer.send('navigate', direction),
  navigateToUrl: (url: string) => ipcRenderer.send('navigate-to-url', url),
  
  // Bookmarks
  addBookmark: (data: { url: string; title: string; favicon?: string }) => 
    ipcRenderer.invoke('add-bookmark', data),
  removeBookmark: (id: string) => ipcRenderer.invoke('remove-bookmark', id),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  isBookmarked: (url: string) => ipcRenderer.invoke('is-bookmarked', url),
  
  // History
  getHistory: () => ipcRenderer.invoke('get-history'),
  searchHistory: (query: string) => ipcRenderer.invoke('search-history', query),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  
  // Zoom
  zoom: (direction: 'in' | 'out' | 'reset') => ipcRenderer.send('zoom', direction),
  
  // Find in page
  findInPage: (text: string, options?: FindOptions) => 
    ipcRenderer.send('find-in-page', { text, options }),
  stopFindInPage: () => ipcRenderer.send('stop-find-in-page'),
  
  // DevTools
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
  
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  
  // Get current tab info
  getCurrentTabInfo: () => ipcRenderer.invoke('get-current-tab-info'),
  
  // Event listeners
  onTabCreated: (callback: (info: { tabId: number; title: string; url: string }) => void) => {
    ipcRenderer.on('tab-created', (_event, info) => callback(info));
  },
  
  onTabUpdated: (callback: (info: TabInfo) => void) => {
    ipcRenderer.on('tab-updated', (_event, info) => callback(info));
  },
  
  onTabClosed: (callback: (info: { tabId: number }) => void) => {
    ipcRenderer.on('tab-closed', (_event, info) => callback(info));
  },
  
  onTabActivated: (callback: (info: { tabId: number }) => void) => {
    ipcRenderer.on('tab-activated', (_event, info) => callback(info));
  },
  
  onTabLoading: (callback: (info: { tabId: number; loading: boolean }) => void) => {
    ipcRenderer.on('tab-loading', (_event, info) => callback(info));
  },
  
  onTabFaviconUpdated: (callback: (info: { tabId: number; favicon: string }) => void) => {
    ipcRenderer.on('tab-favicon-updated', (_event, info) => callback(info));
  },
  
  onNavigationState: (callback: (state: NavigationState) => void) => {
    ipcRenderer.on('navigation-state', (_event, state) => callback(state));
  },
  
  onBookmarksUpdated: (callback: (bookmarks: Bookmark[]) => void) => {
    ipcRenderer.on('bookmarks-updated', (_event, bookmarks) => callback(bookmarks));
  },
  
  onZoomChanged: (callback: (info: { zoom: number }) => void) => {
    ipcRenderer.on('zoom-changed', (_event, info) => callback(info));
  },
  
  onToggleFindBar: (callback: () => void) => {
    ipcRenderer.on('toggle-find-bar', () => callback());
  },
  
  onFocusAddressBar: (callback: () => void) => {
    ipcRenderer.on('focus-address-bar', () => callback());
  }
});

// For TypeScript: declare the window interface
declare global {
  interface Window {
    comiumAPI: {
      createTab: (url?: string) => void;
      switchTab: (tabId: number) => void;
      closeTab: (tabId: number) => void;
      navigate: (direction: 'back' | 'forward' | 'reload') => void;
      navigateToUrl: (url: string) => void;
      addBookmark: (data: { url: string; title: string; favicon?: string }) => Promise<Bookmark>;
      removeBookmark: (id: string) => Promise<boolean>;
      getBookmarks: () => Promise<Bookmark[]>;
      isBookmarked: (url: string) => Promise<boolean>;
      getHistory: () => Promise<HistoryEntry[]>;
      searchHistory: (query: string) => Promise<HistoryEntry[]>;
      clearHistory: () => Promise<boolean>;
      zoom: (direction: 'in' | 'out' | 'reset') => void;
      findInPage: (text: string, options?: FindOptions) => void;
      stopFindInPage: () => void;
      toggleDevTools: () => void;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      getCurrentTabInfo: () => Promise<TabInfo | null>;
      onTabCreated: (callback: (info: { tabId: number; title: string; url: string }) => void) => void;
      onTabUpdated: (callback: (info: TabInfo) => void) => void;
      onTabClosed: (callback: (info: { tabId: number }) => void) => void;
      onTabActivated: (callback: (info: { tabId: number }) => void) => void;
      onTabLoading: (callback: (info: { tabId: number; loading: boolean }) => void) => void;
      onTabFaviconUpdated: (callback: (info: { tabId: number; favicon: string }) => void) => void;
      onNavigationState: (callback: (state: NavigationState) => void) => void;
      onBookmarksUpdated: (callback: (bookmarks: Bookmark[]) => void) => void;
      onZoomChanged: (callback: (info: { zoom: number }) => void) => void;
      onToggleFindBar: (callback: () => void) => void;
      onFocusAddressBar: (callback: () => void) => void;
    };
  }
}

// Set up Ctrl+scroll wheel zoom handler for web content
document.addEventListener('wheel', (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault();
    ipcRenderer.send('zoom', e.deltaY < 0 ? 'in' : 'out');
  }
}, { passive: false });
