import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatInputNumber, FlatDropdown, FlatTextarea, FlatCheckbox } from '../../../../components/flat-form';
import {
  customersApi,
  organisationApi,
  type Customer,
  type CustomerLocation,
  type CustomerType,
  type RelationshipType,
  type Region,
  type District,
  type LocationType,
} from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';
import { formatGhanaCardNumber, formatGhanaPhoneNumber, normalizeGhanaPhoneNumber } from '../../../../lib/utils';

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
  driverMode?: {
    districts: District[];
    region?: { id: string; name: string };
    onSubmit: (payload: Record<string, unknown>, photos: { premises?: File; portrait?: File }) => Promise<void>;
  };
  onAddLocation?: () => void;
  onEditLocation?: (location: CustomerLocation) => void;
  onDeleteLocation?: (location: CustomerLocation) => void;
  pendingLocationIds?: string[];
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  visible,
  onHide,
  customer,
  driverMode,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  pendingLocationIds = [],
}) => {
  const isEditing = Boolean(customer);
  const additionalLocations = customer?.additionalLocations ?? customer?.locations ?? [];
  const [showAdditionalLocations, setShowAdditionalLocations] = useState(false);

  // ── Business fields ───────────────────────────────────────────────
  const [businessName, setBusinessName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType | ''>('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [regionId, setRegionId] = useState('');
  const [locationRegionId, setLocationRegionId] = useState('');

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

  // ── Portrait upload ────────────────────────────────────────────────
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [showPortraitViewer, setShowPortraitViewer] = useState(false);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const [premisesPhotoFile, setPremisesPhotoFile] = useState<File | null>(null);
  const [premisesPreview, setPremisesPreview] = useState<string | null>(null);
  const [showPremisesViewer, setShowPremisesViewer] = useState(false);
  const premisesPhotoInputRef = useRef<HTMLInputElement>(null);

  const handlePremisesPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size === 0) { toast.error('Choose a non-empty premises photo.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, or WebP premises photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Premises photo must be 5 MB or smaller.');
      return;
    }
    setPremisesPhotoFile(file);
    setPremisesPreview(URL.createObjectURL(file));
  };

  const handlePortraitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size === 0) { toast.error('Choose a non-empty photo.'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5 MB.');
      return;
    }
    setPortraitFile(file);
    setPortraitPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

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
    (driverMode ? Promise.resolve([] as Region[]) : organisationApi.getRegions())
      .then((r) => { if (mounted) setRegions(r); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingRegions(false); });
    return () => { mounted = false; };
  }, [visible, driverMode]);

  // Fetch districts when regionId changes
  useEffect(() => {
    if (driverMode) {
      setRegionId(driverMode.region?.id || '');
      setLocationRegionId(driverMode.region?.id || '');
      setDistricts(driverMode.districts);
      return;
    }
    if (!locationRegionId) {
      setDistricts([]);
      return;
    }
    let mounted = true;
    setLoadingDistricts(true);
    setDistricts([]);
    organisationApi
      .getDistricts(locationRegionId)
      .then((d) => { if (mounted) setDistricts(d); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingDistricts(false); });
    return () => { mounted = false; };
  }, [locationRegionId, driverMode?.region?.id, driverMode?.districts]);

  useEffect(() => {
    if (!visible) {
      setShowMap(false);
      setShowPremisesViewer(false);
      setShowAdditionalLocations(false);
      setPortraitFile(null);
      setPortraitPreview(null);
      setPremisesPhotoFile(null);
      setPremisesPreview(null);
    } else {
      setPortraitPreview(customer?.primaryPerson?.portraitUrl ?? null);
      setPremisesPreview(customer?.premisesPhotoUrl ?? null);
    }
  }, [visible, customer]);

  // Initialize form on open
  useEffect(() => {
    if (!visible) return;
    if (customer) {
      // Keep the persisted premises image visible when opening an existing
      // customer, even when the selected row was refreshed independently of
      // the modal visibility state.
      setPremisesPreview(customer.premisesPhotoUrl ?? null);
      setPortraitPreview(customer.primaryPerson?.portraitUrl ?? null);
      setBusinessName(customer.businessName || '');
      setTradingName(customer.tradingName || '');
      setCustomerType(customer.customerType || '');
      setPrimaryPhone(formatGhanaPhoneNumber(customer.primaryPhoneNumber));
      setWhatsAppNumber(formatGhanaPhoneNumber(customer.whatsAppNumber));
      setOpeningBalance(null);
      setRegionId(driverMode?.region?.id || customer.regionId || '');
      setLocationRegionId(driverMode?.region?.id || customer.primaryLocation?.regionId || customer.regionId || '');
      // Rep — split fullName into parts
      const parts = (customer.primaryPerson?.fullName || '').split(' ').filter(Boolean);
      setRepFirstName(parts[0] || '');
      setRepLastName(parts.length > 1 ? parts[parts.length - 1] : '');
      setRepMiddleName(parts.length > 2 ? parts.slice(1, -1).join(' ') : '');
      setRepRelationship((customer.primaryPerson?.relationshipType as RelationshipType) || '');
      setRepPhone(formatGhanaPhoneNumber(customer.primaryPerson?.primaryPhoneNumber));
      setRepGhanaCard('');
      // Location
      setDistrictId(customer.primaryLocation?.districtId || '');
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
      setOpeningBalance(null);
      setRegionId(driverMode?.region?.id || '');
      setLocationRegionId(driverMode?.region?.id || '');
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
    if (locationRegionId !== (customer.primaryLocation.regionId || customer.regionId)) return;
    setDistrictId((prev) => {
      if (prev) return prev;
      const match = districts.find((d) => d.name === customer.primaryLocation!.districtName);
      return match?.id ?? '';
    });
  }, [districts, customer, locationRegionId]);

  const regionOptions = useMemo(
    () => regions.map((r) => ({ label: r.name, value: r.id })),
    [regions]
  );

  const districtOptions = useMemo(
    () => {
      const options = districts.map((d) => ({ label: d.name, value: d.id }));
      const selected = customer?.primaryLocation;
      if (driverMode && selected?.districtId && !options.some((option) => option.value === selected.districtId)) {
        options.unshift({ label: selected.districtName || 'Current district', value: selected.districtId });
      }
      return options;
    },
    [districts, driverMode, customer?.primaryLocation]
  );

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim()) { toast.error('Business name is required.'); return; }
    if (!customerType) { toast.error('Customer type is required.'); return; }
    if (!driverMode && !regionId) { toast.error('Region is required.'); return; }
    if (!primaryPhone.trim()) { toast.error('Primary phone number is required.'); return; }
    if (!isEditing && !driverMode && openingBalance !== null && openingBalance <= 0) {
      toast.error('Opening balance must be greater than zero.');
      return;
    }
    if (!repFirstName.trim() || !repLastName.trim()) {
      toast.error('Representative first and last name are required.');
      return;
    }
    if (!repRelationship) { toast.error('Representative relationship type is required.'); return; }
    if (!repPhone.trim()) { toast.error('Representative phone number is required.'); return; }
    if (!driverMode && !districtId) { toast.error('District is required.'); return; }

    setSubmitting(true);
    try {
      if (driverMode) {
        await driverMode.onSubmit({
          ...(isEditing && customer ? { customerId: customer.id } : {}),
          businessName: businessName.trim(), primaryPhoneNumber: normalizeGhanaPhoneNumber(primaryPhone), customerType,
          ...(tradingName.trim() && { tradingName: tradingName.trim() }), ...(whatsAppNumber.trim() && { whatsAppNumber: normalizeGhanaPhoneNumber(whatsAppNumber) }),
          ...(districtId && { districtId }),
          ...(isEditing ? { streetAddress: streetAddress.trim(), landmarkAndDirections: landmark.trim() }
            : { ...(streetAddress.trim() && { streetAddress: streetAddress.trim() }), ...(landmark.trim() && { landmarkAndDirections: landmark.trim() }) }),
          representative: { firstName: repFirstName.trim(), ...(repMiddleName.trim() && { middleName: repMiddleName.trim() }), lastName: repLastName.trim(), relationshipType: repRelationship, primaryPhoneNumber: normalizeGhanaPhoneNumber(repPhone), ...(repGhanaCard.trim() && { ghanaCardNumber: repGhanaCard.trim() }) },
          gps: latitude !== null && longitude !== null && accuracy !== null ? { latitude, longitude, accuracyMetres: accuracy } : null,
        }, { premises: premisesPhotoFile || undefined, portrait: portraitFile || undefined });
        resetTableData();
        onHide();
        return;
      }
      if (isEditing && customer) {
        await customersApi.updateCustomer(customer.id, {
          businessName: businessName.trim(),
          tradingName: tradingName.trim() || undefined,
          customerType: customerType as CustomerType,
          regionId,
          primaryPhoneNumber: normalizeGhanaPhoneNumber(primaryPhone),
          whatsAppNumber: normalizeGhanaPhoneNumber(whatsAppNumber) || undefined,
          representative: {
            firstName: repFirstName.trim(),
            middleName: repMiddleName.trim() || null,
            lastName: repLastName.trim(),
            relationshipType: repRelationship as RelationshipType,
            primaryPhoneNumber: normalizeGhanaPhoneNumber(repPhone),
            ghanaCardNumber: repGhanaCard.trim() || undefined,
          },
          location: {
            districtId,
            streetAddress: streetAddress.trim() || undefined,
            landmarkAndDirections: landmark.trim() || undefined,
            ...(latitude !== null && longitude !== null && accuracy !== null
              ? { latitude, longitude, accuracyMetres: accuracy }
              : {}),
          },
        });
        resetTableData();
        if (portraitFile && customer.primaryPerson?.id) {
          try {
            await customersApi.uploadPortrait(customer.id, customer.primaryPerson.id, portraitFile);
            resetTableData();
          } catch {
            toast.error('Customer updated but portrait upload failed.');
          }
        }
        if (premisesPhotoFile) {
          try {
            await customersApi.uploadPremisesPhoto(customer.id, premisesPhotoFile);
            resetTableData();
          } catch {
            toast.error('Customer updated but premises photo upload failed.');
          }
        }
        toast.success(`Customer "${businessName.trim()}" updated.`);
      } else {
        const created = await customersApi.createCustomer({
          businessName: businessName.trim(),
          tradingName: tradingName.trim() || undefined,
          customerType: customerType as CustomerType,
          regionId,
          primaryPhoneNumber: normalizeGhanaPhoneNumber(primaryPhone),
          whatsAppNumber: normalizeGhanaPhoneNumber(whatsAppNumber) || undefined,
          ...(openingBalance !== null ? { openingBalance } : {}),
          representative: {
            firstName: repFirstName.trim(),
            middleName: repMiddleName.trim() || null,
            lastName: repLastName.trim(),
            relationshipType: repRelationship as RelationshipType,
            primaryPhoneNumber: normalizeGhanaPhoneNumber(repPhone),
            ghanaCardNumber: repGhanaCard.trim() || undefined,
          },
          location: {
            districtId,
            streetAddress: streetAddress.trim(),
            landmarkAndDirections: landmark.trim(),
            ...(latitude !== null && longitude !== null && accuracy !== null
              ? { latitude, longitude, accuracyMetres: accuracy }
              : {}),
          },
        });
        resetTableData();
        if (portraitFile && created.primaryPerson?.id) {
          try {
            await customersApi.uploadPortrait(created.id, created.primaryPerson.id, portraitFile);
            resetTableData();
          } catch {
            toast.error('Customer created but portrait upload failed.');
          }
        }
        if (premisesPhotoFile) {
          try {
            await customersApi.uploadPremisesPhoto(created.id, premisesPhotoFile);
            resetTableData();
          } catch {
            toast.error('Customer created but premises photo upload failed.');
          }
        }
        toast.success(`Customer "${businessName.trim()}" created.`);
      }

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
    <div className="mt-5 mb-3">
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
            size="md"
            maxLength={200}
            required
          />
          <FlatInputText
            label="Trading Name"
            placeholder="e.g. Accra Pharma"
            value={tradingName}
            onChange={(e) => setTradingName(e.target.value)}
            size="md"
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
            size="md"
          />
          {!isEditing && !driverMode && (
            <FlatInputNumber
              label="Opening Balance (GHS)"
              value={openingBalance}
              onChange={setOpeningBalance}
              placeholder="0.00"
              min={0.01}
              minFractionDigits={2}
              maxFractionDigits={2}
              useGrouping
              size="sm"
              helperText="Optional amount currently owed by the customer."
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlatInputText
            label="Primary Phone"
            placeholder="+233 24 123 4567"
            value={primaryPhone}
            onChange={(e) => setPrimaryPhone(formatGhanaPhoneNumber(e.target.value))}
            size="md"
            maxLength={30}
            required
          />
          <FlatInputText
            label="WhatsApp Number"
            placeholder="+233 24 123 4567"
            value={whatsAppNumber}
            onChange={(e) => setWhatsAppNumber(formatGhanaPhoneNumber(e.target.value))}
            size="md"
            maxLength={30}
          />
        </div>

            <SectionLabel>Representative</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FlatInputText
                label="First Name"
                placeholder="First name"
                value={repFirstName}
                onChange={(e) => setRepFirstName(e.target.value)}
                size="md"
                maxLength={80}
                required
              />
              <FlatInputText
                label="Middle Name"
                placeholder="Middle name"
                value={repMiddleName}
                onChange={(e) => setRepMiddleName(e.target.value)}
                size="md"
                maxLength={80}
              />
              <FlatInputText
                label="Last Name"
                placeholder="Last name"
                value={repLastName}
                onChange={(e) => setRepLastName(e.target.value)}
                size="md"
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
                size="md"
              />
              <FlatInputText
                label="Phone"
                placeholder="+233 24 123 4567"
                value={repPhone}
                onChange={(e) => setRepPhone(formatGhanaPhoneNumber(e.target.value))}
                size="md"
                maxLength={30}
                required
              />
              <FlatInputText
                label="Ghana Card No."
                placeholder="GHA-..."
                value={repGhanaCard}
                onChange={(e) => setRepGhanaCard(formatGhanaCardNumber(e.target.value))}
                size="md"
                maxLength={30}
              />
            </div>

        {/* ── Location ───────────────────────────────────────────── */}
        <>
            <div className="mt-5 mb-3 flex items-center justify-between border-b border-portal-border/60 pb-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-portal-muted">Primary Location
                {customer?.primaryLocation?.id && pendingLocationIds.includes(customer.primaryLocation.id) && <span className="ml-2 normal-case tracking-normal text-portal-accent">Update awaiting sync</span>}
              </span>
              {driverMode && isEditing && customer?.primaryLocation?.id && onEditLocation && (
                <button type="button" onClick={() => onEditLocation(customer.primaryLocation!)} className="text-[11px] text-portal-accent hover:text-portal-accent-hover">Edit location</button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {driverMode ? (
                <FlatInputText label="Region" value={customer?.primaryLocation?.regionName || driverMode.region?.name || ''} disabled size="md" />
              ) : (
                <FlatDropdown
                  label="Region"
                  value={locationRegionId}
                  options={regionOptions}
                  onChange={(val: any) => { const v = val?.value !== undefined ? val.value : val; setLocationRegionId(v); if (!isEditing) setRegionId(v); setDistrictId(''); }}
                  placeholder={loadingRegions ? 'Loading...' : 'Select region'}
                  filter
                  filterPlaceholder="Search region..."
                  size="md"
                />
              )}
              <FlatDropdown
                label="District"
                value={districtId}
                options={districtOptions}
                onChange={(val: any) => setDistrictId(val?.value !== undefined ? val.value : val)}
                placeholder={
                  !locationRegionId && !driverMode
                    ? 'Select region first'
                    : loadingDistricts
                    ? 'Loading...'
                    : 'Select district'
                }
                filter
                filterPlaceholder="Search district..."
                size="md"
                disabled={!locationRegionId && !driverMode}
              />
            </div>
            {driverMode && districts.length === 0 && (
              <p className="mt-2 text-[11px] text-portal-muted">
                No districts are saved for this trek region yet. Connect and use Force Full Refresh in Offline & Sync Center to download them. You can still save this customer without a district.
              </p>
            )}

            <FlatTextarea
              label="Street Address"
              placeholder="12 Liberation Road, Accra"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              size="md"
              rows={2}
              maxLength={300}
            />

            <FlatTextarea
              label="Landmark & Directions"
              placeholder="Next to Accra Mall, ground floor..."
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              size="md"
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

            {isEditing && (additionalLocations.length > 0 || onAddLocation) && (
              <div className="mt-4 border-t border-portal-border/50 pt-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {additionalLocations.length > 0 && <button type="button" onClick={() => setShowAdditionalLocations((value) => !value)} className="flex items-center gap-2 text-[11px] text-portal-accent hover:text-portal-accent-hover">
                    <i className={`pi ${showAdditionalLocations ? 'pi-chevron-down' : 'pi-chevron-right'} text-[10px]`} />
                    {showAdditionalLocations ? 'Hide additional locations' : `View additional locations (${additionalLocations.length})`}
                  </button>}
                  {onAddLocation && <button type="button" onClick={onAddLocation} className="flex items-center gap-1 text-[11px] text-portal-accent hover:text-portal-accent-hover">
                    <i className="pi pi-plus text-[10px]" /> Add additional location
                  </button>}
                </div>
                {showAdditionalLocations && additionalLocations.length > 0 && <div className="mt-3 space-y-3">
                  {additionalLocations.map((location, index) => {
                    const hasGps = location.latitude != null && location.longitude != null;
                    return <div key={location.locationId || location.id} className="rounded border border-portal-border bg-portal-canvas p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3 border-b border-portal-border/50 pb-3">
                        <p className="text-xs font-medium text-portal-text">Location {index + 1}
                          {pendingLocationIds.includes(location.locationId || location.id) && <span className="ml-2 text-[11px] font-normal text-portal-accent">Update awaiting sync</span>}
                        </p>
                        {(onEditLocation || onDeleteLocation) && <div className="flex shrink-0 gap-3">
                          {onEditLocation && <button type="button" onClick={() => onEditLocation(location)} className="text-[11px] text-portal-accent hover:text-portal-accent-hover">Edit</button>}
                          {onDeleteLocation && <button type="button" onClick={() => onDeleteLocation(location)} className="text-[11px] text-red-400 hover:text-red-300">Delete</button>}
                        </div>}
                      </div>
                      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">Region</dt><dd className="mt-1 text-xs text-portal-text">{location.regionName || 'Not provided'}</dd></div>
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">District</dt><dd className="mt-1 text-xs text-portal-text">{location.districtName || 'Not provided'}</dd></div>
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">Location type</dt><dd className="mt-1 text-xs text-portal-text">{location.locationType?.replace(/([a-z])([A-Z])/g, '$1 $2') || 'Not provided'}</dd></div>
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">Street address</dt><dd className="mt-1 whitespace-pre-wrap text-xs text-portal-text">{location.streetAddress || 'Not provided'}</dd></div>
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">Landmark & directions</dt><dd className="mt-1 whitespace-pre-wrap text-xs text-portal-text">{location.landmarkAndDirections || 'Not provided'}</dd></div>
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">GPS location</dt><dd className="mt-1 text-xs text-portal-text">{hasGps ? <a href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noopener noreferrer" className="font-mono text-portal-accent hover:text-portal-accent-hover">{location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)} <i className="pi pi-external-link text-[10px]" /></a> : 'Not captured'}</dd></div>
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">GPS accuracy</dt><dd className="mt-1 text-xs text-portal-text">{location.accuracyMetres != null ? `±${location.accuracyMetres.toFixed(1)} m` : 'Unavailable'}</dd></div>
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">Capture method</dt><dd className="mt-1 text-xs text-portal-text">{location.captureMethod?.replace(/([a-z])([A-Z])/g, '$1 $2') || 'Unavailable'}</dd></div>
                        <div><dt className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">Verification</dt><dd className="mt-1 text-xs text-portal-text">{location.verificationStatus?.replace(/([a-z])([A-Z])/g, '$1 $2') || 'Unavailable'}</dd></div>
                      </dl>
                    </div>;
                  })}
                </div>}
              </div>
            )}
          </>

        {/* ── Attachments ─────────────────────────────────────────── */}
        <SectionLabel>Attachments</SectionLabel>

        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => (premisesPreview || customer?.premisesPhotoUrl) ? setShowPremisesViewer(true) : premisesPhotoInputRef.current?.click()}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 border-dashed border-portal-border bg-portal-canvas transition-colors hover:border-portal-accent group"
            aria-label="Choose business premises photo"
          >
            {(premisesPreview || customer?.premisesPhotoUrl) ? <img src={premisesPreview || customer?.premisesPhotoUrl || ''} alt={`${customer?.businessName || 'Business'} premises`} className="h-full w-full object-cover" /> : <i className="pi pi-camera text-lg text-portal-muted transition-colors group-hover:text-portal-accent" />}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"><i className={`pi ${(premisesPreview || customer?.premisesPhotoUrl) ? 'pi-search-plus' : 'pi-upload'} text-xs text-white`} /></span>
          </button>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-portal-text">{premisesPhotoFile ? premisesPhotoFile.name : 'Business premises photo'}</p>
            <p className="text-[11px] text-portal-muted">JPEG, PNG or WebP · Max 5 MB · Optional</p>
            <div className="mt-0.5 flex items-center gap-3">
              <button type="button" onClick={() => premisesPhotoInputRef.current?.click()} className="text-[11px] text-portal-accent hover:text-portal-accent-hover">{premisesPreview || customer?.premisesPhotoUrl ? 'Change photo' : 'Upload photo'}</button>
              {premisesPhotoFile && <button type="button" onClick={() => { setPremisesPhotoFile(null); setPremisesPreview(customer?.premisesPhotoUrl ?? null); }} className="text-[11px] text-red-400 hover:text-red-300">Remove</button>}
            </div>
          </div>
          <input ref={premisesPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePremisesPhotoChange} />
        </div>

        {showPremisesViewer && (premisesPreview || customer?.premisesPhotoUrl) && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80" onClick={() => setShowPremisesViewer(false)}>
            <div className="relative mx-4 w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
              <img src={premisesPreview || customer?.premisesPhotoUrl || ''} alt={`${customer?.businessName || 'Business'} premises`} className="max-h-[70vh] w-full rounded object-contain" />
              <button type="button" onClick={() => setShowPremisesViewer(false)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"><i className="pi pi-times text-xs" /></button>
            </div>
          </div>
        )}

        {/* Representative photo attachment */}
            {/* Portrait upload */}
            <div className="flex items-center gap-4 mb-4">
              {/* Avatar — click to view if photo exists, else click to upload */}
              <button
                type="button"
                onClick={() => portraitPreview ? setShowPortraitViewer(true) : portraitInputRef.current?.click()}
                className="relative w-16 h-16 rounded overflow-hidden border-2 border-dashed border-portal-border hover:border-portal-accent transition-colors flex-shrink-0 group bg-portal-canvas"
              >
                {portraitPreview ? (
                  <img src={portraitPreview} alt="Portrait" className="w-full h-full object-cover" />
                ) : (
                  <i className="pi pi-camera text-lg text-portal-muted group-hover:text-portal-accent transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <i className={`pi ${portraitPreview ? 'pi-search-plus' : 'pi-upload'} text-white text-xs`} />
                </div>
              </button>

              <div className="flex flex-col gap-1">
                <p className="text-xs text-portal-text font-medium">
                  {portraitFile ? portraitFile.name : 'Representative photo'}
                </p>
                <p className="text-[11px] text-portal-muted">
                  JPEG, PNG or WebP · Max 5 MB · Optional
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <button
                    type="button"
                    onClick={() => portraitInputRef.current?.click()}
                    className="text-[11px] text-portal-accent hover:text-portal-accent-hover"
                  >
                    {portraitPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  {portraitFile && (
                    <button
                      type="button"
                      onClick={() => { setPortraitFile(null); setPortraitPreview(customer?.primaryPerson?.portraitUrl ?? null); }}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={portraitInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePortraitChange}
              />
            </div>

            {/* Portrait lightbox */}
            {showPortraitViewer && portraitPreview && (
              <div
                className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center"
                onClick={() => setShowPortraitViewer(false)}
              >
                <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <img src={portraitPreview} alt="Portrait" className="w-full rounded object-contain max-h-[70vh]" />
                  <button
                    type="button"
                    onClick={() => setShowPortraitViewer(false)}
                    className="absolute top-2 right-2 w-7 h-7 rounded bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <i className="pi pi-times text-xs" />
                  </button>
                </div>
              </div>
            )}

        </form>
    </FlatModal>
  );
};

export interface CustomerLocationModalProps {
  visible: boolean;
  onHide: () => void;
  customerName?: string;
  location?: CustomerLocation | null;
  region?: { id: string; name: string };
  districts: District[];
  online?: boolean;
  districtRequired?: boolean;
  includeRegion?: boolean;
  regionLocked?: boolean;
  driverEdit?: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export const CustomerLocationModal: React.FC<CustomerLocationModalProps> = ({
  visible, onHide, customerName, location, region, districts, online = true, districtRequired = true, includeRegion = true, regionLocked = false, driverEdit = false, onSubmit,
}) => {
  const [locationType, setLocationType] = useState<LocationType>('BusinessPremises');
  const [regionId, setRegionId] = useState(region?.id || '');
  const [regions, setRegions] = useState<Region[]>([]);
  const [locationDistricts, setLocationDistricts] = useState<District[]>(districts);
  const [districtId, setDistrictId] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLocationDistricts(districts);
    setRegionId(regionLocked ? region?.id || '' : location?.regionId || (location?.regionName === region?.name ? region?.id || '' : !location?.regionName ? region?.id || '' : ''));
    setLocationType((location?.locationType as LocationType) || 'BusinessPremises');
    setDistrictId(location?.districtId || '');
    setStreetAddress(location?.streetAddress || ''); setLandmark(location?.landmarkAndDirections || '');
    setLatitude(location?.latitude ?? null); setLongitude(location?.longitude ?? null); setAccuracy(location?.accuracyMetres ?? null);
    setIsPrimary(Boolean(location?.isPrimary)); setSaving(false);
  }, [visible, location, region?.id, region?.name, regionLocked]);

  useEffect(() => {
    if (!visible || regionLocked) return;
    organisationApi.getRegions().then(setRegions).catch(() => {});
  }, [visible, regionLocked]);

  useEffect(() => {
    if (!visible || regionLocked || regionId || !location?.regionName || !regions.length) return;
    const match = regions.find((item) => item.name.trim().toLowerCase() === location.regionName?.trim().toLowerCase());
    if (match) setRegionId(match.id);
  }, [visible, regionLocked, regionId, location?.regionName, regions]);

  useEffect(() => {
    if (regionLocked) setLocationDistricts(districts);
  }, [regionLocked, districts]);

  useEffect(() => {
    if (!visible || regionLocked || !regionId) return;
    let active = true;
    setLocationDistricts([]);
    organisationApi.getDistricts(regionId).then((items) => { if (active) setLocationDistricts(items); }).catch(() => {});
    return () => { active = false; };
  }, [visible, regionId, regionLocked]);

  const availableDistricts = useMemo(
    () => {
      const options = locationDistricts.filter((district) => !regionId || !district.regionId || district.regionId === regionId);
      if (regionLocked && location?.districtId && !options.some((district) => district.id === location.districtId)) {
        options.unshift({ id: location.districtId, name: location.districtName || 'Current district', regionId: location.regionId || '' });
      }
      return options;
    },
    [locationDistricts, regionId, regionLocked, location]
  );

  useEffect(() => {
    if (!visible || !location?.districtName || districtId || !availableDistricts.length) return;
    const originalRegionId = location.regionId || regions.find((item) => item.name.trim().toLowerCase() === location.regionName?.trim().toLowerCase())?.id || (location.regionName === region?.name ? region?.id : undefined);
    if (originalRegionId && regionId !== originalRegionId) return;
    const match = availableDistricts.find((item) => item.name.trim().toLowerCase() === location.districtName?.trim().toLowerCase());
    if (match) setDistrictId(match.id);
  }, [visible, location, districtId, availableDistricts, regions, regionId, region?.id, region?.name]);

  const capture = () => {
    if (!navigator.geolocation) { toast.error('Geolocation is not supported by this browser.'); return; }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (position) => { setLatitude(position.coords.latitude); setLongitude(position.coords.longitude); setAccuracy(position.coords.accuracy); setCapturing(false); },
      () => { setCapturing(false); toast.error('Could not capture the current location.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (districtRequired && !location && !regionId) { toast.error('Region is required.'); return; }
    if (districtRequired && !location && !districtId) { toast.error('Select a district.'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        locationType,
        ...(includeRegion && regionId ? { regionId } : {}),
        ...(districtId ? { districtId } : {}),
        ...(streetAddress.trim() ? { streetAddress: streetAddress.trim() } : {}),
        ...(landmark.trim() ? { landmarkAndDirections: landmark.trim() } : {}),
        ...(latitude !== null && longitude !== null ? { latitude, longitude, accuracyMetres: accuracy ?? undefined } : {}),
        isPrimary,
      };
      if (driverEdit && location) {
        delete payload.locationType;
        delete payload.isPrimary;
        delete payload.regionId;
        if (districtId === (location.districtId || '')) delete payload.districtId;
        if (streetAddress.trim() === (location.streetAddress || '').trim()) delete payload.streetAddress;
        else payload.streetAddress = streetAddress.trim();
        if (landmark.trim() === (location.landmarkAndDirections || '').trim()) delete payload.landmarkAndDirections;
        else payload.landmarkAndDirections = landmark.trim();
        if (latitude === location.latitude && longitude === location.longitude && accuracy === location.accuracyMetres) {
          delete payload.latitude; delete payload.longitude; delete payload.accuracyMetres;
        }
        if (!Object.keys(payload).length) { toast('No location changes to save.'); return; }
      }
      await onSubmit(payload);
      onHide();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add location.');
    } finally { setSaving(false); }
  };

  return <FlatModal visible={visible} onHide={() => !saving && onHide()} title={`${location ? 'Edit location' : 'Add additional location'}${customerName ? ` · ${customerName}` : ''}`} size="md"
    footer={<><FlatButton variant="ghost" size="sm" onClick={onHide} disabled={saving}>Cancel</FlatButton><FlatButton size="sm" onClick={submit} loading={saving} disabled={saving || capturing}>Save location</FlatButton></>}>
    <div className="space-y-3">
      {!driverEdit && <FlatDropdown label="Location type" value={locationType} options={[{ label: 'Business premises', value: 'BusinessPremises' }, { label: 'Delivery location', value: 'DeliveryLocation' }, { label: 'Residential', value: 'Residential' }, { label: 'Other', value: 'Other' }]} onChange={(value: any) => setLocationType((value?.value ?? value) as LocationType)} size="md" />}
      {regionLocked ? (
        <FlatInputText label="Region" value={location?.regionName || region?.name || ''} disabled size="md" />
      ) : (
        <FlatDropdown label={`Region${districtRequired && !location ? ' *' : ''}`} value={regionId} options={regions.map((item) => ({ label: item.name, value: item.id }))} onChange={(value: any) => { setRegionId(value?.value ?? value ?? ''); setDistrictId(''); }} placeholder="Select region" filter size="md" />
      )}
      <FlatDropdown label={`District${districtRequired && !location ? ' *' : ''}`} value={districtId} options={availableDistricts.map((district) => ({ label: district.name, value: district.id }))} onChange={(value: any) => setDistrictId(value?.value ?? value ?? '')} placeholder="Select district" filter size="md" disabled={!regionId && districtRequired} />
      <FlatTextarea label="Street Address" value={streetAddress} onChange={(event) => setStreetAddress(event.target.value)} rows={2} maxLength={300} size="md" />
      <FlatTextarea label="Landmark & Directions" value={landmark} onChange={(event) => setLandmark(event.target.value)} rows={2} maxLength={500} size="md" />
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-portal-border/60 bg-portal-canvas/40 p-3">
        <span className="text-[11px] text-portal-muted">{latitude !== null && longitude !== null ? `GPS captured · ±${(accuracy ?? 0).toFixed(1)}m` : online ? 'GPS is optional for an additional location.' : 'Saved offline and queued for sync.'}</span>
        <FlatButton variant="outline" size="sm" leftIcon="pi pi-map-marker" onClick={capture} loading={capturing} disabled={capturing}>{capturing ? 'Capturing...' : latitude !== null ? 'Recapture GPS' : 'Capture GPS'}</FlatButton>
      </div>
      {!driverEdit && <FlatCheckbox checked={isPrimary} onChange={setIsPrimary} label="Make this the primary location" />}
    </div>
  </FlatModal>;
};

export default CustomerModal;
