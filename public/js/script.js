let store = window.localStorage;
// load parameters into localStorage
let params = new URLSearchParams(location.search);
params.forEach((value, param) => {
  if (param === 'airport') {
    var oldAirport = store.getItem('airport');
    var isDifferent = value !== (oldAirport !== null ? oldAirport : '');
    if (isDifferent) {
      store.removeItem('mostRecentMetar');
      store.removeItem('mostRecentMetarTime');
      store.removeItem('mostRecentMetarInserted');
    }
  }

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

const metarFields = ['elevation', 'pressure', 'surfaceTemp', 'dewPoint'];

const shareLinkExclude = [
  'sw-version',
  'debug',
  'debugLevel',
  'reductionFactor',
  'mostRecentMetar',
  'mostRecentMetarTime',
  'mostRecentMetarInserted',
];

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
  airport: store.getItem('airport') !== null ? store.getItem('airport') : '',
  debug:
    store.getItem('debug') !== null ? store.getItem('debug') === 'true' : false,
  debugLevel:
    store.getItem('debugLevel') !== null ? store.getItem('debugLevel') : 1,
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

  store.setItem('mostRecentMetarInserted', false);
  updateSyncAirportButton();
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
    const field = document.getElementById(id);

    if (typeof value == 'object') {
      const { type } = value;
      const currentUnit = settings[`${type}Unit`];

      if (standards[type]) {
        field.placeholder = standards[type][currentUnit];
      }

      field.value =
        store.getItem(id) !== null ? store.getItem(id) : value[currentUnit];
    } else {
      field.value = store.getItem(id) !== null ? store.getItem(id) : value;
    }
  }
};

const initLabels = () => {
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
};

const initSettingsPanel = () => {
  let settingsPressureUnit = document.getElementById('settingPressureUnit');
  settingsPressureUnit.value = settings.pressureUnit;

  let settingsFlightLevelStart = document.getElementById(
    'settingFlightLevelStart'
  );
  settingsFlightLevelStart.value = settings.flightLevelStart;

  let settingsAirport = document.getElementById('settingAirport');
  settingsAirport.value = settings.airport;

  let settingsDebug = document.getElementById('settingDebug');
  settingsDebug.checked = settings.debug;

  let settingsDebugLevel = document.getElementById('settingDebugLevel');
  settingsDebugLevel.value = settings.debugLevel;

  let settingsReductionFactor = document.getElementById(
    'settingReductionFactor'
  );
  settingsReductionFactor.value = settings.reductionFactor;

  const debugFields = document.querySelectorAll('[debug]');
  if (!settings.debug) {
    debugFields.forEach((field) => field.classList.add('hidden'));
  } else {
    debugFields.forEach((field) => field.classList.remove('hidden'));
  }
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

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

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

const closeWhatsNew = () => {
  toggleOut('whatsNewWrapper');
  store.removeItem('whatsNew');
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

  Object.entries(fieldDefaults)
    .filter(([id, { type }]) => type === unit)
    .forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input && standards[unit]) {
        input.placeholder = standards[unit][newVal];
      }
    });

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

const setAirport = (value) => {
  settings.airport = value;
  var oldAirport = store.getItem('airport');
  var isDifferent =
    value !== '' && value !== (oldAirport !== null ? oldAirport : '');
  if (value == '') {
    store.removeItem('airport');
  } else {
    store.setItem('airport', value);
  }

  updateSyncAirportButton(isDifferent);

  document.getElementById('settingLink').value = generateShareLink();
};

const faClasses = [
  'fa-spin',
  'fa-arrows-rotate',
  'fa-triangle-exclamation',
  'fa-check',
  'fa-stopwatch',
  'fa-wifi',
  'fa-arrow-up-from-bracket',
];
const syncAirportButtonStates = {
  default: (button, icon) => {
    button.disabled = false;
    let reset = faClasses;
    delete reset['fa-arrows-rotate'];
    icon.classList.remove(...reset);
    icon.classList.add('fa-arrows-rotate');
  },
  loading: (button, icon) => {
    button.disabled = 'disabled';
    let reset = faClasses;
    delete reset['fa-spin'];
    delete reset['fa-arrows-rotate'];
    icon.classList.remove(...reset);
    icon.classList.add('fa-spin', 'fa-arrows-rotate');
  },
  error: (button, icon) => {
    button.disabled = 'disabled';
    let reset = faClasses;
    delete reset['fa-triangle-exclamation'];
    icon.classList.remove(...reset);
    icon.classList.add('fa-triangle-exclamation');
  },
  success: (button, icon) => {
    button.disabled = 'disabled';
    let reset = faClasses;
    delete reset['fa-check'];
    icon.classList.remove(...reset);
    icon.classList.add('fa-check');
  },
  throttled: (button, icon) => {
    button.disabled = 'disabled';
    let reset = faClasses;
    delete reset['fa-stopwatch'];
    icon.classList.remove(...reset);
    icon.classList.add('fa-stopwatch');
  },
  insert: (button, icon) => {
    button.disabled = false;
    let reset = faClasses;
    delete reset['fa-arrow-up-from-bracket'];
    icon.classList.remove(...reset);
    icon.classList.add('fa-arrow-up-from-bracket');
    button.onclick = insertRecentMetar;
  },
  offline: (button, icon) => {
    button.disabled = 'disabled';
    let reset = faClasses;
    delete reset['fa-wifi'];
    icon.classList.remove(...reset);
    icon.classList.add('fa-wifi');
  },
};

const setFlightCategory = (button, category) => {
  button.classList.remove('vfr', 'mvfr', 'ifr', 'lifr');
  switch (category) {
    case 'VFR':
      dbug(1, 'setting flight category to VFR');
      button.classList.add('vfr');
      break;

    case 'MVFR':
      dbug(1, 'setting flight category to MVFR');
      button.classList.add('mvfr');
      break;

    case 'IFR':
      dbug(1, 'setting flight category to IFR');
      button.classList.add('ifr');
      break;

    case 'LIFR':
      dbug(1, 'setting flight category to LIFR');
      button.classList.add('lifr');
      break;

    default:
      dbug(1, 'unknown flight category');
  }
};

const updateSyncAirportButton = (forceUpdate) => {
  dbug(1, `updating sync button${forceUpdate ? ': forced' : ''}`);
  var existingButton = document.getElementById('syncAirportButton');

  if (settings.airport != '' || forceUpdate) {
    dbug(1, 'airport is set');
    if (!existingButton || forceUpdate) {
      if (forceUpdate) {
        existingButton?.remove();
        store.removeItem('mostRecentMetar');
        store.removeItem('mostRecentMetarTime');
        store.removeItem('mostRecentMetarInserted');

        metarFields.forEach((id) =>
          document.getElementById(id).classList.remove('calculated')
        );
      }
      dbug(2, 'adding sync button');
      const viewButtons = document.getElementById('resetRow');
      existingButton = document.createElement('button');
      existingButton.id = 'syncAirportButton';
      existingButton.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i>${settings.airport}`;
      existingButton.onclick = syncAirport;
      viewButtons.prepend(existingButton);
    }

    const icon = existingButton.querySelector('i');

    var isMetarInserted = store.getItem('mostRecentMetarInserted');
    if (isMetarInserted === 'false' && isMetarInserted !== null) {
      dbug(1, 'metar is not inserted');

      syncAirportButtonStates.insert(existingButton, icon);
    } else if (isThrottled()) {
      dbug(1, 'metar is throttled');

      syncAirportButtonStates.throttled(existingButton, icon);

      var milliseconds = getMillisecondsToNextMetar();
      if (milliseconds) {
        dbug(
          1,
          `sync button will be set to default in ${milliseconds / 1000} seconds`
        );
        timeoutToDefault = setTimeout(() => {
          syncAirportButtonStates.default(existingButton, icon);
          clearTimeout(timeoutToDefault);
        }, milliseconds);
      }
    }

    var metarJson = store.getItem('mostRecentMetar');
    if (metarJson !== null) {
      var metar = JSON.parse(metarJson);
      setFlightCategory(existingButton, metar?.flight_category);
      setWindIndicator(metar);
    }
  } else {
    existingButton?.remove();
    document.querySelector('wind')?.classList.add('hidden');
    store.removeItem('mostRecentMetar');
    store.removeItem('mostRecentMetarTime');
    store.removeItem('mostRecentMetarInserted');
  }
};

const getEstNextMetarTime = () => {
  const mostRecentMetarTime = store.getItem('mostRecentMetarTime');
  if (mostRecentMetarTime) {
    var metarTime = new Date(mostRecentMetarTime);

    let newHours =
      metarTime.getHours() + Math.ceil((metarTime.getMinutes() + 15) / 60);
    if (newHours > 24) {
      metarTime.setDate(metarTime.getDay() + 1);
    }

    metarTime.setHours(newHours);
    metarTime.setMinutes(0, 0, 0);

    return metarTime;
  }

  return null;
};

const getMillisecondsToNextMetar = () => {
  var nextMetarTime = getEstNextMetarTime();
  var milliseconds = new Date(nextMetarTime) - new Date();
  // if more than 1 second out then return false
  return milliseconds > 5000 ? milliseconds : false;
};

const isThrottled = () => {
  var nextMetarTime = getEstNextMetarTime();
  return nextMetarTime ? new Date() < nextMetarTime : false;
};

const insertMetar = (metar) => {
  const elevation = document.getElementById('elevation');
  elevation.value = round2(metar?.elevation_m * 3.281);
  elevation.classList.add('calculated');

  const pressureMap = {
    inHg: metar.altim_in_hg,
    hPa: metar.sea_level_pressure_mb,
  };
  const pressure = document.getElementById('pressure');
  pressure.value = round2(pressureMap[settings.pressureUnit]);
  pressure.classList.add('calculated');

  const surfaceTemp = document.getElementById('surfaceTemp');
  surfaceTemp.value = round2(metar.temp_c);
  surfaceTemp.classList.add('calculated');

  const dewPoint = document.getElementById('dewPoint');
  dewPoint.value = round2(metar.dewpoint_c);
  dewPoint.classList.add('calculated');

  // document.getElementById('kollsman').value = '';

  store.setItem('mostRecentMetarInserted', true);
};

const setWindIndicator = (metar) => {
  const wind = document.querySelector('wind');
  wind.classList.remove('hidden');

  const arrow = wind.querySelector('arrow');
  const direction = wind.querySelector('direction');
  const velocity = wind.querySelector('velocity');

  arrow.style.transform = metar?.wind_dir_degrees
    ? `rotate(${metar.wind_dir_degrees}deg)`
    : '';
  direction.innerHTML =
    metar.wind_dir_degrees == 0 ? 'Wind' : `${metar?.wind_dir_degrees}&deg;`;
  velocity.innerText =
    metar.wind_speed_kt == 0
      ? 'Calm'
      : `${[metar?.wind_speed_kt, metar?.wind_gust_kt]
          .filter((speed) => !!speed === true)
          .join('-')}kts`;
};

const insertRecentMetar = () => {
  var metarJson = store.getItem('mostRecentMetar');
  var metar = JSON.parse(metarJson);

  insertMetar(metar);

  updateSyncAirportButton();
  updateEnv(runCalculations(getFieldValues()));
};

var timeoutToDefault = null;
var timeoutToThrottled = null;
const syncAirport = async () => {
  dbug(1, 'syncing airport data');
  const { protocol, host } = window.location;

  const syncButton = document.getElementById('syncAirportButton');
  const syncIcon = syncButton.querySelector('i');

  syncAirportButtonStates.loading(syncButton, syncIcon);

  if (window.navigator.onLine) {
    dbug(1, 'online: fetching metar');
    fetch(`${protocol}//${host}/.netlify/functions/metar/${settings.airport}`)
      .then((response) => {
        if (response.ok) {
          return [
            {
              raw_text:
                'KGTU 041756Z 16013G19KT 10SM OVC017 22/16 A3013 RMK AO2 SLP199 T02170161 10217 20161 58016',
              station_id: 'KGTU',
              observation_time: '2022-03-04T17:56:00Z',
              latitude: '30.68',
              longitude: '-97.68',
              temp_c: '21.7',
              dewpoint_c: '16.1',
              wind_dir_degrees: '160',
              wind_speed_kt: '13',
              wind_gust_kt: '19',
              visibility_statute_mi: '10.0',
              altim_in_hg: '30.129921',
              sea_level_pressure_mb: '1019.9',
              quality_control_flags: { auto_station: 'TRUE' },
              sky_condition: { sky_cover: 'OVC', cloud_base_ft_agl: '1700' },
              flight_category: 'MVFR',
              three_hr_pressure_tendency_mb: '-1.6',
              maxT_c: '21.7',
              minT_c: '16.1',
              metar_type: 'SPECI',
              elevation_m: '232.0',
            },
          ]; // response.json();
        } else {
          syncAirportButtonStates.error(syncButton, syncIcon);

          dbug(1, 'sync button will be set to default in 3 seconds');
          timeoutToDefault = setTimeout(() => {
            syncAirportButtonStates.default(syncButton, syncIcon);
            clearTimeout(timeoutToDefault);
          }, 1000 * 3);

          return [];
        }
      })
      .then((json) => {
        var metar = json[0];

        if (metar) {
          dbug(2, metar);
          store.setItem('mostRecentMetarTime', metar.observation_time);
          store.setItem('mostRecentMetar', JSON.stringify(metar));
          syncAirportButtonStates.success(syncButton, syncIcon);

          dbug(1, `sync button will be set to throttled in 3 seconds`);
          timeoutToThrottled = setTimeout(() => {
            syncAirportButtonStates.throttled(syncButton, syncIcon);
            clearTimeout(timeoutToThrottled);

            var milliseconds = getMillisecondsToNextMetar();
            if (milliseconds) {
              dbug(
                1,
                `sync button will be set to default in ${
                  milliseconds / 1000
                } seconds`
              );
              timeoutToDefault = setTimeout(() => {
                syncAirportButtonStates.default(syncButton, syncIcon);
                clearTimeout(timeoutToDefault);
              }, milliseconds);
            }
          }, 1000 * 3);

          setFlightCategory(syncButton, metar?.flight_category);
          insertMetar(metar);
          setWindIndicator(metar);

          updateEnv(runCalculations(getFieldValues()));
        } else {
          syncAirportButtonStates.error(syncButton, syncIcon);

          dbug(1, `sync button will be set to default in 3 seconds`);
          timeoutToDefault = setTimeout(() => {
            syncAirportButtonStates.default(syncButton, syncIcon);
            clearTimeout(timeoutToDefault);
          }, 1000 * 3);
        }
      })
      .catch((e) => {
        console.log(e.message);
        syncAirportButtonStates.error(syncButton, syncIcon);

        dbug(1, `sync button will be set to default in 3 seconds`);
        timeoutToDefault = setTimeout(() => {
          syncAirportButtonStates.default(syncButton, syncIcon);
          clearTimeout(timeoutToDefault);
        }, 1000 * 3);
      });
  } else {
    dbug(1, 'offline: waiting a while to try again');

    syncAirportButtonStates.offline(syncButton, syncIcon);

    dbug(1, `sync button will be set to default in 30 seconds`);
    timeoutToDefault = setTimeout(() => {
      syncAirportButtonStates.default(syncButton, syncIcon);
      clearTimeout(timeoutToDefault);
    }, 1000 * 30);
  }
};

const generateShareLink = () => {
  let params = new URLSearchParams(location.search);

  let items = Object.keys(store);
  items.forEach((item) => {
    if (!shareLinkExclude.includes(item)) {
      params.set(item, store.getItem(item));
    }
  });

  let { protocol, host, pathname } = window.location;
  let shareLink = '';
  if (params.toString() != '') {
    shareLink = `${protocol}//${host}${pathname}?${params.toString()}`;
  }

  return shareLink;
};

var copySuccessTimeout = null;
const copyShareLink = (copyBtn) => {
  const shareLink = document.getElementById('settingLink');
  navigator.clipboard.writeText(shareLink.value);
  copyBtn.classList.add('success');
  copySuccessTimeout = setTimeout(() => {
    copyBtn.classList.remove('success');
    clearTimeout(copySuccessTimeout);
  }, 1000 * 2);
};

const clearField = (btn, event) => {
  var field = btn.parentElement.querySelector('input');
  field.value = '';
  if (event) {
    field.dispatchEvent(event);
  }
};

const setDebug = (value) => {
  dbug(2, `setting debug to ${value}`);
  settings.debug = value;
  const debugFields = document.querySelectorAll('[debug]');
  if (value == false) {
    store.removeItem('debug');
    debugFields.forEach((field) => field.classList.add('hidden'));
  } else {
    store.setItem('debug', value);
    debugFields.forEach((field) => field.classList.remove('hidden'));
  }
};

const setDebugLevel = (level) => {
  settings.debugLevel = level;
  if (level == 1) {
    store.removeItem('debugLevel');
  } else {
    store.setItem('debugLevel', level);
  }
};

const setReductionFactor = (factor = 10) => {
  settings.reductionFactor = factor;
  if (factor == 10) {
    store.removeItem('reductionFactor');
  } else {
    store.setItem('reductionFactor', factor);
  }

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
  // load versions
  document.getElementById('sw-version').innerText = `SW: v${
    store.getItem('sw-version') !== null ? store.getItem('sw-version') : '0.0.0'
  }`;

  // update environment on field value change
  for (const [id, value] of Object.entries(fieldDefaults)) {
    document.getElementById(id).addEventListener('change', (event) => {
      let { id, value } = event.target;
      event.target.classList.remove('calculated');

      if (
        metarFields.includes(id) &&
        store.getItem('mostRecentMetar') !== null
      ) {
        store.setItem('mostRecentMetarInserted', false);
        const syncButton = document.getElementById('syncAirportButton');
        const syncIcon = syncButton.querySelector('i');

        syncAirportButtonStates.insert(syncButton, syncIcon);
      }

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

  var whatsNew = store.getItem('whatsNew');
  if (whatsNew !== null) {
    const wrapper = document.getElementById('whatsNewWrapper');
    const whatsNewText = wrapper.querySelector('#whatsNewText');
    whatsNewText.innerHTML = whatsNew;
    wrapper.classList.add('out');
  }

  initFields();
  initLabels();
  initSettingsPanel();
  updateSyncAirportButton();
  generateRulers();
  updateEnv(runCalculations(getFieldValues()));
});
