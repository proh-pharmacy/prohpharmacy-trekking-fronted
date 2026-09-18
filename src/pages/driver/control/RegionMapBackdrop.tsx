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

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] || character));
}

function customerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function makeCustomerPin(pin: {
  businessName: string;
  primaryContactPortraitUrl?: string | null;
}): L.DivIcon {
  const portrait = pin.primaryContactPortraitUrl ? escapeHtml(pin.primaryContactPortraitUrl) : null;
  const content = portrait
    ? `<img src="${portrait}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<span style="font-size:10px;font-weight:700;color:#fff;font-family:system-ui,sans-serif;line-height:1;">${escapeHtml(customerInitials(pin.businessName))}</span>`;
  return L.divIcon({
    className: 'customer-pin-icon',
    html: `<div style="width:28px;height:28px;border-radius:50%;overflow:hidden;background:#15803d;border:2px solid #f0883e;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;box-sizing:border-box;">${content}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -17],
  });
}

function customerPopup(pin: {
  businessName: string;
  primaryPhoneNumber?: string;
  customerType?: string | null;
  regionName?: string | null;
  latitude: number;
  longitude: number;
}): string {
  const businessName = escapeHtml(pin.businessName);
  const phone = pin.primaryPhoneNumber ? escapeHtml(pin.primaryPhoneNumber) : '';
  const type = pin.customerType ? escapeHtml(pin.customerType.replace(/([A-Z])/g, ' $1').trim()) : '';
  const region = pin.regionName ? escapeHtml(pin.regionName) : '';
  return `<div style="min-width:180px;font-size:13px;line-height:1.5;padding:10px 12px;"><p style="font-weight:700;margin-bottom:4px;color:#ffffff;">${businessName}</p>${type ? `<p style="color:#adbac7;margin-bottom:2px;font-size:12px;">${type}</p>` : ''}${phone ? `<p style="color:#adbac7;margin-bottom:2px;font-size:12px;">${phone}</p>` : ''}${region ? `<p style="color:#768390;font-size:11px;margin-bottom:6px;">${region}</p>` : ''}<a href="https://www.google.com/maps?q=${pin.latitude},${pin.longitude}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:10px;text-align:center;padding:6px 8px;color:#41cc84;background:rgba(65,204,132,.15);border:1px solid rgba(65,204,132,.4);border-radius:4px;text-decoration:none;font-size:11px;font-weight:600;">Open in Google Maps</a></div>`;
}

export function RegionMapBackdrop({ regionName, onReady, interactive = false, customerPins = [] }: {
  regionName: string;
  onReady: (regionName: string) => void;
  interactive?: boolean;
  customerPins?: Array<{ id: string; businessName: string; primaryPhoneNumber?: string; customerType?: string | null; regionName?: string | null; primaryContactPortraitUrl?: string | null; latitude: number; longitude: number }>;
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
      const layer = leafletLayer({ url: archive, flavor: 'light', lang: 'en', maxZoom: 9 });
      layer.once('tileload', () => { if (!cancelled) onReady(regionName); });
      layer.addTo(map);
      const markers = customerPins
        .filter((pin) => Number.isFinite(pin.latitude) && Number.isFinite(pin.longitude))
        .map((pin) => L.marker([pin.latitude, pin.longitude], {
          icon: makeCustomerPin(pin),
        }).bindPopup(customerPopup(pin)).addTo(map!));
      if (interactive && markers.length > 0) {
        map.fitBounds(L.latLngBounds(markers.map((marker) => marker.getLatLng())), { padding: [40, 40], maxZoom: 12 });
      }
    }).catch((error) => console.error('Offline trek map could not load', error));
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [regionName, onReady, interactive, customerPins]);

  return <div ref={container} aria-hidden={!interactive} className={`absolute inset-0 ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`} />;
}
