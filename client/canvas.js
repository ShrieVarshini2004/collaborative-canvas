const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - document.getElementById("toolbar").offsetHeight;

let drawing = false;
let brushColor = document.getElementById("colorPicker").value;
let brushSize = document.getElementById("brushSize").value;
let isErasing = false;

let undoStack = [];
let redoStack = [];

function saveState() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  redoStack = [];
}

canvas.addEventListener("mousedown", (e) => {
  saveState();
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.clientX, e.clientY - document.getElementById("toolbar").offsetHeight);
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";
  ctx.strokeStyle = isErasing ? "#ffffff" : brushColor;
  ctx.lineTo(e.clientX, e.clientY - document.getElementById("toolbar").offsetHeight);
  ctx.stroke();
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  ctx.closePath();
});

document.getElementById("colorPicker").addEventListener("input", (e) => {
  brushColor = e.target.value;
});

document.getElementById("brushSize").addEventListener("input", (e) => {
  brushSize = e.target.value;
});

document.getElementById("eraser").addEventListener("click", () => {
  isErasing = !isErasing;
  document.getElementById("eraser").textContent = isErasing ? "Brush" : "Eraser";
});

document.getElementById("undo").addEventListener("click", () => {
  if (undoStack.length > 0) {
    redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const prev = undoStack.pop();
    ctx.putImageData(prev, 0, 0);
  }
});

document.getElementById("redo").addEventListener("click", () => {
  if (redoStack.length > 0) {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const next = redoStack.pop();
    ctx.putImageData(next, 0, 0);
  }
});
