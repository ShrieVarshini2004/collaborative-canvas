const socket = io();

const loginDiv = document.getElementById('login');
const appDiv = document.getElementById('app');
const usernameInput = document.getElementById('usernameInput');
const roomIdInput = document.getElementById('roomIdInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomInfo = document.getElementById('roomInfo');
const displayRoomId = document.getElementById('displayRoomId');
const copyRoomBtn = document.getElementById('copyRoomBtn');
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// UI elements
const chatToggle = document.getElementById('chatToggle');
const chatSidebar = document.getElementById('chatSidebar');
const closeChatBtn = document.getElementById('closeChatBtn');
const roomBadge = document.getElementById('roomBadge');
const userCount = document.getElementById('userCount');
const usersList = document.getElementById('usersList');
const cursorsContainer = document.getElementById('cursorsContainer');

// Drawing tools
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const brushBtn = document.getElementById('brushBtn');
const eraserBtn = document.getElementById('eraserBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const userColorIndicator = document.getElementById('userColorIndicator');
const brushStyleBtn = document.getElementById('brushStyleBtn');
const brushStyleMenu = document.getElementById('brushStyleMenu');

let username = null;
let roomId = null;
let userColor = null;

// Drawing state
let drawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = '#000000';
let currentBrushSize = 3;
let isEraser = false;
let currentBrushStyle = 'normal'; // normal, pixel, airbrush, spray, calligraphy, sketch

// Current stroke data (for grouping operations)
let currentStroke = null;
let strokeId = null;

// Remote cursors
const remoteCursors = new Map();

// Throttle cursor updates
let lastCursorSent = 0;
const CURSOR_THROTTLE = 50; // ms

// --- Create Room ---
createRoomBtn.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (!name) {
    alert('Please enter your name');
    return;
  }
  
  username = name;
  roomId = generateRoomId();
  
  displayRoomId.textContent = roomId;
  roomInfo.style.display = 'block';
  
  createRoomBtn.style.display = 'none';
  joinRoomBtn.style.display = 'none';
  roomIdInput.style.display = 'none';
  document.querySelector('.divider').style.display = 'none';
});

// --- Join Room ---
joinRoomBtn.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  const room = roomIdInput.value.trim();
  
  if (!name) {
    alert('Please enter your name');
    return;
  }
  
  if (!room) {
    alert('Please enter a room ID');
    return;
  }
  
  username = name;
  roomId = room;
  joinCanvas();
});

// --- Copy Room ID ---
copyRoomBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(roomId);
  copyRoomBtn.textContent = '✓ Copied!';
  setTimeout(() => {
    copyRoomBtn.textContent = '📋 Copy Room ID';
  }, 2000);
  
  joinCanvas();
});

// --- Join Canvas ---
function joinCanvas() {
  userColor = generateRandomColor();
  
  socket.emit('join-room', { username, roomId, color: userColor });
  loginDiv.style.display = 'none';
  appDiv.style.display = 'block';
  roomBadge.textContent = `Room: ${roomId}`;
  userColorIndicator.style.backgroundColor = userColor;
  resizeCanvas();
}

// --- Generate Random Room ID ---
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// --- Generate Random Color ---
function generateRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

// --- Canvas Resize ---
function resizeCanvas() {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  
  canvas.width = window.innerWidth - 220;
  canvas.height = window.innerHeight;
  
  ctx.drawImage(tempCanvas, 0, 0);
}

window.addEventListener('resize', resizeCanvas);

// --- Load Canvas State ---
socket.on('load-canvas', (canvasData) => {
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
  };
  img.src = canvasData;
});

// --- Load Drawing History ---
socket.on('load-history', (history) => {
  // Save template if it exists
  const tempTemplate = backgroundImage;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Redraw template first if it exists
  if (tempTemplate) {
    const scale = Math.min(
      canvas.width / tempTemplate.width * 0.8,
      canvas.height / tempTemplate.height * 0.8
    );
    const x = (canvas.width - tempTemplate.width * scale) / 2;
    const y = (canvas.height - tempTemplate.height * scale) / 2;
    ctx.drawImage(tempTemplate, x, y, tempTemplate.width * scale, tempTemplate.height * scale);
  }
  
  // Then draw all operations
  history.forEach(stroke => {
    drawStroke(stroke);
  });
});

// --- User Management ---
socket.on('user-joined', (data) => {
  userCount.textContent = data.userCount;
  addSystemMessage(`${data.username} joined the room`);
  
  if (data.userId !== socket.id) {
    createRemoteCursor(data.userId, data.username, data.color);
  }
});

socket.on('user-left', (data) => {
  userCount.textContent = data.userCount;
  addSystemMessage(`${data.username} left the room`);
  removeRemoteCursor(data.userId);
});

socket.on('room-users', (users) => {
  usersList.innerHTML = users.map(u => 
    `<span style="color: ${u.color}">● ${u.username}</span>`
  ).join(', ');
  userCount.textContent = users.length;
  
  users.forEach(user => {
    if (user.id !== socket.id) {
      createRemoteCursor(user.id, user.username, user.color);
    }
  });
});

function addSystemMessage(message) {
  const li = document.createElement('li');
  li.textContent = `🔔 ${message}`;
  li.style.background = '#1e1e1e';
  li.style.fontStyle = 'italic';
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// --- Remote Cursors ---
function createRemoteCursor(userId, username, color) {
  if (remoteCursors.has(userId)) return;
  
  const cursorDiv = document.createElement('div');
  cursorDiv.className = 'remote-cursor';
  cursorDiv.style.backgroundColor = color;
  cursorDiv.innerHTML = `<div class="cursor-label">${username}</div>`;
  cursorDiv.style.display = 'none';
  cursorsContainer.appendChild(cursorDiv);
  
  remoteCursors.set(userId, cursorDiv);
}

function removeRemoteCursor(userId) {
  const cursor = remoteCursors.get(userId);
  if (cursor) {
    cursor.remove();
    remoteCursors.delete(userId);
  }
}

function updateRemoteCursor(userId, x, y) {
  const cursor = remoteCursors.get(userId);
  if (cursor) {
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    cursor.style.display = 'block';
  }
}

socket.on('cursor-move', (data) => {
  updateRemoteCursor(data.userId, data.x, data.y);
});

// --- Chat Toggle ---
chatToggle.addEventListener('click', () => {
  chatSidebar.classList.add('open');
  chatToggle.classList.add('hidden');
});

closeChatBtn.addEventListener('click', () => {
  chatSidebar.classList.remove('open');
  chatToggle.classList.remove('hidden');
});

// --- Chat ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit('chat message', { username, message: input.value });
    input.value = '';
  }
});

socket.on('chat message', (data) => {
  const li = document.createElement('li');
  li.textContent = `${data.username}: ${data.message}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// --- Drawing Tools Setup ---
colorPicker.addEventListener('input', (e) => {
  currentColor = e.target.value;
  isEraser = false;
  isBucketMode = false;
  brushBtn.classList.add('active');
  eraserBtn.classList.remove('active');
  bucketBtn.classList.remove('active');
  canvas.classList.remove('bucket-mode');
});

brushSize.addEventListener('input', (e) => {
  currentBrushSize = parseInt(e.target.value);
  brushSizeValue.textContent = currentBrushSize;
});

brushBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isEraser = false;
  isBucketMode = false;
  brushBtn.classList.add('active');
  eraserBtn.classList.remove('active');
  bucketBtn.classList.remove('active');
  canvas.classList.remove('bucket-mode');
  
  // Toggle brush style menu
  brushStyleMenu.classList.toggle('open');
});

eraserBtn.addEventListener('click', () => {
  isEraser = true;
  isBucketMode = false;
  eraserBtn.classList.add('active');
  brushBtn.classList.remove('active');
  bucketBtn.classList.remove('active');
  canvas.classList.remove('bucket-mode');
  brushStyleMenu.classList.remove('open');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (!brushStyleMenu.contains(e.target) && e.target !== brushBtn) {
    brushStyleMenu.classList.remove('open');
  }
});

// Brush style selection
document.querySelectorAll('.brush-style-option').forEach(option => {
  option.addEventListener('click', () => {
    currentBrushStyle = option.dataset.style;
    document.querySelectorAll('.brush-style-option').forEach(opt => 
      opt.classList.remove('selected')
    );
    option.classList.add('selected');
    
    // Update button text to show current style
    const styleEmoji = option.querySelector('span').textContent;
    brushBtn.innerHTML = styleEmoji;
    
    brushStyleMenu.classList.remove('open');
  });
});

undoBtn.addEventListener('click', () => {
  socket.emit('undo');
});

redoBtn.addEventListener('click', () => {
  socket.emit('redo');
});

clearBtn.addEventListener('click', () => {
  if (confirm('Clear entire canvas? This will affect all users!')) {
    socket.emit('clear-canvas');
  }
});

// --- Drawing ---
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('mousemove', handleMouseMove);

function startDrawing(e) {
  // Don't start drawing if in bucket mode
  if (isBucketMode) return;
  
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
  
  // Generate unique stroke ID
  strokeId = `${socket.id}-${Date.now()}-${Math.random()}`;
  
  // Initialize stroke data
  currentStroke = {
    id: strokeId,
    points: [{ x: lastX, y: lastY }],
    color: currentColor,
    size: currentBrushSize,
    isEraser: isEraser,
    brushStyle: currentBrushStyle, // Add brush style
    userId: socket.id,
    username: username
  };
  
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
}

function stopDrawing() {
  if (drawing) {
    drawing = false;
    
    // Send complete stroke to server
    if (currentStroke && currentStroke.points.length > 1) {
      socket.emit('stroke-complete', currentStroke);
      saveCanvasState();
    }
    
    currentStroke = null;
    strokeId = null;
    ctx.beginPath();
  }
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Send cursor position (throttled)
  const now = Date.now();
  if (now - lastCursorSent > CURSOR_THROTTLE) {
    socket.emit('cursor-move', { x: e.clientX, y: e.clientY });
    lastCursorSent = now;
  }
  
  // Draw if mouse is down AND not in bucket mode
  if (drawing && !isBucketMode) {
    draw(x, y);
  }
}

function draw(x, y) {
  // Add point to current stroke
  currentStroke.points.push({ x, y });
  
  // Draw line segment locally with the current brush style
  drawWithBrushStyle(lastX, lastY, x, y, currentColor, currentBrushSize, isEraser, currentBrushStyle);
  
  // Send real-time drawing update (for immediate feedback to others)
  socket.emit('draw-segment', { 
    strokeId: strokeId,
    x0: lastX, 
    y0: lastY, 
    x1: x, 
    y1: y,
    color: currentColor,
    size: currentBrushSize,
    isEraser: isEraser,
    brushStyle: currentBrushStyle
  });

  lastX = x;
  lastY = y;
}

// NEW: Main drawing function that handles different brush styles
function drawWithBrushStyle(x0, y0, x1, y1, color, size, eraser, brushStyle) {
  if (eraser) {
    drawSmoothLine(x0, y0, x1, y1, color, size, true);
    return;
  }
  
  switch(brushStyle) {
    case 'pixel':
      drawPixelBrush(x0, y0, x1, y1, color, size);
      break;
    case 'airbrush':
      drawAirbrush(x0, y0, x1, y1, color, size);
      break;
    case 'spray':
      drawSpray(x0, y0, x1, y1, color, size);
      break;
    case 'calligraphy':
      drawCalligraphy(x0, y0, x1, y1, color, size);
      break;
    case 'sketch':
      drawSketch(x0, y0, x1, y1, color, size);
      break;
    default:
      drawSmoothLine(x0, y0, x1, y1, color, size, false);
  }
}

// Pixel brush - blocky squares
function drawPixelBrush(x0, y0, x1, y1, color, size) {
  ctx.save();
  ctx.fillStyle = color;
  
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / size);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.floor((x0 + dx * t) / size) * size;
    const y = Math.floor((y0 + dy * t) / size) * size;
    ctx.fillRect(x, y, size, size);
  }
  
  ctx.restore();
}

// Airbrush - soft, transparent circles
function drawAirbrush(x0, y0, x1, y1, color, size) {
  ctx.save();
  
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / 2);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, color.replace(')', ', 0.1)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

// Spray paint - random dots
function drawSpray(x0, y0, x1, y1, color, size) {
  ctx.save();
  ctx.fillStyle = color;
  
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / 2);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const centerX = x0 + dx * t;
    const centerY = y0 + dy * t;
    
    // Draw random dots around center
    for (let j = 0; j < size * 2; j++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * size;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(x, y, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

// Calligraphy - angled rectangular brush
function drawCalligraphy(x0, y0, x1, y1, color, size) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  
  const dx = x1 - x0;
  const dy = y1 - y0;
  const angle = Math.atan2(dy, dx);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / 2);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 4);
    ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    ctx.restore();
  }
  
  ctx.restore();
}

// Sketch - rough, jittery line
function drawSketch(x0, y0, x1, y1, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size / 2;
  ctx.lineCap = 'round';
  
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / 3);
  
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jitter = size / 3;
    const x = x0 + dx * t + (Math.random() - 0.5) * jitter;
    const y = y0 + dy * t + (Math.random() - 0.5) * jitter;
    ctx.lineTo(x, y);
  }
  
  ctx.stroke();
  ctx.restore();
}

// Draw smooth line with interpolation (fixes broken strokes)
function drawSmoothLine(x0, y0, x1, y1, color, size, eraser) {
  ctx.save();
  
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (eraser) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
  }
  
  // Calculate distance between points
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // If distance is large, interpolate points
  if (distance > size / 2) {
    const steps = Math.ceil(distance / (size / 2));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t;
      const y = y0 + dy * t;
      
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Draw the line
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  
  ctx.restore();
}

// Draw entire stroke (used for history replay)
function drawStroke(stroke) {
  // Handle bucket fill operations
  if (stroke.type === 'fill') {
    floodFill(stroke.x, stroke.y, stroke.color);
    return;
  }
  
  // Handle drawing strokes
  if (!stroke.points || stroke.points.length < 2) return;
  
  for (let i = 1; i < stroke.points.length; i++) {
    const point = stroke.points[i];
    const prevPoint = stroke.points[i - 1];
    
    drawWithBrushStyle(
      prevPoint.x,
      prevPoint.y,
      point.x,
      point.y,
      stroke.color,
      stroke.size,
      stroke.isEraser,
      stroke.brushStyle || 'normal'
    );
  }
}

function saveCanvasState() {
  // Delay to ensure all drawing is complete
  setTimeout(() => {
    const canvasData = canvas.toDataURL();
    socket.emit('save-canvas', canvasData);
    console.log('Canvas state saved');
  }, 100);
}

// Receive real-time drawing segments from others
socket.on('draw-segment', (data) => {
  drawWithBrushStyle(
    data.x0, 
    data.y0, 
    data.x1, 
    data.y1,
    data.color,
    data.size,
    data.isEraser,
    data.brushStyle || 'normal'
  );
});

// Handle undo/redo responses (redraw from history)
socket.on('history-update', (history) => {
  // Save template if it exists
  const tempTemplate = backgroundImage;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Redraw template first if it exists
  if (tempTemplate) {
    const scale = Math.min(
      canvas.width / tempTemplate.width * 0.8,
      canvas.height / tempTemplate.height * 0.8
    );
    const x = (canvas.width - tempTemplate.width * scale) / 2;
    const y = (canvas.height - tempTemplate.height * scale) / 2;
    ctx.drawImage(tempTemplate, x, y, tempTemplate.width * scale, tempTemplate.height * scale);
  }
  
  // Then replay all operations in order
  history.forEach(stroke => {
    drawStroke(stroke);
  });
  
  console.log(`History updated: ${history.length} operations`);
});

// NEW: Handle restore-canvas for snapshot-based undo/redo
socket.on('restore-canvas', (canvasData) => {
  if (!canvasData) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    console.log('Canvas restored from snapshot');
  };
  img.onerror = () => {
    console.error('Failed to restore canvas');
  };
  img.src = canvasData;
});

// Clear canvas
socket.on('clear-canvas', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ===== TEMPLATE & BUCKET FILL SYSTEM =====

let isBucketMode = false;
let backgroundImage = null;
let lockedRegions = new Map();

// Template gallery data
const templates = [
  {
    id: 'flower',
    name: 'Flower',
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="20" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="100" cy="60" r="20" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="140" cy="80" r="20" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="140" cy="120" r="20" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="100" cy="140" r="20" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="60" cy="120" r="20" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="60" cy="80" r="20" fill="none" stroke="black" stroke-width="2"/>
      </svg>
    `)
  },
  {
    id: 'heart',
    name: 'Heart',
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <path d="M100,170 C100,170 30,120 30,80 C30,50 50,30 75,30 C85,30 95,35 100,45 C105,35 115,30 125,30 C150,30 170,50 170,80 C170,120 100,170 100,170 Z" 
              fill="none" stroke="black" stroke-width="3"/>
      </svg>
    `)
  },
  {
    id: 'star',
    name: 'Star',
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <polygon points="100,20 120,80 180,80 130,115 150,175 100,140 50,175 70,115 20,80 80,80" 
                 fill="none" stroke="black" stroke-width="3"/>
      </svg>
    `)
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="70" cy="70" rx="30" ry="40" fill="none" stroke="black" stroke-width="2"/>
        <ellipse cx="130" cy="70" rx="30" ry="40" fill="none" stroke="black" stroke-width="2"/>
        <ellipse cx="70" cy="130" rx="25" ry="35" fill="none" stroke="black" stroke-width="2"/>
        <ellipse cx="130" cy="130" rx="25" ry="35" fill="none" stroke="black" stroke-width="2"/>
        <line x1="100" y1="40" x2="100" y2="160" stroke="black" stroke-width="3"/>
        <circle cx="100" cy="40" r="8" fill="black"/>
      </svg>
    `)
  },
  {
    id: 'mandala',
    name: 'Mandala',
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="100" cy="100" r="60" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="100" cy="100" r="40" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="100" cy="100" r="20" fill="none" stroke="black" stroke-width="2"/>
        <line x1="100" y1="20" x2="100" y2="180" stroke="black" stroke-width="1"/>
        <line x1="20" y1="100" x2="180" y2="100" stroke="black" stroke-width="1"/>
        <line x1="35" y1="35" x2="165" y2="165" stroke="black" stroke-width="1"/>
        <line x1="165" y1="35" x2="35" y2="165" stroke="black" stroke-width="1"/>
      </svg>
    `)
  },
  {
    id: 'tree',
    name: 'Tree',
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect x="85" y="120" width="30" height="60" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="100" cy="100" r="40" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="70" cy="80" r="30" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="130" cy="80" r="30" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="100" cy="60" r="25" fill="none" stroke="black" stroke-width="2"/>
      </svg>
    `)
  }
];

// Bucket tool button
const bucketBtn = document.getElementById('bucketBtn');
const templateBtn = document.getElementById('templateBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const templateModal = document.getElementById('templateModal');
const closeTemplateModal = document.getElementById('closeTemplateModal');
const templateGrid = document.getElementById('templateGrid');

bucketBtn.addEventListener('click', () => {
  isBucketMode = !isBucketMode;
  isEraser = false;
  drawing = false;
  
  if (isBucketMode) {
    bucketBtn.classList.add('active');
    brushBtn.classList.remove('active');
    eraserBtn.classList.remove('active');
    canvas.classList.add('bucket-mode');
  } else {
    bucketBtn.classList.remove('active');
    canvas.classList.remove('bucket-mode');
  }
  brushStyleMenu.classList.remove('open');
});

// ===== FLOOD FILL ALGORITHM =====
function floodFill(startX, startY, fillColor, fromHistory = false) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) {
    console.log('Click outside canvas bounds');
    return;
  }
  
  const startPos = (startY * canvas.width + startX) * 4;
  const startR = pixels[startPos];
  const startG = pixels[startPos + 1];
  const startB = pixels[startPos + 2];
  const startA = pixels[startPos + 3];
  
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.fillStyle = fillColor;
  tempCtx.fillRect(0, 0, 1, 1);
  const fillData = tempCtx.getImageData(0, 0, 1, 1).data;
  const fillR = fillData[0];
  const fillG = fillData[1];
  const fillB = fillData[2];
  
  if (startR === fillR && startG === fillG && startB === fillB && startA === 255) {
    return;
  }
  
  const stack = [[startX, startY]];
  const visited = new Set();
  const tolerance = 30;
  let pixelsFilled = 0;
  
  while (stack.length > 0 && pixelsFilled < 100000) {
    const [x, y] = stack.pop();
    
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
    
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    
    const pos = (y * canvas.width + x) * 4;
    const r = pixels[pos];
    const g = pixels[pos + 1];
    const b = pixels[pos + 2];
    const a = pixels[pos + 3];
    
    if (
      Math.abs(r - startR) <= tolerance &&
      Math.abs(g - startG) <= tolerance &&
      Math.abs(b - startB) <= tolerance &&
      Math.abs(a - startA) <= tolerance
    ) {
      pixels[pos] = fillR;
      pixels[pos + 1] = fillG;
      pixels[pos + 2] = fillB;
      pixels[pos + 3] = 255;
      
      pixelsFilled++;
      
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
  }
  
  console.log(`Filled ${pixelsFilled} pixels`);
  
  ctx.putImageData(imageData, 0, 0);
  
  // Only emit to server if this is a NEW fill, not from history replay
  if (!fromHistory) {
    socket.emit('bucket-fill', {
      x: startX,
      y: startY,
      color: fillColor,
      timestamp: Date.now()
    });
  }
}

canvas.addEventListener('click', (e) => {
  if (isBucketMode) {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    
    floodFill(x, y, currentColor, false);
    
    // Save state after fill
    saveCanvasState();
    
    return false;
  }
});

socket.on('bucket-fill', (data) => {
  floodFill(data.x, data.y, data.color, true);
});

canvas.addEventListener('click', (e) => {
  if (isBucketMode) {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    
    floodFill(x, y, currentColor, false); // Pass false for user-initiated fills
    
    return false;
  }
});

closeTemplateModal.addEventListener('click', () => {
  templateModal.classList.remove('open');
});

templateModal.addEventListener('click', (e) => {
  if (e.target === templateModal) {
    templateModal.classList.remove('open');
  }
});

function loadTemplateGallery() {
  templateGrid.innerHTML = templates.map(template => `
    <div class="template-item" data-template-id="${template.id}">
      <img src="${template.url}" alt="${template.name}">
      <p>${template.name}</p>
    </div>
  `).join('');
  
  document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
      const templateId = item.dataset.templateId;
      const template = templates.find(t => t.id === templateId);
      loadTemplate(template.url);
      templateModal.classList.remove('open');
    });
  });
}

function loadTemplate(imageUrl) {
  const img = new Image();
  img.onload = () => {
    backgroundImage = img;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const scale = Math.min(
      canvas.width / img.width * 0.8,
      canvas.height / img.height * 0.8
    );
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    
    socket.emit('load-template', { imageUrl, x, y, width: img.width * scale, height: img.height * scale });
    
    addSystemMessage('Template loaded! Use bucket tool 🪣 to fill colors.');
  };
  img.src = imageUrl;
}

uploadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      loadTemplate(event.target.result);
    };
    reader.readAsDataURL(file);
  }
});

socket.on('load-template', (data) => {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, data.x, data.y, data.width, data.height);
    backgroundImage = img;
    addSystemMessage('Template loaded by another user!');
  };
  img.src = data.imageUrl;
});