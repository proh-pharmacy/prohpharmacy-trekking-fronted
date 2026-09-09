import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatDropdown, FlatTextarea } from '../../../../components/flat-form';
import {
  customersApi,
  organisationApi,
  type Customer,
  type CustomerType,
  type RelationshipType,
  type Region,
  type District,
} from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const pinIcon = L.divIcon({
  className: '',
  html: `<div class="map-pin-drop" style="width:32px;height:44px">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
      <ellipse cx="16" cy="42" rx="5.5" ry="2" fill="rgba(0,0,0,0.2)"/>
      <path d="M16 1C8.268 1 2 7.268 2 15c0 10.5 14 28 14 28S30 25.5 30 15C30 7.268 23.732 1 16 1z"
            fill="#15803d" stroke="#14532d" stroke-width="0.5"/>
      <path d="M16 2C9 2 3 8 3 15c0 5 4 12 8 19C7 28 4 21 4 15 4 8.4 9.4 3 16 3z"
            fill="rgba(255,255,255,0.12)"/>
      <circle cx="16" cy="15" r="7.5" fill="white"/>
      <circle cx="16" cy="15" r="3.5" fill="#16a34a"/>
    </svg>
  </div>`,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
});

// Re-centres map when lat/lng changes
const MapRecentre: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
};

// ── Option constants ───────────────────────────────────────────────────
const CUSTOMER_TYPE_OPTIONS: { label: string; value: CustomerType }[] = [
  { label: 'Retail Pharmacy', value: 'RetailPharmacy' },
  { label: 'Wholesale Pharmacy', value: 'WholesalePharmacy' },
  { label: 'OTC Medicine Seller', value: 'OTCMedicineSeller' },
  { label: 'Clinic', value: 'Clinic' },
  { label: 'Hospital', value: 'Hospital' },
  { label: 'Chemical Shop', value: 'ChemicalShop' },
  { label: 'Licensed Health Facility', value: 'LicensedHealthFacility' },
  { label: 'Other', value: 'Other' },
];

const RELATIONSHIP_TYPE_OPTIONS: { label: string; value: RelationshipType }[] = [
  { label: 'Owner', value: 'Owner' },
  { label: 'Proprietor', value: 'Proprietor' },
  { label: 'Director', value: 'Director' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Primary Contact', value: 'PrimaryContact' },
  { label: 'Credit Responsible Person', value: 'CreditResponsiblePerson' },
  { label: 'Guarantor', value: 'Guarantor' },
  { label: 'Other', value: 'Other' },
];

interface CustomerModalProps {
  visible: boolean;
  onHide: () => void;
  customer: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  visible,
  onHide,
  customer,
}) => {
  const isEditing = Boolean(customer);

  // ── Business fields ───────────────────────────────────────────────
  const [businessName, setBusinessName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType | ''>('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [regionId, setRegionId] = useState('');

  // ── Representative fields (create only) ───────────────────────────
  const [repFirstName, setRepFirstName] = useState('');
  const [repMiddleName, setRepMiddleName] = useState('');
  const [repLastName, setRepLastName] = useState('');
  const [repRelationship, setRepRelationship] = useState<RelationshipType | ''>('');
  const [repPhone, setRepPhone] = useState('');
  const [repGhanaCard, setRepGhanaCard] = useState('');

  // ── Location fields (create only) ─────────────────────────────────
  const [districtId, setDistrictId] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // ── Lookups ────────────────────────────────────────────────────────
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // ── GPS capture ────────────────────────────────────────────────────
  const handleCaptureGps = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }
    setCapturingGps(true);

    const attempt = (retriesLeft: number) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setAccuracy(pos.coords.accuracy);
          setCapturingGps(false);
        },
        (err) => {
          // code 2 = POSITION_UNAVAILABLE (transient — GPS still searching)
          if (err.code === 2 && retriesLeft > 0) {
            setTimeout(() => attempt(retriesLeft - 1), 2000);
            return;
          }
          setCapturingGps(false);
          const messages: Record<number, string> = {
            1: 'Location permission denied. Please allow access and try again.',
            2: 'Location unavailable. Move outdoors and try again.',
            3: 'Location request timed out. Please try again.',
          };
          toast.error(messages[err.code] ?? 'Failed to capture GPS location.');
        },
        { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 }
      );
    };

    attempt(4);
  }, []);

  // Fetch regions when modal opens
  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setLoadingRegions(true);
    organisationApi
      .getRegions()
      .then((r) => { if (mounted) setRegions(r); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingRegions(false); });
    return () => { mounted = false; };
  }, [visible]);

  // Fetch districts when regionId changes
  useEffect(() => {
    if (!regionId) {
      setDistricts([]);
      return;
    }
    let mounted = true;
    setLoadingDistricts(true);
    organisationApi
      .getDistricts(regionId)
      .then((d) => { if (mounted) setDistricts(d); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingDistricts(false); });
    return () => { mounted = false; };
  }, [regionId]);

  useEffect(() => { if (!visible) setShowMap(false); }, [visible]);

  // Initialize form on open
  useEffect(() => {
    if (!visible) return;
    if (customer) {
      setBusinessName(customer.businessName || '');
      setTradingName(customer.tradingName || '');
      setCustomerType(customer.customerType || '');
      setPrimaryPhone(customer.primaryPhoneNumber || '');
      setWhatsAppNumber(customer.whatsAppNumber || '');
      setRegionId(customer.regionId || '');
      // Rep — split fullName into parts
      const parts = (customer.primaryPerson?.fullName || '').split(' ').filter(Boolean);
      setRepFirstName(parts[0] || '');
      setRepLastName(parts.length > 1 ? parts[parts.length - 1] : '');
      setRepMiddleName(parts.length > 2 ? parts.slice(1, -1).join(' ') : '');
      setRepRelationship((customer.primaryPerson?.relationshipType as RelationshipType) || '');
      setRepPhone(customer.primaryPerson?.primaryPhoneNumber || '');
      setRepGhanaCard('');
      // Location
      setDistrictId(''); // resolved by effect once districts load
      setStreetAddress(customer.primaryLocation?.streetAddress || '');
      setLandmark(customer.primaryLocation?.landmarkAndDirections || '');
      setLatitude(customer.primaryLocation?.latitude ?? null);
      setLongitude(customer.primaryLocation?.longitude ?? null);
      setAccuracy(customer.primaryLocation?.accuracyMetres ?? null);
    } else {
      setBusinessName('');
      setTradingName('');
      setCustomerType('');
      setPrimaryPhone('');
      setWhatsAppNumber('');
      setRegionId('');
      setRepFirstName('');
      setRepMiddleName('');
      setRepLastName('');
      setRepRelationship('');
      setRepPhone('');
      setRepGhanaCard('');
      setDistrictId('');
      setStreetAddress('');
      setLandmark('');
      setLatitude(null);
      setLongitude(null);
      setAccuracy(null);
    }
  }, [visible, customer]);

  // Auto-match district by name when editing
  useEffect(() => {
    if (!customer?.primaryLocation?.districtName || !districts.length) return;
    setDistrictId((prev) => {
      if (prev) return prev;
      const match = districts.find((d) => d.name === customer.primaryLocation!.districtName);
      return match?.id ?? '';
    });
  }, [districts, customer]);

  const regionOptions = useMemo(
    () => regions.map((r) => ({ label: r.name, value: r.id })),
    [regions]
  );

  const districtOptions = useMemo(
    () => districts.map((d) => ({ label: d.name, value: d.id })),
    [districts]
  );

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim()) { toast.error('Business name is required.'); return; }
    if (!customerType) { toast.error('Customer type is required.'); return; }
    if (!regionId) { toast.error('Region is required.'); return; }
    if (!primaryPhone.trim()) { toast.error('Primary phone number is required.'); return; }
    if (!repFirstName.trim() || !repLastName.trim()) {
      toast.error('Representative first and last name are required.');
      return;
    }
    if (!repRelationship) { toast.error('Representative relationship type is required.'); return; }
    if (!repPhone.trim()) { toast.error('Representative phone number is required.'); return; }
    if (!districtId) { toast.error('District is required.'); return; }

    setSubmitting(true);
    try {
      if (isEditing && customer) {
        if (latitude === null || longitude === null || accuracy === null) {
          toast.error('GPS coordinates are required. Please capture location.');
          setSubmitting(false);
          return;
        }
        await customersApi.updateCustomer(customer.id, {
          businessName: businessName.trim(),
          tradingName: tradingName.trim() || undefined,
          customerType: customerType as CustomerType,
          regionId,
          primaryPhoneNumber: primaryPhone.trim(),
          whatsAppNumber: whatsAppNumber.trim() || undefined,
          representative: {
            firstName: repFirstName.trim(),
            middleName: repMiddleName.trim() || null,
            lastName: repLastName.trim(),
            relationshipType: repRelationship as RelationshipType,
            primaryPhoneNumber: repPhone.trim(),
            ghanaCardNumber: repGhanaCard.trim() || undefined,
          },
          location: {
            districtId,
            streetAddress: streetAddress.trim() || undefined,
            landmarkAndDirections: landmark.trim() || undefined,
            latitude,
            longitude,
            accuracyMetres: accuracy,
          },
        });
        toast.success(`Customer "${businessName.trim()}" updated.`);
      } else {
        if (latitude === null || longitude === null || accuracy === null) {
          toast.error('GPS coordinates are required. Please capture location.');
          setSubmitting(false);
          return;
        }
        await customersApi.createCustomer({
          businessName: businessName.trim(),
          tradingName: tradingName.trim() || undefined,
          customerType: customerType as CustomerType,
          regionId,
          primaryPhoneNumber: primaryPhone.trim(),
          whatsAppNumber: whatsAppNumber.trim() || undefined,
          representative: {
            firstName: repFirstName.trim(),
            middleName: repMiddleName.trim() || null,
            lastName: repLastName.trim(),
            relationshipType: repRelationship as RelationshipType,
            primaryPhoneNumber: repPhone.trim(),
            ghanaCardNumber: repGhanaCard.trim() || undefined,
          },
          location: {
            districtId,
            streetAddress: streetAddress.trim(),
            landmarkAndDirections: landmark.trim(),
            latitude,
            longitude,
            accuracyMetres: accuracy,
          },
        });
        toast.success(`Customer "${businessName.trim()}" created.`);
      }

      resetTableData();
      onHide();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to save customer.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Section label helper ───────────────────────────────────────────
  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-4 mb-3">
      <span className="text-[11px] font-medium text-portal-muted uppercase tracking-wide">
        {children}
      </span>
      <div className="h-[1px] w-full bg-portal-border mt-2" />
    </div>
  );

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={isEditing ? 'Edit Customer' : 'Add Customer'}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton
            variant="danger-outline"
            label="Cancel"
            onClick={onHide}
            disabled={submitting}
          />
          <FlatButton
            variant="primary"
            label={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Customer'}
            icon={isEditing ? 'pi pi-check' : 'pi pi-plus'}
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || !businessName.trim()}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ── Business Info ──────────────────────────────────────── */}
        <SectionLabel>Business Info</SectionLabel>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlatInputText
            label="Business Name"
            placeholder="e.g. Accra Pharmacy Ltd"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            size="sm"
            maxLength={200}
            required
          />
          <FlatInputText
            label="Trading Name"
            placeholder="e.g. Accra Pharma"
            value={tradingName}
            onChange={(e) => setTradingName(e.target.value)}
            size="sm"
            maxLength={200}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlatDropdown
            label="Customer Type"
            value={customerType}
            options={CUSTOMER_TYPE_OPTIONS}
            onChange={(val: any) => setCustomerType(val?.value !== undefined ? val.value : val)}
            placeholder="Select type"
            filter
            filterPlaceholder="Search..."
            size="sm"
          />
          <FlatDropdown
            label="Region"
            value={regionId}
            options={regionOptions}
            onChange={(val: any) => {
              const v = val?.value !== undefined ? val.value : val;
              setRegionId(v);
              setDistrictId('');
            }}
            placeholder={loadingRegions ? 'Loading...' : 'Select region'}
            filter
            filterPlaceholder="Search region..."
            size="sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlatInputText
            label="Primary Phone"
            placeholder="+233..."
            value={primaryPhone}
            onChange={(e) => setPrimaryPhone(e.target.value)}
            size="sm"
            maxLength={30}
            required
          />
          <FlatInputText
            label="WhatsApp Number"
            placeholder="+233..."
            value={whatsAppNumber}
            onChange={(e) => setWhatsAppNumber(e.target.value)}
            size="sm"
            maxLength={30}
          />
        </div>

        {/* ── Representative ─────────────────────────────────────── */}
        <>
            <SectionLabel>Representative</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FlatInputText
                label="First Name"
                placeholder="First name"
                value={repFirstName}
                onChange={(e) => setRepFirstName(e.target.value)}
                size="sm"
                maxLength={80}
                required
              />
              <FlatInputText
                label="Middle Name"
                placeholder="Middle name"
                value={repMiddleName}
                onChange={(e) => setRepMiddleName(e.target.value)}
                size="sm"
                maxLength={80}
              />
              <FlatInputText
                label="Last Name"
                placeholder="Last name"
                value={repLastName}
                onChange={(e) => setRepLastName(e.target.value)}
                size="sm"
                maxLength={80}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FlatDropdown
                label="Relationship"
                value={repRelationship}
                options={RELATIONSHIP_TYPE_OPTIONS}
                onChange={(val: any) => setRepRelationship(val?.value !== undefined ? val.value : val)}
                placeholder="Select role"
                filter
                filterPlaceholder="Search..."
                size="sm"
              />
              <FlatInputText
                label="Phone"
                placeholder="+233..."
                value={repPhone}
                onChange={(e) => setRepPhone(e.target.value)}
                size="sm"
                maxLength={30}
                required
              />
              <FlatInputText
                label="Ghana Card No."
                placeholder="GHA-..."
                value={repGhanaCard}
                onChange={(e) => setRepGhanaCard(e.target.value)}
                size="sm"
                maxLength={30}
              />
            </div>

        </>

        {/* ── Location ───────────────────────────────────────────── */}
        <>
            <SectionLabel>Location</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FlatDropdown
                label="District"
                value={districtId}
                options={districtOptions}
                onChange={(val: any) => setDistrictId(val?.value !== undefined ? val.value : val)}
                placeholder={
                  !regionId
                    ? 'Select region first'
                    : loadingDistricts
                    ? 'Loading...'
                    : 'Select district'
                }
                filter
                filterPlaceholder="Search district..."
                size="sm"
                disabled={!regionId}
              />
              <FlatInputText
                label="Street Address"
                placeholder="12 Liberation Road, Accra"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                size="sm"
                maxLength={300}
              />
            </div>

            <FlatTextarea
              label="Landmark & Directions"
              placeholder="Next to Accra Mall, ground floor..."
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              size="sm"
              rows={2}
              maxLength={500}
            />

            {/* GPS Capture */}
            <div className="mt-1 space-y-2">
              {latitude !== null && longitude !== null && accuracy !== null ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-portal-canvas rounded px-3 py-2.5 border border-portal-border">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[10px] font-medium text-portal-muted uppercase tracking-wide block mb-0.5">Latitude</span>
                        <span className="text-xs font-mono text-portal-text">{latitude.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-portal-muted uppercase tracking-wide block mb-0.5">Longitude</span>
                        <span className="text-xs font-mono text-portal-text">{longitude.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-portal-muted uppercase tracking-wide block mb-0.5">Accuracy</span>
                        <span className="text-xs font-mono text-portal-text">{accuracy.toFixed(1)}m</span>
                      </div>
                    </div>
                    <div className="sm:flex-shrink-0 flex flex-col gap-1.5 w-full sm:w-auto">
                      <FlatButton
                        variant="outline"
                        size="sm"
                        leftIcon="pi pi-refresh"
                        onClick={handleCaptureGps}
                        loading={capturingGps}
                        disabled={capturingGps}
                        className="w-full sm:w-auto"
                      >
                        Recapture
                      </FlatButton>
                      <FlatButton
                        variant="outline"
                        size="sm"
                        leftIcon={showMap ? 'pi pi-times' : 'pi pi-map'}
                        onClick={() => setShowMap((v) => !v)}
                        className="w-full sm:w-auto"
                      >
                        {showMap ? 'Hide Map' : 'View on Map'}
                      </FlatButton>
                    </div>
                  </div>

                  {showMap && (
                    <div className="relative rounded overflow-hidden border border-portal-border aspect-video">
                      <MapContainer
                        center={[latitude, longitude]}
                        zoom={13}
                        style={{ width: '100%', height: '100%' }}
                        zoomControl
                        scrollWheelZoom={true}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <Marker position={[latitude, longitude]} icon={pinIcon} />
                        <MapRecentre lat={latitude} lng={longitude} />
                      </MapContainer>
                      <a
                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 z-[1000] flex items-center gap-1.5 bg-white text-red-500 text-[11px] font-medium px-2 py-1 rounded shadow-md hover:bg-gray-100 hover:text-red-600 transition-colors"
                      >
                        <i className="pi pi-external-link text-[10px]" />
                        Open in Google Maps
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <FlatButton
                  variant="outline"
                  size="sm"
                  leftIcon={capturingGps ? undefined : 'pi pi-map-marker'}
                  onClick={handleCaptureGps}
                  loading={capturingGps}
                  disabled={capturingGps}
                >
                  {capturingGps ? 'Capturing...' : 'Capture GPS Location'}
                </FlatButton>
              )}
            </div>
          </>
        </form>
    </FlatModal>
  );
};

export default CustomerModal;
