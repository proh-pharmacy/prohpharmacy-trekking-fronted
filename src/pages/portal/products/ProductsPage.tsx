import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse, resetTableData } from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import { FlatConfirmDialog } from '../../../components/overlay';
import { productsApi, type Product, type Unit } from '../../../api-client';
import { ProductModal } from './components/ProductModal';
import { UnitModal } from './components/UnitModal';
import { PackagingUnitModal } from './components/PackagingUnitModal';
import { ImportProductsModal } from './components/ImportProductsModal';
import toast from 'react-hot-toast';
import { usePermissions } from '../../../hooks/usePermissions';

export const ProductsPage: React.FC = () => {
  const { hasAnyPermission } = usePermissions();
  const canManageProducts = hasAnyPermission('Products.Manage', 'Products.Create', 'Products.Edit');
  const canImportProducts = hasAnyPermission('Products.Import', 'Products.Manage');
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: 'products' | 'units' | 'packaging' = rawTab === 'units' || rawTab === 'packaging' ? rawTab : 'products';

  const handleTabChange = (tab: 'products' | 'units' | 'packaging') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  // Modals state
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [packagingProduct, setPackagingProduct] = useState<Product | null>(null);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [statusTarget, setStatusTarget] = useState<
    { kind: 'product'; item: Product } | { kind: 'unit'; item: Unit } | null
  >(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setUpdatingStatus(true);
    try {
      if (statusTarget.kind === 'product') {
        await productsApi.toggleProductStatus(statusTarget.item.id);
      } else {
        await productsApi.toggleUnitStatus(statusTarget.item.id);
      }
      resetTableData();
      toast.success(
        `${statusTarget.kind === 'product' ? 'Product' : 'Unit'} "${statusTarget.item.name}" ${statusTarget.item.isActive ? 'deactivated' : 'activated'}.`
      );
      setStatusTarget(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || `Failed to update ${statusTarget.kind} status.`;
      toast.error(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Data mappers
  const productDataMapper = useCallback(
    (response: any): PaginatedDataResponse<Product> => {
      const payload = response || {};
      const rawList: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : [];

      const normalized: Product[] = rawList.map((p: any) => ({
        id: String(p.id || ''),
        name: p.name || 'Unnamed Product',
        description: p.description || null,
        basicUnitId: p.basicUnitId || '',
        basicUnitName: p.basicUnitName || '',
        basicUnitPrice: p.basicUnitPrice ?? 0,
        packagingUnitId: p.packagingUnitId || null,
        packagingUnitName: p.packagingUnitName || null,
        packagingUnitPrice: p.packagingUnitPrice ?? null,
        isActive: p.isActive ?? true,
        createdAt: p.createdAt || '',
        updatedAt: p.updatedAt || null,
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

  const unitDataMapper = useCallback(
    (response: any): PaginatedDataResponse<Unit> => {
      const payload = response || {};
      const rawList: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : [];

      const normalized: Unit[] = rawList.map((u: any) => ({
        id: String(u.id || ''),
        name: u.name || 'Unnamed Unit',
        isActive: u.isActive ?? true,
        createdAt: u.createdAt || '',
        updatedAt: u.updatedAt || null,
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
      ...(payload.isActive !== undefined && payload.isActive !== '' ? { isActive: payload.isActive } : {}),
    };
  }, []);

  const ACTIVE_FILTER_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' },
  ];

  // Columns definitions
  const productColumns: ColumnDef<Product>[] = useMemo(
    () => [
      {
        field: 'name',
        header: 'Product Name',
        body: (product) => (
          <div>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(product);
                setProductModalVisible(true);
              }}
              className="text-xs text-portal-text hover:text-portal-accent text-left transition cursor-pointer"
            >
              {product.name}
            </button>
            {product.description && (
              <div className="text-[11px] text-portal-muted truncate max-w-sm mt-0.5">
                {product.description}
              </div>
            )}
          </div>
        ),
      },
      {
        field: 'basicUnitName',
        header: 'Basic Unit',
        body: (product) => (
          <div className="text-xs text-portal-text">
            <span>{product.basicUnitName || '—'}</span>
            <span className="block text-[11px] text-portal-muted">GHS {Number(product.basicUnitPrice).toFixed(2)}</span>
          </div>
        ),
      },
      {
        field: 'packagingUnitName',
        header: 'Packaging Unit',
        body: (product) => (
          <div className="text-xs text-portal-text">
            <span>{product.packagingUnitName || '—'}</span>
            {product.packagingUnitPrice != null && (
              <span className="block text-[11px] text-portal-muted">GHS {Number(product.packagingUnitPrice).toFixed(2)}</span>
            )}
          </div>
        ),
      },
      {
        field: 'isActive',
        header: 'Status',
        body: (product) => (
          <span
            className={`text-xs font-medium ${
              product.isActive ? 'text-portal-accent' : 'text-portal-muted'
            }`}
          >
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        field: 'actions',
        header: 'Actions',
        headerStyle: { textAlign: 'right' },
        style: { width: '130px', textAlign: 'right' },
        body: (product) => (
          <div className="flex items-center justify-end gap-2">
            <FlatButton
              variant="outline"
              size="sm"
              leftIcon="pi pi-pencil"
              onClick={() => {
                setEditingProduct(product);
                setProductModalVisible(true);
              }}
            >
              Edit
            </FlatButton>
            <FlatButton
              variant={product.isActive ? 'danger-outline' : 'outline'}
              size="icon-sm"
              leftIcon={product.isActive ? 'pi pi-ban' : 'pi pi-check-circle'}
              onClick={() => setStatusTarget({ kind: 'product', item: product })}
              title={product.isActive ? 'Deactivate Product' : 'Activate Product'}
              aria-label={product.isActive ? `Deactivate ${product.name}` : `Activate ${product.name}`}
              className={product.isActive ? '' : '!text-portal-accent hover:!bg-portal-accent/10'}
            />
          </div>
        ),
      },
    ],
    []
  );

  const unitColumns: ColumnDef<Unit>[] = useMemo(
    () => [
      {
        field: 'name',
        header: 'Unit Name',
        body: (unit) => (
          <span className="text-xs text-portal-text">
            {unit.name}
          </span>
        ),
      },
      {
        field: 'isActive',
        header: 'Status',
        body: (unit) => (
          <span
            className={`text-xs font-medium ${
              unit.isActive ? 'text-portal-accent' : 'text-portal-muted'
            }`}
          >
            {unit.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        field: 'actions',
        header: 'Actions',
        headerStyle: { textAlign: 'right' },
        style: { width: '130px', textAlign: 'right' },
        body: (unit) => (
          <div className="flex items-center justify-end gap-2">
            <FlatButton
              variant="outline"
              size="sm"
              leftIcon="pi pi-pencil"
              onClick={() => {
                setEditingUnit(unit);
                setUnitModalVisible(true);
              }}
            >
              Rename
            </FlatButton>
            <FlatButton
              variant={unit.isActive ? 'danger-outline' : 'outline'}
              size="icon-sm"
              leftIcon={unit.isActive ? 'pi pi-ban' : 'pi pi-check-circle'}
              onClick={() => setStatusTarget({ kind: 'unit', item: unit })}
              title={unit.isActive ? 'Deactivate Unit' : 'Activate Unit'}
              aria-label={unit.isActive ? `Deactivate ${unit.name}` : `Activate ${unit.name}`}
              className={unit.isActive ? '' : '!text-portal-accent hover:!bg-portal-accent/10'}
            />
          </div>
        ),
      },
    ],
    []
  );

  const packagingColumns: ColumnDef<Product>[] = useMemo(() => [
    {
      field: 'name',
      header: 'Product',
      body: (product) => <span className="text-xs text-portal-text">{product.name}</span>,
    },
    {
      field: 'basicUnitName',
      header: 'Basic Unit',
      body: (product) => <span className="text-xs text-portal-text">{product.basicUnitName || '—'}</span>,
    },
    {
      field: 'packagingUnitName',
      header: 'Packaging Unit',
      body: (product) => <span className="text-xs text-portal-text">{product.packagingUnitName || 'Not assigned'}</span>,
    },
    {
      field: 'packagingUnitPrice',
      header: 'Price',
      body: (product) => <span className="text-xs text-portal-text">{product.packagingUnitPrice == null ? '—' : `GHS ${Number(product.packagingUnitPrice).toFixed(2)}`}</span>,
    },
    {
      field: 'actions',
      header: 'Actions',
      headerStyle: { textAlign: 'right' },
      style: { width: '120px', textAlign: 'right' },
      body: (product) => (
        <FlatButton variant="outline" size="sm" leftIcon="pi pi-pencil" onClick={() => setPackagingProduct(product)}>
          {product.packagingUnitId ? 'Edit' : 'Assign'}
        </FlatButton>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-portal-border/60 gap-6 text-sm font-semibold overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => handleTabChange('products')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer !rounded-none ${
            activeTab === 'products'
              ? 'border-portal-accent text-portal-heading font-bold'
              : 'border-transparent text-portal-muted hover:text-portal-heading'
          }`}
        >
          <span>Products Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('units')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer !rounded-none ${
            activeTab === 'units'
              ? 'border-portal-accent text-portal-heading font-bold'
              : 'border-transparent text-portal-muted hover:text-portal-heading'
          }`}
        >
          <span>Basic Units</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('packaging')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer !rounded-none ${
            activeTab === 'packaging'
              ? 'border-portal-accent text-portal-heading font-bold'
              : 'border-transparent text-portal-muted hover:text-portal-heading'
          }`}
        >
          <span>Packaging Units</span>
        </button>
      </div>

      {/* Tab 1: Products Catalog */}
      {activeTab === 'products' ? (
        <FlatDataTable<Product>
          dataSourceUrl="/products"
          columns={productColumns}
          heading="Products List"
          secondaryAction={canImportProducts}
          secondaryActionName="Import"
          secondaryActionNameMobile="Import"
          secondaryActionIcon="pi pi-upload"
          onSecondaryAction={() => setImportModalVisible(true)}
          hasAction={canManageProducts}
          actionName="Add Product"
          actionNameMobile="Add"
          onAction={() => {
            setEditingProduct(null);
            setProductModalVisible(true);
          }}
          filterable="search"
          filterablePlaceholder="Search products by name..."
          enableTableFilter
          enablePaginator
          initialPageSize={10}
          emptyDataText="No products found."
          dataMapper={productDataMapper}
          parsePayload={parsePaginationPayload}
          extendedFilter={{
            enable: true,
            filters: [
              {
                type: 'SelectFilter',
                accessor: 'isActive',
                label: 'Status',
                args: { options: ACTIVE_FILTER_OPTIONS },
              },
            ],
          }}
        />
      ) : activeTab === 'units' ? (
        /* Tab 2: Basic Units */
        <FlatDataTable<Unit>
          dataSourceUrl="/units"
          columns={unitColumns}
          heading="Basic Units"
          hasAction
          actionName="Add Basic Unit"
          onAction={() => {
            setEditingUnit(null);
            setUnitModalVisible(true);
          }}
          filterable="search"
          filterablePlaceholder="Search units..."
          enableTableFilter
          enablePaginator
          initialPageSize={10}
          emptyDataText="No units found."
          dataMapper={unitDataMapper}
          parsePayload={parsePaginationPayload}
          extendedFilter={{
            enable: true,
            filters: [
              {
                type: 'SelectFilter',
                accessor: 'isActive',
                label: 'Status',
                args: { options: ACTIVE_FILTER_OPTIONS },
              },
            ],
          }}
        />
      ) : (
        /* Tab 3: Product packaging assignments */
        <FlatDataTable<Product>
          dataSourceUrl="/products"
          columns={packagingColumns}
          heading="Packaging Units"
          hasAction
          actionName="Add Unit"
          onAction={() => { setEditingUnit(null); setUnitModalVisible(true); }}
          filterable="search"
          filterablePlaceholder="Search products by name..."
          enableTableFilter
          enablePaginator
          initialPageSize={10}
          emptyDataText="No products found."
          dataMapper={productDataMapper}
          parsePayload={parsePaginationPayload}
          extendedFilter={{
            enable: true,
            filters: [
              { type: 'SelectFilter', accessor: 'isActive', label: 'Status', args: { options: ACTIVE_FILTER_OPTIONS } },
            ],
          }}
        />
      )}

      {/* Modals */}
      <ProductModal
        visible={productModalVisible}
        onHide={() => {
          setProductModalVisible(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
      />

      <UnitModal
        visible={unitModalVisible}
        onHide={() => {
          setUnitModalVisible(false);
          setEditingUnit(null);
        }}
        unit={editingUnit}
      />

      <PackagingUnitModal
        visible={Boolean(packagingProduct)}
        onHide={() => setPackagingProduct(null)}
        product={packagingProduct}
      />

      <ImportProductsModal
        visible={importModalVisible}
        onHide={() => setImportModalVisible(false)}
      />

      <FlatConfirmDialog
        visible={Boolean(statusTarget)}
        onHide={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        loading={updatingStatus}
        title={`${statusTarget?.item.isActive ? 'Deactivate' : 'Activate'} ${statusTarget?.kind === 'unit' ? 'Unit' : 'Product'}`}
        message={statusTarget?.item.isActive
          ? `Deactivate "${statusTarget.item.name}"? It will no longer be available for active operations.`
          : `Activate "${statusTarget?.item.name}" and make it available for operations?`}
        confirmLabel={`${statusTarget?.item.isActive ? 'Deactivate' : 'Activate'} ${statusTarget?.kind === 'unit' ? 'Unit' : 'Product'}`}
        variant={statusTarget?.item.isActive ? 'danger' : 'primary'}
        icon={statusTarget?.item.isActive ? 'pi pi-ban' : 'pi pi-check-circle'}
      />
    </div>
  );
};

export default ProductsPage;
