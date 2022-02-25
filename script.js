const settingsFields = ['settingPressureUnit'];

const fieldTypes = {
  altitude: 'altitude',
  pressure: 'pressure',
  temp: 'temp',
};

const altitudeFields = ['fieldElev', 'plannedAlt'];
const altitudeUnits = { Feet: 'ft', Meters: 'm' };

const pressureFields = ['pressure', 'kollsman'];
const pressureUnits = { inHg: 'inHg', hPa: 'hPa' };

const tempFields = ['surfaceTemp', 'oat'];
const tempUnits = { C: 'C', F: 'F' };

let params = new URLSearchParams(location.search);

let reductionFactor = 10;
let debug = params.has('debug') ? params.get('debug') : false;

let altitudeUnit = altitudeUnits.Feet;
let pressureUnit = params.has('pressureUnit')
  ? params.get('pressureUnit')
  : pressureUnits.inHg;
let tempUnit = tempUnits.C;

let fieldDefaults = {
  fieldElev: {
    type: fieldTypes.altitude,
    ft: 790,
  },
  pressure: {
    type: fieldTypes.pressure,
    inHg: 29.92,
    hPa: 1013,
  },
  surfaceTemp: {
    type: fieldTypes.temp,
    C: 15,
  },
  plannedAlt: {
    type: fieldTypes.altitude,
    ft: 3500,
  },
  kollsman: {
    type: fieldTypes.pressure,
    inHg: 29.92,
    hPa: 1013,
  },
  oat: {
    type: fieldTypes.temp,
    C: 8,
  },
};

const ISA = (alt) => (alt / 1000) * -2 + 15;
const ISADeviation = (alt, oat) => oat - ISA(alt);
const TEC = (absoluteAlt, oat) =>
  4 * (absoluteAlt / 1000) * ISADeviation(absoluteAlt, oat);
const pressureCorrection = (baro, unit) => {
  switch (unit) {
    case pressureUnits.hPa:
      return (1013 - baro) * 30;

    default:
      return (29.92 - baro) * 1000; // inHg
  }
};
const pressureAlt = (presCorr, fieldElv) => presCorr + fieldElv;
const densityAlt = (presAlt, oat) => presAlt + 120 * (oat - 15);
const absoluteAlt = (trueAlt, fieldElev) => trueAlt - fieldElev;
const trueAlt = (indicatedAlt, absoluteAlt, oat) =>
  indicatedAlt + TEC(absoluteAlt, oat);
const indicatedAlt = (kollsman, baro, alt, unit) => {
  switch (unit) {
    case pressureUnits.hPa:
      return (kollsman - baro) * 30 + alt;

    default:
      return (kollsman - baro) * 1000 + alt; // inHg
  }
};

const toggleOut = (id) => {
  const elem = document.getElementById(id);
  if (elem.classList.contains('out')) {
    elem.classList.remove('out');
  } else {
    elem.classList.add('out');
  }
};

const setPressureUnit = (unit) => {
  pressureUnit = unit;
  dbug('pressure unit set to', pressureUnit);

  let pressureUnitLocs = document.querySelectorAll(
    '#pressureUnitBtn, .pressureUnitLabel'
  );
  pressureUnitLocs.forEach((unit) => (unit.innerText = pressureUnit));

  if (pressureUnit == pressureUnits.inHg) {
    deleteParam('pressureUnit');
  } else {
    addParam('pressureUnit', pressureUnit);
  }

  resetEnv();
};

// --- Environment ---

const updateEnv = () => {
  dbug('updating environment');
  dbug('fieldDefaults', fieldDefaults);

  let fields = {
    fieldElev: Number(document.getElementById('fieldElev').value),
    pressure: Number(document.getElementById('pressure').value),
    surfaceTemp: Number(document.getElementById('surfaceTemp').value),
    plannedAlt: Number(document.getElementById('plannedAlt').value),
    kollsman: Number(document.getElementById('kollsman').value),
    oat: Number(document.getElementById('oat').value),
  };
  dbug('fields', fields);

  updateFieldParams(fields);

  let calcs = {
    absoluteAlt: absoluteAlt(fields.plannedAlt, fields.fieldElev),
    presCorr: pressureCorrection(fields.pressure, pressureUnit),
    presAlt: pressureAlt(
      pressureCorrection(fields.pressure, pressureUnit),
      fields.fieldElev
    ),
    isa: ISA(fields.plannedAlt),
    surfaceIsa: ISA(fields.fieldElev),
  };
  calcs.isaDev = ISADeviation(fields.plannedAlt, fields.oat);
  calcs.surfaceIsaDev = ISADeviation(fields.fieldElev, fields.surfaceTemp);
  calcs.densAlt = densityAlt(calcs.presAlt, fields.surfaceTemp);
  calcs.indicatedAlt = indicatedAlt(
    fields.kollsman,
    fields.pressure,
    fields.plannedAlt,
    pressureUnit
  );
  calcs.trueAlt = trueAlt(
    fields.plannedAlt,
    absoluteAlt(fields.plannedAlt, fields.fieldElev),
    fields.oat
  );

  dbug('calcs', calcs);

  const infoList = [
    `True (MSL): ${round2(calcs.trueAlt)}ft.`,
    `Absolute (AGL): ${calcs.absoluteAlt}ft.`,
    `Surface ISA: ${round2(calcs.surfaceIsa)}&deg;C (ISA${
      calcs.surfaceIsaDev >= 0
        ? '+' + round2(calcs.surfaceIsaDev)
        : round2(calcs.surfaceIsaDev)
    }&deg;C)`,
    `Indicated: ${round2(calcs.indicatedAlt)}ft.`,
    `In Flight ISA: ${round2(calcs.isa)}&deg;C (ISA${
      calcs.isaDev >= 0 ? '+' + round2(calcs.isaDev) : round2(calcs.isaDev)
    }&deg;C)`,
    `Pressure: ${round2(calcs.presAlt)}ft. (Corr. ${round2(
      calcs.presCorr
    )}ft.)`,
    `Density: ${round2(calcs.densAlt)}ft.`,
  ];
  dbug('infoList', infoList);

  const info = document.getElementById('info');
  info.innerHTML = '';
  infoList.forEach((infoItem) => {
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = infoItem;
    info.append(infoDiv);
  });

  const ground = document.getElementById('groundInfo');
  ground.innerHTML = '';
  ground.innerHTML = `Elev.&nbsp;${fields.fieldElev}ft - Temp.&nbsp;${fields.surfaceTemp}&deg;C - Pressure&nbsp;${fields.pressure}${pressureUnit}`;

  const properties = {
    '--ground': fields.fieldElev / reductionFactor + 'px',
    '--planned': fields.plannedAlt / reductionFactor + 'px',
    '--indicated': calcs.indicatedAlt / reductionFactor + 'px',
    '--pressure': calcs.presAlt / reductionFactor + 'px',
    '--density': calcs.densAlt / reductionFactor + 'px',
    '--true': calcs.trueAlt / reductionFactor + 'px',
    '--absolute': fields.plannedAlt / reductionFactor + 'px',
  };
  dbug('properties', properties);

  const root = document.documentElement;
  for (const [property, value] of Object.entries(properties)) {
    root.style.setProperty(property, value);
  }
};

const resetEnv = () => {
  for (const [id, value] of Object.entries(fieldDefaults)) {
    if (typeof value == 'object') {
      document.getElementById(id).value = value[eval(value.type + 'Unit')];
    } else {
      document.getElementById(id).value = value;
    }
  }

  updateEnv();
  scrollToSea();
};

// --- Scrolling ---

const belowHeight = 1000;
const getScrollLocation = (height = 0) => {
  let seaHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--sea-height')
  );
  let scrollHeight = document.body.scrollHeight - belowHeight;
  let screenHeight = document.body.offsetHeight * 0.55;

  // just go to the bottom if the item is below the focus point
  if (height + seaHeight < document.body.offsetHeight * 0.45) {
    return (
      document.body.scrollHeight - document.body.offsetHeight - belowHeight
    );
  }

  return scrollHeight - (height + seaHeight + screenHeight);
};

const scrollToPlane = () => {
  window.scrollTo({
    top: getScrollLocation(
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--planned')
      )
    ),
    behavior: 'smooth',
  });
};

const scrollToGround = () => {
  window.scrollTo({
    top: getScrollLocation(
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--ground')
      )
    ),
    behavior: 'smooth',
  });
};

const scrollToSea = () => {
  window.scrollTo({
    top: getScrollLocation(),
    behavior: 'smooth',
  });
};

// --- GET Param handling ---

const loadFieldParams = () => {
  let params = new URLSearchParams(location.search);
  for (const [id, value] of Object.entries(fieldDefaults)) {
    if (typeof value == 'object') {
      document.getElementById(id).value = params.has(id)
        ? params.get(id)
        : value[eval(value.type + 'Unit')];
    } else {
      document.getElementById(id).value = params.has(id)
        ? params.get(id)
        : value;
    }
  }
};

const updateFieldParams = (fields) => {
  let params = new URLSearchParams(location.search);
  for (const [id, value] of Object.entries(fields)) {
    if (typeof fieldDefaults[id] == 'object') {
      let fieldDefault = fieldDefaults[id];
      if (value != fieldDefault[eval(fieldDefault.type + 'Unit')]) {
        dbug(
          'setting param',
          id,
          value,
          'did not match',
          fieldDefault[eval(fieldDefault.type + 'Unit')]
        );
        params.set(id, value);
      } else {
        dbug('deleting param', id, value);
        params.delete(id);
      }
    } else if (value != fieldDefaults[id]) {
      dbug('setting param', id, value, 'did not match', fieldDefaults[id]);
      params.set(id, value);
    } else {
      dbug('deleting param', id, value);
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

  dbug('pushing state', newurl);
  window.history.pushState({ path: newurl }, '', newurl);
};

const addParam = (id, value) => {
  let params = new URLSearchParams(location.search);
  dbug('setting param', id, value);
  params.set(id, value);
  let { protocol, host, pathname } = window.location;
  let newurl = '';
  if (params.toString() != '') {
    newurl = `${protocol}//${host}${pathname}?${params.toString()}`;
  } else {
    newurl = `${protocol}//${host}${pathname}`;
  }

  dbug('pushing state', newurl);
  window.history.pushState({ path: newurl }, '', newurl);
};

const deleteParam = (id) => {
  let params = new URLSearchParams(location.search);
  dbug('deleting param', id);
  params.delete(id);
  let { protocol, host, pathname } = window.location;
  let newurl = '';
  if (params.toString() != '') {
    newurl = `${protocol}//${host}${pathname}?${params.toString()}`;
  } else {
    newurl = `${protocol}//${host}${pathname}`;
  }

  dbug('pushing state', newurl);
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

const setReductionFactor = (factor = 10) => {
  reductionFactor = factor;
  // @TODO we need to reduce the environment height when the reduction factor is changed
  // const environment = document.getElementById('environment');
  // environment.style.height.value = (10 - factor) * 1000 + 7000;
  updateEnv();
  updateRulerScale();
};

function toggleDebug() {
  if (debug) {
    debug = false;
    deleteParam('debug');
  } else {
    debug = true;
    addParam('debug', debug);
  }
}

const dbug = (...params) => {
  if (debug) {
    console.log(...params);
  }
};

// --- Listeners ---

window.addEventListener('DOMContentLoaded', () => {
  // update environment on field value change
  for (const [id, value] of Object.entries(fieldDefaults)) {
    document.getElementById(id).addEventListener('change', () => {
      updateEnv();
    });
  }

  window.scrollTo({
    top: document.body.scrollHeight - document.body.offsetHeight - belowHeight,
  });

  const pressureUnitLocs = document.querySelectorAll(
    '#pressureUnitBtn, .pressureUnitLabel'
  );
  pressureUnitLocs.forEach((loc) => {
    loc.innerText = pressureUnit;
  });

  createRuler();
  loadFieldParams();
  updateEnv();
});
