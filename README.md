# [Aviation Altitudes](https://github.com/Jixabon/Aviation-Altitudes)

A quick tool to visualize the different altitudes in aviation and to see how pressure and temperature change them.

Do you like the project or has hit helped you study and understand the topics around altitudes? Show your appreciation by [buying me a coffee](https://ko-fi.com/jixabon)!

## We've Moved!

The host for this project has changed. The new URL for the app is [https://aviation-altitudes.netlify.app](https://aviation-altitudes.netlify.app). Thanks!

## How do I use this?

For instructions and help on how to use this tool see our [user page](https://jixabon.github.io/Aviation-Altitudes/).

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

Google Analytics is used to note the active user base of this project and is not used for any marketing or advertizing purposes, nor will any information be sold or released to the public. If you'd like to learn more, see Google Analytics' [Privacy Policy](https://policies.google.com/privacy) and [Terms of Service](https://policies.google.com/terms).
