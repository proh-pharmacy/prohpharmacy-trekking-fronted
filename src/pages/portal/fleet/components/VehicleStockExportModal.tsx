import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import {
  dataExportsApi,
  getApiError,
  type Product,
  type StockLedgerSource,
} from '../../../../api-client';
import {
  FlatAsyncSelect,
  FlatButton,
  FlatDatePicker,
  FlatDropdown,
} from '../../../../components/flat-form';
import { FlatModal } from '../../../../components/overlay';
import { formatDateInput } from '../../../../lib/utils';

interface Props {
  visible: boolean;
  vehicleId: string;
  vehicleName: string;
  onHide: () => void;
}

type ExportStyle = 'worksheet' | 'workbook';

const SOURCE_OPTIONS = [
  { label: 'All sources', value: '' },
  { label: 'Manual load', value: 'ManualLoad' },
  { label: 'Trek completion', value: 'TrekCompletion' },
  { label: 'Return approval', value: 'ReturnApproval' },
  { label: 'Stock reset', value: 'StockReset' },
];

const STYLE_OPTIONS = [
  { label: 'Single worksheet', value: 'worksheet' },
  { label: 'Sheet per product', value: 'workbook' },
];

export const VehicleStockExportModal: React.FC<Props> = ({
  visible,
  vehicleId,
  vehicleName,
  onHide,
}) => {
  const [productId, setProductId] = useState('');
  const [source, setSource] = useState<StockLedgerSource | ''>('');
  const [dateRange, setDateRange] = useState<(Date | null)[] | null>(null);
  const [exportStyle, setExportStyle] = useState<ExportStyle>('worksheet');
  const [exporting, setExporting] = useState(false);

  const resetAndHide = () => {
    setProductId('');
    setSource('');
    setDateRange(null);
    setExportStyle('worksheet');
    onHide();
  };

  const handleExport = async () => {
    const [from, to] = dateRange ?? [];
    setExporting(true);
    try {
      const { blob, filename } = await dataExportsApi.exportVehicleStockLedger(vehicleId, {
        ...(productId ? { productId } : {}),
        ...(source ? { source } : {}),
        ...(from ? { from: formatDateInput(from) } : {}),
        ...(to ? { to: formatDateInput(to) } : {}),
        exportStyle,
      });
      saveAs(blob, filename);
      toast.success('Stock history downloaded.');
      setExporting(false);
      resetAndHide();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError?.message || 'Failed to export stock history.');
      setExporting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={resetAndHide}
      title="Export Stock History"
      subtitle={vehicleName}
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <FlatButton size="sm" variant="danger-outline" label="Cancel" onClick={resetAndHide} disabled={exporting} />
          <FlatButton
            size="sm"
            variant="primary"
            label={exporting ? 'Generating...' : 'Download'}
            leftIcon="pi pi-download"
            onClick={handleExport}
            loading={exporting}
            disabled={exporting}
          />
        </div>
      }
    >
      <div className="space-y-3">
        <FlatAsyncSelect<Product>
          label="Product"
          size="sm"
          placeholder="All products"
          value={productId || undefined}
          endpointUrl={`/products?vehicleId=${encodeURIComponent(vehicleId)}`}
          pageSize={20}
          optionValue="id"
          optionLabel="name"
          clearable
          itemTemplate={(item) => (
            <div className="min-w-0">
              <span className="block truncate text-xs font-semibold text-white">{item.name}</span>
              <span className="block truncate text-[11px] text-portal-muted">
                {[item.packagingUnitName, item.basicUnitName].filter(Boolean).join(' / ')}
              </span>
            </div>
          )}
          onChange={(value) => setProductId((value as string) || '')}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FlatDropdown
            label="Source"
            size="sm"
            value={source}
            options={SOURCE_OPTIONS}
            onChange={(value) => setSource((value || '') as StockLedgerSource | '')}
          />
          <FlatDropdown
            label="Workbook layout"
            size="sm"
            value={exportStyle}
            options={STYLE_OPTIONS}
            onChange={(value) => setExportStyle((value || 'worksheet') as ExportStyle)}
          />
        </div>

        <FlatDatePicker
          label="Date range"
          size="sm"
          selectionMode={'range' as any}
          readOnlyInput
          hideOnRangeSelection
          value={dateRange}
          onChange={(value) => setDateRange(value || null)}
          placeholder="All dates"
        />
      </div>
    </FlatModal>
  );
};

export default VehicleStockExportModal;
