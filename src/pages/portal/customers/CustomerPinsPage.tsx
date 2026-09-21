import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { customersApi, organisationApi, type CustomerMapPin, type Region } from '../../../api-client';
import { FlatDropdown } from '../../../components/flat-form';
import toast from 'react-hot-toast';

const GHANA_CENTER: [number, number] = [7.9465, -1.0232];
const GHANA_BOUNDS: [[number, number], [number, number]] = [[4.5, -3.5], [11.2, 1.2]];
const HEATMAP_COLORS = {
  low: '#087A2D',
  medium: '#f0883e',
  high: '#DE2512',
} as const;

// ── Auto fit-bounds when pins change ───────────────────────────────────
const FitBounds: React.FC<{ pins: CustomerMapPin[]; trigger: number }> = ({ pins, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const coords = pins.map((p) => [p.latitude, p.longitude] as L.LatLngTuple);
    const bounds = L.latLngBounds(coords);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [pins, trigger, map]);
  return null;
};

const FocusPin: React.FC<{ pin: CustomerMapPin | null }> = ({ pin }) => {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    map.flyTo([pin.latitude, pin.longitude], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.8,
    });
  }, [map, pin]);
  return null;
};

// ── Pin helpers ────────────────────────────────────────────────────────
export type PinSize = 'xs' | 'sm' | 'normal';
type MapMode = 'pins' | 'heatmap';

const PIN_SIZES: Record<PinSize, { size: number; anchor: number; popupY: number; border: number; label: string }> = {
  xs: { size: 18, anchor: 9, popupY: -12, border: 1.5, label: 'Extra Small' },
  sm: { size: 28, anchor: 14, popupY: -17, border: 2, label: 'Small' },
  normal: { size: 38, anchor: 19, popupY: -22, border: 2.5, label: 'Normal' },
};

function getInitials(businessName: string): string {
  const words = businessName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function escapeSvgAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function makePin(pin: CustomerMapPin, pinSize: PinSize = 'normal'): L.DivIcon {
  const conf = PIN_SIZES[pinSize] || PIN_SIZES.normal;
  const portrait = pin.primaryContactPortraitUrl;
  const initials = getInitials(pin.businessName);
  const height = Math.round(conf.size * 1.32);
  const markerId = `customer-pin-${(pin.locationId || pin.customerAccountId).replace(/[^a-zA-Z0-9_-]/g, '')}-${pinSize}`;
  const borderColor = pin.isPrimary ? '#f0883e' : '#41cc84';
  const portraitMarkup = portrait
    ? `<clipPath id="${markerId}-clip"><circle cx="24" cy="21" r="12.5" /></clipPath>
       <image href="${escapeSvgAttribute(portrait)}" x="11.5" y="8.5" width="25" height="25" preserveAspectRatio="xMidYMid slice" clip-path="url(#${markerId}-clip)" />`
    : `<circle cx="24" cy="21" r="12.5" fill="#22272e" />
       <text x="24" y="25" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="${Math.max(9, Math.round(conf.size * 0.34))}" font-weight="700" letter-spacing="0.4">${initials}</text>`;

  return L.divIcon({
    className: 'customer-pin-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${conf.size}" height="${height}" viewBox="0 0 48 58" role="img" aria-label="${escapeSvgAttribute(pin.businessName)}">
      <defs>
        <filter id="${markerId}-shadow" x="-30%" y="-20%" width="160%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.45" />
        </filter>
      </defs>
      <path d="M24 2.5C12.1 2.5 3.5 10.8 3.5 21.2c0 13.9 14.6 26.9 20.5 32.3 5.9-5.4 20.5-18.4 20.5-32.3C44.5 10.8 35.9 2.5 24 2.5Z" fill="#2d333b" stroke="${borderColor}" stroke-width="${conf.border}" filter="url(#${markerId}-shadow)" />
      ${portraitMarkup}
    </svg>`,
    iconSize: [conf.size, height],
    iconAnchor: [conf.anchor, height],
    popupAnchor: [0, conf.popupY],
  });
}

function formatCustomerType(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

const HeatmapLayer: React.FC<{ pins: CustomerMapPin[] }> = ({ pins }) => {
  const points = pins.map((pin) => {
    const nearby = pins.filter((other) => {
      const latitudeDistance = (other.latitude - pin.latitude) * 111;
      const longitudeDistance = (other.longitude - pin.longitude) * 111 * Math.cos((pin.latitude * Math.PI) / 180);
      return Math.sqrt(latitudeDistance ** 2 + longitudeDistance ** 2) <= 2;
    }).length;
    const intensity = Math.min(1, nearby / Math.max(3, Math.min(12, pins.length)));
    return { pin, intensity };
  });

  return <>
    {points.map(({ pin, intensity }) => (
      <Circle
        key={`heat-${pin.locationId}`}
        center={[pin.latitude, pin.longitude]}
        radius={Math.round(900 + intensity * 2200)}
        pathOptions={{
          stroke: false,
          fillColor: intensity > 0.65 ? HEATMAP_COLORS.high : intensity > 0.3 ? HEATMAP_COLORS.medium : HEATMAP_COLORS.low,
          fillOpacity: 0.28 + intensity * 0.22,
        }}
      />
    ))}
  </>;
};

// ── Page ───────────────────────────────────────────────────────────────
export const CustomerPinsPage: React.FC = () => {
  const [pins, setPins]           = useState<CustomerMapPin[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

  const [regions, setRegions]             = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [pinSize, setPinSize]             = useState<PinSize>('normal');
  const [mapMode, setMapMode]             = useState<MapMode>('pins');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);
  const [focusedPin, setFocusedPin] = useState<CustomerMapPin | null>(null);

  useEffect(() => {
    organisationApi.getRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  const loadPins = useCallback(async (regionId: string) => {
    setLoading(true);
    try {
      const data = await customersApi.getMapPins(regionId ? { regionId } : undefined);
      setPins(data);
      if (regionId) setFitTrigger((t) => t + 1);
    } catch {
      toast.error('Failed to load customer locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPins(selectedRegion);
  }, [selectedRegion, loadPins]);

  const regionOptions = [
    { label: 'All Regions', value: '' },
    ...regions.map((r) => ({ label: r.name, value: r.id })),
  ];

  return (
    <div className="relative flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-4.5rem)] -m-4 sm:-m-6 md:-m-8 overflow-hidden bg-portal-canvas">
      {/* Header */}
      <div className="shrink-0 bg-portal-surface border-b border-portal-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-[11px] text-portal-muted">
              {pins.length} location pin{pins.length !== 1 ? 's' : ''}
            </span>
          )}
          {loading && (
            <span className="text-[11px] text-portal-muted flex items-center gap-1.5">
              <i className="pi pi-spin pi-spinner text-xs" />
              Loading...
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center flex-wrap gap-3">
          <div className="inline-flex h-[38px] rounded border border-portal-border bg-portal-canvas p-0.5">
            {(['pins', 'heatmap'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setMapMode(mode)} className={`!rounded-none px-3 text-xs font-medium transition cursor-pointer ${mapMode === mode ? 'bg-portal-accent/20 text-portal-accent border border-portal-accent/50' : 'text-portal-muted hover:text-white border border-transparent'}`}>
                {mode === 'pins' ? 'Pins' : 'Heatmap'}
              </button>
            ))}
          </div>
          {/* Pin size toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-portal-muted">
              PIN SIZE:
            </span>
            <div className="inline-flex h-[38px] rounded border border-portal-border bg-portal-canvas p-0.5">
              {(
                [
                  { id: 'xs', label: 'Extra Small', shortLabel: 'XS' },
                  { id: 'sm', label: 'Small', shortLabel: 'Small' },
                  { id: 'normal', label: 'Normal', shortLabel: 'Normal' },
                ] as const
              ).map((s) => {
                const isActive = pinSize === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPinSize(s.id)}
                    title={`Set pin size to ${s.label}`}
                    className={`flex items-center justify-center px-2 text-xs font-medium rounded transition cursor-pointer ${
                      isActive
                        ? 'bg-portal-accent/20 text-portal-accent font-semibold border border-portal-accent/50'
                        : 'text-portal-muted hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="inline sm:hidden">{s.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-44">
            <FlatDropdown
              value={selectedRegion}
              options={regionOptions}
              onChange={(val: any) => {
                const v = val?.value !== undefined ? val.value : val;
                setSelectedRegion(v);
              }}
              placeholder="All Regions"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0">
        <MapContainer
          center={GHANA_CENTER}
          zoom={7}
          minZoom={6}
          maxBounds={GHANA_BOUNDS}
          maxBoundsViscosity={0.8}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
          zoomControl
          >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <FitBounds pins={pins} trigger={fitTrigger} />
          <FocusPin pin={focusedPin} />
          {mapMode === 'heatmap' && <HeatmapLayer pins={pins} />}
          {mapMode === 'pins' && pins.filter((pin) => !focusedPin || pin.locationId === focusedPin.locationId).map((pin) => (
            <Marker
              key={`${pin.locationId || `${pin.customerAccountId}-${pin.latitude}-${pin.longitude}`}-${pinSize}`}
              position={[pin.latitude, pin.longitude]}
              icon={makePin(pin, pinSize)}
              ref={(marker) => {
                if (marker && mapMode === 'pins' && focusedPin?.locationId === pin.locationId) {
                  window.requestAnimationFrame(() => marker.openPopup());
                }
              }}
              eventHandlers={{
                mouseover: (e) => {
                  e.target.openPopup();
                },
                popupclose: () => {
                  if (focusedPin?.locationId === pin.locationId) setFocusedPin(null);
                },
              }}
            >
              <Popup className="customer-pin-popup">
                <div style={{ minWidth: 180, fontSize: 13, lineHeight: 1.5, padding: '10px 12px' }}>
                  <p style={{ fontWeight: 700, marginBottom: 4, color: '#ffffff' }}>
                    {pin.businessName}
                  </p>
                  {pin.tradingName && (
                    <p style={{ color: '#adbac7', marginBottom: 4, fontSize: 12 }}>
                      {pin.tradingName}
                    </p>
                  )}
                  <p style={{ color: '#adbac7', marginBottom: 2, fontSize: 12 }}>
                    {formatCustomerType(pin.customerType)}
                  </p>
                  {pin.primaryPhoneNumber && (
                    <p style={{ color: '#adbac7', marginBottom: 2, fontSize: 12 }}>
                      {pin.primaryPhoneNumber}
                    </p>
                  )}
                  {pin.regionName && (
                    <p style={{ color: '#768390', fontSize: 11, marginBottom: 6 }}>
                      {pin.regionName}
                    </p>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 px-2 text-[11px] font-semibold text-portal-accent hover:text-white bg-portal-accent/15 hover:bg-portal-accent/30 border border-portal-accent/40 rounded transition no-underline cursor-pointer"
                  >
                    <i className="pi pi-map-marker text-xs" />
                    <span>Open in Google Maps</span>
                    <i className="pi pi-external-link text-[10px] ml-0.5 opacity-80" />
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Desktop customer location picker */}
      <div className={`hidden md:flex absolute left-4 bottom-4 z-[1000] w-80 max-h-[65%] flex-col bg-portal-surface/95 border border-portal-border shadow-2xl backdrop-blur-xl transform-gpu transition-transform duration-300 ease-out ${desktopPanelOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-[calc(100%+1rem)] pointer-events-none'}`}>
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-portal-border px-3 py-2.5">
          <span className="text-xs font-semibold text-white">Customer locations</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-portal-muted">{pins.length} pins</span>
            <button type="button" onClick={() => setDesktopPanelOpen(false)} title="Hide customer locations" className="!rounded-none flex h-7 w-7 items-center justify-center text-portal-muted hover:bg-white/[0.08] hover:text-white transition cursor-pointer">
              <i className="pi pi-times text-xs" />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain custom-scrollbar divide-y divide-portal-border/40">
          {pins.map((pin) => (
            <button key={`desktop-${pin.locationId}`} type="button" onClick={() => { setFocusedPin(pin); setMapMode('pins'); }} className="!rounded-none w-full p-3 text-left hover:bg-white/[0.06] transition cursor-pointer">
              <span className="block text-xs font-semibold text-white truncate">{pin.businessName}</span>
              <span className="mt-1 block text-[11px] text-portal-muted truncate">{pin.regionName || 'Region unavailable'}{pin.primaryPhoneNumber ? ` · ${pin.primaryPhoneNumber}` : ''}</span>
            </button>
          ))}
          {!pins.length && <div className="p-6 text-center text-xs text-portal-muted">No customer locations found.</div>}
        </div>
      </div>
      <button type="button" onClick={() => setDesktopPanelOpen(true)} title="Show customer list" className={`hidden md:flex absolute left-4 bottom-4 z-[1000] h-10 items-center gap-2 rounded border border-portal-border bg-portal-surface/95 px-3 text-xs font-semibold text-portal-text shadow-2xl backdrop-blur-xl hover:bg-portal-card hover:text-white transition ${desktopPanelOpen ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'}`}>
        <i className="pi pi-list text-sm text-portal-accent" />
        <span>Show customer list</span>
        <span className="font-mono text-[10px] text-portal-muted">{pins.length}</span>
      </button>

      {/* Mobile map controls and location list bottom sheet */}
      <div className="md:hidden absolute inset-x-0 bottom-0 z-[1050] h-[70%] flex flex-col bg-portal-surface/95 border-t border-portal-border shadow-2xl backdrop-blur-xl transform-gpu will-change-transform transition-transform duration-500 ease-in-out"
        style={{ transform: mobilePanelOpen ? 'translateY(0)' : 'translateY(calc(100% - 58px))' }}>
        <div className="shrink-0 grid grid-cols-[1fr_1fr_1fr_44px] border-b border-portal-border">
          <div className="flex flex-col items-center justify-center py-2 text-[11px] text-portal-text">
            <span className="font-mono font-bold text-white">{pins.length}</span>
            <span className="text-portal-muted">Pins</span>
          </div>
          <button type="button" onClick={() => setMobilePanelOpen(true)} className="!rounded-none border-l border-portal-border/60 py-2 text-[11px] text-portal-muted hover:bg-white/[0.06] hover:text-white transition cursor-pointer">
            <span className="block truncate px-1">{selectedRegion ? regions.find((region) => region.id === selectedRegion)?.name || 'Region' : 'All regions'}</span>
            <span className="text-[10px] text-portal-muted">Region</span>
          </button>
          <button type="button" onClick={() => setMobilePanelOpen(true)} className="!rounded-none border-l border-portal-border/60 py-2 text-[11px] text-portal-muted hover:bg-white/[0.06] hover:text-white transition cursor-pointer">
            <span className="block text-portal-accent">{PIN_SIZES[pinSize].label}</span>
            <span className="text-[10px] text-portal-muted">Pin size</span>
          </button>
          <button type="button" onClick={() => setMobilePanelOpen((open) => !open)} title={mobilePanelOpen ? 'Hide locations' : 'Show locations'} className="!rounded-none border-l border-portal-border/60 flex items-center justify-center text-portal-text hover:bg-white/[0.08] hover:text-white transition cursor-pointer">
            <i className={`pi ${mobilePanelOpen ? 'pi-angle-down' : 'pi-list'} text-sm`} />
          </button>
        </div>
        <div className="shrink-0 grid grid-cols-1 gap-3 border-b border-portal-border/60 p-3">
          <div className="grid grid-cols-2 h-[38px] rounded border border-portal-border bg-portal-canvas p-0.5">
            {(['pins', 'heatmap'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => { setMapMode(mode); setMobilePanelOpen(false); }} className={`!rounded-none text-[11px] font-medium transition cursor-pointer ${mapMode === mode ? 'bg-portal-accent/20 text-portal-accent border border-portal-accent/50' : 'text-portal-muted hover:text-white'}`}>
                {mode === 'pins' ? 'Pins' : 'Heatmap'}
              </button>
            ))}
          </div>
          <FlatDropdown value={selectedRegion} options={regionOptions} onChange={(val: any) => { const v = val?.value !== undefined ? val.value : val; setSelectedRegion(v); setMobilePanelOpen(false); }} placeholder="All Regions" size="sm" />
          <div className="grid grid-cols-3 h-[38px] rounded border border-portal-border bg-portal-canvas p-0.5">
            {(['xs', 'sm', 'normal'] as const).map((size) => (
              <button key={size} type="button" onClick={() => { setPinSize(size); setMobilePanelOpen(false); }} className={`!rounded-none text-[11px] font-medium transition cursor-pointer ${pinSize === size ? 'bg-portal-accent/20 text-portal-accent border border-portal-accent/50' : 'text-portal-muted hover:text-white'}`}>
                {PIN_SIZES[size].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar divide-y divide-portal-border/40">
          {pins.map((pin) => (
            <button key={pin.locationId} type="button" onClick={() => { setFocusedPin(pin); setMapMode('pins'); setMobilePanelOpen(false); }} className="!rounded-none w-full p-3 text-left hover:bg-white/[0.06] transition cursor-pointer">
              <span className="block text-xs font-semibold text-white truncate">{pin.businessName}</span>
              <span className="mt-1 block text-[11px] text-portal-muted truncate">{pin.regionName || 'Region unavailable'}{pin.primaryPhoneNumber ? ` · ${pin.primaryPhoneNumber}` : ''}</span>
            </button>
          ))}
          {!pins.length && <div className="p-8 text-center text-xs text-portal-muted">No customer locations found.</div>}
        </div>
      </div>
    </div>
  );
};

export default CustomerPinsPage;
