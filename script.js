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
var pause = false;
var cw, ch, cc, cx, cy;
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
var mosq = [];
var counter = options.count;
var sorted = [];
var interval;
var started = false;
const fpsTime = 1000/fps/(options.showspeed ?? 1);
var music = new Audio();
music.src = "https://zvukipro.com/uploads/files/2019-11/1572597916_5d8bce8c181a325.mp3";
//music from zvukipro.com
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
  let res = style.resolution ?? 1080;
  canvas.width = Math.floor(res);
  canvas.height = Math.floor(res/2);
  canvas.style.width = `${Math.floor(W)}px`;
  canvas.style.height = `${Math.floor(H)}px`;
  cc = res/900;
  canvas.style.top = `${Math.floor(Y)}px`;
  canvas.style.left = `${Math.floor(X)}px`;
  graph_.width = Math.floor(250*cc);
  graph_.height = Math.floor(120*cc);
  cx = Math.floor(X);
  cy = Math.floor(Y);
  cw = W;
  ch = H;
  if (!started) startrender();
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
    this.teleportated = false;
    this.magnet = null;
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
  toState(state, init) {
    if (this.alive) {
      let laststate = this.st;
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
      if (this.st.teleporto && !init) {
        this.teleportated = { st: laststate, x: this.x, y: this.y }
        this.x = Math.max(Math.min(this.x+random(this.st.teleporto*2+1)-this.st.teleporto, options.size), 0);
        this.y = Math.max(Math.min(this.y+random(this.st.teleporto*2+1)-this.st.teleporto, options.size), 0);
      } else {
        this.teleportated = false;
      }
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
    if (this.st.mosquito) {
      for (let i = 0; i < this.st.mosquito; i++) {
        mosq.push(new Mosquito(mosq.length, this.x, this.y, this.state));
      }
    }
  }
  handler() {
    if (this.alive && this.st.time && this.time+this.st.time <= timeNow()) this.timeend();
    if (this.restend && this.restend < timeNow() && this.alive) {
      this.infectable = true;
      this.restend = false;
    }
    if ((!this.alive) && this.infectable && this.st.after+this.time < timeNow()) {
      this.infectable = false;
      this.st.count--;
      counter--;
    } 
    if (this.infectable || (this.st.magnet && this.st.magnetpow) || this.st.parasite) {
      let inzone = 0;
      for (let i = 0; i < arr.length; i++) {
        let p = arr[i];
        if (p.state != this.infect && p.state != this.state && p.alive) {
          if (p.x >= this.x-this.st.magnet && p.x <= this.x+this.st.magnet && p.y >= this.y-this.st.magnet && p.y <= this.y+this.st.magnet) {
            let c = (this.st.magnet-Math.sqrt(((this.x-p.x)**2)+((this.y-p.y)**2)))/this.st.magnet;
            p.magnet = {};
            p.magnet.y = p.y < this.y ? this.st.magnetpow*c:-this.st.magnetpow*c;
            p.magnet.x = p.x < this.x ? this.st.magnetpow*c:-this.st.magnetpow*c;
          }
          if (this.x-this.st.zone  <= p.x && this.x+this.st.zone >= p.x && this.y-this.st.zone <= p.y && this.y+this.st.zone >= p.y) {
            inzone++;
            if (Math.random() < this.st.prob && (p.st.protect ?? 0) < Math.random()) {
              if (Math.random() < this.st.killer) {
                p.dead();
              } else {
                p.toState(this.infect);
              }
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
  }
  move() {
    if (this.alive) {
      let home = this.st.robber ? this.shome:this.home;
      let magnet = this.magnet ?? { x: 0, y: 0 };
      this.x += (this.speed.x*(this.st.speed ?? 1))+magnet.x;
      this.y += (this.speed.y*(this.st.speed ?? 1))+magnet.y;
      if (this.x < home.minx) this.speed.x *=-1, this.x = home.minx;
      if (this.x > home.maxx) this.speed.x *=-1, this.x = home.maxx;
      if (this.y < home.miny) this.speed.y *=-1, this.y = home.miny;
      if (this.y > home.maxy) this.speed.y *=-1, this.y = home.maxy;
    }
  }
  render() {
    if (!this.st.invisible) {
      if (this.alive) {
        if (this.teleportated) {
          if (frame_ < this.frame+5 && style.anim && this.frame !== false) {
            let fram = frame_-this.frame;
            let cellTrans = this.st.transparent ? 128:255;
            let trans = cellTrans*fram/5;
            ctx.fillStyle = this.st.color + ahex(trans);
            ctx.fillRect(X((this.x-(style.size/2)*scale)+15), Y((this.y-(style.size/2)*scale)+15), X(style.size*scale), Y(style.size*scale));
            cellTrans = this.teleportated.st.transparent ? 128:255;
            trans = cellTrans*fram/5;
            ctx.fillStyle = this.teleportated.st.color+ ahex(255-trans);
            ctx.fillRect(X((this.teleportated.x-(style.size/2)*scale)+15), Y((this.teleportated.y-(style.size/2)*scale)+15), X(style.size*scale), Y(style.size*scale));
          } else {
            let trans = this.st.transparent ? 128:255;
            ctx.fillStyle = this.st.color + ahex(trans);
            ctx.fillRect(X((this.x-(style.size/2))*scale+15), Y((this.y-(style.size/2))*scale+15), X(style.size*scale), Y(style.size*scale));
          }
        } else {
          let trans = this.st.transparent ? 128:255;
          ctx.fillStyle = this.st.color + ahex(trans);
          ctx.fillRect(X((this.x-(style.size/2))*scale+15), Y((this.y-(style.size/2))*scale+15), X(style.size*scale), Y(style.size*scale));
          if (this.magnet && style.anim) {
            let trans = this.st.transparent ? 64:128;
            ctx.fillStyle = this.st.color + ahex(trans);
            ctx.fillRect(X((this.x-(style.size))*scale+15), Y((this.y-(style.size))*scale+15), X(style.size*2*scale), Y(style.size*2*scale));
          } else {
            if (frame_ < this.frame+5 && style.chanim && this.frame !== false) {
              let fram = frame_-this.frame;
              let cellTrans = this.st.transparent ? 128:255;
              let trans = ahex(cellTrans*(5-fram)/10);
              let size = 2*style.size;
              ctx.fillStyle = this.st.color + trans;
              ctx.fillRect(X((this.x-(size/2))*scale+15), Y((this.y-(size/2))*scale+15), X(size*scale), Y(size*scale));
            }
          }
        }
      } else {
        if (frame_ < this.frame+15 && style.deadanim) {
          let fram = frame_-this.frame;
          let size = (fram/7.5+1)*style.size;
          let cellTrans = this.st.transparent ? 128:255;
          let trans = ahex(cellTrans*(15-fram)/15);
          ctx.fillStyle = this.st.color + trans;
          ctx.fillRect(X((this.x-(size/2))*scale+15), Y((this.y-(size/2))*scale+15), X(size*scale), Y(size*scale));
        }
      }
    }
  }
  first() {
    if (!this.alive) {
      if (this.infectable) {
        let cellTrans = this.st.transparent ? 128:255;
        let fill = (x, y, s, x_, y_, c) => {
          ctx.fillStyle = c;
          ctx.fillRect(X((x_+(style.size*x))*scale+15), Y((y_+(style.size*y))*scale+15), X(s*style.size*scale), Y(s*style.size*scale));
        };
        fill(-0.75, -0.75, 0.6, this.x, this.y, this.st.color + ahex(cellTrans/3*(style.anim ? Math.sin(degToRad(frame_*30))+1:1)));
        fill(0.75, -0.75, 1, this.x, this.y, this.st.color + ahex(cellTrans/3*(style.anim ? Math.sin(degToRad(frame_*30+180))+1:1)));
        fill(-0.75, 0.75, 1, this.x, this.y, this.st.color + ahex(cellTrans/3*(style.anim ? Math.sin(degToRad(frame_*30+180))+1:1)));
        fill(0.75, 0.75, 0.8, this.x, this.y, this.st.color + ahex(cellTrans/3*(style.anim ? Math.sin(degToRad(frame_*30))+1:1)));
      } else {
        if (style.dots) {
          let cellTrans = this.st.transparent ? 128:255;
          ctx.fillStyle = (style.dots.color == "ill" ? this.st.color:style.dots.color) + (style.dots.transparent ? ahex(cellTrans-80):"");
          ctx.fillRect(X(this.x*scale+15-(style.dots.size/2)), Y(this.y*scale+15-(style.dots.size/2)), X(style.dots.size*scale), Y(style.dots.size*scale));
        }
      }
    }
  }
  end() {
    this.magnet = null;
  }
}
class  Mosquito {
  constructor(id, x, y, state) {
    this.x = x;
    this.y = y;
    this.speed = { x: random(options.mosquitospeed)-(options.mosquitospeed/2), y: random(options.mosquitospeed)-(options.mosquitospeed/2) };
    this.state = state;
    this.id = id;
    this.alive = true;
    this.st = states[this.state];
    this.home = { minx: style.size/2, miny: style.size/2, maxx: options.size-(style.size/2), maxy: options.size-(style.size/2) };
    this.time = timeNow();
  }
  render() {
    if (this.alive) {
      let x_ = style.anim ? Math.cos(degToRad(frame_*30))*style.mosquitosize*1.5:0;
      let y_ = style.anim ? Math.sin(degToRad(frame_*30))*style.mosquitosize*1.5:0;
      let trans = this.st.transparent ? 128:255;
      ctx.fillStyle = this.st.color + ahex(trans);
      ctx.fillRect(X(testCordMinMax(this.x-(style.mosquitosize/2)+x_, style.mosquitosize)*scale+15), Y(testCordMinMax(this.y-(style.mosquitosize/2)+y_, style.mosquitosize)*scale+15), X(style.mosquitosize*scale), Y(style.mosquitosize*scale));
      ctx.fillStyle = this.st.color + ahex(trans/2);
      ctx.fillRect(X(testCordMinMax(this.x-(style.mosquitosize)+x_, style.mosquitosize*2)*scale+15), Y(testCordMinMax(this.y-(style.mosquitosize)+y_, style.mosquitosize*2)*scale+15), X(style.mosquitosize*2*scale), Y(style.mosquitosize*2*scale)); 
    }
  }
  handler() {
    if (this.alive) {
      for (let i = 0; i < arr.length; i++) {
        let p = arr[i];
        if (p.state != this.state && p.alive) {
          if (this.x - options.mosquitozone <= p.x && this.x + options.mosquitozone >= p.x && this.y - options.mosquitozone <= p.y && this.y + options.mosquitozone >= p.y) {
            if (Math.random() < options.mosquitozone && (p.st.protect ?? 0) < Math.random()) {
              p.toState(this.state);
            }
          }
        }
      }
      if (options.mosquitotime && this.time+options.mosquitotime < timeNow()) {
        this.alive = false;
      }
      this.x += this.speed.x;
      this.y += this.speed.y;
      if (this.x < this.home.minx) this.speed.x *=-1, this.x = this.home.minx;
      if (this.x > this.home.maxx) this.speed.x *=-1, this.x = this.home.maxx;
      if (this.y < this.home.miny) this.speed.y *=-1, this.y = this.home.miny;
      if (this.y > this.home.maxy) this.speed.y *=-1, this.y = this.home.maxy;
    }
  }
}
function random(max) {
  return Math.random()*max;
}
function start() {
  arr = [];
  counts = [];
  mosq = [];
  frame_ = 0;
  counter = options.count;
  for (let i = 0; i < options.count; i++) {
    arr.push(new Cell(i));
  }
  states[0].count = options.count;
  for (let i = 1, j = 0; i < states.length; i++) {
    let ill = states[i];
    ill.count = 0;
    ill.lastadd = 0;
    for (let k = 0; k < ill.initial; k++, j++) {
      let p = arr[j];
      if (ill.position && ill.position.length > k) p.x = ill.position[k].x, p.y = ill.position[k].y;
      p.toState(i, true);
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
    if (!pause) {
      for (let i = 0; i < arr.length; i++) {
        arr[i].handler();
      }
      for (let i = 0; i < mosq.length; i++) {
        mosq[i].handler();
      }
      for (let i = 0; i < states.length; i++) {
        let ill = states[i];
        if (ill.addtime && ill.addcount) {
          if (ill.addtime+ill.lastadd < timeNow()) {
            for (let j = 0; j < ill.addcount; j++) {
              arr[Math.floor(random(arr.length))].toState(i);
            }
            ill.lastadd = timeNow();
          }
        }
      }
    }
    for (let i = 0; i < arr.length; i++) {
      arr[i].first();
    }
    for (let i = 0; i < arr.length; i++) {
      arr[i].render();
    }
    for (let i = 0; i < mosq.length; i++) {
      mosq[i].render();
    }
    if (!pause) {
      for (let i = 0; i < arr.length; i++) {
        arr[i].move();
      }
      for (let i = 0; i < arr.length; i++) {
        arr[i].end();
      }
    }
    if (!style.onlygame) {
      ctx.font = `${X(18)}px Monospace`;
      ctx.fillStyle = "#000000";
      ctx.fillText(`Время: ${flr(timeNow()/1000)}с`, X(490), Y(style.biggraph ? 260:30));
      ctx.fillText(`FPS: ${flr(FPS)+ (options.showspeed == 1000 ? " ⚡":` x${options.showspeed ?? 1}`)}`, X(490), Y(style.biggraph ? 290:60));
      if (!style.biggraph) ctx.fillText("Статистика:", X(490), Y(120));
      ctx.fillText(`${counter} | сумма`, X(490), Y(style.biggraph ? 350:150));
      sort();
      ctx.font = `${X(Math.min(Math.floor(9/states.length*18), 18))}px Monospace`;
      if (style.biggraph) {
        biggraph();
      } else {
        for (let i = 0; i < sorted.length; i++) {
          let st = sorted[i];
          ctx.fillStyle = st.color + (st.transparent ? "80":"ff");
          ctx.fillText(`${st.count} | ${st.name} ${st.invisible? "(невидим)":""}`, X(490), Y(180+(i*Math.min(Math.floor(9/states.length*30), 30))));
        }
        if (frame_%(options.graph ?? 1) == 0) updateGraph();
        ctx.putImageData(graph, X(650), Y(10));
      }
    }
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
      ctx.beginPath();
      ctx.moveTo(X(760), Y(400));
      ctx.lineTo(X(770), Y(400));
      ctx.lineTo(X(760), Y(410));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(790), Y(400));
      ctx.lineTo(X(780), Y(400));
      ctx.lineTo(X(790), Y(410));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(760), Y(430));
      ctx.lineTo(X(770), Y(430));
      ctx.lineTo(X(760), Y(420));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(790), Y(430));
      ctx.lineTo(X(780), Y(430));
      ctx.lineTo(X(790), Y(420));
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(X(770), Y(410), X(10), Y(10))
    } else {
      ctx.fillRect(X(850), Y(400), X(10), Y(30));
      ctx.fillRect(X(870), Y(400), X(10), Y(30));
      frame_++;
    }
    if (!style.onlygame) {
      ctx.fillStyle = "#000000";
      ctx.font = `${X(18)}px Monospace`;
      ctx.fillText(`Расчёт: ${Math.floor(performance.now()-start)}мс`, X(490), Y(style.biggraph ? 320:90));
    }
  } else {
    clearInterval(interval);
  }
}
function X(x) {
  return Math.floor(x*cc);
}
function Y(y) {
  return Math.floor(y*cc);
}
function timeNow() {
  return frame_/30*1000;
}
function flr(num) {
  num = Math.floor(num*10)/10;
  return num%1 == 0 ? num+".0":num;
}
function biggraph() {
  let max = 2;
  let start = style.graphmove ? (frame_ < 290 ? 0:frame_-290):0;
  let timeinc = start*(1000/fps);
  let size = style.graphmove ? (frame_ < 290 ? frame_:290):frame_;
  for (let t = start; t < counts.length; t++) {
    for (let i = 0; i < states.length; i++) {
      if (!(states[i].hidden || states[i].hiddengraph)) {
        let ct = counts[t][i];
        if (ct > max) {
          max = ct;
        }
      }
    }
  }
  ctx.font = `${X(12)}px Monospace`;
  ctx.fillStyle = "#ffffff";
  
  ctx.fillRect(X(465), Y(15), X(420), Y(210));
  ctx.fillStyle = "#d0d0d0";
  
  ctx.fillRect(X(500), Y(40), X(360), Y(2));
  ctx.fillText(`${max}`, X(470), Y(45), X(30));
  ctx.fillRect(X(500), Y(120), X(360), Y(2));
  ctx.fillText(`${Math.floor(max/2)}`, X(470), Y(125), X(30));
  ctx.fillRect(X(500), Y(200), X(360), Y(2));
  ctx.fillText("0", X(470), Y(205), X(30));
  
  ctx.fillRect(X(530), Y(15), X(2), Y(195));
  ctx.fillText(`${flr(timeinc/1000)}`, X(525), Y(235), X(30));
  ctx.fillRect(X(602.5), Y(15), X(2), Y(195));
  ctx.fillText(`${flr((timeNow()-timeinc)/4000+(timeinc/1000))}`, X(600), Y(235), X(30));
  ctx.fillRect(X(675), Y(15), X(2), Y(195));
  ctx.fillText(`${flr((timeNow()-timeinc)/2000+(timeinc/1000))}`, X(670), Y(235), X(30));
  ctx.fillRect(X(747.5), Y(15), X(2), Y(195));
  ctx.fillText(`${flr((timeNow()-timeinc)/4000*3+(timeinc/1000))}`, X(742.5), Y(235), X(30));
  ctx.fillRect(X(820), Y(15), X(2), Y(195));
  ctx.fillText(`${flr(timeNow()/1000)}`, X(815), Y(235), X(30));
  ctx.lineWidth = X(3);
  if (frame_ > 0) {
    for (let i = 0; i < states.length; i++) {
      if (!(states[i].hidden || states[i].hiddengraph)) {
        ctx.beginPath();
        for (let x = 0; x < 290; x++) {
          let ci = Math.floor(x/290*size)+start;
          let y = 160-(counts[ci][i]/max*160);
          if (x == 0) {
            ctx.moveTo(X(x+530), Y(y+40));
          } else {
            ctx.lineTo(X(x+530), Y(y+40));
          }
        }
        ctx.strokeStyle = states[i].color + (states[i].transparent ? "80":"ff");
        ctx.stroke();
      }
    }
  }
}
function updateGraph() {
  let max = 2;
  let start = style.graphmove ? (frame_ < 160 ? 0:frame_-160):0;
  let timeinc = start*(1000/fps);
  let size = style.graphmove ? (frame_ < 160 ? frame_:160):frame_;
  for (let t = start; t < counts.length; t++) {
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
  grp.fillText(`${flr(timeinc/1000)}`, X(40), Y(105), X(30));
  grp.fillRect(X(75), Y(5), X(1), Y(90));
  grp.fillText(`${flr((timeNow()-timeinc)/4000/20*18+(timeinc/1000))}`, X(70), Y(105), X(30));
  grp.fillRect(X(110), Y(5), X(1), Y(90));
  grp.fillText(`${flr((timeNow()-timeinc)/2000/20*18+(timeinc/1000))}`, X(110), Y(105), X(30));
  grp.fillRect(X(145), Y(5), X(1), Y(90));
  grp.fillText(`${flr((timeNow()-timeinc)/4000*3/20*18+(timeinc/1000))}`, X(145), Y(105), X(30));
  grp.fillRect(X(180), Y(5), X(1), Y(90));
  grp.fillText(`${flr((timeNow()-timeinc)/1000/20*18+(timeinc/1000))}`, X(180), Y(105), X(30));
  grp.lineWidth = X(2);
  if (frame_ > 0) {
    for (let i = 0; i < states.length; i++) {
      if (!(states[i].hidden || states[i].hiddengraph)) {
        grp.beginPath();
        for (let x = 0; x < 160; x++) {
          let ci = Math.floor(x/160*size)+start;
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

function startrender() {
  clear();
  ctx.fillStyle = "#a00000a0";
  ctx.font = `${X(42)}px Monospace`;
  ctx.fillText("Кликните чтобы продолжить", X(120), Y(200));
  ctx.fillStyle = "#0000a0a0";
  ctx.font = `${X(36)}px Monospace`;
  ctx.fillText("Симулятор Болезни", X(230), Y(100));
}
startrender();
addEventListener('click', () => {
  music.loop = true;
  if (options.music) music.play();
  interval = setInterval(() => { if (performance.now() >= lastTime+fpsTime) frame(); }, 1);
  started = true;
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
  let c = cw/900;
  let x = (e.pageX-cx)/c;
  let y = (e.pageY-cy)/c;
  if (x > 850 && y > 400) {
    pause = !pause;
  }
  if (pause && x > 800 && x < 850 && y > 400) {
    start();
    pause = false;
  }
  if (pause && x > 760 && x < 790 && y > 400) {
    fullScreen(document.documentElement);
  }
  if (options.healzone && y >= 15 && y <= 435 && x >= 15 && x <= 435) {
    let x_ = (x-15)/420*options.size;
    let y_ = (y-15)/420*options.size;
    let zone = options.healzone;
    for (let i = 0; i < arr.length; i++) {
      let p = arr[i];
      if (p.y >= y_-zone && p.y <= y_+zone*1 && p.x >= x_-zone && p.x <= x_+zone*1) {
        p.toState(0);
      }
    }
  }
}
function ahex(a) {
  a = Math.floor(a);
  return (a < 16 ? "0":"") + a.toString(16);
}
function degToRad(deg) {
  return deg/180*Math.PI;
}
function testCordMinMax(c, size) {
  return Math.min(Math.max(c, size/2), options.size-(size/2));
}
