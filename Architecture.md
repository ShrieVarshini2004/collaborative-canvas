# Architecture Overview

This document outlines the architectural design and core technical decisions for the Real-Time Collaborative Drawing Canvas.

## System Components

- **Client (Frontend):**  
  Developed in Vanilla JavaScript, directly manipulating the HTML5 Canvas API for drawing operations and DOM for UI controls.  
- **Server (Backend):**  
  Built with Node.js and Express.js, utilizing Socket.IO to manage real-time bi-directional communication between clients.

## Data Flow

```
graph LR
UserA[User A's Browser]
UserB[User B's Browser]
```

Backend[Node.js + Socket.IO Server]
UserA -- Draw Events --> Backend
UserB -- Draw Events --> Backend
Backend -- Broadcast Draw Events --> UserA
Backend -- Broadcast Draw Events --> UserB


User drawing actions (strokes, cursor movements) are serialized and transmitted via WebSocket events to the backend, which broadcasts these to all connected clients for real-time synchronization.

## Communication Protocol

- **Client emits:**  
  - `draw_event` with stroke and tool data  
  - `cursor_move` with current cursor coordinates  
  - `undo_request` / `redo_request` to modify global canvas state  
- **Server broadcasts:**  
  - Corresponding `draw_event`, `cursor_update`, and undo/redo results  
  - User presence updates (`user_joined`, `user_left`, `user_list_update`)

## Undo/Redo Mechanism

- The server maintains a global operation log of all drawing actions.  
- Undo/redo requests update this log and replay the operations to all clients to maintain a consistent canvas state.  
- Conflict resolution ensures order integrity and fair operation in multi-user scenarios.

## Performance Strategies

- Event batching and throttling reduce network overhead.  
- Client-side rendering uses `requestAnimationFrame` to ensure smooth updates.  
- Cursors and user presence data are optimized to send only on meaningful changes.

## Future Scalability

- Planned stateless server architecture enabling horizontal scaling using external state stores if needed.  
- Potential for multi-room support to allow isolated sessions.

---

*This document is intended for project reviewers and future contributors to understand system functioning and design choices.*

