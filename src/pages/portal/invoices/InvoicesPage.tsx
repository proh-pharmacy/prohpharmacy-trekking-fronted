import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { fmtGhs } from '../../../lib/utils';
import type { InvoiceListFilters, SaleInvoice } from '../../../api-client';
import { InvoiceExportModal } from './InvoiceExportModal';

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Issued', value: 'Issued' },
  { label: 'Partially paid', value: 'PartiallyPaid' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Voided', value: 'Voided' },
];

const SORT_OPTIONS = [
  { label: 'Newest issued', value: 'issuedAt_desc' },
  { label: 'Oldest issued', value: 'issuedAt_asc' },
  { label: 'Invoice number A–Z', value: 'invoiceNumber_asc' },
  { label: 'Invoice number Z–A', value: 'invoiceNumber_desc' },
  { label: 'Highest total', value: 'totalAmount_desc' },
  { label: 'Lowest total', value: 'totalAmount_asc' },
];

const STATUS_STYLES: Record<string, string> = {
  Issued: 'text-portal-muted',
  PartiallyPaid: 'text-portal-orange',
  Paid: 'text-portal-accent',
  Voided: 'text-red-accent',
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const normalizeInvoice = (value: any): SaleInvoice => ({
  id: String(value?.id ?? ''),
  invoiceNumber: value?.invoiceNumber ?? null,
  status: value?.status ?? 'Issued',
  issuedAt: value?.issuedAt ?? '',
  createdOffline: Boolean(value?.createdOffline),
  trekkingTripId: String(value?.trekkingTripId ?? ''),
  trekNumber: value?.trekNumber ?? '',
  trekDate: value?.trekDate ?? '',
  driverName: value?.driverName ?? '',
  salesStaffName: value?.salesStaffName ?? null,
  vehicleDisplayName: value?.vehicleDisplayName ?? '',
  regionName: value?.regionName ?? '',
  customerAccountId: String(value?.customerAccountId ?? ''),
  customerName: value?.customerName ?? '',
  customerCode: value?.customerCode ?? '',
  customerTradingName: value?.customerTradingName ?? null,
  customerPhone: value?.customerPhone ?? '',
  customerWhatsAppNumber: value?.customerWhatsAppNumber ?? null,
  customerRegionName: value?.customerRegionName ?? '',
  totalAmount: Number(value?.totalAmount ?? 0),
  totalPaid: Number(value?.totalPaid ?? 0),
  balance: Number(value?.balance ?? 0),
  lineItems: Array.isArray(value?.lineItems) ? value.lineItems : [],
});

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [exportVisible, setExportVisible] = useState(false);
  const [exportFilters, setExportFilters] = useState<InvoiceListFilters>({});

  const openExport = () => {
    const query = new URLSearchParams(window.location.search);
    const keys: Array<keyof InvoiceListFilters> = ['customerId', 'trekId', 'regionId', 'status', 'dateFrom', 'dateTo'];
    const filters: InvoiceListFilters = {};
    keys.forEach((key) => {
      const value = query.get(key)?.trim();
      if (value) filters[key] = value;
    });
    setExportFilters(filters);
    setExportVisible(true);
  };

  const dataMapper = useCallback((response: any): PaginatedDataResponse<SaleInvoice> => {
    const payload = response ?? {};
    const source = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
    const invoices = source.map(normalizeInvoice);
    return {
      data: invoices,
      totalCount: Number(payload.totalCount ?? invoices.length),
      totalPages: Number(payload.totalPages ?? 1),
      currentPage: Number(payload.currentPage ?? 1),
      pageSize: Number(payload.pageSize ?? (invoices.length || 20)),
    };
  }, []);

  const parsePayload = useCallback((payload: any) => {
    const toDate = (value: unknown) => {
      if (!value) return null;
      const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const start = toDate(payload.dateFrom);
    const end = toDate(payload.dateTo);
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return {
      pageNumber: payload.pageNumber || 1,
      pageSize: payload.pageSize || 20,
      sort: payload.sort || 'issuedAt_desc',
      ...(payload.search?.trim() ? { search: payload.search.trim() } : {}),
      ...(payload.customerId ? { customerId: payload.customerId } : {}),
      ...(payload.trekId ? { trekId: payload.trekId } : {}),
      ...(payload.regionId ? { regionId: payload.regionId } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(start ? { dateFrom: start.toISOString() } : {}),
      ...(end ? { dateTo: end.toISOString() } : {}),
    };
  }, []);

  const columns: ColumnDef<SaleInvoice>[] = useMemo(() => [
    {
      field: 'invoiceNumber',
      header: 'Invoice',
      style: { width: '150px' },
      body: (row) => row.invoiceNumber ? (
        <button
          type="button"
          onClick={() => navigate(`/portal/invoices/${encodeURIComponent(row.invoiceNumber!)}`)}
          className="font-mono text-xs font-semibold text-portal-accent transition hover:text-portal-accent-hover"
        >
          {row.invoiceNumber}
        </button>
      ) : <span className="text-xs text-portal-muted">—</span>,
    },
    {
      field: 'customerName',
      header: 'Customer',
      body: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/portal/customers/${row.customerAccountId}`)}
          className="text-left text-xs font-semibold text-portal-text transition hover:text-portal-accent"
        >
          {row.customerName || '—'}
        </button>
      ),
    },
    {
      field: 'trekNumber',
      header: 'Trek',
      style: { width: '125px' },
      body: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/portal/trekking/${row.trekkingTripId}`)}
          className="font-mono text-[11px] text-portal-text transition hover:text-portal-accent"
        >
          {row.trekNumber || '—'}
        </button>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      style: { width: '115px' },
      body: (row) => <span className={`text-[11px] font-semibold ${STATUS_STYLES[row.status] ?? 'text-portal-muted'}`}>{row.status === 'PartiallyPaid' ? 'Partially paid' : row.status}</span>,
    },
    {
      field: 'totalAmount',
      header: 'Total',
      style: { width: '130px', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => <span className="block text-right text-xs font-semibold text-portal-text">{fmtGhs(row.totalAmount)}</span>,
    },
    {
      field: 'totalPaid',
      header: 'Paid',
      style: { width: '130px', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => <span className="block text-right text-xs text-portal-accent">{fmtGhs(row.totalPaid)}</span>,
    },
    {
      field: 'balance',
      header: 'Balance',
      style: { width: '130px', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => <span className={`block text-right text-xs font-semibold ${row.balance > 0 ? 'text-portal-orange' : 'text-portal-muted'}`}>{fmtGhs(row.balance)}</span>,
    },
    {
      field: 'issuedAt',
      header: 'Issued',
      style: { width: '155px' },
      body: (row) => <span className="text-[11px] text-portal-muted">{row.issuedAt ? formatDateTime(row.issuedAt) : '—'}</span>,
    },
  ], [navigate]);

  return (
    <>
      <FlatDataTable<SaleInvoice>
      dataSourceUrl="/invoices"
      columns={columns}
      heading="Invoices"
      hasAction
      actionName="Export"
      actionIcon="pi pi-download"
      onAction={openExport}
      filterable="search"
      filterablePlaceholder="Search invoice number..."
      enableTableFilter
      enablePaginator
      initialPageSize={20}
      persistFiltersInUrl
      emptyDataText="No invoices found."
      dataMapper={dataMapper}
      parsePayload={parsePayload}
      extendedFilter={{
        enable: true,
        filters: [
          {
            type: 'AsyncSelectFilter',
            accessor: 'regionId',
            label: 'Region',
            args: {
              endpointUrl: '/organisation/regions',
              optionValue: 'id',
              optionLabel: 'name',
              pageSize: 20,
              size: 'sm',
              placeholder: 'Search regions...',
            },
          },
          {
            type: 'AsyncSelectFilter',
            accessor: 'customerId',
            label: 'Customer',
            args: {
              endpointUrl: '/customers',
              optionValue: 'id',
              optionLabel: 'businessName',
              pageSize: 20,
              size: 'sm',
              placeholder: 'Search customers...',
            },
          },
          {
            type: 'AsyncSelectFilter',
            accessor: 'trekId',
            label: 'Trek',
            args: {
              endpointUrl: '/treks',
              optionValue: 'id',
              optionLabel: 'trekNumber',
              pageSize: 20,
              size: 'sm',
              placeholder: 'Search treks...',
            },
          },
          { type: 'SelectFilter', accessor: 'status', label: 'Status', args: { options: STATUS_OPTIONS } },
          { type: 'DateRangeFilter', accessor: ['dateFrom', 'dateTo'], label: 'Issued date' },
          { type: 'SelectFilter', accessor: 'sort', label: 'Sort', args: { options: SORT_OPTIONS } },
        ],
      }}
      />
      <InvoiceExportModal
        visible={exportVisible}
        filters={exportFilters}
        onHide={() => setExportVisible(false)}
      />
    </>
  );
};

export default InvoicesPage;
