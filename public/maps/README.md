# Ghana offline basemap

`ghana-z9.pmtiles` is a regional extract of the Protomaps Basemap build dated
2026-09-12 (tileset 4.15.2). It contains zoom levels 0–9 within
`-3.3,4.5,1.3,11.2` (longitude, latitude). Source data includes OpenStreetMap
and Natural Earth. OpenStreetMap attribution appears on the driver trek card.

Source: https://docs.protomaps.com/basemaps/downloads

To refresh the map with a newer Protomaps build:

```sh
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles public/maps/ghana-z9.pmtiles --bbox=-3.3,4.5,1.3,11.2 --maxzoom=9
```
