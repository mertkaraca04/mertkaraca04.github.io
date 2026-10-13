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

// ---------- OEE: Overall Equipment Effectiveness (industrial engineering) ----------
// OEE = Availability x Performance x Quality
//   Availability = run time / planned time
//   Performance  = (ideal cycle time x total units) / run time
//   Quality      = good units / total units
// Times are in minutes, the ideal cycle time is in seconds per unit.
function oee(plannedMin, downMin, idealCycleSec, totalUnits, defectUnits) {
  if (!(plannedMin > 0) || !(downMin >= 0) || !(downMin < plannedMin) || !(idealCycleSec > 0) ||
      !(totalUnits > 0) || !(defectUnits >= 0) || !(defectUnits <= totalUnits)) return null;
  var run = plannedMin - downMin;
  var a = run / plannedMin;
  var p = idealCycleSec * totalUnits / 60 / run;
  var q = (totalUnits - defectUnits) / totalUnits;
  return { a: a, p: p, q: q, oee: a * p * q };
}

// ---------- FX forward / swap pricing (treasury) ----------
// Covered interest parity for USD/TRY with simple interest:
//   F = S * (1 + rTRY * d/365) / (1 + rUSD * d/360)
// TRY money-market rates use Act/365 and USD rates use Act/360. Rates are given in % per year.
function fxForward(spot, rTryPct, rUsdPct, days) {
  if (!(spot > 0) || !(days > 0) || !isFinite(rTryPct) || !isFinite(rUsdPct)) return null;
  var tryLeg = 1 + (rTryPct / 100) * days / 365;
  var usdLeg = 1 + (rUsdPct / 100) * days / 360;
  if (!(tryLeg > 0) || !(usdLeg > 0)) return null;
  var f = spot * tryLeg / usdLeg;
  return { f: f, points: f - spot, annPremium: (f / spot - 1) * 365 / days * 100 };
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
  var panelFx = document.getElementById('panel-fx');
  var fx = {
    spot: document.getElementById('fx-spot'), days: document.getElementById('fx-days'),
    rTry: document.getElementById('fx-try'), rUsd: document.getElementById('fx-usd'),
    f: document.getElementById('fx-f'), pts: document.getElementById('fx-pts'),
    ann: document.getElementById('fx-ann'), text: document.getElementById('fx-text')
  };

  function updateFx() {
    var d = parseFloat(fx.days.value);
    var res = fxForward(parseFloat(fx.spot.value), parseFloat(fx.rTry.value), parseFloat(fx.rUsd.value), d);
    if (!res) {
      fx.f.textContent = fx.pts.textContent = fx.ann.textContent = '-';
      fx.text.textContent = 'Enter a spot rate above 0, a number of days above 0, and both interest rates.';
      return;
    }
    var spotNum = parseFloat(fx.spot.value);
    fx.f.textContent = res.f.toFixed(4);
    fx.pts.textContent = (res.points >= 0 ? '+' : '') + res.points.toFixed(4);
    fx.ann.textContent = res.annPremium.toFixed(2) + '%';
    var above = res.points >= 0;
    fx.text.textContent = 'A ' + format(d) + '-day USD/TRY forward is ' + res.f.toFixed(4) + ' against a spot of ' + spotNum.toFixed(4) +
      ', which is ' + Math.abs(res.points).toFixed(4) + ' TRY ' + (above ? 'above' : 'below') + ' spot (' +
      Math.abs(res.annPremium).toFixed(2) + '% a year). It is ' + (above ? 'above' : 'below') + ' spot because the TRY rate is ' +
      (above ? 'higher' : 'lower') + ' than the USD rate; this gap is what an FX swap trades.';
  }

  var panelOee = document.getElementById('panel-oee');
  var oeeEl = {
    planned: document.getElementById('oee-planned'), down: document.getElementById('oee-down'),
    ct: document.getElementById('oee-ct'), units: document.getElementById('oee-units'),
    defects: document.getElementById('oee-defects'),
    a: document.getElementById('oee-a'), p: document.getElementById('oee-p'),
    q: document.getElementById('oee-q'), o: document.getElementById('oee-o'),
    text: document.getElementById('oee-text')
  };

  function updateOee() {
    var res = oee(parseFloat(oeeEl.planned.value), parseFloat(oeeEl.down.value), parseFloat(oeeEl.ct.value),
                  parseFloat(oeeEl.units.value), parseFloat(oeeEl.defects.value));
    if (!res) {
      oeeEl.a.textContent = oeeEl.p.textContent = oeeEl.q.textContent = oeeEl.o.textContent = '-';
      oeeEl.text.textContent = 'Enter planned time above 0, downtime from 0 to less than the planned time, an ideal cycle time above 0, units above 0, and defects from 0 up to the number of units.';
      return;
    }
    function pct(x) { return (x * 100).toFixed(1) + '%'; }
    oeeEl.a.textContent = pct(res.a);
    oeeEl.p.textContent = pct(res.p);
    oeeEl.q.textContent = pct(res.q);
    oeeEl.o.textContent = pct(res.oee);
    if (res.p > 1) {
      oeeEl.text.textContent = 'Performance is above 100%, which means the plant ran faster than the ideal cycle time. Check the ideal cycle time and the unit count before trusting this OEE.';
      return;
    }
    var losses = [['availability, so stops and breakdowns', res.a], ['performance, so slow running', res.p], ['quality, so defects and rework', res.q]];
    losses.sort(function (x, y) { return x[1] - y[1]; });
    oeeEl.text.textContent = 'An OEE of ' + pct(res.oee) + ' means about ' + (res.oee * 100).toFixed(1) +
      ' of every 100 planned minutes made good parts at full speed. ' +
      (losses[0][1] >= 1 ? 'There is no loss in this shift.' : 'The biggest loss is ' + losses[0][0] + ' (' + pct(losses[0][1]) + ').');
  }

  function selectTab(category) {
    current = category;
    Array.prototype.forEach.call(tabsEl.children, function (b) {
      b.setAttribute('aria-selected', b.dataset.category === category ? 'true' : 'false');
    });
    var special = category === 'fx' || category === 'oee';
    panelConvert.hidden = special;
    panelFx.hidden = category !== 'fx';
    panelOee.hidden = category !== 'oee';
    if (category === 'fx') { updateFx(); return; }
    if (category === 'oee') { updateOee(); return; }
    fillUnits(fromUnit, category, DEFAULTS[category][0]);
    fillUnits(toUnit, category, DEFAULTS[category][1]);
    update();
  }

  var TAB_LIST = Object.keys(CATEGORIES).map(function (k) { return [k, CATEGORIES[k].label]; });
  TAB_LIST.push(['fx', 'FX swap']);
  TAB_LIST.push(['oee', 'OEE']);
  TAB_LIST.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab');
    b.dataset.category = t[0]; b.textContent = t[1];
    b.addEventListener('click', function () { selectTab(t[0]); });
    tabsEl.appendChild(b);
  });

  [fx.spot, fx.days, fx.rTry, fx.rUsd].forEach(function (el) { el.addEventListener('input', updateFx); });
  [oeeEl.planned, oeeEl.down, oeeEl.ct, oeeEl.units, oeeEl.defects].forEach(function (el) { el.addEventListener('input', updateOee); });

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

if (typeof module !== 'undefined') module.exports = { convert: convert, format: format, CATEGORIES: CATEGORIES, fxForward: fxForward, oee: oee };
