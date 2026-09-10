import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse, resetTableData } from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import { productsApi, type Product, type Unit } from '../../../api-client';
import { ProductModal } from './components/ProductModal';
import { UnitModal } from './components/UnitModal';
import { ImportProductsModal } from './components/ImportProductsModal';
import toast from 'react-hot-toast';

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: 'products' | 'units' = rawTab === 'units' ? 'units' : 'products';

  const handleTabChange = (tab: 'products' | 'units') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  // Modals state
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [importModalVisible, setImportModalVisible] = useState(false);

  // Status toggles with immediate table refresh
  const handleToggleProductStatus = async (product: Product) => {
    try {
      await productsApi.toggleProductStatus(product.id);
      toast.success(
        `Product "${product.name}" ${product.isActive ? 'deactivated' : 'activated'}.`
      );
      resetTableData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update product status.';
      toast.error(msg);
    }
  };

  const handleToggleUnitStatus = async (unit: Unit) => {
    try {
      await productsApi.toggleUnitStatus(unit.id);
      toast.success(
        `Unit "${unit.name}" ${unit.isActive ? 'deactivated' : 'activated'}.`
      );
      resetTableData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update unit status.';
      toast.error(msg);
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
        unit: p.unit || undefined,
        description: p.description || undefined,
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
              className="font-bold text-xs text-white hover:text-portal-accent text-left transition cursor-pointer"
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
        field: 'unit',
        header: 'Packaging Unit',
        body: (product) => (
          <span className="font-mono text-xs text-portal-text">
            {product.unit || '—'}
          </span>
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
            <button
              type="button"
              onClick={() => handleToggleProductStatus(product)}
              title={product.isActive ? 'Deactivate Product' : 'Activate Product'}
              className={`w-[38px] h-[38px] rounded border text-xs flex items-center justify-center transition cursor-pointer ${
                product.isActive
                  ? 'border-portal-border text-portal-muted hover:text-red-accent hover:border-red-accent/40 bg-portal-canvas'
                  : 'border-portal-accent/40 text-portal-accent hover:bg-portal-accent/10 bg-portal-canvas'
              }`}
            >
              <i className={`pi ${product.isActive ? 'pi-power-off' : 'pi-check'}`} />
            </button>
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
          <span className="font-bold text-xs text-white">
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
            <button
              type="button"
              onClick={() => handleToggleUnitStatus(unit)}
              title={unit.isActive ? 'Deactivate Unit' : 'Activate Unit'}
              className={`w-[38px] h-[38px] rounded border text-xs flex items-center justify-center transition cursor-pointer ${
                unit.isActive
                  ? 'border-portal-border text-portal-muted hover:text-red-accent hover:border-red-accent/40 bg-portal-canvas'
                  : 'border-portal-accent/40 text-portal-accent hover:bg-portal-accent/10 bg-portal-canvas'
              }`}
            >
              <i className={`pi ${unit.isActive ? 'pi-power-off' : 'pi-check'}`} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-portal-border/60 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => handleTabChange('products')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none rounded-none ${
            activeTab === 'products'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-box text-xs" />
          <span>Products Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('units')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none rounded-none ${
            activeTab === 'units'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-tags text-xs" />
          <span>Packaging Units</span>
        </button>
      </div>

      {/* Tab 1: Products Catalog */}
      {activeTab === 'products' ? (
        <FlatDataTable<Product>
          dataSourceUrl="/products"
          columns={productColumns}
          heading="Products List"
          secondaryAction
          secondaryActionName="Import"
          secondaryActionIcon="pi pi-upload"
          onSecondaryAction={() => setImportModalVisible(true)}
          hasAction
          actionName="Add Product"
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
      ) : (
        /* Tab 2: Units */
        <FlatDataTable<Unit>
          dataSourceUrl="/units"
          columns={unitColumns}
          heading="Packaging Units"
          hasAction
          actionName="Add Unit"
          onAction={() => {
            setEditingUnit(null);
            setUnitModalVisible(true);
          }}
          filterable="search"
          filterablePlaceholder="Search packaging units..."
          enableTableFilter
          enablePaginator
          initialPageSize={10}
          emptyDataText="No packaging units found."
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

      <ImportProductsModal
        visible={importModalVisible}
        onHide={() => setImportModalVisible(false)}
      />
    </div>
  );
};

export default ProductsPage;
