# 🎭 Virtual Dungeon Master: The Chaos Architect

> "Legendary moments, narrow escapes, and hilarious failures—locally powered and infinitely persistent."

Welcome to the **Virtual DM** repository. This is an installable, offline-first Progressive Web App (PWA) designed to act as your ultimate D&D 2024 companion. It runs locally on your device (WebGPU) for maximum privacy and performance.

![Dungeons & Dragons](https://img.shields.io/badge/Ruleset-D%26D%202024-red?style=for-the-badge)
![WebLLM](https://img.shields.io/badge/Engine-WebLLM%20(Local)-blue?style=for-the-badge)
![PWA](https://img.shields.io/badge/Platform-Android%20PWA-green?style=for-the-badge)

---

## 📂 Repository Structure

*   **`dnd-dm-emulator/`**: The core application. A Vite + React project featuring:
    *   **Local LLM**: Powered by Gemma 2B via WebLLM.
    *   **Persistence**: Character and session state synced to IndexedDB.
    *   **Voice Mode**: Real-time DM interaction.
*   **`references/`**: Official rulebooks and resources (Ignored by Git to keep the repo lean).
*   **`examples/`**: Template markdown files for World Building, NPC tracking, and Combat.

---

## 🚀 Quick Start (Android PWA)

1.  **Deploy**: Push to Vercel (Production configuration is in `vercel.json`).
2.  **Install**: Open the Vercel URL in Chrome on Android.
3.  **Add to Home Screen**: Select "Install App" or "Add to Home Screen" from the menu.
4.  **Awaken the Master**: Choose "Local (Gemma)" to download the ~1.5GB model directly to your browser cache.

---

## 🛠️ Tech Stack

*   **Logic**: React, TypeScript, TailwindCSS.
*   **AI**: WebLLM (MLC-AI), Google Gemini (Cloud Fallback).
*   **Persistence**: `idb-keyval` (IndexedDB).
*   **Design**: Framer Motion, Lucide Icons, Custom Fantasy Borders.

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*“Your blade catches the torchlight before sinking into the goblin's rusted mail...”*
