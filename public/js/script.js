let store = window.localStorage;
// load parameters into localStorage
let params = new URLSearchParams(location.search);
params.forEach((value, param) => {
  store.setItem(param, value);
});

const standards = {
  pressure: {
    inHg: 29.92,
    hPa: 1013,
  },
  temp: {
    C: 15,
    F: 59,
  },
};

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
  elevation: {
    type: fieldTypes.altitude,
    ft: 790,
    m: 240.79,
  },
  pressure: {
    type: fieldTypes.pressure,
    inHg: standards.pressure.inHg,
    hPa: standards.pressure.hPa,
  },
  surfaceTemp: {
    type: fieldTypes.temp,
    C: 13.42,
    F: 56.16,
  },
  dewPoint: {
    type: fieldTypes.temp,
    C: 13.42,
    F: 56.16,
  },
  trueAlt: {
    type: fieldTypes.altitude,
    ft: 3500,
    m: 1066.8,
  },
  indicatedAlt: {
    type: fieldTypes.altitude,
    ft: 3500,
    m: 1066.8,
  },
  kollsman: {
    type: fieldTypes.pressure,
    inHg: standards.pressure.inHg,
    hPa: standards.pressure.hPa,
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
  flightLevelStart:
    store.getItem('flightLevelStart') !== null
      ? store.getItem('flightLevelStart')
      : 18,
  debug:
    store.getItem('debug') !== null ? Boolean(store.getItem('debug')) : false,
  debugLevel: 1,
  reductionFactor:
    store.getItem('reductionFactor') !== null
      ? store.getItem('reductionFactor')
      : 10,
};

let state = {
  lastChangedAlt:
    store.getItem('lastChangedAlt') !== null
      ? store.getItem('lastChangedAlt')
      : 'indicatedAlt',
  comingFromFlightLevels: false,
  lastKollsmanSetting: null,
};

const ISA = (alt) => 15 - (alt / 1000) * 2;
const ISADeviation = (alt, oat) => oat - ISA(alt);
const TEC = (absoluteAlt, alt, oat) =>
  4 * (absoluteAlt / 1000) * ISADeviation(alt, oat);
const pressureCorrection = (baro) => {
  switch (settings.pressureUnit) {
    case units.pressure.hPa:
      return (baro - standards.pressure.hPa) * 30;

    default:
      return (standards.pressure.inHg - baro) * 1000; // inHg
  }
};
const kollsmanCorrection = (kollsman, baro) => {
  switch (settings.pressureUnit) {
    case units.pressure.hPa:
      return (kollsman - baro) * 30;

    default:
      return (baro - kollsman) * 1000; // inHg
  }
};
const pressureAlt = (alt, presCorr) => alt + presCorr;
const densityAlt = (presAlt, oat, alt) => presAlt + 120 * (oat - ISA(alt));
const absoluteAlt = (trueAlt, fieldElev) => trueAlt - fieldElev;
const trueAlt = (indicatedAlt, tec) => indicatedAlt + tec;
const indicatedAlt = (alt, presCorr) => alt - presCorr;
const freezingLevel = (temp, dewPt, elevation) =>
  ((temp - dewPt) / 2.5) * 1000 + elevation;

// --- Environment ---

const runCalculations = (fields) => {
  let calcs = { ...fields };

  calcs.presCorr = pressureCorrection(fields.pressure);
  calcs.presAlt = pressureAlt(fields.elevation, calcs.presCorr);
  calcs.densAlt = densityAlt(
    calcs.presAlt,
    fields.surfaceTemp,
    fields.elevation
  );

  calcs.surfaceIsa = ISA(fields.elevation);
  calcs.surfaceIsaDev = ISADeviation(fields.elevation, fields.surfaceTemp);

  calcs.freezingLevel = freezingLevel(
    fields.surfaceTemp,
    fields.dewPoint,
    fields.elevation
  );

  const indicatedInput = document.getElementById('indicatedAlt');
  const trueInput = document.getElementById('trueAlt');
  if (state.lastChangedAlt === 'trueAlt') {
    // We are given True; we need to calculate Indicated
    indicatedInput.classList.add('calculated');
    trueInput.classList.remove('calculated');

    calcs.absoluteAlt = absoluteAlt(fields.trueAlt, fields.elevation);
    calcs.tec = TEC(calcs.absoluteAlt, fields.trueAlt, fields.oat);

    calcs.indicatedAlt = fields.trueAlt - calcs.tec;
    calcs.indicatedAlt = indicatedAlt(
      calcs.indicatedAlt,
      pressureCorrection(fields.kollsman)
    );
    document.getElementById('indicatedAlt').value = round2(calcs.indicatedAlt);
    updateState({ indicatedAlt: calcs.indicatedAlt });

    calcs.presAltFlight = fields.indicatedAlt - calcs.presCorr;

    calcs.isa = ISA(fields.trueAlt);
    calcs.isaDev = ISADeviation(fields.trueAlt, fields.oat);
  } else {
    // We are given Indicated; we need to calculate True
    trueInput.classList.add('calculated');
    indicatedInput.classList.remove('calculated');

    calcs.indicatedAlt = indicatedAlt(
      fields.indicatedAlt,
      pressureCorrection(fields.kollsman)
    );

    calcs.absoluteAlt = absoluteAlt(fields.indicatedAlt, fields.elevation);

    calcs.presAltFlight = fields.indicatedAlt - calcs.presCorr;
    calcs.tec = TEC(calcs.absoluteAlt, calcs.presAltFlight, fields.oat);

    calcs.trueAlt = trueAlt(fields.indicatedAlt, calcs.tec);
    document.getElementById('trueAlt').value = round2(calcs.trueAlt);
    updateState({ trueAlt: calcs.trueAlt });

    calcs.isa = ISA(fields.indicatedAlt);
    calcs.isaDev = ISADeviation(fields.indicatedAlt, fields.oat);
  }

  dbug(2, 'calcs', calcs);
  return calcs;
};

const getFieldValues = () => {
  let fields = {
    elevation: Number(document.getElementById('elevation').value),
    pressure: Number(document.getElementById('pressure').value),
    surfaceTemp: Number(document.getElementById('surfaceTemp').value),
    dewPoint: Number(document.getElementById('dewPoint').value),
    trueAlt: Number(document.getElementById('trueAlt').value),
    indicatedAlt: Number(document.getElementById('indicatedAlt').value),
    kollsman: Number(document.getElementById('kollsman').value),
    oat: Number(document.getElementById('oat').value),
  };

  dbug(2, 'fields', fields);
  updateState(fields);
  return fields;
};

const updateEnv = (values) => {
  dbug(1, 'updating environment');

  const aircraft = document.getElementById('aircraft');
  if (
    values.trueAlt >= values.elevation &&
    values.trueAlt < values.elevation + 180
  ) {
    aircraft.classList.add('near-ground');
  } else {
    aircraft.classList.remove('near-ground');
  }

  const infoList = {
    'Temp. Error': `${round2(values.tec)}${settings.altitudeUnit}`,
    'Pressure Correction': `${round2(values.presCorr)}${settings.altitudeUnit}`,
    'ISA in Flight': `${round2(values.isa)}&deg;${settings.tempUnit}`,
    'ISA Dev. in Flight': `ISA${
      values.isaDev >= 0 ? '+' + round2(values.isaDev) : round2(values.isaDev)
    }&deg;${settings.tempUnit}`,
    'Kolls. Adjusted Ind.': `${round2(values.indicatedAlt)}${
      settings.altitudeUnit
    }`,
    'Pressure Alt. in Flight': `${round2(values.presAltFlight)}${
      settings.altitudeUnit
    }`,
    'Absolute (AGL)': `${round2(values.absoluteAlt)}${settings.altitudeUnit}`,
    'Pressure Alt. at Surface': `${round2(values.presAlt)}${
      settings.altitudeUnit
    }`,
    'Density Alt. at Surface': `${round2(values.densAlt)}${
      settings.altitudeUnit
    }`,
    'ISA at Surface': `${round2(values.surfaceIsa)}&deg;${settings.tempUnit}`,
    'ISA Dev. at Surface': `ISA${
      values.surfaceIsaDev >= 0
        ? '+' + round2(values.surfaceIsaDev)
        : round2(values.surfaceIsaDev)
    }&deg;${settings.tempUnit}`,
    'Freezing Level': `${round2(values.freezingLevel)}${settings.altitudeUnit}`,
  };

  dbug(1, 'updating info panel');

  const info = document.getElementById('info');
  info.innerHTML = '';
  for (let [label, value] of Object.entries(infoList)) {
    const itemDiv = document.createElement('div');
    const labelDiv = document.createElement('div');
    labelDiv.innerHTML = label;
    const valueDiv = document.createElement('div');
    valueDiv.innerHTML = value;
    itemDiv.append(labelDiv);
    itemDiv.append(valueDiv);
    info.append(itemDiv);
  }

  dbug(1, 'updating ground level info');

  const ground = document.getElementById('groundInfo');
  ground.innerHTML = '';
  ground.innerHTML = [
    `Elev.&nbsp;${values.elevation}${settings.altitudeUnit}`,
    `Temp.&nbsp;${values.surfaceTemp}&deg;${settings.tempUnit}`,
    `Dew&nbsp;Pt.&nbsp;${values.dewPoint}&deg;${settings.tempUnit}`,
  ].join(' - ');

  const sea = document.getElementById('seaInfo');
  sea.innerHTML = '';
  sea.innerHTML = [`Pressure ${values.pressure}${settings.pressureUnit}`].join(
    ' - '
  );

  const properties = {
    '--elevation': values.elevation / settings.reductionFactor + 'px',
    '--planned': values.trueAlt / settings.reductionFactor + 'px',
    '--indicated': values.indicatedAlt / settings.reductionFactor + 'px',
    '--datum': values.presCorr / settings.reductionFactor + 'px',
    '--pressure': values.presAlt / settings.reductionFactor + 'px',
    '--density': values.densAlt / settings.reductionFactor + 'px',
    '--true': values.trueAlt / settings.reductionFactor + 'px',
    '--absolute': values.absoluteAlt / settings.reductionFactor + 'px',
    '--feels':
      (values.elevation - values.densAlt) / settings.reductionFactor + 'px',
    '--freezing': values.freezingLevel / settings.reductionFactor + 'px',
  };

  dbug(1, 'setting properties');

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

  updateEnv(runCalculations(getFieldValues()));
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
        getComputedStyle(document.documentElement).getPropertyValue(
          '--elevation'
        )
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

  let settingsFlightLevelStart = document.getElementById(
    'settingFlightLevelStart'
  );
  settingsFlightLevelStart.value = settings.flightLevelStart;

  let settingsDebug = document.getElementById('settingDebug');
  settingsDebug.checked = settings.debug;
};

const updateState = (fields) => {
  dbug(1, 'updating state');
  for (const [id, value] of Object.entries(fields)) {
    if (typeof fieldDefaults[id] == 'object') {
      let fieldDefault = fieldDefaults[id];
      if (value != fieldDefault[settings[`${fieldDefault.type}Unit`]]) {
        dbug(
          3,
          'storing',
          id,
          value,
          'did not match',
          fieldDefault[settings[`${fieldDefault.type}Unit`]]
        );
        store.setItem(id, value);
      } else if (store.getItem(id) !== null) {
        dbug(3, 'removing', id, value);
        store.removeItem(id);
      }
    } else if (value != fieldDefaults[id]) {
      dbug(3, 'storing', id, value, 'did not match', fieldDefaults[id]);
      store.setItem(id, value);
    } else if (store.getItem(id) !== null) {
      dbug(3, 'deleting param', id, value);
      store.removeItem(id);
    }
  }

  document.getElementById('settingLink').value = generateShareLink();
};

// --- Ruler ---

const generateRulers = () => {
  dbug(1, 'generating rulers');
  const rulers = document.getElementsByTagName('ruler');
  for (let ruler of rulers) {
    let tickCount = parseInt(ruler.getAttribute('ticks'));
    let alt = (tickCount.valueOf() / 2) * 1000;
    const ticks = document.createElement('ticks');
    for (let i = 0; i < tickCount + 1; i++) {
      let tick = document.createElement('tick');
      if (i == tickCount) {
        tick.style.marginBottom = '-2px';
      } else {
        tick.style.marginBottom =
          1000 / 2 / settings.reductionFactor - 2 + 'px';
      }

      if (i % 2 == 0) {
        let span = document.createElement('span');
        span.innerText =
          alt >= settings.flightLevelStart * 1000
            ? 'FL' + ('000' + alt / 1000).substr(-3)
            : alt;
        tick.append(span);
        alt = alt - 1000;
      }

      ticks.append(tick);
    }

    let negativeTickCount = parseInt(ruler.getAttribute('negative-ticks'));
    const negativeTicks = document.createElement('negativeTicks');
    for (let i = 0; i < negativeTickCount; i++) {
      let tick = document.createElement('tick');
      tick.style.marginTop = 1000 / 2 / settings.reductionFactor - 2 + 'px';

      if ((i + 1) % 2 == 0) {
        let span = document.createElement('span');
        span.innerText = alt;
        tick.append(span);
        alt = alt - 1000;
      }

      negativeTicks.append(tick);
    }

    ruler.append(ticks);
    ruler.append(negativeTicks);
  }
};

const updateRulerLabels = () => {
  dbug(1, 'updating ruler labels');
  const rulers = document.getElementsByTagName('ruler');
  for (let ruler of rulers) {
    let tickCount = parseInt(ruler.getAttribute('ticks'));
    let alt = (tickCount.valueOf() / 2) * 1000;
    const ticks = ruler.getElementsByTagName('tick');
    for (let [i, tick] of Object.entries(ticks)) {
      if (i % 2 == 0) {
        let span = tick.getElementsByTagName('span')[0];
        span.innerText =
          alt >= settings.flightLevelStart * 1000
            ? 'FL' + ('000' + alt / 1000).substr(-3)
            : alt;
        alt = alt - 1000;
      }
    }
  }
};

const updateRulerScale = () => {
  dbug(1, 'updating ruler scale');
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
  dbug(1, `${unit} unit set to`, newVal);

  const unitLabels = document.querySelectorAll(`.${unit}UnitLabel`);
  unitLabels.forEach((label) => (label.innerText = newVal));

  if (unit === 'pressure') {
    const standardPressureValue = document.getElementById(
      'standardPressureValue'
    );
    standardPressureValue.innerText = standards.pressure[newVal];
  }

  // set placeholders to default value according to unit

  if (newVal == units[unit].default) {
    dbug(3, `deleting param ${unit}Unit`, newVal);
    store.removeItem(`${unit}Unit`);
  } else {
    dbug(
      3,
      `storing ${unit}Unit`,
      newVal,
      'did not match',
      units[unit].default
    );
    store.setItem(`${unit}Unit`, newVal);
  }

  resetEnv();

  document.getElementById('settingLink').value = generateShareLink();
};

const setFlightLevelStart = (flightLevel) => {
  settings.flightLevelStart = flightLevel;
  dbug(1, `flight level start set to`, flightLevel);

  flightLevelDefault = 18;
  if (flightLevel == 18) {
    dbug(3, 'deleting param flightLevelStart', flightLevel);
    store.removeItem('flightLevelStart');
  } else {
    dbug(3, 'storing flightLevelStart', flightLevel, 'did not match');
    store.setItem('flightLevelStart', flightLevel);
  }

  updateRulerLabels();
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
  updateEnv(runCalculations(getFieldValues()));
  updateRulerScale();
};

const dbug = (level, ...args) => {
  if (settings.debug && settings.debugLevel >= level) {
    console.log(...args);
  }
};

// --- Listeners ---

window.addEventListener('DOMContentLoaded', () => {
  // update environment on field value change
  for (const [id, value] of Object.entries(fieldDefaults)) {
    document.getElementById(id).addEventListener('change', (event) => {
      let { id, value } = event.target;
      let fields = getFieldValues();

      let kollsman = document.getElementById('kollsman');
      if (id === 'trueAlt' || id === 'indicatedAlt') {
        state.lastChangedAlt = id;
        store.setItem('lastChangedAlt', id);

        // set kollsman window to standard when at or above flight levels
        if (value >= settings.flightLevelStart * 1000) {
          if (
            value == settings.flightLevelStart * 1000 &&
            !state.comingFromFlightLevels
          ) {
            state.lastKollsmanSetting = fields.kollsman;
          }
          kollsman.value = standards.pressure[settings.pressureUnit];
          state.comingFromFlightLevels = true;
        } else {
          if (state.comingFromFlightLevels) {
            kollsman.value = state.lastKollsmanSetting || fields.pressure;
            state.comingFromFlightLevels = false;
            state.lastKollsmanSetting = null;
          }
        }
      }

      // if (id === 'pressure') {
      //   kollsman.value = fields.pressure;
      // }

      updateEnv(runCalculations(getFieldValues()));
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

  const standardPressureValue = document.getElementById(
    'standardPressureValue'
  );
  standardPressureValue.innerText = standards.pressure[settings.pressureUnit];

  const tempUnitLocs = document.querySelectorAll('.tempUnitLabel');
  tempUnitLocs.forEach((loc) => {
    loc.innerText = settings.tempUnit;
  });

  initFields();
  initSettingsPanel();
  generateRulers();
  updateEnv(runCalculations(getFieldValues()));
});
