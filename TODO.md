# TODO

## Known Issues

- When pressure is changed the placeholder of the input does not update to reflect the default for that pressure unit
- Reduce the `environment` height when the reduction factor is changes
- copyright year is hard coded
- METAR only inputs in_hg

## Thoughts

- State for Info hide/show
- Rather than resetting on unit change. Convert between units
- Option to switch right ruler to pressure altitude

### Airport lookup

- [x] Airport ICAO setting
- [x] Button in `#resetRow` appears after adding airport to settings
- [x] Use `observation time` plus `1 hour` (metars are released every hour, on the hour) to limit obsessive refreshing
- [x] Show time icon to indicate that they have to wait
- [x] If they change one of the values inserted from the METAR change to insert icon to reset most recently fetched values
- [ ] `online` handler to re-enable when connected again

## Supporting Units

- Altitude
  - [x] Labels
  - [ ] Set function
  - [x] Load from params
  - Meters
    - [x] Unit Definition
    - [x] Defaults
    - [ ] Equations
- Pressure
  - [x] Labels
  - [x] Set function
  - [x] Load from params
- Temp
  - [x] Labels
  - [x] Set function
  - [x] Load from params
  - F
    - [x] Unit Definition
    - [x] Defaults
    - [ ] Equations
