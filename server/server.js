const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 10e6 // 10MB for large canvas data
});

app.use(express.static(path.join(__dirname, '../client')));

// Store room data
const rooms = new Map();

/*
Room structure:
{
  roomId: {
    users: Map<socketId, { username, color }>,
    undoStack: [],    // Array of canvas snapshots
    redoStack: [],    // Redo snapshots
    currentState: null // Current canvas state
  }
}
*/

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (data) => {
    const { username, roomId, color } = data;
    
    socket.username = username;
    socket.roomId = roomId;
    socket.color = color;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        undoStack: [],
        redoStack: [],
        currentState: null,
        templateData: null
      });
    }

    const room = rooms.get(roomId);
    room.users.set(socket.id, { username, color });

    console.log(`${username} joined room: ${roomId}`);

    // Send current canvas state to new user
    if (room.currentState) {
      socket.emit('load-canvas', room.currentState);
    }

    const usersArray = Array.from(room.users.entries()).map(([id, user]) => ({
      id,
      username: user.username,
      color: user.color
    }));

    io.to(roomId).emit('user-joined', {
      userId: socket.id,
      username,
      color,
      userCount: room.users.size,
      users: usersArray
    });

    socket.emit('room-users', usersArray);
  });

  socket.on('chat message', (data) => {
    io.to(socket.roomId).emit('chat message', data);
  });

  // Real-time drawing segments
  socket.on('draw-segment', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('draw-segment', data);
    }
  });

  // Complete stroke
  socket.on('stroke-complete', (stroke) => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        console.log(`Stroke completed in room ${socket.roomId}`);
      }
    }
  });

  socket.on('cursor-move', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('cursor-move', {
        ...data,
        userId: socket.id
      });
    }
  });

  // Save canvas snapshot (called after each complete operation)
  socket.on('save-canvas', (canvasData) => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        // Push current state to undo stack before saving new state
        if (room.currentState) {
          room.undoStack.push(room.currentState);
          
          // Limit undo stack to last 20 states
          if (room.undoStack.length > 20) {
            room.undoStack.shift();
          }
        }
        
        // Clear redo stack when new action is performed
        room.redoStack = [];
        
        // Save new current state
        room.currentState = canvasData;
        
        console.log(`Canvas saved. Undo stack: ${room.undoStack.length}, Redo stack: ${room.redoStack.length}`);
      }
    }
  });

  // Global Undo
  socket.on('undo', () => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room && room.undoStack.length > 0) {
        // Push current state to redo stack
        if (room.currentState) {
          room.redoStack.push(room.currentState);
          
          // Limit redo stack
          if (room.redoStack.length > 20) {
            room.redoStack.shift();
          }
        }
        
        // Pop from undo stack
        room.currentState = room.undoStack.pop();
        
        // Broadcast to all users
        io.to(socket.roomId).emit('restore-canvas', room.currentState);
        
        console.log(`Undo in room ${socket.roomId}. Undo: ${room.undoStack.length}, Redo: ${room.redoStack.length}`);
      } else {
        console.log(`Cannot undo - undo stack is empty`);
      }
    }
  });

  // Global Redo
  socket.on('redo', () => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room && room.redoStack.length > 0) {
        // Push current state back to undo stack
        if (room.currentState) {
          room.undoStack.push(room.currentState);
        }
        
        // Pop from redo stack
        room.currentState = room.redoStack.pop();
        
        // Broadcast to all users
        io.to(socket.roomId).emit('restore-canvas', room.currentState);
        
        console.log(`Redo in room ${socket.roomId}. Undo: ${room.undoStack.length}, Redo: ${room.redoStack.length}`);
      } else {
        console.log(`Cannot redo - redo stack is empty`);
      }
    }
  });

  // Template loading
  socket.on('load-template', (data) => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.templateData = data;
        
        // Save this as a new state
        room.undoStack = []; // Clear undo stack when loading template
        room.redoStack = [];
        room.currentState = null;
      }
      socket.to(socket.roomId).emit('load-template', data);
      console.log(`Template loaded in room ${socket.roomId}`);
    }
  });

  // Bucket fill
  socket.on('bucket-fill', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('bucket-fill', data);
      console.log(`Bucket fill in room ${socket.roomId}`);
    }
  });

  socket.on('clear-canvas', () => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        // Save current state to undo before clearing
        if (room.currentState) {
          room.undoStack.push(room.currentState);
        }
        room.currentState = null;
        room.redoStack = [];
        room.templateData = null;
      }
      io.to(socket.roomId).emit('clear-canvas');
      console.log(`Canvas cleared in room ${socket.roomId}`);
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomId && socket.username) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.users.delete(socket.id);
        
        const usersArray = Array.from(room.users.entries()).map(([id, user]) => ({
          id,
          username: user.username,
          color: user.color
        }));
        
        io.to(socket.roomId).emit('user-left', {
          userId: socket.id,
          username: socket.username,
          userCount: room.users.size,
          users: usersArray
        });

        if (room.users.size === 0) {
          setTimeout(() => {
            const currentRoom = rooms.get(socket.roomId);
            if (currentRoom && currentRoom.users.size === 0) {
              rooms.delete(socket.roomId);
              console.log(`Room ${socket.roomId} deleted (empty)`);
            }
          }, 3600000);
        }
      }
      console.log(`${socket.username} left room: ${socket.roomId}`);
    }
  });
});

app.get('/stats', (req, res) => {
  const stats = {
    activeRooms: rooms.size,
    rooms: Array.from(rooms.entries()).map(([id, room]) => ({
      roomId: id,
      users: room.users.size,
      undoStackSize: room.undoStack.length,
      redoStackSize: room.redoStack.length
    }))
  };
  res.json(stats);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Stats available at http://localhost:${PORT}/stats`);
});