import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { dataExportsApi, getApiError, type Product } from '../../../../api-client';
import { FlatAsyncSelect, FlatButton, FlatCheckbox } from '../../../../components/flat-form';
import { FlatModal } from '../../../../components/overlay';

interface Props {
  visible: boolean;
  vehicleId: string;
  vehicleName: string;
  onHide: () => void;
}

export const VehicleStockSnapshotExportModal: React.FC<Props> = ({ visible, vehicleId, vehicleName, onHide }) => {
  const [productId, setProductId] = useState('');
  const [includeOutOfStock, setIncludeOutOfStock] = useState(true);
  const [exporting, setExporting] = useState(false);

  const close = () => {
    if (exporting) return;
    setProductId('');
    setIncludeOutOfStock(true);
    onHide();
  };

  const download = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await dataExportsApi.exportVehicleStock(vehicleId, {
        ...(productId ? { productId } : {}),
        includeOutOfStock,
      });
      saveAs(blob, filename);
      toast.success('Current stock downloaded.');
      setExporting(false);
      setProductId('');
      setIncludeOutOfStock(true);
      onHide();
    } catch (error: unknown) {
      toast.error(getApiError(error)?.message || 'Failed to export current stock.');
      setExporting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={close}
      title="Export current stock"
      subtitle={vehicleName}
      size="sm"
      closable={!exporting}
      footer={(
        <>
          <FlatButton size="sm" variant="outline" onClick={close} disabled={exporting}>Cancel</FlatButton>
          <FlatButton size="sm" variant="primary" leftIcon="pi pi-download" onClick={() => void download()} loading={exporting} disabled={exporting}>Download</FlatButton>
        </>
      )}
    >
      <div className="space-y-4">
        <FlatAsyncSelect<Product>
          id="stock-snapshot-product"
          label="Product"
          placeholder="All products"
          value={productId || undefined}
          endpointUrl={`/products?vehicleId=${encodeURIComponent(vehicleId)}`}
          pageSize={20}
          optionValue="id"
          optionLabel="name"
          clearable
          itemTemplate={(product) => (
            <div className="min-w-0">
              <span className="block truncate text-xs font-semibold text-portal-text">{product.name}</span>
              <span className="block truncate text-[11px] text-portal-muted">{[product.packagingUnitName, product.basicUnitName].filter(Boolean).join(' / ')}</span>
            </div>
          )}
          onChange={(value) => setProductId((value as string) || '')}
          size="sm"
        />
        <FlatCheckbox
          id="stock-snapshot-include-empty"
          label="Include out-of-stock products"
          checked={includeOutOfStock}
          onChange={setIncludeOutOfStock}
        />
      </div>
    </FlatModal>
  );
};

export default VehicleStockSnapshotExportModal;
