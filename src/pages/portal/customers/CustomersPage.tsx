import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import { type Customer, organisationApi } from '../../../api-client';
import { CustomerModal } from './components/CustomerModal';

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
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [regionOptions, setRegionOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Regions', value: '' },
  ]);
  const [districtOptions, setDistrictOptions] = useState<{ label: string; value: string }[]>([
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
          ...districtsResult.value.map((d) => ({ label: d.name, value: d.id })),
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
        createdAt: c.createdAt || '',
        updatedAt: c.updatedAt || null,
        primaryPerson: c.primaryPerson || undefined,
        primaryLocation: c.primaryLocation || undefined,
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
              className="font-bold text-xs text-white hover:text-portal-accent text-left transition cursor-pointer"
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
            <FlatButton
              variant="outline"
              size="sm"
              leftIcon="pi pi-pencil"
              onClick={() => {
                setEditingCustomer(row);
                setModalVisible(true);
              }}
            >
              Edit
            </FlatButton>
            <FlatButton
              variant="outline"
              size="sm"
              leftIcon="pi pi-wallet"
              onClick={() => navigate(`/portal/customers/${row.id}`)}
            >
              Ledger
            </FlatButton>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <FlatDataTable<Customer>
        dataSourceUrl="/customers"
        columns={columns}
        heading="Customers"
        hasAction
        actionName="Add Customer"
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
      />
    </div>
  );
};

export default CustomersPage;
