# Real-Time Collaborative Drawing Canvas

A multi-user drawing application that enables simultaneous canvas collaboration with real-time synchronization. Built with vanilla JavaScript/TypeScript on the frontend and Node.js + WebSockets for the backend.

## 📋 Assignment Overview

- **Simultaneous Drawing:** Multiple users can draw in real time.
- **Canvas Tools:** Brush, eraser, various colors, stroke width options.
- **User Indicators:** Display active users and their cursor positions.
- **Global Undo/Redo:** Changes affect all users (see [Architecture.md](Architecture.md)).
- **Conflict Handling:** Overlapping actions are intelligently managed.
- **User Management:** Shows online users and assigns them unique colors.

## 🗂️ Project Structure

```
client
├── canvas.js
├── index.html
├── main.js
├── style.css
└── websocket.js
node_modules
server
├── drawing-state.js
├── index.html
├── rooms.js
└── server.js
Architecture.md
package-lock.json
package.json
README.md
```

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

- Undo/redo doesn't work for first stroke.
- Mobile drawing support is experimental.
- No drawing persistence once link.
- High latency can cause cursor lag on slow networks.

## ⏱️ Time Spent

Total development time: 51 hours (and more for future developments)

## 🛠 Tech Stack

- **Frontend:** JavaScript
- **UI:** Canvas
- **RealTime:** Socket.IO
- **Backend:** Node.js
- **Framework:** Express
- **PackageManager:** npm
- **Hosting:** RENDER


## 💬 Author info

Author: _Shrie Varshini_  
Email: _shrievarshini.2004@gmail.com_  
Demo: _https://drive.google.com/file/d/1SILHi54vrx357JX3_F4Slaw27JfN9g7M/view?usp=sharing_  
website URL: https://collaborative-canvas-s833.onrender.com
Repo: _https://github.com/ShrieVarshini2004/collaborative-canvas/tree/main_

---

For architectural details, data flow diagrams, protocol specs, and performance notes, see [Architecture.md](Architecture.md).
