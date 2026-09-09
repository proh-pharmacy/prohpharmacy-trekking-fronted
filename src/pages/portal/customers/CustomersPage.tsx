import React, { useState, useMemo, useCallback } from 'react';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import { type Customer } from '../../../api-client';
import { CustomerModal } from './components/CustomerModal';

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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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
              onClick={() => {
                setEditingCustomer(row);
                setModalVisible(true);
              }}
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
        style: { width: '80px', textAlign: 'right' },
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
