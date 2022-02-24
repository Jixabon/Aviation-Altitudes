let reductionFactor = 10;
let debug = false;

const ISA = (alt) => (alt / 1000) * -2 + 15;
const ISADeviation = (alt, oat) => oat - ISA(alt);
const TEC = (absoluteAlt, oat) =>
  4 * (absoluteAlt / 1000) * ISADeviation(absoluteAlt, oat);
const pressureCorrection = (baro) => (29.92 - baro) * 1000;
const pressureAlt = (baro, fieldElv) => pressureCorrection(baro) + fieldElv;
const densityAlt = (presAlt, oat) => presAlt + 120 * (oat - 15);
const absoluteAlt = (trueAlt, fieldElev) => trueAlt - fieldElev;
const trueAlt = (indicatedAlt, absoluteAlt, oat) =>
  indicatedAlt + TEC(absoluteAlt, oat);

let fieldDefaults = {
  fieldElev: 790,
  altimeter: 29.92,
  surfaceTemp: 15,
  plannedAlt: 3500,
  kollsman: 29.92,
  oat: 8,
};

const toggleMenu = (id) => {
  const inputs = document.getElementById(id);
  if (inputs.classList.contains('out')) {
    inputs.classList.remove('out');
  } else {
    inputs.classList.add('out');
  }
};

// --- Environment ---

const updateEnv = () => {
  let fields = {
    fieldElev: Number(document.getElementById('fieldElev').value),
    altimeter: Number(document.getElementById('altimeter').value),
    surfaceTemp: Number(document.getElementById('surfaceTemp').value),
    plannedAlt: Number(document.getElementById('plannedAlt').value),
    kollsman: Number(document.getElementById('kollsman').value),
    oat: Number(document.getElementById('oat').value),
  };
  if (debug) {
    console.log('fields', fields);
  }

  updateParams(fields);

  let calcs = {
    absoluteAlt: absoluteAlt(fields.plannedAlt, fields.fieldElev),
    presCorr: pressureCorrection(fields.altimeter),
    presAlt: Math.round(pressureAlt(fields.altimeter, fields.fieldElev)),
    isa: ISA(fields.plannedAlt),
    surfaceIsa: ISA(fields.fieldElev),
    temp: {},
  };
  calcs.isaDev = ISADeviation(fields.plannedAlt, fields.oat);
  calcs.surfaceIsaDev = ISADeviation(fields.fieldElev, fields.surfaceTemp);
  calcs.densAlt = Math.round(densityAlt(calcs.presAlt, fields.surfaceTemp));
  calcs.indicatedAlt =
    (fields.kollsman - fields.altimeter) * 1000 + fields.plannedAlt;
  calcs.trueAlt = trueAlt(
    fields.plannedAlt,
    absoluteAlt(fields.plannedAlt, fields.fieldElev),
    fields.oat
  );

  if (debug) {
    console.log('calcs', calcs);
  }

  const infoList = [
    `True (MSL): ${round2(calcs.trueAlt)}ft.`,
    `Absolute (AGL): ${calcs.absoluteAlt}ft.`,
    `Indicated: ${round2(calcs.indicatedAlt)}ft.`,
    `In Flight ISA: ${round2(calcs.isa)}&deg;C (ISA${
      calcs.isaDev >= 0 ? '+' + round2(calcs.isaDev) : round2(calcs.isaDev)
    }&deg;C)`,
    `Pressure: ${calcs.presAlt}ft. (Corr. ${round2(calcs.presCorr)}ft.)`,
    `Surface ISA: ${round2(calcs.surfaceIsa)}&deg;C (ISA${
      calcs.surfaceIsaDev >= 0
        ? '+' + round2(calcs.surfaceIsaDev)
        : round2(calcs.surfaceIsaDev)
    }&deg;C)`,
    `Density: ${calcs.densAlt}ft.`,
  ];
  if (debug) {
    console.log('infoList', infoList);
  }

  const info = document.getElementById('info');
  info.innerHTML = '';
  infoList.forEach((infoItem) => {
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = infoItem;
    info.append(infoDiv);
  });

  const ground = document.getElementById('groundInfo');
  ground.innerHTML = '';
  ground.innerHTML = `Elev. ${fields.fieldElev}ft - Temp. ${fields.surfaceTemp}&deg;C - Altimeter ${fields.altimeter}inHg`;

  const properties = {
    '--ground': fields.fieldElev / reductionFactor + 'px',
    '--planned': fields.plannedAlt / reductionFactor + 'px',
    '--indicated': calcs.indicatedAlt / reductionFactor + 'px',
    '--pressure': calcs.presAlt / reductionFactor + 'px',
    '--density': calcs.densAlt / reductionFactor + 'px',
    '--true': calcs.trueAlt / reductionFactor + 'px',
    '--absolute': fields.plannedAlt / reductionFactor + 'px',
  };
  if (debug) {
    console.log('properties', properties);
  }

  const root = document.documentElement;
  for (const [property, value] of Object.entries(properties)) {
    root.style.setProperty(property, value);
  }
};

const resetEnv = () => {
  setFields(fieldDefaults);
  updateEnv();
  scrollToSea();
};

// --- Scrolling ---

const belowHeight = 1000;
const getScrollLocation = (height) => {
  let seaHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--sea-height')
  );
  let scrollHeight = document.body.scrollHeight - belowHeight;
  let screenHeight = document.body.offsetHeight * 0.55;
  return scrollHeight - (height + seaHeight + screenHeight);
};

const scrollToPlane = () => {
  let plannedAlt = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--planned')
  );

  window.scrollTo({
    top: getScrollLocation(plannedAlt),
    behavior: 'smooth',
  });
};

const scrollToGround = () => {
  let ground = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--ground')
  );

  window.scrollTo({
    top: getScrollLocation(ground),
    behavior: 'smooth',
  });
};

const scrollToSea = () => {
  window.scrollTo({
    top: document.body.scrollHeight - document.body.offsetHeight - belowHeight,
    behavior: 'smooth',
  });
};

// --- GET Param handling ---

const loadParams = () => {
  let params = new URLSearchParams(location.search);
  for (const [id, value] of Object.entries(fieldDefaults)) {
    document.getElementById(id).value = params.has(id) ? params.get(id) : value;
  }
};

const updateParams = (fields) => {
  let params = new URLSearchParams(location.search);
  for (const [id, value] of Object.entries(fields)) {
    if (value != fieldDefaults[id]) {
      params.set(id, value);
    } else {
      params.delete(id);
    }
  }
  let { protocol, host, pathname } = window.location;
  let newurl = '';
  if (params.toString() != '') {
    newurl = `${protocol}//${host}${pathname}?${params.toString()}`;
  } else {
    newurl = `${protocol}//${host}${pathname}`;
  }
  window.history.pushState({ path: newurl }, '', newurl);
};

// --- Ruler ---

const createRuler = () => {
  const rulers = document.getElementsByTagName('ruler');
  for (let ruler of rulers) {
    let ticks = parseInt(ruler.getAttribute('ticks'));
    let alt = (ticks.valueOf() / 2) * 1000;
    for (var i = 0; i < ticks; i++) {
      let tick = document.createElement('tick');
      tick.style.marginBottom = 1000 / 2 / reductionFactor - 2 + 'px';

      if (i % 2 == 0) {
        let span = document.createElement('span');
        span.innerText = alt >= 18000 ? 'FL' + alt / 1000 + '0' : alt;
        tick.append(span);
        alt = alt - 1000;
      }

      ruler.append(tick);
    }
  }
};

const updateRulerScale = () => {
  const ticks = document.querySelectorAll('tick');
  for (let tick of ticks) {
    tick.style.marginBottom = 1000 / 2 / reductionFactor - 2 + 'px';
  }
};

// --- Helper Functions ---

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const setFields = (fields) => {
  for (const [id, value] of Object.entries(fields)) {
    document.getElementById(id).value = value;
  }
};

const setReductionFactor = (factor = 10) => {
  reductionFactor = factor;
  updateEnv();
  updateRulerScale();
};

// --- Listeners ---

window.addEventListener('DOMContentLoaded', () => {
  for (const [id, value] of Object.entries(fieldDefaults)) {
    document.getElementById(id).addEventListener('change', () => {
      updateEnv();
    });
  }

  window.scrollTo({
    top: document.body.scrollHeight - document.body.offsetHeight - belowHeight,
  });

  let params = new URLSearchParams(location.search);
  debug = params.has('debug') ? params.get('debug') : false;

  createRuler();
  loadParams();
  updateEnv();
});
