let reductionFactor = 10;
let debug = false;

const ISA = (alt) => (alt / 1000) * -2 + 15;
const pressureAlt = (baro, fieldElv) => (29.92 - baro) * 1000 + fieldElv;
const densityAlt = (presAlt, oat) => presAlt + 120 * (oat - 15);

let fieldDefaults = {
  fieldElev: 790,
  fieldPres: 29.92,
  fieldTemp: 15,
  indicated: 3500,
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
    fieldElev: parseInt(document.getElementById('fieldElev').value),
    fieldPres: parseFloat(document.getElementById('fieldPres').value),
    fieldTemp: parseFloat(document.getElementById('fieldTemp').value),
    indicated: parseInt(document.getElementById('indicated').value),
    kollsman: parseFloat(document.getElementById('kollsman').value),
    oat: parseFloat(document.getElementById('oat').value),
  };
  if (debug) {
    console.log('fields', fields);
  }

  updateParams(fields);

  let calcs = {
    presAlt: Math.round(pressureAlt(fields.fieldPres, fields.fieldElev)),
    isa: ISA(fields.indicated),
    fieldIsa: ISA(fields.fieldElev),
    absoAlt: fields.indicated - fields.fieldElev,
  };
  calcs.fieldIsaDiff = fields.fieldTemp - calcs.fieldIsa;
  calcs.densAlt = Math.round(
    densityAlt(calcs.presAlt, fields.fieldTemp, fields.fieldElev)
  );
  calcs.isaDiff = fields.oat - calcs.isa;
  calcs.trueAlt =
    4 * (fields.indicated / 1000) * calcs.isaDiff + fields.indicated;

  if (debug) {
    console.log('calcs', calcs);
  }

  const info = {
    infoFieldISA: calcs.fieldIsa,
    infoFieldISADiff:
      calcs.fieldIsaDiff >= 0 ? '+' + calcs.fieldIsaDiff : calcs.fieldIsaDiff,
    infoPresAlt: calcs.presAlt,
    infoDensAlt: calcs.densAlt,
    infoISATemp: calcs.isa,
    infoISADiff: calcs.isaDiff >= 0 ? '+' + calcs.isaDiff : calcs.isaDiff,
    infoTrueAlt: calcs.trueAlt,
    infoAbsoAlt: calcs.absoAlt,
  };
  if (debug) {
    console.log('info', info);
  }

  for (const [id, value] of Object.entries(info)) {
    document.getElementById(id).innerText = value;
  }

  const properties = {
    '--ground': fields.fieldElev / reductionFactor + 'px',
    '--indicated': fields.indicated / reductionFactor + 'px',
    '--pressure': calcs.presAlt / reductionFactor + 'px',
    '--density': calcs.densAlt / reductionFactor + 'px',
    '--true': calcs.trueAlt / reductionFactor + 'px',
    '--absolute': fields.indicated / reductionFactor + 'px',
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

const getScrollLocation = (height) => {
  let seaHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--seaHeight')
  );
  let scrollHeight = document.body.scrollHeight - 1000;
  let screenHeight = document.body.offsetHeight * 0.55;
  return scrollHeight - (height + seaHeight + screenHeight);
};

const scrollToPlane = () => {
  let indicated = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--indicated')
  );

  window.scrollTo({
    top: getScrollLocation(indicated),
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
    top: document.body.scrollHeight - document.body.offsetHeight - 1000,
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

const setFields = (fields) => {
  for (const [id, value] of Object.entries(fields)) {
    document.getElementById(id).value = value;
  }
};

const setReductionFactor = (factor) => {
  reductionFactor = factor;
  updateEnv();
  updateRulerScale();
};

// --- Listeners ---

window.addEventListener('DOMContentLoaded', () => {
  window.scrollTo({
    top: document.body.scrollHeight - document.body.offsetHeight - 1000,
  });

  createRuler();
  loadParams();
  updateEnv();
});
