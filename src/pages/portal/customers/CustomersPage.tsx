import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { FlatDataTable, resetTableData, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { FlatButton, FlatDropdown } from '../../../components/flat-form';
import { FlatModal, FlatConfirmDialog } from '../../../components/overlay';
import { type Customer, type CustomerLocation, organisationApi, customersApi, type CustomerImportMapping } from '../../../api-client';
import { CustomerModal, CustomerLocationModal } from './components/CustomerModal';
import toast from 'react-hot-toast';
import { usePermissions } from '../../../hooks/usePermissions';

// ── Filter options ──────────────────────────────────────────────────
const CUSTOMER_TYPE_FILTER_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Retail Pharmacy', value: 'RetailPharmacy' },
  { label: 'Wholesale Pharmacy', value: 'WholesalePharmacy' },
  { label: 'OTC Medicine Seller', value: 'OTCMedicineSeller' },
  { label: 'Clinic', value: 'Clinic' },
  { label: 'Hospital', value: 'Hospital' },
  { label: 'Chemical Shop', value: 'ChemicalShop' },
  { label: 'Licensed Health Facility', value: 'LicensedHealthFacility' },
  { label: 'Other', value: 'Other' },
];

const CUSTOMER_STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Pending Review', value: 'PendingReview' },
  { label: 'Active', value: 'Active' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Suspended', value: 'Suspended' },
  { label: 'Inactive', value: 'Inactive' },
];

// ── Friendly label helpers ──────────────────────────────────────────
const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  RetailPharmacy: 'Retail Pharmacy',
  WholesalePharmacy: 'Wholesale Pharmacy',
  OTCMedicineSeller: 'OTC Seller',
  Clinic: 'Clinic',
  Hospital: 'Hospital',
  ChemicalShop: 'Chemical Shop',
  LicensedHealthFacility: 'Health Facility',
  Other: 'Other',
};

const STATUS_STYLES: Record<string, string> = {
  Active: 'text-portal-accent',
  PendingReview: 'text-yellow-400',
  Draft: 'text-portal-muted',
  Rejected: 'text-red-accent',
  Suspended: 'text-red-accent',
  Inactive: 'text-portal-muted',
};

const STATUS_LABELS: Record<string, string> = {
  Active: 'Active',
  PendingReview: 'Pending',
  Draft: 'Draft',
  Rejected: 'Rejected',
  Suspended: 'Suspended',
  Inactive: 'Inactive',
};

export const CustomersPage: React.FC = () => {
  const { hasAnyPermission } = usePermissions();
  const canRegisterCustomers = hasAnyPermission('Customers.Register', 'Customers.Create');
  const canEditCustomers = hasAnyPermission('Customers.Edit', 'Customers.Manage');
  const canViewLedger = hasAnyPermission('CustomerCredit.View', 'Ledger.View', 'Ledger.ViewDetails');
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [locationCustomer, setLocationCustomer] = useState<Customer | null>(null);
  const [locationEditing, setLocationEditing] = useState<CustomerLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<CustomerLocation | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMapping, setImportMapping] = useState<CustomerImportMapping>({ businessNameColumn: 'Business Name', customerTypeColumn: 'Type', regionNameColumn: 'Region', primaryPhoneColumn: 'Phone', repFirstNameColumn: 'Rep First Name', repLastNameColumn: 'Rep Last Name', repPhoneColumn: 'Rep Phone', repRelationshipColumn: 'Rep Relationship' });
  const [regionOptions, setRegionOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Regions', value: '' },
  ]);
  const [districtOptions, setDistrictOptions] = useState<{ label: string; value: string; regionId?: string }[]>([
    { label: 'All Districts', value: '' },
  ]);
  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Branches', value: '' },
  ]);

  useEffect(() => {
    Promise.allSettled([
      organisationApi.getRegions(),
      organisationApi.getDistricts(),
      organisationApi.getBranches(),
    ]).then(([regionsResult, districtsResult, branchesResult]) => {
      if (regionsResult.status === 'fulfilled') {
        setRegionOptions([
          { label: 'All Regions', value: '' },
          ...regionsResult.value.map((r) => ({ label: r.name, value: r.id })),
        ]);
      }
      if (districtsResult.status === 'fulfilled') {
        setDistrictOptions([
          { label: 'All Districts', value: '' },
          ...districtsResult.value.map((d) => ({ label: d.name, value: d.id, regionId: d.regionId })),
        ]);
      }
      if (branchesResult.status === 'fulfilled') {
        setBranchOptions([
          { label: 'All Branches', value: '' },
          ...branchesResult.value.map((b) => ({ label: b.name, value: b.id })),
        ]);
      }
    });
  }, []);

  // ── Data mapper ────────────────────────────────────────────────────
  const dataMapper = useCallback(
    (response: any): PaginatedDataResponse<Customer> => {
      const payload = response || {};
      const rawList: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : [];

      const normalized: Customer[] = rawList.map((c: any) => ({
        id: String(c.id || ''),
        customerCode: c.customerCode || '',
        businessName: c.businessName || '',
        tradingName: c.tradingName || undefined,
        customerType: c.customerType || 'Other',
        registrationStatus: c.registrationStatus || 'Active',
        primaryPhoneNumber: c.primaryPhoneNumber || '',
        whatsAppNumber: c.whatsAppNumber || undefined,
        regionId: c.regionId || '',
        regionName: c.regionName || '',
        owningBranchId: c.owningBranchId || undefined,
        owningBranchName: c.owningBranchName || undefined,
        registeredByStaffId: c.registeredByStaffId || undefined,
        registeredByName: c.registeredByName || undefined,
        registeredDuringTrekId: c.registeredDuringTrekId || null,
        clientGeneratedId: c.clientGeneratedId || null,
        createdOffline: Boolean(c.createdOffline),
        premisesPhotoUrl: c.premisesPhotoUrl || null,
        recordedAt: c.recordedAt || undefined,
        createdAt: c.createdAt || '',
        updatedAt: c.updatedAt || null,
        primaryPerson: c.primaryPerson || undefined,
        primaryLocation: c.primaryLocation || undefined,
        locations: Array.isArray(c.locations) ? c.locations : undefined,
        additionalLocations: Array.isArray(c.additionalLocations) ? c.additionalLocations : (Array.isArray(c.locations) ? c.locations : undefined),
      }));

      return {
        data: normalized,
        totalCount: payload?.totalCount ?? normalized.length,
        totalPages: payload?.totalPages ?? 1,
        currentPage: payload?.currentPage ?? 1,
        pageSize: payload?.pageSize ?? normalized.length,
      };
    },
    []
  );

  const parsePaginationPayload = useCallback((payload: any) => {
    return {
      pageNumber: payload.pageNumber || payload.page || 1,
      pageSize: payload.pageSize || 10,
      search: payload.search || undefined,
      sort: payload.sort || 'createdAt_desc',
      ...(payload.regionId     ? { regionId:     payload.regionId }     : {}),
      ...(payload.districtId   ? { districtId:   payload.districtId }   : {}),
      ...(payload.branchId     ? { branchId:     payload.branchId }     : {}),
      ...(payload.customerType ? { customerType: payload.customerType } : {}),
      ...(payload.status       ? { status:       payload.status }       : {}),
    };
  }, []);

  // ── Column definitions ─────────────────────────────────────────────
  const columns: ColumnDef<Customer>[] = useMemo(
    () => [
      {
        field: 'businessName',
        header: 'Business Name',
        body: (row) => (
          <div>
            <button
              type="button"
              onClick={() => navigate(`/portal/customers/${row.id}`)}
              className="text-xs text-portal-text hover:text-portal-accent text-left transition cursor-pointer"
            >
              {row.businessName}
            </button>
            {row.tradingName && (
              <div className="text-[11px] text-portal-muted truncate max-w-sm mt-0.5">
                {row.tradingName}
              </div>
            )}
          </div>
        ),
      },
      {
        field: 'customerCode',
        header: 'Code',
        style: { width: '120px' },
        body: (row) => (
          <span className="font-mono text-xs text-portal-accent">
            {row.customerCode || '—'}
          </span>
        ),
      },
      {
        field: 'customerType',
        header: 'Type',
        style: { width: '140px' },
        body: (row) => (
          <span className="text-xs text-portal-text">
            {CUSTOMER_TYPE_LABELS[row.customerType] || row.customerType}
          </span>
        ),
      },
      {
        field: 'primaryPhoneNumber',
        header: 'Phone',
        style: { width: '140px' },
        body: (row) => (
          <span className="text-[11px] text-portal-text font-mono">
            {row.primaryPhoneNumber || '—'}
          </span>
        ),
      },
      {
        field: 'regionName',
        header: 'Region',
        style: { width: '160px' },
        body: (row) => (
          <span className="text-xs text-portal-text">
            {row.regionName || '—'}
          </span>
        ),
      },
      {
        field: 'registrationStatus',
        header: 'Status',
        style: { width: '100px' },
        body: (row) => (
          <span
            className={`text-xs font-medium ${
              STATUS_STYLES[row.registrationStatus] || 'text-portal-muted'
            }`}
          >
            {STATUS_LABELS[row.registrationStatus] || row.registrationStatus}
          </span>
        ),
      },
      {
        field: 'actions',
        header: 'Actions',
        headerStyle: { textAlign: 'right' },
        style: { width: '140px', textAlign: 'right' },
        body: (row) => (
          <div className="flex items-center justify-end gap-2">
            {canEditCustomers && <FlatButton
                variant="outline"
                size="sm"
                leftIcon="pi pi-pencil"
                onClick={() => {
                  setEditingCustomer(row);
                  setModalVisible(true);
                }}
              >
                Edit
              </FlatButton>}
            {canViewLedger && <FlatButton
                variant="outline"
                size="sm"
                leftIcon="pi pi-wallet"
                onClick={() => navigate(`/portal/customers/${row.id}`)}
              >
                Ledger
              </FlatButton>}
          </div>
        ),
      },
    ],
    []
  );

  const importFields: Array<{ key: keyof CustomerImportMapping; label: string; required?: boolean }> = [
    { key: 'businessNameColumn', label: 'Business name', required: true }, { key: 'customerTypeColumn', label: 'Customer type', required: true }, { key: 'regionNameColumn', label: 'Region', required: true }, { key: 'primaryPhoneColumn', label: 'Primary phone', required: true },
    { key: 'repFirstNameColumn', label: 'Rep first name', required: true }, { key: 'repLastNameColumn', label: 'Rep last name', required: true }, { key: 'repPhoneColumn', label: 'Rep phone', required: true }, { key: 'repRelationshipColumn', label: 'Rep relationship', required: true },
    { key: 'tradingNameColumn', label: 'Trading name' }, { key: 'whatsAppColumn', label: 'WhatsApp' }, { key: 'districtNameColumn', label: 'District' }, { key: 'streetAddressColumn', label: 'Street address' }, { key: 'landmarkColumn', label: 'Landmark' },
    { key: 'openingBalanceColumn', label: 'Opening balance' },
  ];
  const runImport = async () => {
    if (!importFile) { toast.error('Choose an Excel file first.'); return; }
    setImporting(true);
    try {
      const result = await customersApi.importCustomers(importFile, importMapping);
      resetTableData();
      toast.success(
        `${result.imported} customers imported; ${result.skipped} skipped; ${result.openingBalancesCreated ?? 0} opening balances created.`,
      );
      setImportVisible(false);
      setImportFile(null);
    }
    catch (error: any) { toast.error(error.response?.data?.message || 'Customer import failed.'); }
    finally { setImporting(false); }
  };

  const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const inferImportMapping = (headers: string[]) => {
    const normalized = headers.map((header) => ({ header, key: normalizeHeader(header) }));
    const aliases: Record<keyof CustomerImportMapping, string[]> = {
      businessNameColumn: ['businessname', 'customername', 'name'], customerTypeColumn: ['customertype', 'type'], regionNameColumn: ['region', 'regionname'], primaryPhoneColumn: ['primaryphone', 'phone', 'phonenumber'],
      repFirstNameColumn: ['repfirstname', 'representativefirstname', 'firstname'], repLastNameColumn: ['replastname', 'representativelastname', 'lastname'], repPhoneColumn: ['repphone', 'representativephone'], repRelationshipColumn: ['reprelationship', 'relationship', 'relationshiptype'],
      tradingNameColumn: ['tradingname', 'dba'], whatsAppColumn: ['whatsapp', 'whatsappnumber'], repMiddleNameColumn: ['repmiddlename', 'middlename'], ghanaCardColumn: ['ghanacard', 'ghanacardnumber'], districtNameColumn: ['district', 'districtname'], streetAddressColumn: ['street', 'streetaddress', 'address'], landmarkColumn: ['landmark', 'landmarkanddirections'],
      openingBalanceColumn: ['openingbalance', 'openingbalanceamount', 'initialbalance'],
    };
    setImportMapping((current) => Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, normalized.find((item) => names.some((name) => item.key === name || item.key.includes(name)))?.header || current[field as keyof CustomerImportMapping] || ''])) as unknown as CustomerImportMapping);
  };
  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const headers = await new Promise<string[]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => { try { const workbook = XLSX.read(new Uint8Array(event.target?.result as ArrayBuffer), { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }); resolve(((rows[0] as unknown[]) || []).filter(Boolean).map(String)); } catch (error) { reject(error); } };
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsArrayBuffer(file);
      });
      setImportFile(file); setImportHeaders(headers); inferImportMapping(headers);
    } catch { toast.error('Could not read the Excel headers.'); }
  };

  return (
    <div className="space-y-6">
      <FlatDataTable<Customer>
        dataSourceUrl="/customers"
        columns={columns}
        heading="Customers"
        hasAction={canRegisterCustomers}
        actionName="Add Customer"
        actionNameMobile="Add"
        secondaryAction={canRegisterCustomers}
        secondaryActionName="Import Customers"
        secondaryActionNameMobile="Import"
        secondaryActionIcon="pi pi-upload"
        onSecondaryAction={() => setImportVisible(true)}
        onAction={() => {
          setEditingCustomer(null);
          setModalVisible(true);
        }}
        filterable="search"
        filterablePlaceholder="Search by name, code, or phone..."
        enableTableFilter
        enablePaginator
        initialPageSize={10}
        emptyDataText="No customers found."
        dataMapper={dataMapper}
        parsePayload={parsePaginationPayload}
        extendedFilter={{
          enable: true,
          filters: [
            {
              type: 'SelectFilter',
              accessor: 'regionId',
              label: 'Region',
              args: { options: regionOptions },
            },
            {
              type: 'SelectFilter',
              accessor: 'districtId',
              label: 'District',
              args: { options: districtOptions },
            },
            {
              type: 'SelectFilter',
              accessor: 'branchId',
              label: 'Branch',
              args: { options: branchOptions },
            },
            {
              type: 'SelectFilter',
              accessor: 'customerType',
              label: 'Customer Type',
              args: { options: CUSTOMER_TYPE_FILTER_OPTIONS },
            },
            {
              type: 'SelectFilter',
              accessor: 'status',
              label: 'Status',
              args: { options: CUSTOMER_STATUS_FILTER_OPTIONS },
            },
          ],
        }}
      />

      <CustomerModal
        visible={modalVisible}
        onHide={() => {
          setModalVisible(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onAddLocation={() => { setLocationCustomer(editingCustomer); setLocationEditing(null); setModalVisible(false); }}
        onEditLocation={(location) => { setLocationCustomer(editingCustomer); setLocationEditing(location); setModalVisible(false); }}
        onDeleteLocation={setLocationToDelete}
      />
      <FlatConfirmDialog
        visible={locationToDelete !== null}
        onHide={() => setLocationToDelete(null)}
        onConfirm={async () => {
          if (!editingCustomer || !locationToDelete) return;
          try {
            const locationId = locationToDelete.locationId || locationToDelete.id;
            await customersApi.deleteLocation(editingCustomer.id, locationId);
            resetTableData();
            try { setEditingCustomer(await customersApi.getCustomer(editingCustomer.id)); }
            catch { toast.error('Location deleted, but customer details could not be refreshed.'); }
            setLocationToDelete(null);
            toast.success('Location deleted.');
          } catch { toast.error('Could not delete location.'); }
        }}
        title="Delete location?"
        message="This location will be removed from the customer."
        confirmLabel="Delete location"
        variant="danger"
      />
      {locationCustomer && <CustomerLocationModal
        visible={Boolean(locationCustomer)}
        onHide={() => setLocationCustomer(null)}
        customerName={locationCustomer.businessName}
        location={locationEditing}
        region={{ id: locationCustomer.regionId, name: locationCustomer.regionName }}
        districts={districtOptions.filter((option) => option.value).map((option) => ({ id: option.value, name: option.label, regionId: option.regionId || '' }))}
        onSubmit={async (payload) => {
          if (locationEditing) await customersApi.updateLocation(locationCustomer.id, locationEditing.locationId || locationEditing.id, payload as any);
          else await customersApi.addLocation(locationCustomer.id, payload as any);
          resetTableData();
          try { setEditingCustomer(await customersApi.getCustomer(locationCustomer.id)); }
          catch { toast.error('Location saved, but customer details could not be refreshed.'); }
          setLocationCustomer(null);
          setLocationEditing(null);
          toast.success(locationEditing ? 'Location updated.' : 'Additional location added.');
        }}
      />}
      <FlatModal visible={importVisible} onHide={() => !importing && setImportVisible(false)} title="Import customers" size="lg"
        footer={<><FlatButton size="sm" variant="ghost" onClick={() => setImportVisible(false)} disabled={importing}>Cancel</FlatButton><FlatButton size="sm" onClick={() => void runImport()} loading={importing}>Import customers</FlatButton></>}>
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-portal-muted">Upload an <span className="text-portal-text">.xlsx</span> or <span className="text-portal-text">.xls</span> file. Row 1 must contain the spreadsheet headers.</p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-portal-border/60 p-7 transition hover:border-portal-accent/50">
            <i className="pi pi-file-excel text-2xl text-portal-muted" />
            <span className="text-xs text-portal-muted">{importFile ? importFile.name : 'Click to select a file'}</span>
            <span className="text-[11px] text-portal-muted/60">.xlsx or .xls</span>
            <input type="file" accept=".xlsx,.xls" onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)} className="hidden" />
          </label>
          {importFile && <div className="border-t border-portal-border/50 pt-4">
            <p className="mb-3 text-[11px] text-portal-muted">{importHeaders.length ? `Detected ${importHeaders.length} headers and matched the available fields. You can adjust any mapping below.` : 'Map each field to the exact spreadsheet header.'}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {importFields.map((field) => <FlatDropdown key={field.key} label={`${field.label}${field.required ? ' *' : ''}`} options={[{ label: 'Not mapped', value: '' }, ...importHeaders.map((header) => ({ label: header, value: header }))]} value={importMapping[field.key] ?? ''} onChange={(value) => setImportMapping((current) => ({ ...current, [field.key]: value ?? '' }))} placeholder="Select spreadsheet column" size="sm" />)}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-portal-muted">
              Opening balances are optional amounts owed by the customer. Positive amounts create debit entries; zero, negative, or invalid values are ignored.
            </p>
          </div>}
        </div>
      </FlatModal>
    </div>
  );
};

export default CustomersPage;
