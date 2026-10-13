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

// ---------- Newsvendor (industrial engineering) ----------
// Inverse of the standard normal CDF (Acklam's rational approximation, relative error ~1e-9).
function invNorm(p) {
  var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  var pLow = 0.02425, q, r;
  if (p <= 0 || p >= 1) return NaN;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p > 1 - pLow) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  q = p - 0.5; r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

// Cu = cost of each unit you are short, Co = cost of each unit left over.
// Critical ratio CR = Cu / (Cu + Co); best quantity Q* = mean + z * sigma, where z = invNorm(CR).
function newsvendor(mu, sigma, cu, co) {
  if (!(sigma >= 0) || !(cu > 0) || !(co > 0) || !isFinite(mu)) return null;
  var cr = cu / (cu + co), z = invNorm(cr);
  return { cr: cr, z: z, q: mu + z * sigma };
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

  var panelConvert = document.getElementById('panel-convert');
  var panelNv = document.getElementById('panel-newsvendor');
  var nv = {
    mu: document.getElementById('nv-mu'), sigma: document.getElementById('nv-sigma'),
    cu: document.getElementById('nv-cu'), co: document.getElementById('nv-co'),
    cr: document.getElementById('nv-cr'), z: document.getElementById('nv-z'),
    q: document.getElementById('nv-q'), text: document.getElementById('nv-text')
  };

  function updateNv() {
    var res = newsvendor(parseFloat(nv.mu.value), parseFloat(nv.sigma.value), parseFloat(nv.cu.value), parseFloat(nv.co.value));
    if (!res) {
      nv.cr.textContent = nv.z.textContent = nv.q.textContent = '-';
      nv.text.textContent = 'Enter a mean, a standard deviation of 0 or more, and shortage and leftover costs above 0.';
      return;
    }
    nv.cr.textContent = (res.cr * 100).toFixed(2) + '%';
    nv.z.textContent = res.z.toFixed(4);
    var qText = String(parseFloat(res.q.toFixed(4)));
    nv.q.textContent = qText;
    var side = res.z > 0 ? 'above' : (res.z < 0 ? 'below' : 'exactly at');
    nv.text.textContent = 'Stock or hold ' + qText + ' units. Being short costs ' + parseFloat((res.cr / (1 - res.cr)).toFixed(2)) +
      ' times as much as having extra, so the best amount sits ' + (res.z === 0 ? 'exactly at' : Math.abs(res.z).toFixed(2) + ' standard deviations ' + side) +
      ' the mean, and it covers demand about ' + (res.cr * 100).toFixed(1) + '% of the time.';
  }

  function selectTab(category) {
    current = category;
    Array.prototype.forEach.call(tabsEl.children, function (b) {
      b.setAttribute('aria-selected', b.dataset.category === category ? 'true' : 'false');
    });
    var isNv = category === 'newsvendor';
    panelConvert.hidden = isNv;
    panelNv.hidden = !isNv;
    if (isNv) { updateNv(); return; }
    fillUnits(fromUnit, category, DEFAULTS[category][0]);
    fillUnits(toUnit, category, DEFAULTS[category][1]);
    update();
  }

  var TAB_LIST = Object.keys(CATEGORIES).map(function (k) { return [k, CATEGORIES[k].label]; });
  TAB_LIST.push(['newsvendor', 'Newsvendor']);
  TAB_LIST.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab');
    b.dataset.category = t[0]; b.textContent = t[1];
    b.addEventListener('click', function () { selectTab(t[0]); });
    tabsEl.appendChild(b);
  });

  [nv.mu, nv.sigma, nv.cu, nv.co].forEach(function (el) { el.addEventListener('input', updateNv); });
  document.getElementById('nv-example').addEventListener('click', function () {
    nv.mu.value = 100; nv.sigma.value = 20; nv.cu.value = 0.40; nv.co.value = 0.355;
    updateNv();
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

if (typeof module !== 'undefined') module.exports = { convert: convert, format: format, CATEGORIES: CATEGORIES, invNorm: invNorm, newsvendor: newsvendor };
