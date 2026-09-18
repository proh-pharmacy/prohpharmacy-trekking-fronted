# Ghana offline basemap

`ghana-z9.pmtiles` is a regional extract of the Protomaps Basemap build dated
2026-09-12 (tileset 4.15.2). It contains zoom levels 0–9 within
`-3.3,4.5,1.3,11.2` (longitude, latitude). Source data includes OpenStreetMap
and Natural Earth. OpenStreetMap attribution appears on the driver trek card.

The driver map prefers high-detail regional extracts from `regions/` when they
are available. Current extracts are generated at zoom 14 for all 16 Ghana
regions:

- `regions/ahafo-z14.pmtiles`
- `regions/ashanti-z14.pmtiles`
- `regions/bono-z14.pmtiles`
- `regions/bono-east-z14.pmtiles`
- `regions/central-z14.pmtiles`
- `regions/eastern-z14.pmtiles`
- `regions/greater-accra-z14.pmtiles`
- `regions/north-east-z14.pmtiles`
- `regions/northern-z14.pmtiles`
- `regions/oti-z14.pmtiles`
- `regions/savannah-z14.pmtiles`
- `regions/upper-east-z14.pmtiles`
- `regions/upper-west-z14.pmtiles`
- `regions/volta-z14.pmtiles`
- `regions/western-z14.pmtiles`
- `regions/western-north-z14.pmtiles`

The Ghana archive remains the fallback for regions without a regional extract.

Source: https://docs.protomaps.com/basemaps/downloads

To refresh the map with a newer Protomaps build:

```sh
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles public/maps/ghana-z9.pmtiles --bbox=-3.3,4.5,1.3,11.2 --maxzoom=9
```

Regional extract example:

```sh
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles public/maps/regions/greater-accra-z14.pmtiles --bbox=-0.65,5.25,0.25,6.25 --maxzoom=14
```
