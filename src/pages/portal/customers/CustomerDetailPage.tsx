import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { FlatButton, FlatDropdown } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import {
  customersApi,
  type Customer,
  type LedgerEntry,
  type LedgerEntryType,
  type AddLedgerEntryPayload,
} from '../../../api-client';
import { CustomerModal } from './components/CustomerModal';
import { fmtGhs, fmtGhsShort } from '../../../lib/utils';

// ── Constants ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Active: 'text-portal-accent',
  PendingReview: 'text-yellow-400',
  Draft: 'text-portal-muted',
  Rejected: 'text-red-400',
  Suspended: 'text-red-400',
  Inactive: 'text-portal-muted',
};

const STATUS_LABELS: Record<string, string> = {
  Active: 'Active',
  PendingReview: 'Pending Review',
  Draft: 'Draft',
  Rejected: 'Rejected',
  Suspended: 'Suspended',
  Inactive: 'Inactive',
};

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

const ENTRY_TYPE_FILTER_OPTIONS = [
  { label: 'All Entries', value: '' },
  { label: 'Debit', value: 'Debit' },
  { label: 'Credit', value: 'Credit' },
];

const ENTRY_TYPE_OPTIONS: { label: string; value: LedgerEntryType }[] = [
  { label: 'Debit', value: 'Debit' },
  { label: 'Credit', value: 'Credit' },
];

const PAYMENT_METHOD_OPTIONS = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Mobile Money', value: 'MobileMoney' },
  { label: 'Credit', value: 'Credit' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Bank Transfer', value: 'BankTransfer' },
];

// ── Helpers ────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Page ───────────────────────────────────────────────────────────────
export const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  // ── Customer state ─────────────────────────────────────────────────
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Ledger totals (populated via dataMapper side effect) ───────────
  const [totals, setTotals] = useState({ totalDebits: 0, totalCredits: 0, currentBalance: 0 });
  const [refreshTick, setRefreshTick] = useState(0);

  // ── Edit modal state ───────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);

  // ── Export modal state ─────────────────────────────────────────────
  const [exportVisible, setExportVisible] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const resetExportModal = () => {
    setExportFrom('');
    setExportTo('');
    setExportVisible(false);
  };

  const handleExport = async () => {
    if (!customerId || !customer) return;
    setExporting(true);
    try {
      const { blob, filename } = await customersApi.exportCustomerLedger(customerId, {
        ...(exportFrom ? { from: exportFrom } : {}),
        ...(exportTo ? { to: exportTo } : {}),
      });
      saveAs(blob, filename);
      toast.success('Statement downloaded.');
      resetExportModal();
    } catch {
      toast.error('Failed to generate statement.');
    } finally {
      setExporting(false);
    }
  };

  // ── Add entry modal state ──────────────────────────────────────────
  const [addVisible, setAddVisible] = useState(false);
  const [addType, setAddType] = useState<LedgerEntryType>('Debit');
  const [addPaymentMethod, setAddPaymentMethod] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addRecordedAt, setAddRecordedAt] = useState('');
  const [adding, setAdding] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────
  const loadCustomer = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await customersApi.getCustomer(customerId);
      setCustomer(data);
    } catch {
      toast.error('Failed to load customer.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  // ── FlatDataTable wiring ───────────────────────────────────────────
  const dataMapper = useCallback(
    (response: any): PaginatedDataResponse<LedgerEntry> => {
      const payload = response || {};

      setTotals({
        totalDebits: payload.totalDebits ?? 0,
        totalCredits: payload.totalCredits ?? 0,
        currentBalance: payload.currentBalance ?? 0,
      });

      const entries: LedgerEntry[] = Array.isArray(payload.entries) ? payload.entries : [];

      return {
        data: entries,
        totalCount: payload.totalCount ?? entries.length,
        totalPages: payload.totalPages ?? 1,
        currentPage: payload.page ?? 1,
        pageSize: payload.pageSize ?? 20,
      };
    },
    []
  );

  const parsePayload = useCallback((payload: any) => ({
    pageNumber: payload.pageNumber || payload.page || 1,
    pageSize: payload.pageSize || 20,
    ...(payload.entryType ? { entryType: payload.entryType } : {}),
  }), []);

  const columns: ColumnDef<LedgerEntry>[] = useMemo(
    () => [
      {
        field: 'recordedAt',
        header: 'Date',
        style: { width: '110px' },
        body: (row) => (
          <span className="text-xs text-portal-text whitespace-nowrap">
            {formatDate(row.recordedAt)}
          </span>
        ),
      },
      {
        field: 'description',
        header: 'Description',
        body: (row) => (
          <div className="flex items-center gap-2">
            <span className="text-xs text-portal-text">{row.description}</span>
            {row.isAutoGenerated && (
              <span className="text-[10px] font-medium text-portal-muted bg-portal-canvas border border-portal-border px-1.5 py-0.5">
                Auto
              </span>
            )}
          </div>
        ),
      },
      {
        field: 'trekNumber',
        header: 'Trek',
        style: { width: '120px' },
        body: (row) =>
          row.trekNumber ? (
            row.trekId ? (
              <Link
                to={`/portal/trekking/${row.trekId}`}
                className="font-mono text-xs text-portal-accent hover:underline"
              >
                {row.trekNumber}
              </Link>
            ) : (
              <span className="font-mono text-xs text-portal-accent">{row.trekNumber}</span>
            )
          ) : (
            <span className="text-portal-muted text-xs">—</span>
          ),
      },
      {
        field: 'paymentMethod',
        header: 'Payment',
        style: { width: '120px' },
        body: (row) => (
          <span className="text-xs text-portal-text">
            {row.paymentMethod ?? '—'}
          </span>
        ),
      },
      {
        field: 'entryType',
        header: 'Type',
        style: { width: '80px' },
        body: (row) => (
          <span
            className={`text-xs font-medium ${row.entryType === 'Debit' ? 'text-red-400' : 'text-portal-accent'
              }`}
          >
            {row.entryType}
          </span>
        ),
      },
      {
        field: 'amount',
        header: 'Amount',
        style: { width: '120px', textAlign: 'right' },
        headerStyle: { textAlign: 'right' },
        body: (row) => (
          <span className="font-mono text-xs text-white">{fmtGhs(row.amount)}</span>
        ),
      },
      {
        field: 'recordedBy',
        header: 'Recorded By',
        style: { width: '150px' },
        body: (row) => <span className="text-xs text-portal-muted">{row.recordedBy}</span>,
      },
    ],
    []
  );

  // ── Add entry submit ───────────────────────────────────────────────
  const handleAddEntry = async () => {
    if (!customerId) return;
    const amt = parseFloat(addAmount);
    if (!addType) { toast.error('Entry type is required.'); return; }
    if (!addAmount || isNaN(amt) || amt <= 0) { toast.error('A positive amount is required.'); return; }
    if (!addDescription.trim()) { toast.error('Description is required.'); return; }

    const payload: AddLedgerEntryPayload = {
      entryType: addType,
      amount: amt,
      description: addDescription.trim(),
      ...(addType === 'Credit' && addPaymentMethod ? { paymentMethod: addPaymentMethod } : {}),
      ...(addRecordedAt ? { recordedAt: addRecordedAt } : {}),
    };

    setAdding(true);
    try {
      await customersApi.addLedgerEntry(customerId, payload);
      toast.success('Ledger entry added.');
      resetAddModal();
      setRefreshTick((t) => t + 1);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to add entry.';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const resetAddModal = () => {
    setAddAmount('');
    setAddPaymentMethod('');
    setAddDescription('');
    setAddRecordedAt('');
    setAddType('Debit');
    setAddVisible(false);
  };

  // ── Balance tile color ─────────────────────────────────────────────
  const balanceColor = totals.currentBalance > 0 ? 'text-orange-400' : 'text-portal-accent';

  // ── Loading / not found states ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-portal-muted text-xs gap-2">
        <i className="pi pi-spin pi-spinner" /> Loading customer...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-portal-muted text-sm">Customer not found.</p>
        <FlatButton
          variant="outline"
          size="sm"
          leftIcon="pi pi-arrow-left"
          onClick={() => navigate('/portal/customers')}
        >
          Back to Customers
        </FlatButton>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[customer.registrationStatus] ?? 'text-portal-muted';
  const statusLabel = STATUS_LABELS[customer.registrationStatus] ?? customer.registrationStatus;
  const typeLabel = CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType;

  const infoTiles = [
    { label: 'Phone', value: customer.primaryPhoneNumber },
    { label: 'WhatsApp', value: customer.whatsAppNumber },
    { label: 'Primary Contact', value: customer.primaryPerson?.fullName },
    { label: 'Branch', value: customer.owningBranchName },
  ].filter((t) => t.value);

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb + header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[11px] text-portal-muted hover:text-portal-accent transition-colors w-fit"
          >
            <i className="pi pi-arrow-left text-[10px]" /> Back
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">{customer.businessName}</h1>
            <span className="w-px h-4 bg-portal-border shrink-0" />
            <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
          </div>
          <p className="text-xs text-portal-muted">
            {typeLabel}
            {customer.regionName ? ` · ${customer.regionName}` : ''}
            {customer.owningBranchName ? ` · ${customer.owningBranchName}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <FlatButton
            variant="outline"
            size="sm"
            leftIcon="pi pi-download"
            onClick={() => setExportVisible(true)}
          >
            Export
          </FlatButton>
          <FlatButton
            variant="outline"
            size="sm"
            leftIcon="pi pi-pencil"
            onClick={() => setEditVisible(true)}
          >
            Edit
          </FlatButton>
        </div>
      </div>

      {/* ── Info tiles ── */}
      {infoTiles.length > 0 && (
        <div className="flex gap-3">
          {infoTiles.map(({ label, value }) => (
            <div key={label} className="flex-1 bg-portal-surface border border-portal-border/60 p-3">
              <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">{label}</p>
              <p className="text-xs font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Balance summary tiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Debits</p>
          <p className="text-xs font-medium text-red-400 truncate" title={fmtGhs(totals.totalDebits)}>{fmtGhsShort(totals.totalDebits)}</p>
        </div>
        <div className="bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Credits</p>
          <p className="text-xs font-medium text-portal-accent truncate" title={fmtGhs(totals.totalCredits)}>{fmtGhsShort(totals.totalCredits)}</p>
        </div>
        <div className="bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Balance</p>
          <p className={`text-xs font-medium truncate ${balanceColor}`} title={fmtGhs(totals.currentBalance)}>{fmtGhsShort(totals.currentBalance)}</p>
        </div>
      </div>

      {/* ── Ledger table ── */}
      <FlatDataTable<LedgerEntry>
        key={refreshTick}
        dataSourceUrl={`/customers/${customerId}/ledger`}
        columns={columns}
        heading="Ledger"
        hasAction
        actionName="Add Entry"
        onAction={() => setAddVisible(true)}
        enablePaginator
        initialPageSize={20}
        emptyDataText="No ledger entries yet."
        dataMapper={dataMapper}
        parsePayload={parsePayload}
        extendedFilter={{
          enable: true,
          filters: [
            {
              type: 'SelectFilter',
              accessor: 'entryType',
              label: 'Type',
              args: { options: ENTRY_TYPE_FILTER_OPTIONS },
            },
          ],
        }}
      />

      {/* ── Export Statement Modal ── */}
      <FlatModal
        visible={exportVisible}
        onHide={resetExportModal}
        title="Export Ledger Statement"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <FlatButton
              variant="danger-outline"
              label="Cancel"
              onClick={resetExportModal}
              disabled={exporting}
            />
            <FlatButton
              variant="primary"
              label={exporting ? 'Generating...' : 'Download'}
              icon="pi pi-download"
              onClick={handleExport}
              loading={exporting}
              disabled={exporting}
            />
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-portal-muted">
            Leave dates empty to export the full history.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
                From
              </label>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
                To
              </label>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent"
              />
            </div>
          </div>
        </div>
      </FlatModal>

      {/* ── Edit Customer Modal ── */}
      <CustomerModal
        visible={editVisible}
        onHide={() => {
          setEditVisible(false);
          loadCustomer();
        }}
        customer={customer}
      />

      {/* ── Add Ledger Entry Modal ── */}
      <FlatModal
        visible={addVisible}
        onHide={resetAddModal}
        title="Add Ledger Entry"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <FlatButton
              variant="danger-outline"
              label="Cancel"
              onClick={resetAddModal}
              disabled={adding}
            />
            <FlatButton
              variant="primary"
              label={adding ? 'Adding...' : 'Add Entry'}
              icon="pi pi-check"
              onClick={handleAddEntry}
              loading={adding}
              disabled={adding}
            />
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Entry Type
            </label>
            <FlatDropdown
              value={addType}
              options={ENTRY_TYPE_OPTIONS}
              onChange={(val: any) => setAddType(val?.value !== undefined ? val.value : val)}
              placeholder="Select type"
              size="sm"
            />
          </div>

          {addType === 'Credit' && (
            <div>
              <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
                Payment Method <span className="text-portal-muted font-normal normal-case">(optional)</span>
              </label>
              <FlatDropdown
                value={addPaymentMethod}
                options={PAYMENT_METHOD_OPTIONS}
                onChange={(val: any) => setAddPaymentMethod(val?.value !== undefined ? val.value : val)}
                placeholder="Select method"
                size="sm"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Amount (GHS)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              placeholder="0.00"
              className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              placeholder="e.g. Payment received for order #1234"
              className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Date <span className="text-portal-muted font-normal normal-case">(optional)</span>
            </label>
            <input
              type="date"
              value={addRecordedAt}
              onChange={(e) => setAddRecordedAt(e.target.value)}
              className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent"
            />
          </div>
        </div>
      </FlatModal>
    </div>
  );
};

export default CustomerDetailPage;
