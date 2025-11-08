# Real-Time Collaborative Drawing Canvas

A multi-user drawing application that enables simultaneous canvas collaboration with real-time synchronization. Built with vanilla JavaScript/TypeScript on the frontend and Node.js + WebSockets for the backend.

## 📋 Assignment Overview

- **Simultaneous Drawing:** Multiple users can draw in real time.
- **Canvas Tools:** Brush, eraser, various colors, stroke width options.
- **User Indicators:** Display active users and their cursor positions.
- **Global Undo/Redo:** Changes affect all users (see [ARCHITECTURE.md](ARCHITECTURE.md)).
- **Conflict Handling:** Overlapping actions are intelligently managed.
- **User Management:** Shows online users and assigns them unique colors.

## 🗂️ Project Structure

collaborative-canvas/
├── client/
│   ├── index.html             # Main HTML file
│   ├── style.css              # App styling
│   ├── canvas.js              # Canvas drawing logic
│   ├── websocket.js           # WebSocket client logic
│   └── main.js                # App initialization and event handling
│
├── server/
│   ├── server.js              # Express + WebSocket server
│   ├── rooms.js               # Room management logic
│   └── drawing-state.js       # Canvas state, undo/redo, and sync handling
│
├── package.json
├── README.md
└── ARCHITECTURE.md            # Detailed technical documentation

## ⚡ Setup Instructions

1. **Clone and Install**
    ```
    git clone https://github.com/yourusername/collaborative-canvas.git
    cd collaborative-canvas
    npm install
    ```
2. **Start the Server**
    ```
    npm start
    ```
3. **Access**
    - Open `http://localhost:3000` in a modern browser.
    - Supported: Chrome, Firefox, Safari.

## 🧑‍🤝‍🧑 Multi-User Testing

- Open the application in multiple browser windows or devices.
- Draw and observe live updates on all instances.
- User color and cursor position are displayed for each participant.

## ⭐ Features

- Brush & eraser tool
- Color and stroke width picker
- Live user indicators (active cursors)
- Real-time sync of strokes/events
- Global undo/redo
- Online user management

## 🚨 Known Limitations & Bugs

- Undo/redo may briefly desync under heavy concurrent edits.
- Mobile drawing support is experimental (see issues).
- No drawing persistence (session clears on server restart).
- High latency can cause cursor lag on slow networks.

## ⏱️ Time Spent

Total development time: 51 hours (and more for future developments)

## 🛠 Tech Stack

- **Frontend:** Vanilla JS/TS, HTML5 Canvas, raw DOM
- **Backend:** Node.js, WebSockets (Socket.io or native)
- **No frameworks/libraries** for drawing or UI


## 💬 Author info

Author: _[Your Name]_  
Email: _[your.email@example.com]_  
Demo: _[URL to deployed app (Heroku, Vercel, etc.)]_  
Repo: [https://github.com/yourusername/collaborative-canvas](https://github.com/yourusername/collaborative-canvas)

---

For architectural details, data flow diagrams, protocol specs, and performance notes, see [ARCHITECTURE.md](ARCHITECTURE.md).
