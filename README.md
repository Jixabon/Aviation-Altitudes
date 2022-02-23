# Aviation-Altitudes

A quick tool to visualize the different altidudes in aviation and to see how pressure and temperature change them.

## Formulas used

From what I could find these are the commonly used formulas, although my numbers aren't matching the results of apps like Foreflight and the Sportys E6B. So I'm not sure what formulas they use.

- ISA = (Altitude / 1000) \* -2 + 15
- Pressure Altitude = (29.92 - Baro) \* 1000 + FieldElev
- Density Altitude = PressureAlt + 120 \* (OAT - 15)

## Options

Currently refreshing the page will reset these options.

### Debug

Run the following in the browser console and all actions after will output debug information.

```
debug = true;
```

To disable:

```
debug = false;
```

### Scale

To use a 1:1 pixel to foot ratio would be unruly so there is a reduction factor implemented. The default is 10:1. To change the reduction factor run the command a pass an integer of your choosing.

```
setReductionFactor(10);
```

### Field Defaults

You can see the default values used when the reset button is pressed by peeping the `fieldDefaults` variable.
To change these values simply set them like below:

```
fieldDefaults.fieldTemp = 21;
```

or

```
fieldDefaults = {
  fieldElev: 790,
  fieldPres: 29.92,
  fieldTemp: 21,
  indicated: 3500,
  kollsman: 29.92,
  oat: 8,
};
```

Be sure to press the reset button afterwards.
