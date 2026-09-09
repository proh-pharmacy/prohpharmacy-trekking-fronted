import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { customersApi, type Customer } from '../../../api-client';
import toast from 'react-hot-toast';

const GHANA_CENTER: [number, number] = [7.9465, -1.0232];
const GHANA_BOUNDS: [[number, number], [number, number]] = [[4.5, -3.5], [11.2, 1.2]];

function getInitials(businessName: string): string {
  const words = businessName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function makePin(customer: Customer): L.DivIcon {
  const portrait = customer.primaryPerson?.portraitUrl;
  const initials  = getInitials(customer.businessName);

  const inner = portrait
    ? `<img src="${portrait}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="font-size:12px;font-weight:700;color:#fff;font-family:system-ui,sans-serif;letter-spacing:0.03em;line-height:1;">${initials}</span>`;

  return L.divIcon({
    className: '',
    html: `<div style="
      width:38px;height:38px;border-radius:50%;overflow:hidden;
      background:${portrait ? '#000' : '#15803d'};
      border:2.5px solid #41cc84;
      box-shadow:0 2px 6px rgba(0,0,0,0.45);
      display:flex;align-items:center;justify-content:center;
    ">${inner}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });
}

function formatCustomerType(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

export const CustomerPinsPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all: Customer[] = [];
        let page = 1;

        while (true) {
          const res = await customersApi.getCustomers({ pageNumber: page, pageSize: 200 });
          const items: Customer[] = res.items ?? res.data ?? [];
          all.push(...items);
          const totalPages: number = res.totalPages ?? 1;
          if (page >= totalPages || items.length === 0) break;
          page++;
        }

        setCustomers(all.filter(c => c.primaryLocation?.latitude && c.primaryLocation?.longitude));
      } catch {
        toast.error('Failed to load customer locations.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4.5rem)] -m-4 sm:-m-6 md:-m-8 overflow-hidden bg-portal-canvas">
      {/* Header */}
      <div className="shrink-0 bg-portal-surface border-b border-portal-border px-4 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white">Customer Pins</span>
          {!loading && (
            <span className="text-[11px] text-portal-muted">
              {customers.length} customer{customers.length !== 1 ? 's' : ''} with GPS location
            </span>
          )}
        </div>
        {loading && (
          <span className="text-[11px] text-portal-muted flex items-center gap-1.5">
            <i className="pi pi-spin pi-spinner text-xs" />
            Loading customers...
          </span>
        )}
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
          {customers.map((customer) => (
            <Marker
              key={customer.id}
              position={[customer.primaryLocation!.latitude, customer.primaryLocation!.longitude]}
              icon={makePin(customer)}
            >
              <Popup className="customer-pin-popup">
                <div style={{ minWidth: 170, fontSize: 13, lineHeight: 1.6, padding: '10px 12px' }}>
                  <p style={{ fontWeight: 700, marginBottom: 4, color: '#ffffff' }}>
                    {customer.businessName}
                  </p>
                  {customer.tradingName && (
                    <p style={{ color: '#adbac7', marginBottom: 4, fontSize: 12 }}>
                      {customer.tradingName}
                    </p>
                  )}
                  <p style={{ color: '#adbac7', marginBottom: 2 }}>
                    {formatCustomerType(customer.customerType)}
                  </p>
                  <p style={{ color: '#adbac7', marginBottom: 2 }}>
                    {customer.primaryPhoneNumber}
                  </p>
                  {customer.primaryLocation?.districtName && (
                    <p style={{ color: '#768390', fontSize: 12 }}>
                      {customer.primaryLocation.districtName}
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
