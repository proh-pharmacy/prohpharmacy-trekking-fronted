import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FlatDataTable,
  resetTableData,
  type ColumnDef,
  type PaginatedDataResponse,
} from '../../../components/data-table';
import { FlatButton, FlatDropdown, FlatTextarea } from '../../../components/flat-form';
import { FlatConfirmDialog, FlatModal } from '../../../components/overlay';
import {
  getApiError,
  PENDING_RETURNS_COUNT_QUERY_KEY,
  returnsApi,
  type GlobalInvoiceReturnReview,
  type ReturnApprovalStatus,
} from '../../../api-client';
import { fmtGhs } from '../../../lib/utils';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
];

const SORT_OPTIONS = [
  { label: 'Newest recorded', value: 'recordedAt_desc' },
  { label: 'Oldest recorded', value: 'recordedAt_asc' },
];

const REJECTION_REASONS = [
  'Product does not match the invoice',
  'Returned quantity could not be verified',
  'Product condition is not eligible for return',
  'Duplicate return request',
  'Return was not authorised',
  'Insufficient return information',
  'Other',
].map((reason) => ({ label: reason, value: reason }));

const STATUS_STYLES: Record<ReturnApprovalStatus, string> = {
  Pending: 'text-portal-orange',
  Approved: 'text-portal-accent',
  Rejected: 'text-red-accent',
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const quantityText = (row: GlobalInvoiceReturnReview) => {
  const quantities = [`${row.basicQtyReturned} ${row.basicUnitName || 'basic units'}`];
  if (Number(row.packagingQtyReturned || 0) > 0) {
    quantities.push(`${row.packagingQtyReturned} ${row.packagingUnitName || 'packages'}`);
  }
  return quantities.join(' · ');
};

const normalizeReturn = (value: any): GlobalInvoiceReturnReview => ({
  returnId: String(value?.returnId ?? ''),
  stopId: String(value?.stopId ?? ''),
  trekId: String(value?.trekId ?? ''),
  trekNumber: value?.trekNumber ?? '',
  trekDate: value?.trekDate ?? '',
  trekStatus: value?.trekStatus ?? '',
  regionName: value?.regionName ?? '',
  driverName: value?.driverName ?? '',
  customerId: String(value?.customerId ?? ''),
  customerName: value?.customerName ?? '',
  customerCode: value?.customerCode ?? '',
  invoiceId: String(value?.invoiceId ?? ''),
  invoiceNumber: value?.invoiceNumber ?? '',
  productId: String(value?.productId ?? ''),
  productName: value?.productName ?? '',
  basicUnitName: value?.basicUnitName ?? '',
  packagingUnitName: value?.packagingUnitName ?? null,
  basicQtyReturned: Number(value?.basicQtyReturned ?? 0),
  packagingQtyReturned: value?.packagingQtyReturned == null ? null : Number(value.packagingQtyReturned),
  basicUnitPrice: Number(value?.basicUnitPrice ?? 0),
  packagingUnitPrice: value?.packagingUnitPrice == null ? null : Number(value.packagingUnitPrice),
  refundAmount: Number(value?.refundAmount ?? 0),
  refundMethod: value?.refundMethod ?? null,
  reason: value?.reason ?? null,
  approvalStatus: value?.approvalStatus ?? 'Pending',
  rejectionReason: value?.rejectionReason ?? null,
  recordedAt: value?.recordedAt ?? '',
  approvedAt: value?.approvedAt ?? null,
  recordedByName: value?.recordedByName ?? null,
  approvedByName: value?.approvedByName ?? null,
});

export const RefundApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [approveTarget, setApproveTarget] = useState<GlobalInvoiceReturnReview | null>(null);
  const [rejectTarget, setRejectTarget] = useState<GlobalInvoiceReturnReview | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [otherRejectionReason, setOtherRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [deciding, setDeciding] = useState(false);

  const dataMapper = useCallback((response: any): PaginatedDataResponse<GlobalInvoiceReturnReview> => {
    const payload = response ?? {};
    const source = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
    const rows = source.map(normalizeReturn);
    return {
      data: rows,
      totalCount: Number(payload.totalCount ?? rows.length),
      totalPages: Number(payload.totalPages ?? 1),
      currentPage: Number(payload.currentPage ?? 1),
      pageSize: Number(payload.pageSize ?? (rows.length || 20)),
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
      approvalStatus: payload.approvalStatus || 'Pending',
      sort: payload.sort || 'recordedAt_desc',
      ...(payload.search?.trim() ? { search: payload.search.trim() } : {}),
      ...(payload.regionId ? { regionId: payload.regionId } : {}),
      ...(payload.trekId ? { trekId: payload.trekId } : {}),
      ...(payload.customerId ? { customerId: payload.customerId } : {}),
      ...(start ? { dateFrom: start.toISOString() } : {}),
      ...(end ? { dateTo: end.toISOString() } : {}),
    };
  }, []);

  const closeReject = () => {
    if (deciding) return;
    setRejectTarget(null);
    setRejectionReason('');
    setOtherRejectionReason('');
    setRejectionError('');
  };

  const approveReturn = async () => {
    if (!approveTarget) return;
    setDeciding(true);
    try {
      await returnsApi.approve(approveTarget.returnId);
      resetTableData();
      void queryClient.invalidateQueries({ queryKey: PENDING_RETURNS_COUNT_QUERY_KEY });
      setApproveTarget(null);
      toast.success('Refund approved.');
    } catch (error) {
      toast.error(getApiError(error)?.message || 'Failed to approve refund.');
    } finally {
      setDeciding(false);
    }
  };

  const rejectReturn = async () => {
    const reason = rejectionReason === 'Other' ? otherRejectionReason.trim() : rejectionReason.trim();
    if (!rejectTarget) return;
    if (!reason) {
      setRejectionError('Enter a reason for rejecting this refund.');
      return;
    }
    if (reason.length > 500) {
      setRejectionError('Reason must be 500 characters or fewer.');
      return;
    }

    setDeciding(true);
    setRejectionError('');
    try {
      await returnsApi.reject(rejectTarget.returnId, reason);
      resetTableData();
      void queryClient.invalidateQueries({ queryKey: PENDING_RETURNS_COUNT_QUERY_KEY });
      setRejectTarget(null);
      setRejectionReason('');
      setOtherRejectionReason('');
      toast.success('Refund rejected.');
    } catch (error) {
      setRejectionError(getApiError(error)?.message || 'Failed to reject refund.');
    } finally {
      setDeciding(false);
    }
  };

  const columns: ColumnDef<GlobalInvoiceReturnReview>[] = useMemo(() => [
    {
      field: 'customerName',
      header: 'Customer',
      body: (row) => (
        <button type="button" onClick={() => navigate(`/portal/customers/${row.customerId}`)} className="text-left">
          <span className="block text-xs font-semibold text-portal-text transition hover:text-portal-accent">{row.customerName || '—'}</span>
          <span className="mt-0.5 block font-mono text-[10px] text-portal-muted">{row.customerCode || '—'}</span>
        </button>
      ),
    },
    {
      field: 'invoiceNumber',
      header: 'Invoice / Trek',
      style: { width: '155px' },
      body: (row) => (
        <div>
          <button type="button" onClick={() => navigate(`/portal/invoices/${encodeURIComponent(row.invoiceNumber)}`)} className="block font-mono text-[11px] font-semibold text-portal-accent transition hover:text-portal-accent-hover">
            {row.invoiceNumber || '—'}
          </button>
          <button type="button" onClick={() => navigate(`/portal/trekking/${row.trekId}`)} className="mt-0.5 block font-mono text-[10px] text-portal-muted transition hover:text-portal-accent">
            {row.trekNumber || '—'}
          </button>
          <span className="mt-0.5 block truncate text-[10px] text-portal-muted" title={`${row.trekDate || 'No trek date'} · ${row.regionName || 'No region'}`}>
            {[row.trekDate, row.regionName].filter(Boolean).join(' · ') || '—'}
          </span>
        </div>
      ),
    },
    {
      field: 'productName',
      header: 'Product',
      body: (row) => (
        <div className="min-w-0">
          <span className="block text-xs font-semibold text-portal-text">{row.productName || '—'}</span>
          {row.reason && <span className="mt-0.5 block truncate text-[11px] text-portal-muted" title={row.reason}>{row.reason}</span>}
        </div>
      ),
    },
    {
      field: 'quantity',
      header: 'Quantity',
      style: { width: '165px' },
      body: (row) => <span className="text-xs text-portal-text">{quantityText(row)}</span>,
    },
    {
      field: 'refundAmount',
      header: 'Refund',
      style: { width: '125px', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => (
        <div className="text-right">
          <span className="block text-xs font-semibold text-portal-text">{fmtGhs(row.refundAmount)}</span>
          <span className="mt-0.5 block text-[10px] text-portal-muted">{row.refundMethod || '—'}</span>
        </div>
      ),
    },
    {
      field: 'recordedAt',
      header: 'Recorded',
      style: { width: '165px' },
      body: (row) => (
        <div>
          <span className="block text-[11px] text-portal-text">{row.recordedAt ? formatDateTime(row.recordedAt) : '—'}</span>
          <span className="mt-0.5 block text-[10px] text-portal-muted">{row.recordedByName || row.driverName || '—'}</span>
        </div>
      ),
    },
    {
      field: 'approvalStatus',
      header: 'Status',
      style: { width: '115px' },
      body: (row) => (
        <div className="min-w-0">
          <span className={`block text-[11px] font-semibold ${STATUS_STYLES[row.approvalStatus]}`}>{row.approvalStatus}</span>
          {row.approvedByName && <span className="mt-0.5 block truncate text-[10px] text-portal-muted" title={row.approvedAt ? `${row.approvedByName} · ${formatDateTime(row.approvedAt)}` : row.approvedByName}>{row.approvedByName}</span>}
          {row.rejectionReason && <span className="mt-0.5 block truncate text-[10px] text-portal-muted" title={row.rejectionReason}>{row.rejectionReason}</span>}
        </div>
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      style: { width: '90px', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => row.approvalStatus === 'Pending' ? (
        <div className="flex items-center justify-end gap-2">
          <FlatButton variant="outline" size="icon-sm" leftIcon="pi pi-check" title="Approve refund" aria-label={`Approve return for ${row.productName}`} onClick={() => setApproveTarget(row)} />
          <FlatButton variant="danger-outline" size="icon-sm" leftIcon="pi pi-times" title="Reject refund" aria-label={`Reject return for ${row.productName}`} onClick={() => setRejectTarget(row)} />
        </div>
      ) : <span className="text-[11px] text-portal-muted">—</span>,
    },
  ], [navigate]);

  return (
    <>
      <FlatDataTable<GlobalInvoiceReturnReview>
        dataSourceUrl="/returns"
        columns={columns}
        heading="Refund Approvals"
        filterable="search"
        filterablePlaceholder="Search invoice, customer or product..."
        enableTableFilter
        enablePaginator
        initialPageSize={20}
        persistFiltersInUrl
        postData={{ approvalStatus: 'Pending', sort: 'recordedAt_desc' }}
        emptyDataText="No refunds found."
        dataMapper={dataMapper}
        parsePayload={parsePayload}
        extendedFilter={{
          enable: true,
          filters: [
            { type: 'SelectFilter', accessor: 'approvalStatus', label: 'Status', args: { options: STATUS_OPTIONS } },
            {
              type: 'AsyncSelectFilter',
              accessor: 'regionId',
              label: 'Region',
              args: { endpointUrl: '/organisation/regions', optionValue: 'id', optionLabel: 'name', pageSize: 20, size: 'sm', placeholder: 'Search regions...' },
            },
            {
              type: 'AsyncSelectFilter',
              accessor: 'trekId',
              label: 'Trek',
              args: { endpointUrl: '/treks', optionValue: 'id', optionLabel: 'trekNumber', pageSize: 20, size: 'sm', placeholder: 'Search treks...' },
            },
            {
              type: 'AsyncSelectFilter',
              accessor: 'customerId',
              label: 'Customer',
              args: { endpointUrl: '/customers', optionValue: 'id', optionLabel: 'businessName', pageSize: 20, size: 'sm', placeholder: 'Search customers...' },
            },
            { type: 'DateRangeFilter', accessor: ['dateFrom', 'dateTo'], label: 'Recorded date' },
            { type: 'SelectFilter', accessor: 'sort', label: 'Sort', args: { options: SORT_OPTIONS } },
          ],
        }}
      />

      <FlatConfirmDialog
        visible={Boolean(approveTarget)}
        onHide={() => !deciding && setApproveTarget(null)}
        onConfirm={approveReturn}
        title="Approve refund"
        message={approveTarget ? (
          <div className="space-y-2">
            <p>Approve this refund and apply its ledger and stock updates?</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <span className="text-portal-muted">Customer</span><span className="text-right text-portal-text">{approveTarget.customerName}</span>
              <span className="text-portal-muted">Invoice</span><span className="text-right font-mono text-portal-text">{approveTarget.invoiceNumber}</span>
              <span className="text-portal-muted">Product</span><span className="text-right text-portal-text">{approveTarget.productName}</span>
              <span className="text-portal-muted">Quantity</span><span className="text-right text-portal-text">{quantityText(approveTarget)}</span>
              <span className="text-portal-muted">Refund</span><span className="text-right font-semibold text-portal-text">{fmtGhs(approveTarget.refundAmount)}</span>
            </div>
          </div>
        ) : null}
        confirmLabel="Approve"
        variant="primary"
        loading={deciding}
      />

      <FlatModal
        visible={Boolean(rejectTarget)}
        onHide={closeReject}
        title="Reject refund"
        size="sm"
        closable={!deciding}
        footer={(
          <>
            <FlatButton variant="outline" size="sm" label="Cancel" onClick={closeReject} disabled={deciding} />
            <FlatButton variant="danger" size="sm" label="Reject" onClick={rejectReturn} loading={deciding} />
          </>
        )}
      >
        <div className="space-y-3">
          <FlatDropdown
            label="Rejection reason"
            value={rejectionReason}
            onChange={(value) => {
              setRejectionReason(value ?? '');
              if (value !== 'Other') setOtherRejectionReason('');
              if (rejectionError) setRejectionError('');
            }}
            options={REJECTION_REASONS}
            optionLabel="label"
            optionValue="value"
            placeholder="Select a reason"
            required
            errorMessage={rejectionReason === 'Other' ? undefined : rejectionError}
            size="sm"
          />
          {rejectionReason === 'Other' && (
            <FlatTextarea
              label="Other reason"
              value={otherRejectionReason}
              onChange={(event) => {
                setOtherRejectionReason(event.target.value);
                if (rejectionError) setRejectionError('');
              }}
              maxLength={500}
              rows={3}
              required
              errorMessage={rejectionError}
              placeholder="Enter rejection reason"
              size="sm"
            />
          )}
        </div>
      </FlatModal>
    </>
  );
};

export default RefundApprovalsPage;
