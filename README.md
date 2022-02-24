# Aviation-Altitudes

A quick tool to visualize the different altidudes in aviation and to see how pressure and temperature change them.

Do you like the project or has hit helped you study and understand the topics around altitudes? Feel free to [Buy me a coffee!](https://ko-fi.com/jixabon)

## Formulas used

From what I could find these are the commonly used formulas, although my numbers aren't matching the results of apps like Foreflight and the Sportys E6B. So I'm not sure what formulas they use. If you have any suggestions for more accurate formulas, please send them my way.

- ISA = (Alt / 1000) &times; -2 + 15
- ISA Deviation = OAT - ISA
- Temperature Error Correction (TEC) = 4 &times; (Alt / 1000) &times; ISADev
- Pressure Correction (PresCorr)
  - inHg: (29.92 - Baro) &times; 1000
  - hPa: (1013 - Baro) &times; 30
- Pressure Altitude = PresCorr + FieldElev
- Density Altitude = PressureAlt + 120 &times; (OAT - 15)
- Absolute Altitude = TrueAlt - FieldAlt
- True Altitude = IndicatedAlt + TEC
- Indicated Altitude
  - inHg: (Kollsman - Baro) &times; 1000 + Alt
  - hPa: (Kollsman - Baro) &times; 30 + alt

For the sake of this project True Altitude is calculated off of Planned Altitude to allow the "altitude indicator" to be experimented with.

## Interface

### Fields

Located at the very top of the screen or opened by the menu button.

- Field Elevation `#fieldElev`
  - The elevation of the airport
- Pressure `#pressure`
  - The pressure at the surface level/airport (Also what should be set in the kollsman window/altimeter setting)
- Surface Temperature `#surfaceTemp`
  - The temperature observed at the surface or airport
- Planned Altitude `#plannedAlt`
  - The altitude that you "intend" to fly
- Kollsman Setting `#kollsman`
  - This is the actual setting that shows in the altimeter instrument. Try setting it incorrectly and see what happens!
- Outside Air Temperature `#oat`
  - Temperature observed in the air by the plane's instruments

### Pressure Unit Button

Use to switch the unit that pressure is in. Current supported units are `inHg` and `hPa`.

### Reset Button

Resets all fields to their "default" values.

### Altitude Info

Found at the top of the screen under the fields. Most in the list are self explanatory but some are a little odd.

- Indicated Altitude: For the sake of this tool, this is the theoretical reading on the planes altimeter

### Altitude Rulers

There are two rulers on the interface on the left and right edges. The ruler on the left starts from sea level, while the ruler on the right starts from where ever Density Altitude is calculated to be.

### "Go To" Buttons

At the bottom of the screen are the Go To buttons to quickly bring into view either the Plane, Ground or Sea.

## Potential Features

### Airport Lookup

Given an airport ICAO identifier, fetch latest METAR and fill in relevant data.

The Aviation Weather Center has a free API, however, is not available to ajax requests. Will look into this feature if demand is high.

### Clouds

Illustrate where clouds would form (or are if Airport lookup is implemented) based on temperatures and lapse rates.

## Options

### Debug

Run the following in the browser console and all actions after will output debug information.

```
toggleDebug();
```

### Reduction Factor

To use a 1:1 pixel to foot ratio would be unruly so there is a reduction factor implemented. The default is 10:1. To change the reduction factor run the command a pass an integer of your choosing.

```
setReductionFactor(10);
```

or no parameter to go back to default

```
setReductionFactor();
```

### Field Defaults

You can see the default values used when the reset button is pressed by peeping the `fieldDefaults` variable. These are not saved and will be cleared on page refresh. To change these values simply set them like below:

```
fieldDefaults.surfaceTemp.C = 21;
```

current available values are

```
fieldDefaults = {
  fieldElev: {
    ft: 790,
  },
  pressure: {
    inHg: 29.92,
    hPa: 1013,
  },
  surfaceTemp: {
    C: 15,
  },
  plannedAlt: {
    ft: 3500,
  },
  kollsman: {
    inHg: 29.92,
    hPa: 1013,
  },
  oat: {
    C: 8,
  },
};
```

Be sure to press the reset button afterwards.
