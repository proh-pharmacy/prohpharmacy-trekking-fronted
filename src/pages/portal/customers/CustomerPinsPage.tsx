import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { customersApi, organisationApi, type CustomerMapPin, type Region } from '../../../api-client';
import { FlatDropdown } from '../../../components/flat-form';
import toast from 'react-hot-toast';

const GHANA_CENTER: [number, number] = [7.9465, -1.0232];
const GHANA_BOUNDS: [[number, number], [number, number]] = [[4.5, -3.5], [11.2, 1.2]];

// ── Auto fit-bounds when pins change ───────────────────────────────────
const FitBounds: React.FC<{ pins: CustomerMapPin[]; trigger: number }> = ({ pins, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const coords = pins.map((p) => [p.latitude, p.longitude] as L.LatLngTuple);
    const bounds = L.latLngBounds(coords);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [trigger, map]);
  return null;
};

// ── Pin helpers ────────────────────────────────────────────────────────
function getInitials(businessName: string): string {
  const words = businessName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function makePin(pin: CustomerMapPin): L.DivIcon {
  const portrait = pin.primaryContactPortraitUrl;
  const initials = getInitials(pin.businessName);

  if (portrait) {
    return L.divIcon({
      className: 'customer-pin-icon',
      html: `<div style="
        width:38px;height:38px;border-radius:50%;overflow:hidden;
        border:2.5px solid #f0883e;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        box-sizing:border-box;
      "><img src="${portrait}" style="width:100%;height:100%;object-fit:cover;display:block;" /></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22],
    });
  }

  return L.divIcon({
    className: 'customer-pin-icon',
    html: `<div style="
      width:38px;height:38px;border-radius:50%;
      background:#15803d;
      border:2.5px solid #f0883e;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      box-sizing:border-box;
    "><span style="font-size:12px;font-weight:700;color:#fff;font-family:system-ui,sans-serif;letter-spacing:0.03em;line-height:1;">${initials}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });
}

function formatCustomerType(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

// ── Page ───────────────────────────────────────────────────────────────
export const CustomerPinsPage: React.FC = () => {
  const [pins, setPins]           = useState<CustomerMapPin[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

  const [regions, setRegions]             = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

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
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4.5rem)] -m-4 sm:-m-6 md:-m-8 overflow-hidden bg-portal-canvas">
      {/* Header */}
      <div className="shrink-0 bg-portal-surface border-b border-portal-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white">Customer Pins</span>
          {!loading && (
            <span className="text-[11px] text-portal-muted">
              {pins.length} customer{pins.length !== 1 ? 's' : ''} with GPS location
            </span>
          )}
          {loading && (
            <span className="text-[11px] text-portal-muted flex items-center gap-1.5">
              <i className="pi pi-spin pi-spinner text-xs" />
              Loading...
            </span>
          )}
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
          {pins.map((pin) => (
            <Marker
              key={pin.customerAccountId}
              position={[pin.latitude, pin.longitude]}
              icon={makePin(pin)}
            >
              <Popup className="customer-pin-popup">
                <div style={{ minWidth: 170, fontSize: 13, lineHeight: 1.6, padding: '10px 12px' }}>
                  <p style={{ fontWeight: 700, marginBottom: 4, color: '#ffffff' }}>
                    {pin.businessName}
                  </p>
                  {pin.tradingName && (
                    <p style={{ color: '#adbac7', marginBottom: 4, fontSize: 12 }}>
                      {pin.tradingName}
                    </p>
                  )}
                  <p style={{ color: '#adbac7', marginBottom: 2 }}>
                    {formatCustomerType(pin.customerType)}
                  </p>
                  <p style={{ color: '#adbac7', marginBottom: 2 }}>
                    {pin.primaryPhoneNumber}
                  </p>
                  {pin.regionName && (
                    <p style={{ color: '#768390', fontSize: 12 }}>
                      {pin.regionName}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default CustomerPinsPage;
