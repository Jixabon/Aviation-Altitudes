# Aviation-Altitudes

A quick tool to visualize the different altitudes in aviation and to see how pressure and temperature change them.

Do you like the project or has hit helped you study and understand the topics around altitudes? Feel free to [Buy me a coffee!](https://ko-fi.com/jixabon)

## Interface

### Fields

Located at the very top of the screen or opened by the menu button.

- Elevation `#elevation`
  - The elevation of the airport
- Pressure `#pressure`
  - The pressure at the surface level/airport (Also what should be set in the kollsman window/altimeter setting)
- Surface OAT `#surfaceTemp`
  - The temperature observed at the surface or airport
- Dew Point `#dewPoint`
  - The dew point observed at the surface or airport
- Indicated Altitude `#indicatedAlt`
  - The altitude that shows on the aircraft's instruments
- True Altitude `#trueAlt`
  - The altitude that the aircraft is above mean sea level
- Kollsman Setting `#kollsman`
  - This is the actual setting that shows in the altimeter instrument. Try setting it incorrectly and see what happens!
- Outside Air Temperature `#oat`
  - Temperature observed in the air by the aircraft's instruments

Note: Red text in a field indicates that it is a calculated value.

### Reset Button

Resets all fields to their "default" values.

### Calculation Data

Can be shown via the "Show Data" button or hidden. Found at the top of the screen under the fields and shows various calculations.

### Altitude Rulers

There are two rulers on the interface on the left and right edges. The ruler on the left starts from sea level, while the ruler on the right starts with Density Altitude at ground level to give a quick idea of what the airplane might be feeling.

### "Go To" Buttons

At the bottom of the screen are the Go To buttons to quickly bring into view either the Plane, Ground or Sea.

## Potential Features

### Airport Lookup

Given an airport ICAO identifier, fetch latest METAR and fill in relevant data.

The Aviation Weather Center has a free API, however, is not available to ajax requests. Will look into this feature if demand is high.

### Clouds

Illustrate where clouds would form (or are if Airport lookup is implemented) based on temperatures and lapse rates.

## Settings

### Pressure Unit

Adjust what pressure unit you want to use: `inHg`, `hPa`.

### Flight Levels Start

Adjust where the flight levels start. This is also determine if the Kollsman option will be set to standard pressure when Indicated or True values are set greater than or equal to the start of the flight levels.

### Share/Bookmark

A link to share your settings configuration.

### Developer

Turn on/off developer options

## Formulas used

From what I could find these are the commonly used formulas, although my numbers aren't matching the results of apps like Foreflight and the Sportys E6B. So I'm not sure what formulas they use. If you have any suggestions for more accurate formulas, please send them my way.

- ISA = 15 + (Alt / 1000) &times; 2
- ISA Deviation = OAT - ISA
- Temperature Error Correction (TEC) = 4 &times; (Alt / 1000) &times; ISADev
- Pressure Correction (PresCorr)
  - inHg: (29.92 - Baro) &times; 1000
  - hPa: (Baro - 1013) &times; 30
- Pressure Altitude = PresCorr + FieldElev
- Density Altitude = PressureAlt + 120 &times; (OAT - ISA)
- Absolute Altitude = TrueAlt - FieldAlt
- True Altitude = IndicatedAlt + TEC

## Developer Options

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

## Google Analytics

Google Analytics is used to note the active user base of this project and is not used for any marketing or advertizing purposes, nor will any information be sold or released to the public. If you'd like to learn more, see Google Analytics' [Privacy Policy](https://policies.google.com/technologies/partner-sites).
