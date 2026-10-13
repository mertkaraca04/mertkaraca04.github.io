// ConvertLab: all maths run in the browser, nothing is sent anywhere.

// Each linear category stores "how many base units is 1 of this unit".
// Base units: metre, kilogram, pascal, joule.
var CATEGORIES = {
  length: { label: 'Length', base: 'm', units: {
    mm: 0.001, cm: 0.01, m: 1, km: 1000, 'in': 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 } },
  mass: { label: 'Mass', base: 'kg', units: {
    mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 } },
  pressure: { label: 'Pressure', base: 'Pa', units: {
    Pa: 1, kPa: 1000, MPa: 1e6, bar: 1e5, atm: 101325, psi: 6894.757293168, mmHg: 133.322387415 } },
  energy: { label: 'Energy', base: 'J', units: {
    J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3.6e6, BTU: 1055.05585262 } },
  temperature: { label: 'Temperature', base: 'K', units: { '°C': 0, '°F': 0, K: 0 } }
};
var DEFAULTS = {
  length: ['mm', 'cm'], mass: ['kg', 'lb'], pressure: ['bar', 'psi'],
  energy: ['kWh', 'kJ'], temperature: ['°C', '°F']
};

// Temperature goes through Kelvin because it is not a simple multiplication.
function toKelvin(v, u) {
  if (u === '°C') return v + 273.15;
  if (u === '°F') return (v - 32) * 5 / 9 + 273.15;
  return v;
}
function fromKelvin(k, u) {
  if (u === '°C') return k - 273.15;
  if (u === '°F') return (k - 273.15) * 9 / 5 + 32;
  return k;
}

function convert(category, value, from, to) {
  if (category === 'temperature') return fromKelvin(toKelvin(value, from), to);
  var u = CATEGORIES[category].units;
  return value * u[from] / u[to];
}

function format(n) {
  if (!isFinite(n)) return '';
  if (n === 0) return '0';
  var a = Math.abs(n);
  if (a >= 1e9 || a < 1e-6) return n.toExponential(6);
  return String(parseFloat(n.toPrecision(10)));
}

// ---------- page wiring (only runs in a browser) ----------
if (typeof document !== 'undefined') {
  var current = 'length';
  var tabsEl = document.getElementById('tabs');
  var fromVal = document.getElementById('from-value');
  var toVal = document.getElementById('to-value');
  var fromUnit = document.getElementById('from-unit');
  var toUnit = document.getElementById('to-unit');
  var formulaEl = document.getElementById('formula');

  function fillUnits(select, category, selected) {
    select.innerHTML = '';
    Object.keys(CATEGORIES[category].units).forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      if (name === selected) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function update() {
    var v = parseFloat(fromVal.value);
    if (isNaN(v)) { toVal.value = ''; formulaEl.textContent = ''; return; }
    var r = convert(current, v, fromUnit.value, toUnit.value);
    toVal.value = format(r);
    formulaEl.textContent = format(v) + ' ' + fromUnit.value + ' = ' + format(r) + ' ' + toUnit.value;
  }

  function selectTab(category) {
    current = category;
    Array.prototype.forEach.call(tabsEl.children, function (b) {
      b.setAttribute('aria-selected', b.dataset.category === category ? 'true' : 'false');
    });
    fillUnits(fromUnit, category, DEFAULTS[category][0]);
    fillUnits(toUnit, category, DEFAULTS[category][1]);
    update();
  }

  Object.keys(CATEGORIES).forEach(function (key) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab');
    b.dataset.category = key; b.textContent = CATEGORIES[key].label;
    b.addEventListener('click', function () { selectTab(key); });
    tabsEl.appendChild(b);
  });

  fromVal.addEventListener('input', update);
  fromUnit.addEventListener('change', update);
  toUnit.addEventListener('change', update);
  document.getElementById('swap').addEventListener('click', function () {
    var a = fromUnit.value; fromUnit.value = toUnit.value; toUnit.value = a;
    update();
  });

  // ----- dark mode -----
  var root = document.documentElement;
  var themeBtn = document.getElementById('theme-toggle');
  function paintThemeButton() {
    var dark = root.getAttribute('data-theme') === 'dark';
    themeBtn.textContent = dark ? '☀️' : '🌙';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('convertlab-theme', next); } catch (e) {}
    paintThemeButton();
  });
  paintThemeButton();

  selectTab('length');
}

if (typeof module !== 'undefined') module.exports = { convert: convert, format: format, CATEGORIES: CATEGORIES };
