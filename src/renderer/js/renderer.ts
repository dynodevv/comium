// Comium Browser - Renderer Script

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

// State
let activeTabId: number | null = null;
const tabElements: Map<number, HTMLElement> = new Map();
let bookmarks: Bookmark[] = [];
let findBarVisible = false;

// DOM Elements
const tabsContainer = document.getElementById('tabsContainer') as HTMLElement;
const btnNewTab = document.getElementById('btnNewTab') as HTMLButtonElement;
const btnBack = document.getElementById('btnBack') as HTMLButtonElement;
const btnForward = document.getElementById('btnForward') as HTMLButtonElement;
const btnReload = document.getElementById('btnReload') as HTMLButtonElement;
const addressInput = document.getElementById('addressInput') as HTMLInputElement;
const btnBookmark = document.getElementById('btnBookmark') as HTMLButtonElement;
const btnZoomOut = document.getElementById('btnZoomOut') as HTMLButtonElement;
const btnZoomIn = document.getElementById('btnZoomIn') as HTMLButtonElement;
const btnFind = document.getElementById('btnFind') as HTMLButtonElement;
const btnDevTools = document.getElementById('btnDevTools') as HTMLButtonElement;
const findBar = document.getElementById('findBar') as HTMLElement;
const findInput = document.getElementById('findInput') as HTMLInputElement;
const btnFindPrev = document.getElementById('btnFindPrev') as HTMLButtonElement;
const btnFindNext = document.getElementById('btnFindNext') as HTMLButtonElement;
const btnCloseFindBar = document.getElementById('btnCloseFindBar') as HTMLButtonElement;
const bookmarksBar = document.getElementById('bookmarksBar') as HTMLElement;
const bookmarksContainer = document.getElementById('bookmarksContainer') as HTMLElement;
const btnMinimize = document.getElementById('btnMinimize') as HTMLButtonElement;
const btnMaximize = document.getElementById('btnMaximize') as HTMLButtonElement;
const btnClose = document.getElementById('btnClose') as HTMLButtonElement;

// Initialize
function init(): void {
  setupEventListeners();
  setupIPCListeners();
  loadBookmarks();
}

// Setup event listeners
function setupEventListeners(): void {
  // Window controls
  btnMinimize.addEventListener('click', () => window.comiumAPI.windowMinimize());
  btnMaximize.addEventListener('click', () => window.comiumAPI.windowMaximize());
  btnClose.addEventListener('click', () => window.comiumAPI.windowClose());
  
  // Tab management
  btnNewTab.addEventListener('click', () => window.comiumAPI.createTab());
  
  // Navigation
  btnBack.addEventListener('click', () => window.comiumAPI.navigate('back'));
  btnForward.addEventListener('click', () => window.comiumAPI.navigate('forward'));
  btnReload.addEventListener('click', () => window.comiumAPI.navigate('reload'));
  
  // Address bar
  addressInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const url = addressInput.value.trim();
      if (url) {
        window.comiumAPI.navigateToUrl(url);
        addressInput.blur();
      }
    } else if (e.key === 'Escape') {
      addressInput.blur();
    }
  });
  
  addressInput.addEventListener('focus', () => {
    addressInput.select();
  });
  
  // Bookmark button
  btnBookmark.addEventListener('click', toggleBookmark);
  
  // Zoom
  btnZoomOut.addEventListener('click', () => window.comiumAPI.zoom('out'));
  btnZoomIn.addEventListener('click', () => window.comiumAPI.zoom('in'));
  
  // Find in page
  btnFind.addEventListener('click', toggleFindBar);
  btnCloseFindBar.addEventListener('click', closeFindBar);
  
  findInput.addEventListener('input', () => {
    window.comiumAPI.findInPage(findInput.value);
  });
  
  findInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      window.comiumAPI.findInPage(findInput.value, { findNext: true, forward: !e.shiftKey });
    } else if (e.key === 'Escape') {
      closeFindBar();
    }
  });
  
  btnFindPrev.addEventListener('click', () => {
    window.comiumAPI.findInPage(findInput.value, { findNext: true, forward: false });
  });
  
  btnFindNext.addEventListener('click', () => {
    window.comiumAPI.findInPage(findInput.value, { findNext: true, forward: true });
  });
  
  // DevTools
  btnDevTools.addEventListener('click', () => window.comiumAPI.toggleDevTools());
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e: KeyboardEvent): void {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
  
  if (cmdOrCtrl) {
    switch (e.key.toLowerCase()) {
      case 't':
        e.preventDefault();
        window.comiumAPI.createTab();
        break;
      case 'w':
        e.preventDefault();
        if (activeTabId !== null) {
          window.comiumAPI.closeTab(activeTabId);
        }
        break;
      case 'l':
        e.preventDefault();
        addressInput.focus();
        break;
      case 'f':
        e.preventDefault();
        toggleFindBar();
        break;
      case 'r':
        e.preventDefault();
        window.comiumAPI.navigate('reload');
        break;
      case '=':
      case '+':
        e.preventDefault();
        window.comiumAPI.zoom('in');
        break;
      case '-':
        e.preventDefault();
        window.comiumAPI.zoom('out');
        break;
      case '0':
        e.preventDefault();
        window.comiumAPI.zoom('reset');
        break;
    }
  }
  
  if (e.key === 'F12') {
    e.preventDefault();
    window.comiumAPI.toggleDevTools();
  }
  
  if (e.altKey) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      window.comiumAPI.navigate('back');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      window.comiumAPI.navigate('forward');
    }
  }
}

// Setup IPC listeners
function setupIPCListeners(): void {
  window.comiumAPI.onTabCreated((info) => {
    createTabElement(info.tabId, info.title, info.url);
  });
  
  window.comiumAPI.onTabUpdated((info) => {
    updateTabElement(info);
    if (info.id === activeTabId) {
      updateAddressBar(info.url);
      updateBookmarkButton(info.url);
    }
  });
  
  window.comiumAPI.onTabClosed((info) => {
    removeTabElement(info.tabId);
  });
  
  window.comiumAPI.onTabActivated((info) => {
    setActiveTab(info.tabId);
  });
  
  window.comiumAPI.onTabLoading((info) => {
    setTabLoading(info.tabId, info.loading);
  });
  
  window.comiumAPI.onTabFaviconUpdated((info) => {
    updateTabFavicon(info.tabId, info.favicon);
  });
  
  window.comiumAPI.onNavigationState((state) => {
    btnBack.disabled = !state.canGoBack;
    btnForward.disabled = !state.canGoForward;
  });
  
  window.comiumAPI.onBookmarksUpdated((newBookmarks) => {
    bookmarks = newBookmarks;
    renderBookmarks();
  });
  
  // Listen for menu-triggered actions
  window.comiumAPI.onToggleFindBar(() => {
    toggleFindBar();
  });
  
  window.comiumAPI.onFocusAddressBar(() => {
    addressInput.focus();
  });
}

// Create tab element
function createTabElement(tabId: number, title: string, url: string): void {
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.tabId = tabId.toString();
  
  tab.innerHTML = `
    <img class="tab-favicon" src="" alt="" style="display: none;">
    <span class="tab-title">${escapeHtml(title)}</span>
    <button class="tab-close" title="Close Tab">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </button>
  `;
  
  // Tab click handler
  tab.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.tab-close')) {
      window.comiumAPI.switchTab(tabId);
    }
  });
  
  // Close button handler
  const closeBtn = tab.querySelector('.tab-close') as HTMLButtonElement;
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.comiumAPI.closeTab(tabId);
  });
  
  tabsContainer.appendChild(tab);
  tabElements.set(tabId, tab);
}

// Update tab element
function updateTabElement(info: TabInfo): void {
  const tab = tabElements.get(info.id);
  if (!tab) return;
  
  const titleElement = tab.querySelector('.tab-title') as HTMLElement;
  titleElement.textContent = info.title || 'New Tab';
  titleElement.title = info.title || '';
}

// Update tab favicon
function updateTabFavicon(tabId: number, favicon: string): void {
  const tab = tabElements.get(tabId);
  if (!tab) return;
  
  const faviconElement = tab.querySelector('.tab-favicon') as HTMLImageElement;
  if (favicon) {
    faviconElement.src = favicon;
    faviconElement.style.display = 'block';
    faviconElement.onerror = () => {
      faviconElement.style.display = 'none';
    };
  } else {
    faviconElement.style.display = 'none';
  }
}

// Set tab loading state
function setTabLoading(tabId: number, loading: boolean): void {
  const tab = tabElements.get(tabId);
  if (!tab) return;
  
  const faviconElement = tab.querySelector('.tab-favicon') as HTMLElement;
  if (loading) {
    faviconElement.classList.add('loading');
  } else {
    faviconElement.classList.remove('loading');
  }
}

// Remove tab element
function removeTabElement(tabId: number): void {
  const tab = tabElements.get(tabId);
  if (tab) {
    tab.remove();
    tabElements.delete(tabId);
  }
}

// Set active tab
function setActiveTab(tabId: number): void {
  // Remove active class from previous tab
  tabElements.forEach((tab) => {
    tab.classList.remove('active');
  });
  
  // Add active class to new tab
  const tab = tabElements.get(tabId);
  if (tab) {
    tab.classList.add('active');
  }
  
  activeTabId = tabId;
}

// Update address bar
function updateAddressBar(url: string): void {
  if (url && !url.startsWith('data:')) {
    addressInput.value = url === 'about:newtab' ? '' : url;
  } else if (!url || url.startsWith('data:')) {
    addressInput.value = '';
  }
}

// Toggle bookmark
async function toggleBookmark(): Promise<void> {
  const info = await window.comiumAPI.getCurrentTabInfo();
  if (!info) return;
  
  const isBookmarked = await window.comiumAPI.isBookmarked(info.url);
  
  if (isBookmarked) {
    const bookmark = bookmarks.find(b => b.url === info.url);
    if (bookmark) {
      await window.comiumAPI.removeBookmark(bookmark.id);
    }
  } else {
    await window.comiumAPI.addBookmark({
      url: info.url,
      title: info.title
    });
  }
}

// Update bookmark button
async function updateBookmarkButton(url: string): Promise<void> {
  const isBookmarked = await window.comiumAPI.isBookmarked(url);
  if (isBookmarked) {
    btnBookmark.classList.add('bookmarked');
  } else {
    btnBookmark.classList.remove('bookmarked');
  }
}

// Load bookmarks
async function loadBookmarks(): Promise<void> {
  bookmarks = await window.comiumAPI.getBookmarks();
  renderBookmarks();
}

// Render bookmarks
function renderBookmarks(): void {
  bookmarksContainer.innerHTML = '';
  
  if (bookmarks.length > 0) {
    bookmarksBar.classList.add('visible');
    
    bookmarks.forEach((bookmark) => {
      const item = document.createElement('button');
      item.className = 'bookmark-item';
      item.title = bookmark.url;
      
      let faviconHtml = '';
      if (bookmark.favicon) {
        faviconHtml = `<img src="${escapeHtml(bookmark.favicon)}" alt="">`;
      }
      
      item.innerHTML = `${faviconHtml}<span>${escapeHtml(bookmark.title)}</span>`;
      
      item.addEventListener('click', () => {
        window.comiumAPI.navigateToUrl(bookmark.url);
      });
      
      bookmarksContainer.appendChild(item);
    });
  } else {
    bookmarksBar.classList.remove('visible');
  }
}

// Toggle find bar
function toggleFindBar(): void {
  findBarVisible = !findBarVisible;
  
  if (findBarVisible) {
    findBar.classList.remove('hidden');
    findInput.focus();
  } else {
    closeFindBar();
  }
}

// Close find bar
function closeFindBar(): void {
  findBarVisible = false;
  findBar.classList.add('hidden');
  findInput.value = '';
  window.comiumAPI.stopFindInPage();
}

// Escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
