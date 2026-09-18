import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { leafletLayer } from 'protomaps-leaflet';
import { FileSource, PMTiles } from 'pmtiles';
import 'leaflet/dist/leaflet.css';
import { getOfflineMap } from './offlineMap';

// Approximate centres keep the assigned region visible before any network lookup.
const REGION_CENTRES: Record<string, [number, number]> = {
  ahafo: [7.05, -2.48], ashanti: [6.75, -1.55], bono: [7.55, -2.55],
  'bono east': [7.75, -1.05], central: [5.55, -1.15], eastern: [6.45, -0.45],
  'greater accra': [5.65, -0.2], 'north east': [10.45, -0.35], northern: [9.45, -0.85],
  oti: [7.9, 0.35], savannah: [9.1, -1.8], 'upper east': [10.75, -0.8],
  'upper west': [10.3, -2.5], volta: [6.55, 0.45], western: [5.0, -2.5],
  'western north': [6.3, -2.85],
};

export function RegionMapBackdrop({ regionName, onReady, interactive = false }: {
  regionName: string;
  onReady: (regionName: string) => void;
  interactive?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let map: L.Map | null = null;
    const key = regionName.toLowerCase().replace(/\s+region\s*$/, '').trim();
    const centre = REGION_CENTRES[key] ?? [7.9, -1.05];
    void getOfflineMap().then((blob) => {
      if (cancelled || !blob || !container.current) return;
      map = L.map(container.current, {
        center: centre, zoom: 8, minZoom: 6, maxZoom: 9,
        zoomControl: interactive, attributionControl: false,
        dragging: interactive, scrollWheelZoom: false, doubleClickZoom: interactive,
        boxZoom: interactive, keyboard: interactive, touchZoom: interactive,
      });
      const archive = new PMTiles(new FileSource(new File([blob], 'ghana-z9.pmtiles')));
      // protomaps-leaflet uses Leaflet's global L when creating its layer.
      Object.assign(window, { L });
      const layer = leafletLayer({ url: archive, flavor: 'dark', lang: 'en', maxZoom: 9 });
      layer.once('tileload', () => { if (!cancelled) onReady(regionName); });
      layer.addTo(map);
    }).catch((error) => console.error('Offline trek map could not load', error));
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [regionName, onReady, interactive]);

  return <div ref={container} aria-hidden={!interactive} className={`absolute inset-0 ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`} />;
}
