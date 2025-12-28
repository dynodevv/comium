# Comium

<div align="center">
  <h3>A Modern, Minimal Desktop Browser</h3>
  <p>Built with Electron and TypeScript</p>
  
  ![Build Status](https://github.com/dynodevv/comium/actions/workflows/build.yml/badge.svg)
  ![License](https://img.shields.io/badge/license-MIT-blue.svg)
  ![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
</div>

---

## ✨ Overview

Comium is a modern, minimal, cross-platform Chromium-based desktop browser. Inspired by Arc Browser and Nothing's design language, it offers a clean, premium UI with both dark and light mode support.

## 🎨 Features

### Core Browser Features
- **Modern Tab System** - Create, switch, and close tabs with smooth animations
- **Smart Address Bar** - Supports both URLs and search queries
- **Navigation Controls** - Back, forward, and reload buttons
- **Session Restore** - Automatically restores your previous tabs on startup

### Quality of Life
- **Bookmarks** - Save and organize your favorite pages
- **Zoom Controls** - Easily zoom in/out with keyboard shortcuts
- **Find in Page** - Search for text within any webpage
- **DevTools** - Built-in developer tools for debugging

### Design
- **Dark & Light Mode** - Automatically follows your system theme
- **Minimal UI** - Clean, distraction-free interface
- **Smooth Animations** - Subtle hover and focus effects
- **Responsive Layout** - Works great at any window size

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + T` | New Tab |
| `Ctrl/Cmd + W` | Close Tab |
| `Ctrl/Cmd + L` | Focus Address Bar |
| `Ctrl/Cmd + F` | Find in Page |
| `Ctrl/Cmd + R` | Reload |
| `Ctrl/Cmd + +` | Zoom In |
| `Ctrl/Cmd + -` | Zoom Out |
| `Ctrl/Cmd + 0` | Reset Zoom |
| `Alt + Left` | Go Back |
| `Alt + Right` | Go Forward |
| `F12` | Toggle DevTools |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dynodevv/comium.git
   cd comium
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

### Development

Run the app in development mode:
```bash
npm run dev
```

Build TypeScript without starting the app:
```bash
npm run build
```

## 📦 Building for Production

Build for your current platform:
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# All platforms
npm run build:all
```

Built applications will be output to the `release/` directory.

## 🔧 Project Structure

```
comium/
├── src/
│   ├── main/           # Main process (Electron)
│   │   └── main.ts     # Application entry point
│   ├── preload/        # Preload scripts
│   │   └── preload.ts  # Context bridge API
│   └── renderer/       # Renderer process (UI)
│       ├── index.html  # Main browser UI
│       ├── newtab.html # New tab page
│       ├── css/        # Stylesheets
│       └── js/         # UI scripts
├── assets/             # App icons and resources
├── dist/               # Compiled TypeScript output
├── release/            # Built applications
└── .github/
    └── workflows/      # GitHub Actions CI/CD
```

## 🔐 Security

Comium follows Electron security best practices:

- ✅ `contextIsolation` enabled
- ✅ `nodeIntegration` disabled in renderer
- ✅ Secure preload scripts with context bridge
- ✅ Sandbox enabled for all web content

## 🤖 GitHub Actions

The project includes automated CI/CD workflows:

- **Build on Push/PR** - Automatically builds on every push to `main` and pull request
- **Multi-platform Builds** - Creates artifacts for Windows, macOS, and Linux
- **Release Automation** - Automatically creates releases when tags are pushed

### Triggering a Release

1. Create and push a tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. GitHub Actions will automatically build and create a release with all platform artifacts.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI inspired by [Arc Browser](https://arc.net/) and [Nothing](https://nothing.tech/)
- Developed with the assistance of GitHub Copilot

---

<div align="center">
  <sub>Made with ❤️ by the Comium Team</sub>
</div>

