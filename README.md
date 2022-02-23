# Aviation-Altitudes

A quick tool to visualize the different altidudes in aviation and to see how pressure and temperature change them.

## Formulas used
From what I could find these are the commonly used formulas, although my numbers aren't matching the results of apps like Foreflight and the Sportys E6B so I'm not sure what formulas they use.

- ISA = (Altitude / 1000) * -2 + 15
- Pressure Altitude = (29.92 -  Baro) * 1000 + FieldElev
- Density Altitude = PressureAlt + 120 * (OAT - 15)
