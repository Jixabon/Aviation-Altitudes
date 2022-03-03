A quick tool to visualize the different altitudes in aviation and to see how pressure and temperature change them.

Do you like the project or has hit helped you study and understand the topics around altitudes? Show your appreciation by [buying me a coffee](https://ko-fi.com/jixabon)!

## We've Moved!

The host for this project has changed. The new URL for the app is [https://aviation-altitudes.netlify.app](https://aviation-altitudes.netlify.app). Thanks!

## Interface

### Fields

Located at the very top of the screen or opened by the menu button.

- Elevation `#elevation` - The elevation of the airport
- Pressure `#pressure` - The pressure at the surface level/airport (Also what should be set in the kollsman window/altimeter setting)
- Surface OAT `#surfaceTemp` - The temperature observed at the surface or airport
- Dew Point `#dewPoint` - The dew point observed at the surface or airport
- Indicated Altitude `#indicatedAlt` - The altitude that shows on the aircraft's instruments
- True Altitude `#trueAlt` - The altitude that the aircraft is above mean sea level
- Kollsman Setting `#kollsman` - This is the actual setting that shows in the altimeter instrument. Try setting it incorrectly and see what happens!
- Outside Air Temperature `#oat` - Temperature observed in the air by the aircraft's instruments

Note: Red text in a field indicates that it is a calculated value.

### Airport Sync Button

When an airport is set, the button will appear in the top fields panel. There are a few things that the button may try to tell you:

- <img src="arrows-rotate-solid.svg" width="15px" height="15px" style="background:white;padding:5px;margin-right:8px;border-radius:8px;vertical-align:middle;"/> A METAR can be fetched (spinning indicates the METAR is being fetched)
- <img src="check-solid.svg" width="15px" height="15px" style="background:white;padding:5px;margin-right:8px;border-radius:8px;vertical-align:middle;"/> The METAR has been fetched and set successfully
- <img src="stopwatch-solid.svg" width="15px" height="15px" style="background:white;padding:5px;margin-right:8px;border-radius:8px;vertical-align:middle;"/> Fetching a new METAR has been disabled until the next hour on the hour
- <img src="arrow-up-from-bracket-solid.svg" width="15px" height="15px" style="background:white;padding:5px;margin-right:8px;border-radius:8px;vertical-align:middle;"/> Allows to reset fields with METAR values
- <img src="wifi-solid.svg" width="15px" height="15px" style="background:white;padding:5px;margin-right:8px;border-radius:8px;vertical-align:middle;"/> (Red) Network connection could not be made
- <img src="triangle-exclamation-solid.svg" width="15px" height="15px" style="background:white;padding:5px;margin-right:8px;border-radius:8px;vertical-align:middle;"/> Something went wrong when fetching the METAR
- ICAO identifier color indicates flight category

#### How is the data used?

The following fields are set from the METAR:

- Elevation (the elevation of the observing station)
- Pressure (currently only supports inHg)
- Surface Temperature
- Dew Point

### Reset Button

Resets all fields to their "default" values.

### Calculation Data

Can be shown via the "Show Data" button or hidden. Found at the top of the screen under the fields and shows various calculations.

### Altitude Rulers

There are two rulers on the interface on the left and right edges. The ruler on the left starts from sea level, while the ruler on the right starts with Density Altitude at ground level to give a quick idea of what the airplane might be feeling.

### "Go To" Buttons

At the bottom of the screen are the Go To buttons to quickly bring into view either the Plane, Ground or Sea.

### As an App

On most devices you can "Add to home screen" or "install" this webpage for offline and ease of use.

## Potential Features

### Clouds

Illustrate where clouds would form or are based on temperatures and lapse rates or METAR.

## Settings

### Pressure Unit

Adjust what pressure unit you want to use: `inHg`, `hPa`.

### Flight Levels Start

Adjust where the flight levels start. This is also determine if the Kollsman option will be set to standard pressure when Indicated or True values are set greater than or equal to the start of the flight levels.

### Airport

Set the airport to fetch a METAR for.

### Share/Bookmark

A link to share your configuration.

### Developer

Turn on/off developer options. For more info see [Developer Options](https://github.com/Jixabon/Aviation-Altitudes#developer-options).

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

Be sure to press the reset button afterwards.

## Google Analytics

Google Analytics is used to note the active user base of this project and is not used for any marketing or advertizing purposes, nor will any information be sold or released to the public. If you'd like to learn more, see Google Analytics' [Privacy Policy](https://policies.google.com/privacy) and [Terms of Service](https://policies.google.com/terms).
