var states = [];
var options = {
  size: 420,
  count: 1000,
  speed: 7,
  quar: 0,
  stop: true
};
var openedadd = [];
var $ = (id) => document.getElementById(id);
var name = "без имени";

function downloadgame() {
  let blob = new Blob([createJSON()], { type: "application/json" });
  let lnk = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = lnk;
  a.download = `${name}.json`;
  a.click();
}
function playgame() {
  localStorage.setItem('epidemic_simulator_json', createJSON());
  open('game.html');
}
function error(str) {
  alert(str);
}
function createJSON() {
  let obj = {
    name: name,
    resolution: 1080,
    states: [], 
    options: options,
    style: {
      size: 5,
      sort: true, 
      dots: { color: "ill", size: 2, transparent: true },
      deadanim: true, 
      chanim: true
    }
  };
  for (let i = 0; i < states.length; i++) {
    let o = states[i];
    delete o.div;
    obj.states.push(o);
  }
  return JSON.stringify(obj);
}
function newState(name, color) {
  let num = states.length;
  let div = document.createElement('div');
  div.innerHTML = `
    <div class="namediv"><input type="text" class="name" id="name${num}" value="${name}" onchange="updateState(${num});">${num == 0 ? "":`<button style="background-color: #00000000; border: none; display: inline;" onclick="deletestate(${num});"><img src="assets/delete.svg" height="12"></button>`}
      <input type="checkbox" id="hiddenstat${num}" onchange="updateState(${num})" style="display: inline;" checked>
      <input type="checkbox" id="hiddengraph${num}" onchange="updateState(${num})" style="display: inline;" ${num == 0 ? "":"checked"}>
    </div>
    <input type="color" id="color${num}" class="colorsel" value="${color}">
    <button class="color" id="colorred" onclick="$('color${num}').value='#a00000'; updateState(${num});"></button>
    <button class="color" id="colorora" onclick="$('color${num}').value='#a05000'; updateState(${num});"></button>
    <button class="color" id="coloryel" onclick="$('color${num}').value='#a0a000'; updateState(${num});"></button>
    <button class="color" id="colorgre" onclick="$('color${num}').value='#00a000'; updateState(${num});"></button>
    <button class="color" id="coloraqu" onclick="$('color${num}').value='#00a0a0'; updateState(${num});"></button>
    <button class="color" id="colorblu" onclick="$('color${num}').value='#0000a0'; updateState(${num});"></button>
    <button class="color" id="colormag" onclick="$('color${num}').value='#a000a0'; updateState(${num});"></button>
    <button class="color" id="colorpur" onclick="$('color${num}').value='#a00050'; updateState(${num});"></button>
    <button class="color" id="colorbla" onclick="$('color${num}').value='#000000'; updateState(${num});"></button>
    <div><input type="checkbox" id="transparent${num}" onchange="updateState(${num})">
    <label for="transparent${num}" class="label">Полупрозрачность</label></div>
    <div><label for="prob${num}" class="label">Вероятность(%):</label>
    <input type="number" id="prob${num}" onchange="checknum(this, 0, 100, false); updateState(${num});" value="0"></div>
    <div><label for="zone${num}" class="label">Зона(пкс.):</label>
    <input type="number" id="zone${num}" onchange="checknum(this, 0, options.size, true); updateState(${num});" value="0"></div>
    ${num == 0 ? "":`<div><label for="zone${num}" class="label">Начальная попуяция(шт.):</label>
    <input type="number" id="initial${num}" onchange="checknum(this, 0, options.count-checksum(${num}), true); updateState(${num});" value="0"></div>`}
    <div><label for="time${num}" class="label">Длина жизни(с) 0 = бесконечно:</label>
    <input type="number" id="time${num}" onchange="checknum(this, 0, 120, false); updateState(${num});" value="0"></div>
    <div><label for="protect${num}" class="label">Защита(%):</label>
    <input type="number" id="protect${num}" onchange="checknum(this, 0, 100, false); updateState(${num});" value="0"></div>
    <p class="add" onclick="addh(${num});">Дополнительно <img src="assets/down.svg" id="add_${num}" width="12"></p>
    <div id="add${num}" style="display: none;">
      <div><label for="speed${num}" class="label">Коэффициент скорости:</label>
      <input type="number" id="speed${num}" onchange="checknum(this, 0, 3, false); updateState(${num});" value="1"></div>
      <div><label for="heal${num}" class="label">Вероятность излечения(%):</label>
      <input type="number" id="heal${num}" onchange="checknum(this, 0, 100, false); updateState(${num});" value="0"></div>
      <div><label for="transform${num}" class="label">Трансформация в:</label>
      <input type="number" id="transform${num}" onchange="checknum(this, 1, states.length, true); updateState(${num});" value="1"></div>
      <div><label for="infect${num}" class="label">Заражение в (0 = в себя):</label>
      <input type="number" id="infect${num}" onchange="checknum(this, 0, states.length, true); updateState(${num});" value="0"></div>
      <div><label for="parasite${num}" class="label">Паразит(0 = без паразита):</label>
      <input type="number" id="parasite${num}" onchange="checknum(this, 0, 120, false); updateState(${num});" value="0"></div>
      <div><label for="after${num}" class="label">Инфекция после смерти(с):</label>
      <input type="number" id="after${num}" onchange="checknum(this, 0, 120, false); updateState(${num});" value="0"></div>
      <div><label for="attacktrans${num}" class="label">Переатака(%):</label>
      <input type="number" id="attacktrans${num}" onchange="checknum(this, 0, 100, false); updateState(${num});" value="0"></div>
      <div><label for="rest${num}" class="label">Отдых(с):</label>
      <input type="number" id="rest${num}" onchange="checknum(this, 0, 120, false); updateState(${num});" value="0"></div>
      <div><input type="checkbox" id="robber${num}" onchange="updateState(${num})">
      <label for="robber${num}" class="label">Грабитель</label></div>
      <div><input type="checkbox" id="allone${num}" onchange="updateState(${num})">
      <label for="allone${num}" class="label">Всё за одного</label></div>
    </div>
    <div class="border"></div>
  `;
  let obj = {
    color: color,
    transparent: false,
    hiddenstat: false,
    hiddengraph: num == 0 ? true:false,
    name: name,
    initial: 0,
    prob: 0,
    zone: 0,
    time: 0,
    speed: 1,
    heal: 0,
    transform: 0,
    infect: 0,
    parasite: 0,
    after: 0,
    rest: 0,
    protect: 0,
    attacktrans: 0,
    robber: false,
    allone: false,
    div: div
  };
  $('states').appendChild(div);
  states.push(obj);
  openedadd.push(true);
}
function updateState(i) {
  states[i] = {
    color: $(`color${i}`).value,
    transparent: Number($(`transparent${i}`).checked),
    hiddenstat: !$(`hiddenstat${i}`).checked,
    hiddengraph: !$(`hiddengraph${i}`).checked,
    name: $(`name${i}`).value,
    div: states[i].div,
    prob: Number($(`prob${i}`).value)/100,
    zone: Number($(`zone${i}`).value),
    time: Number($(`time${i}`).value)*1000,
    rest: Number($(`rest${i}`).value)*1000,
    speed: Number($(`speed${i}`).value),
    heal: Number($(`heal${i}`).value)/100,
    transform: Number($(`transform${i}`).value)-1,
    initial: Number(($(`initial${i}`) ?? { value: null }).value),
    infect: Number($(`infect${i}`).value),
    parasite: Number($(`parasite${i}`).value)*1000,
    allone: $(`allone${i}`).checked,
    after: Number($(`after${i}`).value)*1000,
    attacktrans: Number($(`attacktrans${i}`).value)/100,
    protect: Number($(`protect${i}`).value)/100,
    robber: $(`robber${i}`).checked
  };
  sum = 0;
  for (let j = 0; j < states.length; j++) {
    sum += states[j].initial;
  }
}
function checknum(obj, min, max, trunc) {
  let num = obj.value;
  if (num < min) num = min;
  if (num > max) num = max;
  if (trunc) num = Math.trunc(num) ?? 0;
  obj.value = num;
}
function deletestate(i) {
  if (confirm(`Вы хотите удалить состояние '${states[i].name}'?`)) {
    states[i].div.remove();
    states.splice(i, 1);
  }
}
function checksum(i) {
  let out = 0;
  for (let j = 1; j < states.length; j++) {
    if (j != i) out += states[j].initial;
  }
  return out;
}
function opengame(file) {
  let reader = new FileReader();
  let log = (txt) => $('console').value += txt+"\n";
  $('console').value = "";
  reader.readAsText(file);
  reader.onload = function() {
    log("Файл обрабатывается...")
    let json = reader.result;
    let obj = JSON.parse(json);
    if (typeof obj == "object") {
      log("JSON прочитан, идёт проверка объекта...")
      if (obj.states && obj.options && obj.style && obj.name) {
        log("Проверка states...");
        if (states[0] && states.length) {
          log("Проверка options...");
          if (obj.options.size && obj.options.count && obj.options.speed) {
            log("Проверка style...");
            if (obj.style.size) {
              log("Загрузка...");
              $('states').innerHTML = "";
              states = [];
              openedadd = [];
              for (let i = 0; i < obj.states.length; i++) {
                let st = obj.states[i];
                if (st.name && st.color) {
                  newState(st.name, st.color);
                  $(`hiddenstat${i}`).checked = !(st.hiddenstat ?? false);
                  $(`hiddengraph${i}`).checked = !(st.hiddengraph ?? false);
                  $(`transparent${i}`).checked = st.transparent ?? false;
                  $(`prob${i}`).value = (st.prob ?? 0)*100;
                  $(`zone${i}`).value = st.zone ?? 0;
                  $(`speed${i}`).value = st.speed ?? 1;
                  $(`heal${i}`).value = (st.heal ?? 0)*100;
                  $(`protect${i}`).value = (st.protect ?? 0)*100;
                  $(`transform${i}`).value = (st.transform ?? 0)+1;
                  $(`infect${i}`).value = st.infect ?? 0;
                  $(`parasite${i}`).value = (st.parasite ?? 0)/1000;
                  $(`allone${i}`).checked = st.allone ?? false;
                  $(`robber${i}`).checked = st.robber ?? false;
                  $(`after${i}`).value = (st.after ?? 0)/1000;
                  $(`rest${i}`).value = (st.rest ?? 0)/1000;
                  $(`attacktrans${i}`).value = (st.attacktrans ?? 0)/1000;
                  if (i != 0) $(`initial${i}`).value = st.initial ?? 0;
                  $(`time${i}`).value = (st.time ?? 0)/1000;
                  updateState(i);
                } else {
                  log(`Ошибка при загрузке: состояние ${i} не содержит обязательные поля`);
                  setTimeout(() => close(), 500);
                }
              }
              name = obj.name;
              $('name').value = name;
              log("Загрузка завершена");
              setTimeout(() => { $('opengame').style.display='none'; $('editor').style.display='block'; }, 500);
            } else {
              log("Ошибка: style не содержит обязательные поля")
            }
          } else {
            log("Ошибка: options не содержит обязательные поля")
          }
        } else {
          log("Ошибка: неверный states")
        }
      } else {
        log("Ошибка: объект не содержит обязательные поля")
      }
    }
  };
  reader.onerror = function() {
    log("Ошибка при чтении файла: " + reader.error);
  };
}
function addh(i) {
  if (openedadd[i]) {
    $(`add_${i}`).src = 'assets/down.svg';
    $(`add${i}`).style.display = 'none';
    openedadd[i] = false;
  } else {
    $(`add_${i}`).src = 'assets/up.svg';
    $(`add${i}`).style.display = 'block';
    openedadd[i] = true;
  }
}
newState("здоровые", "#00a000");
