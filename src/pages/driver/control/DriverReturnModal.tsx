import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { PaymentMethod } from '../../../api-client/treks';
import { resetTableData } from '../../../components/data-table';
import { FlatAsyncSelect, FlatButton, FlatDatePicker, FlatDropdown, FlatInputNumber, FlatInputText } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay/FlatModal';
import { fmtGhs } from '../../../lib/utils';
import { captureGps, fieldApi, type FieldCustomer, type ReturnableInvoice, type ReturnableInvoiceLineItem } from './api';

const REFUND_METHODS: Array<{ label: string; value: PaymentMethod }> = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Mobile Money', value: 'MobileMoney' },
  { label: 'Credit', value: 'Credit' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Bank Transfer', value: 'BankTransfer' },
];

const RETURN_REASONS = [
  'Damaged product',
  'Expired product',
  'Near expiry',
  'Wrong product supplied',
  'Excess quantity supplied',
  'Packaging damaged',
  'Product quality concern',
  'Order cancelled',
  'Other',
].map((reason) => ({ label: reason, value: reason }));

interface ReturnRow {
  basicQuantity: number | null;
  packagingQuantity: number | null;
  refundMethod: PaymentMethod | '';
  reason: string;
  customReason: string;
}

interface DriverReturnModalProps {
  token: string;
  customers: FieldCustomer[];
  visible: boolean;
  online: boolean;
  onHide: () => void;
  onSaved: () => Promise<unknown>;
}

const errorMessage = (error: unknown): string => {
  const response = (error as { response?: { data?: { detail?: string; message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return response?.detail || response?.message || (response?.errors ? Object.values(response.errors).flat().join(' ') : '') || 'The return could not be recorded.';
};

const dateParam = (date: Date | null): string | undefined => {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const emptyRow = (): ReturnRow => ({ basicQuantity: null, packagingQuantity: null, refundMethod: '', reason: '', customReason: '' });

export const DriverReturnModal: React.FC<DriverReturnModalProps> = ({ token, customers, visible, online, onHide, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<ReturnableInvoice | null>(null);
  const [rows, setRows] = useState<Record<string, ReturnRow>>({});

  const resetInvoice = () => {
    setInvoiceId('');
    setSelectedInvoice(null);
    setRows({});
  };

  const reset = () => {
    setCustomerId('');
    setFromDate(null);
    setToDate(null);
    resetInvoice();
  };

  const fetchInvoices = useCallback(async ({ search }: { pageNumber: number; pageSize: number; search?: string }) => {
    if (!customerId || !online) return { data: [], totalPages: 1, totalCount: 0 };
    try {
      const items = await fieldApi.getCustomerInvoices(token, customerId, {
        invoiceNumber: search,
        from: dateParam(fromDate),
        to: dateParam(toDate),
      });
      return { data: items, totalPages: 1, totalCount: items.length };
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }, [customerId, fromDate, online, toDate, token]);

  useEffect(() => {
    if (!visible) return;
    reset();
  }, [visible]);

  const customerOptions = useMemo(() => customers
    .filter((customer) => Boolean(customer.id))
    .map((customer) => ({
      label: customer.customerCode ? `${customer.businessName} · ${customer.customerCode}` : customer.businessName,
      value: customer.id,
    })), [customers]);
  const setInvoice = (value: string, invoice?: ReturnableInvoice) => {
    setInvoiceId(value || '');
    setSelectedInvoice(invoice ?? null);
    setRows(Object.fromEntries((invoice?.lineItems ?? []).map((item) => [item.productId, emptyRow()])));
  };

  const updateRow = (productId: string, changes: Partial<ReturnRow>) => {
    setRows((current) => ({ ...current, [productId]: { ...(current[productId] ?? emptyRow()), ...changes } }));
  };

  const itemRefund = (product: ReturnableInvoiceLineItem): number => {
    const row = rows[product.productId] ?? emptyRow();
    return Number(row.basicQuantity ?? 0) * Number(product.basicUnitPrice)
      + Number(row.packagingQuantity ?? 0) * Number(product.packagingUnitPrice ?? 0);
  };

  const selectedProducts = selectedInvoice?.lineItems.filter((product) => Number(rows[product.productId]?.basicQuantity ?? 0) > 0) ?? [];
  const totalRefund = selectedProducts.reduce((total, product) => total + itemRefund(product), 0);

  const close = () => {
    if (saving) return;
    reset();
    onHide();
  };

  const save = async () => {
    if (!online) { toast.error('Connect to the internet to record a return.'); return; }
    if (!customerId || !selectedInvoice) { toast.error('Select a customer and invoice.'); return; }
    if (selectedProducts.length === 0) { toast.error('Enter a returned quantity for at least one product.'); return; }

    for (const product of selectedProducts) {
      const row = rows[product.productId];
      if (Number(row.basicQuantity) > Number(product.basicQtyDelivered ?? 0)
        || Number(row.packagingQuantity ?? 0) > Number(product.packagingQtyDelivered ?? 0)) {
        toast.error(`Returned quantity for ${product.productName} exceeds the delivered quantity.`);
        return;
      }
      if (row.packagingQuantity != null && row.packagingQuantity <= 0) {
        toast.error(`Enter a positive ${product.packagingUnitName || 'packaging'} quantity for ${product.productName}, or leave it empty.`);
        return;
      }
      if (row.reason === 'Other' && !row.customReason.trim()) {
        toast.error(`Enter the return reason for ${product.productName}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const gps = await captureGps();
      const response = await fieldApi.recordCustomerReturns(token, {
        customerAccountId: customerId,
        saleInvoiceId: selectedInvoice.id,
        items: selectedProducts.map((product) => {
          const row = rows[product.productId];
          return {
            productId: product.productId,
            basicQtyReturned: row.basicQuantity,
            ...(row.packagingQuantity != null ? { packagingQtyReturned: row.packagingQuantity } : {}),
            ...(row.refundMethod ? { refundMethod: row.refundMethod } : {}),
            ...(row.reason ? { reason: row.reason === 'Other' ? row.customReason.trim() : row.reason } : {}),
          };
        }),
        ...(gps ? { gps } : {}),
      });
      resetTableData();
      await onSaved();
      toast.success(response.stopWasAutoAdded ? 'Return submitted and customer added to this trek.' : 'Return submitted for approval.');
      reset();
      onHide();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={close}
      title="Record return"
      size="lg"
      footer={(
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs text-portal-muted">{selectedProducts.length} selected · <strong className="text-red-accent">{fmtGhs(totalRefund)}</strong></span>
          <div className="flex gap-2">
            <FlatButton size="sm" variant="outline" onClick={close} disabled={saving}>Cancel</FlatButton>
            <FlatButton size="sm" variant="danger" onClick={() => void save()} loading={saving} disabled={saving || !online || selectedProducts.length === 0}>Submit return</FlatButton>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        <FlatDropdown
          id="driver-return-customer"
          label="Customer"
          value={customerId}
          options={customerOptions}
          onChange={(value) => {
            const next = value ?? '';
            setCustomerId(next);
            setFromDate(null);
            setToDate(null);
            resetInvoice();
          }}
          placeholder="Select a customer"
          filter
          showClear
          size="sm"
        />

        {customerId && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(240px,1fr)_150px_150px] sm:items-end">
            <FlatAsyncSelect<ReturnableInvoice>
              key={`${customerId}:${dateParam(fromDate) ?? ''}:${dateParam(toDate) ?? ''}`}
              id="driver-return-invoice"
              label="Invoice"
              value={invoiceId}
              initialSelectedItem={selectedInvoice ?? undefined}
              onChange={(value, invoice) => setInvoice(value ?? '', invoice)}
              fetchFn={fetchInvoices}
              optionValue="id"
              optionLabel={(invoice) => invoice.invoiceNumber || 'Invoice'}
              itemTemplate={(invoice) => (
                <div>
                  <span className="text-xs font-semibold text-portal-text">{invoice.invoiceNumber || 'Invoice'}</span>
                  <span className="ml-2 text-[11px] text-portal-muted">
                    {new Date(invoice.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {fmtGhs(invoice.totalAmount)}
                  </span>
                </div>
              )}
              selectedItemTemplate={(invoice) => (
                <span className="truncate text-xs text-portal-text">
                  {invoice.invoiceNumber || 'Invoice'} <span className="text-portal-muted">· {new Date(invoice.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {fmtGhs(invoice.totalAmount)}</span>
                </span>
              )}
              placeholder="Search invoice number"
              disabled={!online}
              pageSize={20}
              size="sm"
            />
            <FlatDatePicker id="driver-return-from" label="From" value={fromDate} onChange={(value: Date | null) => { resetInvoice(); setFromDate(value); }} maxDate={toDate ?? undefined} size="sm" />
            <FlatDatePicker id="driver-return-to" label="To" value={toDate} onChange={(value: Date | null) => { resetInvoice(); setToDate(value); }} minDate={fromDate ?? undefined} size="sm" />
          </div>
        )}

        {selectedInvoice && (
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-portal-border/50 pb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-portal-muted">Products</span>
              <span className="text-[11px] text-portal-muted">Invoice total · {fmtGhs(selectedInvoice.totalAmount)}</span>
            </div>
            {selectedInvoice.lineItems.map((product) => {
              const row = rows[product.productId] ?? emptyRow();
              const selected = Number(row.basicQuantity ?? 0) > 0;
              return (
                <div key={product.productId} className={`rounded border p-3 transition-colors ${selected ? 'border-red-accent/50 bg-red-accent/5' : 'border-portal-border/60 bg-portal-canvas/30'}`}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(180px,1fr)_150px_150px] sm:items-end">
                    <div>
                      <span className="block text-xs font-semibold text-portal-text">{product.productName}</span>
                      <span className="mt-1 block text-[11px] text-portal-muted">Delivered · {product.packagingUnitName && Number(product.packagingQtyDelivered ?? 0) > 0 ? `${Number(product.packagingQtyDelivered).toLocaleString()} ${product.packagingUnitName} · ` : ''}{Number(product.basicQtyDelivered ?? 0).toLocaleString()} {product.basicUnitName || 'units'}</span>
                      <span className="mt-0.5 block text-[10px] text-portal-muted">{fmtGhs(product.basicUnitPrice)} / {product.basicUnitName || 'unit'}{product.packagingUnitName && product.packagingUnitPrice != null ? ` · ${fmtGhs(product.packagingUnitPrice)} / ${product.packagingUnitName}` : ''}</span>
                    </div>
                    <FlatInputNumber id={`return-basic-${product.productId}`} label={`${product.basicUnitName || 'Unit'} quantity`} value={row.basicQuantity} onChange={(value) => updateRow(product.productId, { basicQuantity: value })} min={0} max={Number(product.basicQtyDelivered ?? 0)} maxFractionDigits={2} size="sm" />
                    {product.packagingUnitName ? (
                      <FlatInputNumber id={`return-packaging-${product.productId}`} label={`${product.packagingUnitName} quantity`} value={row.packagingQuantity} onChange={(value) => updateRow(product.productId, { packagingQuantity: value })} min={0} max={Number(product.packagingQtyDelivered ?? 0)} maxFractionDigits={2} size="sm" />
                    ) : <div />}
                  </div>
                  {selected && (
                    <div className="mt-3 border-t border-portal-border/40 pt-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
                        <FlatDropdown id={`return-method-${product.productId}`} label="Refund method" value={row.refundMethod} options={REFUND_METHODS} onChange={(value) => updateRow(product.productId, { refundMethod: value ?? '' })} placeholder="Select a method" size="sm" />
                        <FlatDropdown id={`return-reason-${product.productId}`} label="Return reason" value={row.reason} options={RETURN_REASONS} onChange={(value) => updateRow(product.productId, { reason: value ?? '', customReason: value === 'Other' ? row.customReason : '' })} placeholder="Select a reason" size="sm" />
                        {row.reason === 'Other' && (
                          <div className="sm:col-start-2">
                            <FlatInputText id={`return-custom-reason-${product.productId}`} label="Other reason" value={row.customReason} onChange={(event) => updateRow(product.productId, { customReason: event.target.value })} maxLength={500} placeholder="Enter reason" size="sm" />
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex justify-end border-t border-portal-border/40 pt-1.5 text-right">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[9px] uppercase tracking-wider text-portal-muted">Refund</span>
                          <span className="text-xs font-semibold text-red-accent">{fmtGhs(itemRefund(product))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FlatModal>
  );
};
