import React, { useEffect, useState, type ReactNode } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { dataExportsApi, getApiError, organisationApi } from '../../../api-client';
import { FlatButton, FlatDropdown, FlatInputText } from '../../../components/flat-form';

type ExportKind = 'customers' | 'products' | 'staff' | 'regionalMarkups' | 'customerMarkups';

interface ExportCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  loading: boolean;
  disabled: boolean;
  onExport: () => void;
  children?: ReactNode;
}

const ExportCard: React.FC<ExportCardProps> = ({
  title,
  description,
  buttonLabel,
  loading,
  disabled,
  onExport,
  children,
}) => (
  <section className="rounded border border-portal-border/60 bg-portal-surface p-4 sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-portal-heading">{title}</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-portal-muted">{description}</p>
      </div>
      <FlatButton
        size="sm"
        leftIcon="pi pi-download"
        loading={loading}
        disabled={disabled}
        onClick={onExport}
        className="shrink-0"
      >
        {buttonLabel}
      </FlatButton>
    </div>
    {children && <div className="mt-4 border-t border-portal-border/50 pt-4">{children}</div>}
  </section>
);

const CUSTOMER_TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Retail', value: 'Retail' },
  { label: 'Wholesale', value: 'Wholesale' },
  { label: 'Distributor', value: 'Distributor' },
  { label: 'Other', value: 'Other' },
];

const CUSTOMER_STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Active', value: 'Active' },
  { label: 'Suspended', value: 'Suspended' },
  { label: 'Inactive', value: 'Inactive' },
];

const STAFF_STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'On Leave', value: 'OnLeave' },
  { label: 'Terminated', value: 'Terminated' },
];

const PRODUCT_MODE_OPTIONS = [
  { label: 'Product catalog', value: 'catalog' },
  { label: 'Regional pricing', value: 'pricing' },
];

export const DataExportPage: React.FC = () => {
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [regionOptions, setRegionOptions] = useState([{ label: 'All Regions', value: '' }]);
  const [branchOptions, setBranchOptions] = useState([{ label: 'All Branches', value: '' }]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerRegionId, setCustomerRegionId] = useState('');
  const [customerBranchId, setCustomerBranchId] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [customerStatus, setCustomerStatus] = useState('');
  const [productMode, setProductMode] = useState<'catalog' | 'pricing'>('catalog');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffBranchId, setStaffBranchId] = useState('');
  const [staffStatus, setStaffStatus] = useState('');
  const [markupRegionId, setMarkupRegionId] = useState('');

  useEffect(() => {
    Promise.allSettled([organisationApi.getRegions(), organisationApi.getBranches()])
      .then(([regions, branches]) => {
        if (regions.status === 'fulfilled') {
          setRegionOptions([
            { label: 'All Regions', value: '' },
            ...regions.value.map((region) => ({ label: region.name, value: region.id })),
          ]);
        }
        if (branches.status === 'fulfilled') {
          setBranchOptions([
            { label: 'All Branches', value: '' },
            ...branches.value.map((branch) => ({ label: branch.name, value: branch.id })),
          ]);
        }
      });
  }, []);

  const runExport = async (
    kind: ExportKind,
    action: () => Promise<{ blob: Blob; filename: string }>,
  ) => {
    setExporting(kind);
    try {
      const { blob, filename } = await action();
      saveAs(blob, filename);
      toast.success(`${filename} downloaded.`);
    } catch (error) {
      toast.error(getApiError(error)?.message || 'The export could not be generated.');
    } finally {
      setExporting(null);
    }
  };

  const busy = exporting !== null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-portal-heading">Data Export</h1>
        <p className="mt-1 text-xs leading-relaxed text-portal-muted">
          Download operational data as Excel workbooks. Filters apply only to the export where they are shown.
        </p>
      </div>

      <ExportCard
        title="Customers"
        description="Exports customers into one worksheet per region. Matching filters limit the rows included in the workbook."
        buttonLabel="Export customers"
        loading={exporting === 'customers'}
        disabled={busy}
        onExport={() => void runExport('customers', () => dataExportsApi.exportCustomers({
          search: customerSearch.trim() || undefined,
          regionId: customerRegionId || undefined,
          branchId: customerBranchId || undefined,
          customerType: customerType || undefined,
          status: customerStatus || undefined,
        }))}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <FlatInputText label="Search" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Name, code or phone" size="sm" />
          <FlatDropdown label="Region" value={customerRegionId} options={regionOptions} onChange={(value) => setCustomerRegionId(value ?? '')} size="sm" />
          <FlatDropdown label="Branch" value={customerBranchId} options={branchOptions} onChange={(value) => setCustomerBranchId(value ?? '')} size="sm" />
          <FlatDropdown label="Customer type" value={customerType} options={CUSTOMER_TYPE_OPTIONS} onChange={(value) => setCustomerType(value ?? '')} size="sm" />
          <FlatDropdown label="Status" value={customerStatus} options={CUSTOMER_STATUS_OPTIONS} onChange={(value) => setCustomerStatus(value ?? '')} size="sm" />
        </div>
      </ExportCard>

      <ExportCard
        title="Products"
        description="Download the base product catalog or a regional pricing workbook containing resolved selling prices for every active region."
        buttonLabel="Export products"
        loading={exporting === 'products'}
        disabled={busy}
        onExport={() => void runExport('products', () => dataExportsApi.exportProducts(productMode))}
      >
        <div className="max-w-sm">
          <FlatDropdown label="Workbook type" value={productMode} options={PRODUCT_MODE_OPTIONS} onChange={(value) => setProductMode(value ?? 'catalog')} size="sm" />
        </div>
      </ExportCard>

      <ExportCard
        title="Staff"
        description="Exports staff details, branch assignments, employment status, roles, and platform-access availability."
        buttonLabel="Export staff"
        loading={exporting === 'staff'}
        disabled={busy}
        onExport={() => void runExport('staff', () => dataExportsApi.exportStaff({
          search: staffSearch.trim() || undefined,
          branchId: staffBranchId || undefined,
          status: staffStatus || undefined,
        }))}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FlatInputText label="Search" value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} placeholder="Name, email or employee number" size="sm" />
          <FlatDropdown label="Branch" value={staffBranchId} options={branchOptions} onChange={(value) => setStaffBranchId(value ?? '')} size="sm" />
          <FlatDropdown label="Status" value={staffStatus} options={STAFF_STATUS_OPTIONS} onChange={(value) => setStaffStatus(value ?? '')} size="sm" />
        </div>
      </ExportCard>

      <ExportCard
        title="Regional markup rules"
        description="Exports every region-wide and product-specific regional markup rule in a single workbook."
        buttonLabel="Export regional rules"
        loading={exporting === 'regionalMarkups'}
        disabled={busy}
        onExport={() => void runExport('regionalMarkups', dataExportsApi.exportRegionalMarkups)}
      />

      <ExportCard
        title="Customer markup rules"
        description="Exports customer-wide and product-specific customer markup rules, optionally limited to one region."
        buttonLabel="Export customer rules"
        loading={exporting === 'customerMarkups'}
        disabled={busy}
        onExport={() => void runExport('customerMarkups', () => dataExportsApi.exportCustomerMarkups(markupRegionId || undefined))}
      >
        <div className="max-w-sm">
          <FlatDropdown label="Region" value={markupRegionId} options={regionOptions} onChange={(value) => setMarkupRegionId(value ?? '')} size="sm" />
        </div>
      </ExportCard>
    </div>
  );
};

export default DataExportPage;
