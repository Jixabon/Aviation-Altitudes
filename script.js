let store = window.localStorage;
// load parameters into localStorage
let params = new URLSearchParams(location.search);
params.forEach((value, param) => {
  store.setItem(param, value);
});

const units = {
  altitude: { default: 'ft', Feet: 'ft', Meters: 'm' },
  pressure: { default: 'inHg', inHg: 'inHg', hPa: 'hPa' },
  temp: { default: 'C', C: 'C', F: 'F' },
};

const fieldTypes = {
  altitude: 'altitude',
  pressure: 'pressure',
  temp: 'temp',
};

let fieldDefaults = {
  fieldElev: {
    type: fieldTypes.altitude,
    ft: 790,
    m: 240.79,
  },
  pressure: {
    type: fieldTypes.pressure,
    inHg: 29.92,
    hPa: 1013,
  },
  surfaceTemp: {
    type: fieldTypes.temp,
    C: 15,
    F: 59,
  },
  plannedAlt: {
    type: fieldTypes.altitude,
    ft: 3500,
    m: 1066.8,
  },
  kollsman: {
    type: fieldTypes.pressure,
    inHg: 29.92,
    hPa: 1013,
  },
  oat: {
    type: fieldTypes.temp,
    C: 8,
    F: 46.4,
  },
};

let settings = {
  altitudeUnit:
    store.getItem('altitudeUnit') !== null
      ? store.getItem('altitudeUnit')
      : units.altitude.default,
  pressureUnit:
    store.getItem('pressureUnit') !== null
      ? store.getItem('pressureUnit')
      : units.pressure.default,
  tempUnit:
    store.getItem('tempUnit') !== null
      ? store.getItem('tempUnit')
      : units.temp.default,
  debug:
    store.getItem('debug') !== null ? Boolean(store.getItem('debug')) : false,
  reductionFactor:
    store.getItem('reductionFactor') !== null
      ? store.getItem('reductionFactor')
      : 10,
};

const ISA = (alt) => (alt / 1000) * -2 + 15;
const ISADeviation = (alt, oat) => oat - ISA(alt);
const TEC = (absoluteAlt, oat) =>
  4 * (absoluteAlt / 1000) * ISADeviation(absoluteAlt, oat);
const pressureCorrection = (baro, unit) => {
  switch (unit) {
    case units.pressure.hPa:
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
    case units.pressure.hPa:
      return (kollsman - baro) * 30 + alt;

    default:
      return (kollsman - baro) * 1000 + alt; // inHg
  }
};

// --- Environment ---

const updateEnv = () => {
  dbug('updating environment');

  let fields = {
    fieldElev: Number(document.getElementById('fieldElev').value),
    pressure: Number(document.getElementById('pressure').value),
    surfaceTemp: Number(document.getElementById('surfaceTemp').value),
    plannedAlt: Number(document.getElementById('plannedAlt').value),
    kollsman: Number(document.getElementById('kollsman').value),
    oat: Number(document.getElementById('oat').value),
  };
  dbug('fields', fields);

  updateState(fields);

  let calcs = {
    absoluteAlt: absoluteAlt(fields.plannedAlt, fields.fieldElev),
    presCorr: pressureCorrection(fields.pressure, settings.pressureUnit),
    presAlt: pressureAlt(
      pressureCorrection(fields.pressure, settings.pressureUnit),
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
    settings.pressureUnit
  );
  calcs.trueAlt = trueAlt(
    fields.plannedAlt,
    absoluteAlt(fields.plannedAlt, fields.fieldElev),
    fields.oat
  );

  dbug('calcs', calcs);

  const infoList = [
    `True (MSL): ${round2(calcs.trueAlt)}${settings.altitudeUnit}`,
    `Absolute (AGL): ${calcs.absoluteAlt}${settings.altitudeUnit}`,
    `Surface ISA: ${round2(calcs.surfaceIsa)}&deg;${settings.tempUnit} (ISA${
      calcs.surfaceIsaDev >= 0
        ? '+' + round2(calcs.surfaceIsaDev)
        : round2(calcs.surfaceIsaDev)
    }&deg;${settings.tempUnit})`,
    `Indicated: ${round2(calcs.indicatedAlt)}${settings.altitudeUnit}`,
    `In Flight ISA: ${round2(calcs.isa)}&deg;${settings.tempUnit} (ISA${
      calcs.isaDev >= 0 ? '+' + round2(calcs.isaDev) : round2(calcs.isaDev)
    }&deg;${settings.tempUnit})`,
    `Pressure: ${round2(calcs.presAlt)}${settings.altitudeUnit} (Corr. ${round2(
      calcs.presCorr
    )}${settings.altitudeUnit})`,
    `Density: ${round2(calcs.densAlt)}${settings.altitudeUnit}`,
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
  ground.innerHTML = `Elev.&nbsp;${fields.fieldElev}${settings.altitudeUnit} - Temp.&nbsp;${fields.surfaceTemp}&deg;${settings.tempUnit} - Pressure&nbsp;${fields.pressure}${settings.pressureUnit}`;

  const properties = {
    '--ground': fields.fieldElev / settings.reductionFactor + 'px',
    '--planned': fields.plannedAlt / settings.reductionFactor + 'px',
    '--indicated': calcs.indicatedAlt / settings.reductionFactor + 'px',
    '--pressure': calcs.presAlt / settings.reductionFactor + 'px',
    '--density': calcs.densAlt / settings.reductionFactor + 'px',
    '--true': calcs.trueAlt / settings.reductionFactor + 'px',
    '--absolute': fields.plannedAlt / settings.reductionFactor + 'px',
  };
  dbug('properties', properties);

  const root = document.documentElement;
  for (const [property, value] of Object.entries(properties)) {
    root.style.setProperty(property, value);
  }
};

const resetEnv = () => {
  for (const [id, value] of Object.entries(fieldDefaults)) {
    store.removeItem(id);
    if (typeof value == 'object') {
      document.getElementById(id).value = value[settings[`${value.type}Unit`]];
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

// --- State handling ---

const initFields = () => {
  for (const [id, value] of Object.entries(fieldDefaults)) {
    if (typeof value == 'object') {
      document.getElementById(id).value =
        store.getItem(id) !== null
          ? store.getItem(id)
          : value[settings[`${value.type}Unit`]];
    } else {
      document.getElementById(id).value =
        store.getItem(id) !== null ? store.getItem(id) : value;
    }
  }
};

const initSettingsPanel = () => {
  let settingsPressureUnit = document.getElementById('settingPressureUnit');
  settingsPressureUnit.value = settings.pressureUnit;

  let settingsDebug = document.getElementById('settingDebug');
  settingsDebug.checked = settings.debug;
};

const updateState = (fields) => {
  for (const [id, value] of Object.entries(fields)) {
    if (typeof fieldDefaults[id] == 'object') {
      let fieldDefault = fieldDefaults[id];
      if (value != fieldDefault[settings[`${fieldDefault.type}Unit`]]) {
        dbug(
          'storing',
          id,
          value,
          'did not match',
          fieldDefault[settings[`${fieldDefault.type}Unit`]]
        );
        store.setItem(id, value);
      } else {
        dbug('removing', id, value);
        store.removeItem(id);
      }
    } else if (value != fieldDefaults[id]) {
      dbug('storing', id, value, 'did not match', fieldDefaults[id]);
      store.setItem(id, value);
    } else {
      dbug('deleting param', id, value);
      store.removeItem(id);
    }
  }

  document.getElementById('settingLink').value = generateShareLink();
};

// --- Ruler ---

const createRuler = () => {
  const rulers = document.getElementsByTagName('ruler');
  for (let ruler of rulers) {
    let ticks = parseInt(ruler.getAttribute('ticks'));
    let alt = (ticks.valueOf() / 2) * 1000;
    for (var i = 0; i < ticks; i++) {
      let tick = document.createElement('tick');
      tick.style.marginBottom = 1000 / 2 / settings.reductionFactor - 2 + 'px';

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
    tick.style.marginBottom = 1000 / 2 / settings.reductionFactor - 2 + 'px';
  }
};

// --- Helper Functions ---

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const toggleOut = (id, btn, outMsg, inMsg) => {
  const elem = document.getElementById(id);
  if (elem.classList.contains('out')) {
    elem.classList.remove('out');
    if (btn) {
      btn.innerHTML = inMsg;
    }
  } else {
    elem.classList.add('out');
    if (btn) {
      btn.innerHTML = outMsg;
    }
  }
};

const setUnit = (unit, value = null) => {
  let newVal = value ? value : units[unit].default;
  settings[`${unit}Unit`] = newVal;
  dbug(`${unit} unit set to`, newVal);

  let unitLabels = document.querySelectorAll(`.${unit}UnitLabel`);
  unitLabels.forEach((label) => (label.innerText = newVal));

  if (newVal == units[unit].default) {
    store.removeItem(`${unit}Unit`);
  } else {
    store.setItem(`${unit}Unit`, newVal);
  }

  resetEnv();

  document.getElementById('settingLink').value = generateShareLink();
};

const generateShareLink = () => {
  let params = new URLSearchParams(location.search);

  let items = Object.keys(store);
  items.forEach((item) => {
    params.set(item, store.getItem(item));
  });

  let { protocol, host, pathname } = window.location;
  let shareLink = '';
  if (params.toString() != '') {
    shareLink = `${protocol}//${host}${pathname}?${params.toString()}`;
  }

  return shareLink;
};

const setDebug = (value) => {
  settings.debug = Boolean(value);
  if (value == false) {
    store.removeItem('debug');
  } else {
    store.setItem('debug', Boolean(value));
  }

  document.getElementById('settingLink').value = generateShareLink();
};

const setReductionFactor = (factor = 10) => {
  settings.reductionFactor = factor;
  // const environment = document.getElementById('environment');
  // environment.style.height.value = (10 - factor) * 1000 + 7000;
  updateEnv();
  updateRulerScale();
};

const dbug = (...args) => {
  if (settings.debug) {
    console.log(...args);
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

  const altitudeUnitLocs = document.querySelectorAll('.altitudeUnitLabel');
  altitudeUnitLocs.forEach((loc) => {
    loc.innerText = settings.altitudeUnit;
  });

  const pressureUnitLocs = document.querySelectorAll('.pressureUnitLabel');
  pressureUnitLocs.forEach((loc) => {
    loc.innerText = settings.pressureUnit;
  });

  const tempUnitLocs = document.querySelectorAll('.tempUnitLabel');
  tempUnitLocs.forEach((loc) => {
    loc.innerText = settings.tempUnit;
  });

  initFields();
  initSettingsPanel();
  createRuler();
  updateEnv();
});
