var url = new URL(location.href);
var json = (url.searchParams.get('open') ? localStorage.getItem('epidemic_simulator_json'):null)?? `{
  "name": "epidemic_simulator",
  "resolution": 1080,
  "states": [
    { "color": "#00a000", "name": "здоровые", "hiddengraph": true }, 
    { "color": "#a05000", "prob": 0.05, "time": 30000, "initial": 10, "zone": 8, "name": "коклюш" },
    { "color": "#a0a000", "prob": 0.1, "time": 20000, "initial": 3, "zone": 6, "name": "скарлатина" },
    { "color": "#a00000", "prob": 0.5, "time": 1000, "initial": 1, "zone": 8, "name": "COVID-19" },
    { "color": "#0000a0", "prob": 0.03, "time": 10000, "initial": 20, "zone": 10, "name": "грипп" },
    { "color": "#000000", "prob": 0.0001, "time": 2000, "initial": 5, "zone": 420, "name": "чума" },
    { "color": "#a000a0", "prob": 0.05, "time": 15000, "initial": 5, "zone": 8, "speed": 3, "name": "бешенство" },
    { "color": "#00a0a0", "prob": 1, "initial": 1, "zone": 2.5, "protect": 0.9, "transparent": true, "name": "призраки" },
    { "color": "#00a0a0", "prob": 0.03, "initial": 1, "time": 20000, "zone": 10, "protect": 0.6, "heal": 1, "name": "насморк" },
    { "color": "#a00050", "prob": 0.01, "time": 60, "initial": 25, "zone": 10, "after": 10000, "name": "свинка" },
    { "color": "#80a0ff", "prob": 0.03, "initial": 50, "zone": 10, "infect": 1, "protect": 0.95, "name": "доктора" },
    { "color": "#a0a0a0", "initial": 100, "protect": 0.995, "hidden": true, "allone": true, "name": "джекпот" },
    { "color": "#a050a0", "prob": 0.5, "initial": 1, "zone": 10, "parasite": 1000, "name": "паразиты" }
  ], 
  "options": {
    "count": 1000,
    "size": 420,
    "speed": 7,
    "quar": 0, 
    "stop": false,
    "music": true
  },
  "style": {
    "size": 5, 
    "sort": true, 
    "dots": { "color": "ill", "size": 2, "transparent": true },
    "deadanim": true, 
    "chanim": true
  }
}`;
const fps = 30;
const fpsTime = 1000/fps;
var pause = false;
var cw, ch, cwc, chc, cx, cy;
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var graph_ = document.getElementById('graph');
var grp = graph_.getContext('2d');
var arr = [];
var lastTime = 0;
var obj = JSON.parse(json);
var states = obj.states;
var options = obj.options;
var style = obj.style;
var scale = 420/options.size;
var frame_ = 0;
var graph;
var counts = [];
var time;
var counter = options.count;
var sorted = [];
var interval;
var music = new Audio();
music.src = "assets/music.mp3";
document.getElementById('viewport').content = `width=${obj.resolution},user-scalable=no`;
function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  let c = w/h;
  const needc = 2;
  let W, H, X, Y;
  if (c == needc) {
    W = w;
    H = h;
    X = 0;
    Y = 0;
  }
  if (c < needc) {
    W = w;
    H = w/needc;
    X = 0;
    Y = (h-(w/needc))/2;
  }
  if (c > needc) {
    W = h*needc;
    H = h;
    X = (w-(h*needc))/2;
    Y = 0;
  }
  canvas.width = Math.floor(W);
  canvas.height = Math.floor(H);
  cwc = W/900;
  chc = H/450;
  canvas.style.top = `${Math.floor(Y)}px`;
  canvas.style.left = `${Math.floor(X)}px`;
  graph_.width = Math.floor(250*cwc);
  graph_.height = Math.floor(120*chc);
  cx = Math.floor(X);
  cy = Math.floor(Y);
  cw = W;
  ch = H;
}

resize();
addEventListener('resize', resize);

class Cell {
  constructor(id) {
    this.x = random(options.size);
    this.y = random(options.size);
    this.speed = { x: random(options.speed)-(options.speed/2), y: random(options.speed)-(options.speed/2) };
    this.state = 0;
    this.id = id;
    this.alive = true;
    this.infectTime = 0;
    this.st = states[0];
    this.infectable = false;
    this.frame = false;
    this.infect = this.st.infect ?? this.state;
    this.infectable = this.st.zone > 0 && this.st.prob > 0;
    this.parasitetime = false;
    this.shome = { minx: style.size/2, miny: style.size/2, maxx: options.size-(style.size/2), maxy: options.size-(style.size/2) };
    if (options.quar) {
      this.home = { minx: Math.max(style.size/2, this.x-options.quar), miny: Math.max(style.size/2, this.y-options.quar), maxx: Math.min(options.size-(style.size/2), this.x+options.quar), maxy: Math.min(options.size-(style.size/2), this.y+options.quar) };
    } else {
      this.home = this.shome;
    }
  }
  toState(state) {
    if (this.alive) {
      this.st.count--;
      if (this.st.allone) {
        this.st.allone = false;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].id != this.id && arr[i].state == this.state) arr[i].toState(state);
        }
        this.st.allone = true;
      }
      this.state = state;
      this.time = timeNow();
      this.frame = frame_;
      this.st = states[state];
      this.infect = this.st.infect ? this.st.infect-1:this.state;
      this.st.count++;
      if (this.st.prob && this.st.zone) {
        if (this.st.rest) {
          this.restend = timeNow()+this.st.rest;
          this.infectable = false;
        } else {
          this.infectable = true;
        }
      } else {
        this.infectable = false;
      }
    }
  }
  timeend() {
    if (Math.random() <= this.st.heal) {
      this.toState(this.st.transform ?? 0);
    } else {
      this.dead();
    }
  }
  dead() {
    this.alive = false;
    this.time = timeNow();
    this.frame = frame_;
    if (!this.st.after) {
      this.infectable = false;
      this.st.count--;
      counter--;
    } else {
      if (!this.infectable) {
        this.st.count--;
        counter--;
      }
    }
  }
  handler() {
    if (this.alive && this.st.time && this.state && this.time+this.st.time <= timeNow()) this.timeend();
    if (this.restend && this.restend < timeNow() && this.alive) {
      this.infectable = true;
      this.restend = false;
    }
    if ((!this.alive) && this.infectable && this.st.after+this.time < timeNow()) {
      this.infectable = false;
      this.st.count--;
      counter--;
    } 
    if (this.infectable) {
      let inzone = 0;
      for (let i = 0; i < arr.length; i++) {
        let p = arr[i];
        if (p.state != this.infect && p.state != this.state && p.alive) {
          if (this.x - this.st.zone  <= p.x && this.x + this.st.zone >= p.x && this.y - this.st.zone <= p.y && this.y + this.st.zone >= p.y) {
            inzone++;
            if (Math.random() < this.st.prob && (p.st.protect ?? 0) < Math.random()) {
              p.toState(this.infect);
            } else {
              if (Math.random() < this.st.attacktrans && p.state != this.st.transform) {
                p.toState(this.transform ?? 0);
              }
            }
          }
        }
      }
      if (this.alive && inzone == 0 && this.st.parasite) {
        if (!this.parasitetime) this.parasitetime = timeNow();
      } else {
        this.parasitetime = false;
      }
    }
    if (this.st.parasite && this.alive && this.parasitetime && this.parasitetime+this.st.parasite < timeNow()) this.dead();
    if (this.alive) {
      let home = this.st.robber ? this.shome:this.home;
      this.x += this.speed.x*(this.st.speed ?? 1);
      this.y += this.speed.y*(this.st.speed ?? 1);
      if (this.x < home.minx) this.speed.x *=-1, this.x = home.minx;
      if (this.x > home.maxx) this.speed.x *=-1, this.x = home.maxx;
      if (this.y < home.miny) this.speed.y *=-1, this.y = home.miny;
      if (this.y > home.maxy) this.speed.y *=-1, this.y = home.maxy;
    }
  }
  render() {
    let trans = this.st.transparent ? 128:255;
    if (this.alive) {
      ctx.fillStyle = this.st.color + ahex(trans);
      ctx.fillRect(X((this.x-(style.size/2))*scale+15), Y((this.y-(style.size/2))*scale+15), X(style.size*scale), Y(style.size*scale));
      if (frame_ < this.frame+5 && style.chanim && this.frame !== false) {
        let fram = frame_-this.frame;
        let cellTrans = this.st.transparent ? 128:255;
        let trans = ahex(cellTrans*(5-fram)/10);
        let size = 2*style.size;
        ctx.fillStyle = this.st.color + trans;
        ctx.fillRect(X((this.x-(size/2))*scale+15), Y((this.y-(size/2))*scale+15), X(size), Y(size));
      }
    } else {
      if (frame_ < this.frame+15 && style.deadanim) {
        let fram = frame_-this.frame;
        let size = (fram/7.5+1)*style.size;
        let cellTrans = this.st.transparent ? 128:255;
        let trans = ahex(cellTrans*(15-fram)/15);
        ctx.fillStyle = this.st.color + trans;
        ctx.fillRect(X((this.x-(size/2))*scale+15), Y((this.y-(size/2))*scale+15), X(size), Y(size));
      }
    }
  }
  first() {
    if (!this.alive) {
      if (this.infectable) {
        let cellTrans = this.st.transparent ? 128:255;
        ctx.fillStyle = this.st.color + ahex(cellTrans-100);
        let fill = function(x, y, s, x_, y_) {
          ctx.fillRect(X(x_+(style.size*x)+15), Y(y_+(style.size*y)+15), X(s*style.size), Y(s*style.size));
        };
        fill(-0.75, -0.75, 0.6, this.x, this.y);
        fill(0.75, -0.75, 1, this.x, this.y);
        fill(-0.75, 0.75, 1, this.x, this.y);
        fill(0.75, 0.75, 0.8, this.x, this.y);
      } else {
        if (style.dots) {
          let cellTrans = this.st.transparent ? 128:255;
          ctx.fillStyle = (style.dots.color == "ill" ? this.st.color:style.dots.color) + (style.dots.transparent ? ahex(cellTrans-80):"");
          ctx.fillRect(X(this.x*scale+15-(style.dots.size/2)), Y(this.y*scale+15-(style.dots.size/2)), X(style.dots.size), Y(style.dots.size));
        }
      }
    }
  }
}

function random(max) {
  return Math.random()*max;
}

function start() {
  arr = [];
  counts = [];
  frame_ = 0;
  for (let i = 0; i < options.count; i++) {
    arr.push(new Cell(i));
  }
  states[0].count = options.count;
  for (let i = 1, j = 0; i < states.length; i++) {
    let ill = states[i];
    ill.count = 0;
    for (let k = 0; k < ill.initial; k++, j++) {
      arr[j].toState(i);
    }
  }
}

start();
sort();

function clear() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function frame() {
  if (counter > 0 || !options.stop) {
    let FPS = Math.floor(10000/(performance.now()-lastTime))/10;
    let start = performance.now();
    lastTime = performance.now();
    if (!pause) {
      let counts_ = [];
      for (let i = 0; i < states.length; i++) {
        counts_[i] = states[i].count;
      }
      counts.push(counts_);
    }
    clear();
    ctx.fillStyle = "#d0d0d0";
    ctx.fillRect(0, 0, X(450), Y(450));
    ctx.fillStyle ="#ffffff";
    ctx.fillRect(X(15), Y(15), X(420), Y(420));
    for (let i = 0; i < arr.length; i++) {
      if (!pause) arr[i].handler();
      arr[i].first();
    }
    for (let i = 0; i < arr.length; i++) {
      arr[i].render();
    }
    ctx.font = `${X(18)}px Monospace`;
    ctx.fillStyle = "#000000";
    time = Math.floor(timeNow()/100)/10;
    ctx.fillText(`Время: ${time%1 == 0 ? time+".0":time}с`, X(490), Y(30));
    ctx.fillText(`FPS: ${FPS%1 == 0 ? FPS+".0":FPS}`, X(490), Y(60));
    ctx.fillText("Статистика:", X(490), Y(120));
    ctx.fillText(`${counter} | сумма`, X(490), Y(150));
    sort();
    ctx.font = `${X(Math.min(Math.floor(9/states.length*18), 18))}px Monospace`;
    for (let i = 0; i < sorted.length; i++) {
      let st = sorted[i];
      ctx.fillStyle = st.color + (st.transparent ? "80":"ff");
      ctx.fillText(`${st.count} | ${st.name}`, X(490), Y(180+(i*Math.min(Math.floor(9/states.length*30), 30))));
    }
    if (frame_%(options.graph ?? 1) == 0) updateGraph();
    ctx.putImageData(graph, X(650), Y(10));
    ctx.fillStyle = "#d0d0d0";
    ctx.fillRect(0, 0, X(450), Y(15));
    ctx.fillRect(0, Y(435), X(450), Y(15));
    ctx.fillRect(0, 0, X(15), Y(450));
    ctx.fillRect(X(435), 0, X(15), Y(450));
    ctx.fillStyle = "#d0d0d0";
    if (pause) {
      ctx.beginPath();
      ctx.moveTo(X(850), Y(400));
      ctx.lineTo(X(870), Y(415));
      ctx.lineTo(X(850), Y(430));
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(X(800), Y(400), X(30), Y(30));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(X(807), Y(407), X(16), Y(16));
      ctx.fillRect(X(820), Y(415), X(16), Y(20));
      ctx.fillStyle = "#d0d0d0";
      ctx.beginPath();
      ctx.moveTo(X(834), Y(410));
      ctx.lineTo(X(825), Y(420));
      ctx.lineTo(X(818), Y(410));
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(X(850), Y(400), X(10), Y(30));
      ctx.fillRect(X(870), Y(400), X(10), Y(30));
      frame_++;
    }
    ctx.fillStyle = "#000000";
    ctx.font = `${X(18)}px Monospace`;
    ctx.fillText(`Расчёт: ${Math.floor(performance.now()-start)}мс`, X(490), Y(90));
  } else {
    clearInterval(interval);
    addEventListener('click', (e) => {
      if (e.pageX > 650 && e.pageX < 850 && e.pageY > 10 && e.pageY < 130) {
        let link = graph_.toDataURL('image/png');
        let a = document.createElement('a');
        a.href = link;
        a.download = `epidemic_simulator_graph_${new Date().toString()}.png`;
        a.click();
      }
    });
  }
}

function X(x) {
  return Math.floor(x*cwc);
}

function Y(y) {
  return Math.floor(y*chc);
}

function timeNow() {
  return frame_/30*1000;
}

function updateGraph() {
  let max = 0;
  for (let t = 0; t < counts.length; t++) {
    for (let i = 0; i < states.length; i++) {
      if (!(states[i].hidden || states[i].hiddengraph)) {
        let ct = counts[t][i];
        if (ct > max) {
          max = ct;
        }
      }
    }
  }
  grp.font = `${X(9)}px Monospace`;
  grp.fillStyle = "#ffffff";
  
  grp.fillRect(0, 0, graph_.width, graph_.height);
  grp.fillStyle = "#d0d0d0";
  
  grp.fillRect(X(35), Y(10), X(165), Y(1));
  grp.fillText(`${max}`, X(10), Y(15), X(20));
  grp.fillRect(X(35), Y(50), X(165), Y(1));
  grp.fillText(`${Math.floor(max/2)}`, X(10), Y(55), X(20));
  grp.fillRect(X(35), Y(90), X(165), Y(1));
  grp.fillText("0", X(10), Y(95), X(20));
  
  grp.fillRect(X(40), Y(5), X(1), Y(90));
  grp.fillText("0", X(40), Y(105), X(30));
  grp.fillRect(X(75), Y(5), X(1), Y(90));
  let tm = Math.floor(time/4*10)/10;
  grp.fillText(`${tm%1 == 0 ? tm+".0":tm}`, X(70), Y(105), X(30));
  grp.fillRect(X(110), Y(5), X(1), Y(90));
  tm = Math.floor(time/2*10)/10;
  grp.fillText(`${tm%1 == 0 ? tm+".0":tm}`, X(110), Y(105), X(30));
  grp.fillRect(X(145), Y(5), X(1), Y(90));
  tm = Math.floor(time/4*30)/10;
  grp.fillText(`${tm%1 == 0 ? tm+".0":tm}`, X(145), Y(105), X(30));
  grp.fillRect(X(180), Y(5), X(1), Y(90));
  tm = time;
  grp.fillText(`${tm%1 == 0 ? tm+".0":tm}`, X(180), Y(105), X(30));
  grp.lineWidth = X(2);
  if (frame_ > 0) {
    for (let i = 0; i < states.length; i++) {
      if (!(states[i].hidden || states[i].hiddengraph)) {
        grp.beginPath();
        for (let x = 0; x < 160; x++) {
          let ci = Math.floor(x/160*frame_);
          let y = 90-(counts[ci][i]/max*80);
          if (x == 0) {
            grp.moveTo(X(x+40), Y(y));
          } else {
            grp.lineTo(X(x+40), Y(y));
          }
        }
        grp.strokeStyle = states[i].color + (states[i].transparent ? "80":"ff");
        grp.stroke();
      }
    }
  }
  graph = grp.getImageData(0, 0, graph_.width, graph_.height);
}

clear();
ctx.fillStyle = "#a00000a0";
ctx.font = `${X(42)}px Monospace`;
ctx.fillText("Кликните чтобы продолжить", X(120), Y(200));
ctx.fillStyle = "#0000a0a0";
ctx.font = `${X(36)}px Monospace`;
ctx.fillText("Симулятор Болезни", X(230), Y(100));

addEventListener('click', () => {
  music.loop = true;
  if (options.music) music.play();
  interval = setInterval(() => { if (performance.now() >= lastTime+fpsTime) frame(); }, 1);
  document.addEventListener('click', click);
}, { once: true });

function fullScreen(e) {
  if(e.requestFullscreen) {
    e.requestFullscreen();
  } else if(e.webkitrequestFullscreen) {
    e.webkitRequestFullscreen();
  } else if(e.mozRequestFullscreen) {
    e.mozRequestFullScreen();
  }
}

function sort() {
  sorted = [];
  for (let i = 0; i < states.length; i++) {
    let st = states[i];
    if (!(st.hidden || st.hiddenstat)) sorted.push(st);
  }
  if (style.sort) {
    for (let j = 0; j < sorted.length-1; j++) {
      let max = sorted[j];
      let maxi = j;
      for (let i = j; i < sorted.length; i++) {
        let c = sorted[i];
        if (c.count > max.count) {
          maxi = i;
          max = c;
        }
      }
      sorted[maxi] = sorted[j];
      sorted[j] = max;
    }
  }
}
function click(e) {
  let x = (e.pageX-cx)/cwc;
  let y = (e.pageY-cy)/chc;
  if (x > 850 && y > 400) {
    pause = !pause;
  }
  if (pause && x > 800 && x < 850 && y > 400) {
    start();
    pause = false;
  }
}
function ahex(a) {
  a = Math.floor(a);
  return (a < 16 ? "0":"") + a.toString(16);
}
