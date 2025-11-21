const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');

const COLS = 10;
const ROWS = 20;
const BLOCK = 20; // ピクセルサイズ
canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

context.scale(BLOCK, BLOCK);

// next-piece canvas (4x4 blocks area)
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
nextCtx.imageSmoothingEnabled = false;
nextCtx.scale(BLOCK, BLOCK);

function createMatrix(w, h){
  const m = [];
  while(h--) m.push(new Array(w).fill(0));
  return m;
}

function createPiece(type){
  if(type === 'T') return [
    [0,0,0],
    [1,1,1],
    [0,1,0],
  ];
  if(type === 'O') return [
    [2,2],
    [2,2],
  ];
  if(type === 'L') return [
    [0,3,0],
    [0,3,0],
    [0,3,3],
  ];
  if(type === 'J') return [
    [0,4,0],
    [0,4,0],
    [4,4,0],
  ];
  if(type === 'I') return [
    [0,5,0,0],
    [0,5,0,0],
    [0,5,0,0],
    [0,5,0,0],
  ];
  if(type === 'S') return [
    [0,6,6],
    [6,6,0],
    [0,0,0],
  ];
  if(type === 'Z') return [
    [7,7,0],
    [0,7,7],
    [0,0,0],
  ];
}

// Classic/retro palette matching original-like pieces
// piece numbers: 1=T, 2=O, 3=L, 4=J, 5=I, 6=S, 7=Z
const colors = [
  null,
  '#800080', // T - purple
  '#FFFF00', // O - yellow
  '#FF8000', // L - orange
  '#0000FF', // J - blue
  '#00FFFF', // I - cyan
  '#00FF00', // S - green
  '#FF0000', // Z - red
];

function drawMatrix(matrix, offset){
  matrix.forEach((row, y)=>{
    row.forEach((value, x)=>{
      if(value){
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        context.strokeStyle = 'rgba(0,0,0,0.6)';
        context.lineWidth = 0.04;
        context.strokeRect(x + offset.x + 0.02, y + offset.y + 0.02, 0.96, 0.96);
      }
    })
  })
}

function merge(arena, player){
  player.matrix.forEach((row,y)=>{
    row.forEach((value,x)=>{
      if(value) arena[y + player.pos.y][x + player.pos.x] = value;
    })
  })
}

function rotate(matrix, dir){
  for(let y=0;y<matrix.length;y++){
    for(let x=0;x<y;x++){
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if(dir>0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

function collide(arena, player){
  const m = player.matrix;
  const o = player.pos;
  for(let y=0;y<m.length;y++){
    for(let x=0;x<m[y].length;x++){
      if(m[y][x] !== 0 && (arena[y+o.y] && arena[y+o.y][x+o.x]) !== 0){
        return true;
      }
    }
  }
  return false;
}

function createArena(){
  return createMatrix(COLS, ROWS);
}

function sweep(){
  let rowCount = 0;
  outer: for(let y = arena.length -1; y>=0; y--){
    for(let x=0;x<arena[y].length;x++){
      if(arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y,1)[0].fill(0);
    arena.unshift(row);
    y++;
    rowCount++;
  }
  if(rowCount>0){
    player.lines += rowCount;
    player.score += (rowCount === 1 ? 40 : rowCount === 2 ? 100 : rowCount === 3 ? 300 : 1200) * (player.level + 1);
    player.level = Math.floor(player.lines / 10);
    updateHUD();
  }
}

function playerDrop(){
  player.pos.y++;
  if(collide(arena, player)){
    player.pos.y--;
    merge(arena, player);
    resetPlayer();
    sweep();
  }
  dropCounter = 0;
}

function playerMove(dir){
  player.pos.x += dir;
  if(collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir){
  const posX = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while(collide(arena, player)){
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if(offset > player.matrix[0].length){
      rotate(player.matrix, -dir);
      player.pos.x = posX;
      return;
    }
  }
}

function hardDrop(){
  while(!collide(arena, player)){
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  resetPlayer();
  sweep();
  dropCounter = 0;
}

function resetPlayer(){
  // initialize nextPiece if needed
  if(nextPiece === null) nextPiece = getPieceFromBag();
  // current becomes next
  player.matrix = createPiece(nextPiece);
  // pick new next
  nextPiece = getPieceFromBag();
  drawNext();

  player.pos.y = 0;
  player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);
  if(collide(arena, player)){
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 0;
    updateHUD();
  }
}

function updateHUD(){
  scoreEl.textContent = player.score;
  levelEl.textContent = player.level;
  linesEl.textContent = player.lines;
}

function drawNext(){
  const size = 4; // 4x4 area
  // clear (nextCtx is already scaled)
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  // background
  nextCtx.fillStyle = '#071b0d';
  nextCtx.fillRect(0,0,size,size);
  if(!nextPiece) return;
  const matrix = createPiece(nextPiece);
  const offset = { x: Math.floor((size - matrix[0].length)/2), y: Math.floor((size - matrix.length)/2) };
  matrix.forEach((row,y)=>{
    row.forEach((value,x)=>{
      if(value){
        nextCtx.fillStyle = colors[value];
        nextCtx.fillRect(x + offset.x, y + offset.y, 1, 1);
        nextCtx.strokeStyle = 'rgba(0,0,0,0.6)';
        nextCtx.lineWidth = 0.04;
        nextCtx.strokeRect(x + offset.x + 0.02, y + offset.y + 0.02, 0.96, 0.96);
      }
    })
  })
}

function draw(){
  // slight inner gradient effect is handled by CSS background; clear with a semi-dark fill for contrast
  context.fillStyle = '#b7e1a0';
  context.fillRect(0,0,COLS,ROWS);
  drawMatrix(arena, {x:0,y:0});
  drawMatrix(player.matrix, player.pos);
}

let lastTime = 0;
let dropCounter = 0;
let dropInterval = 1000;

function update(time = 0){
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if(!paused){
    if(dropCounter > dropInterval - player.level*80){
      playerDrop();
    }
    draw();
  }
  requestAnimationFrame(update);
}

// init
const arena = createArena();
let piecesIndex = 0;
let piecesOrder = 'TJLOSZI'.split('');
let bag = [];
let nextPiece = null;

function refillBag(){
  bag = 'TJLOSZI'.split('');
  for(let i = bag.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

function getPieceFromBag(){
  if(bag.length === 0) refillBag();
  return bag.pop();
}

const player = {
  pos: {x:0,y:0},
  matrix: null,
  score: 0,
  level: 0,
  lines: 0,
};

let paused = false;

// controls
document.addEventListener('keydown', event =>{
  if(event.key === 'ArrowLeft') playerMove(-1);
  else if(event.key === 'ArrowRight') playerMove(1);
  else if(event.key === 'ArrowDown') playerDrop();
  else if(event.key === 'ArrowUp' || event.key === 'z' || event.key === 'Z') playerRotate(1);
  else if(event.code === 'Space') { event.preventDefault(); hardDrop(); }
  else if(event.key === 'p' || event.key === 'P') togglePause();
});

// on-screen buttons
document.getElementById('left').addEventListener('click', ()=>playerMove(-1));
document.getElementById('right').addEventListener('click', ()=>playerMove(1));
document.getElementById('down').addEventListener('click', ()=>playerDrop());
document.getElementById('rotate').addEventListener('click', ()=>playerRotate(1));
document.getElementById('drop').addEventListener('click', ()=>hardDrop());
document.getElementById('pause').addEventListener('click', ()=>togglePause());
document.getElementById('restart').addEventListener('click', ()=>{
  arena.forEach(r=>r.fill(0));
  player.score = 0; player.lines = 0; player.level = 0;
  updateHUD();
});

function togglePause(){
  paused = !paused;
  document.getElementById('pause').textContent = paused ? 'Resume' : 'Pause';
}

// start
resetPlayer();
updateHUD();
update();
