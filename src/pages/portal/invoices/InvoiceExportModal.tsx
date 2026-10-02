import React, { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { getApiError, invoicesApi, type InvoiceListFilters } from '../../../api-client';
import { FlatAsyncSelect, FlatButton, FlatDatePicker, FlatDropdown } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay';

interface Props {
  visible: boolean;
  filters: InvoiceListFilters;
  onHide: () => void;
}

const FORMAT_OPTIONS = [
  { label: 'Excel workbook', value: 'excel' },
  { label: 'PDF document', value: 'pdf' },
];

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Issued', value: 'Issued' },
  { label: 'Partially paid', value: 'PartiallyPaid' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Voided', value: 'Voided' },
];

const toDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const InvoiceExportModal: React.FC<Props> = ({ visible, filters, onHide }) => {
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [customerId, setCustomerId] = useState('');
  const [trekId, setTrekId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCustomerId(filters.customerId ?? '');
    setTrekId(filters.trekId ?? '');
    setRegionId(filters.regionId ?? '');
    setStatus(filters.status ?? '');
    setDateFrom(toDate(filters.dateFrom));
    setDateTo(toDate(filters.dateTo));
  }, [filters, visible]);

  const close = () => {
    if (exporting) return;
    setFormat('excel');
    onHide();
  };

  const download = async () => {
    setExporting(true);
    try {
      const start = dateFrom ? new Date(dateFrom.getTime()) : null;
      const end = dateTo ? new Date(dateTo.getTime()) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      const exportFilters: InvoiceListFilters = {
        ...(customerId ? { customerId } : {}),
        ...(trekId ? { trekId } : {}),
        ...(regionId ? { regionId } : {}),
        ...(status ? { status } : {}),
        ...(start ? { dateFrom: start.toISOString() } : {}),
        ...(end ? { dateTo: end.toISOString() } : {}),
      };
      const { blob, filename } = await invoicesApi.exportInvoices(format, exportFilters);
      saveAs(blob, filename);
      toast.success('Invoices downloaded.');
      setExporting(false);
      setFormat('excel');
      onHide();
    } catch (error: unknown) {
      toast.error(getApiError(error)?.message || 'Failed to export invoices.');
      setExporting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={close}
      title="Export invoices"
      size="md"
      closable={!exporting}
      footer={(
        <>
          <FlatButton size="sm" variant="outline" onClick={close} disabled={exporting}>Cancel</FlatButton>
          <FlatButton size="sm" variant="primary" leftIcon="pi pi-download" onClick={() => void download()} loading={exporting} disabled={exporting}>Download</FlatButton>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FlatDropdown
            id="invoice-export-format"
            label="File format"
            value={format}
            options={FORMAT_OPTIONS}
            optionLabel="label"
            optionValue="value"
            onChange={(value) => setFormat(value as 'excel' | 'pdf')}
            size="sm"
            disabled={exporting}
          />
          <FlatDropdown
            id="invoice-export-status"
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            optionLabel="label"
            optionValue="value"
            onChange={(value) => setStatus(String(value ?? ''))}
            size="sm"
            disabled={exporting}
          />
        </div>

        <FlatAsyncSelect<any>
          id="invoice-export-region"
          label="Region"
          value={regionId || undefined}
          endpointUrl="/organisation/regions"
          optionValue="id"
          optionLabel="name"
          pageSize={20}
          placeholder="All regions"
          clearable
          size="sm"
          disabled={exporting}
          onChange={(value) => setRegionId(String(value ?? ''))}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <FlatAsyncSelect<any>
            id="invoice-export-customer"
            label="Customer"
            value={customerId || undefined}
            endpointUrl="/customers"
            optionValue="id"
            optionLabel="businessName"
            pageSize={20}
            placeholder="All customers"
            clearable
            size="sm"
            disabled={exporting}
            onChange={(value) => setCustomerId(String(value ?? ''))}
          />
          <FlatAsyncSelect<any>
            id="invoice-export-trek"
            label="Trek"
            value={trekId || undefined}
            endpointUrl="/treks"
            optionValue="id"
            optionLabel="trekNumber"
            pageSize={20}
            placeholder="All treks"
            clearable
            size="sm"
            disabled={exporting}
            onChange={(value) => setTrekId(String(value ?? ''))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FlatDatePicker
            id="invoice-export-date-from"
            label="From"
            value={dateFrom}
            onChange={(value) => setDateFrom(value instanceof Date ? value : null)}
            placeholder="Start date"
            showIcon
            size="sm"
            disabled={exporting}
          />
          <FlatDatePicker
            id="invoice-export-date-to"
            label="To"
            value={dateTo}
            onChange={(value) => setDateTo(value instanceof Date ? value : null)}
            placeholder="End date"
            showIcon
            size="sm"
            disabled={exporting}
          />
        </div>
      </div>
    </FlatModal>
  );
};

export default InvoiceExportModal;
