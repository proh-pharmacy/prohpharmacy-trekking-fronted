import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DataTable as PrimeDataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Search,
  Plus,
  ListFilter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Package,
  X,
  ArrowUpDown,
} from 'lucide-react';
import api from '../../api-client';
import { cn } from '../../lib/utils';
import {
  FlatInputText,
  FlatDropdown,
  FlatMultiSelect,
  FlatDatePicker,
} from '../flat-form';

// --- Types ---

export type FilterType =
  | 'DateFilter'
  | 'SelectFilter'
  | 'MultiSelectFilter'
  | 'TextFilter'
  | 'DateRangeFilter'
  | 'MonthYearFilter';

export interface FilterParam {
  type: FilterType;
  accessor: string | string[];
  label: string;
  args?: any;
}

export interface ColumnDef<TData> {
  field: string;
  header: string;
  body?: (data: TData, options?: { rowIndex?: number }) => React.ReactNode;
  sortable?: boolean;
  style?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  className?: string;
}

export interface SortConfig {
  key: string;
  accessor: string;
  options: { key: string; value: string; label?: string }[];
}

export interface PaginatedDataResponse<TData> {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  nextPageUrl?: string | null;
  previousPageUrl?: string | null;
  path?: string;
  links?: string[];
  data: TData[];
}

export interface FlatDataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data?: TData[];
  dataSourceUrl?: string;
  apiCallType?: 'GET' | 'POST';
  postData?: any;
  filterable?: string;
  filterablePlaceholder?: string;
  sortableColumns?: SortConfig[];
  enableTableFilter?: boolean;
  extendedFilter?: {
    enable: boolean;
    filters: FilterParam[];
  };
  enablePaginator?: boolean;
  hasAction?: boolean;
  actionName?: string;
  onAction?: () => void;
  actionOptions?: { asLink: boolean; link: string };
  heading?: string | React.ReactNode;
  headerNotes?: React.ReactNode;
  isFilterVisibleOnStart?: boolean;
  showErrorAsBanner?: boolean;
  emptyDataText?: string;
  persistFiltersInUrl?: boolean;
  dataMapper?: (response: any) => PaginatedDataResponse<TData>;
  parsePayload?: (payload: any) => any;
  getQueryParamValue?: (key: string) => string | null;
  className?: string;
  stretchHeight?: boolean;
  initialPageSize?: number;
  theme?: 'dark' | 'light';
}

import { scrollDataTableToTop } from './tableEvents';


// --- Main FlatDataTable Component ---

export function FlatDataTable<TData extends Record<string, any>>({
  columns,
  data: staticData,
  dataSourceUrl,
  apiCallType = 'GET',
  postData: initialPostData = {},
  filterable = 'search',
  filterablePlaceholder = 'Search by tag, description, or user...',
  sortableColumns,
  enableTableFilter = true,
  extendedFilter,
  enablePaginator = true,
  hasAction,
  actionName = 'Add Record',
  onAction,
  actionOptions,
  heading,
  headerNotes,
  isFilterVisibleOnStart = false,
  showErrorAsBanner = true,
  emptyDataText = 'No records found.',
  persistFiltersInUrl = true,
  dataMapper,
  parsePayload,
  className,
  stretchHeight = false,
  initialPageSize = 10,
  theme: _theme = 'dark',
}: FlatDataTableProps<TData>) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const tableRootRef = useRef<HTMLDivElement | null>(null);

  // Responsive mobile detector
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const singleFilter = (extendedFilter?.filters?.length ?? 0) === 1 && !filterablePlaceholder;
  const [isFilterVisible, setIsFilterVisible] = useState(() => {
    const isCurrentlyMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    return isCurrentlyMobile ? false : isFilterVisibleOnStart || singleFilter;
  });

  const [globalSearch, setGlobalSearch] = useState(() => {
    return searchParams.get('search') || '';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollRootIntoViewIfNeeded = useCallback(() => {
    const root = tableRootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    if (rect.top < 0) {
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Filter state
  const [filters, setFilters] = useState<Record<string, any>>(() => {
    const baseFilters = initialPostData || {};
    if (persistFiltersInUrl) {
      const urlFilters = searchParams.get('filters');
      if (urlFilters) {
        try {
          return { ...baseFilters, ...JSON.parse(urlFilters) };
        } catch {
          return baseFilters;
        }
      }
    }
    return baseFilters;
  });

  // Pagination state (matches pageNumber & pageSize)
  const [pagination, setPagination] = useState({
    pageNumber: Number(searchParams.get('pageNumber')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || initialPageSize,
  });

  // --- Data Fetching Logic ---
  const fetchTableData = async (
    currentFilters: Record<string, any>,
    currentPagination: { pageNumber: number; pageSize: number }
  ): Promise<PaginatedDataResponse<TData>> => {
    // 1. If staticData is supplied directly
    if (staticData) {
      const totalCount = staticData.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / currentPagination.pageSize));
      const start = (currentPagination.pageNumber - 1) * currentPagination.pageSize;
      const pageSlice = staticData.slice(start, start + currentPagination.pageSize);

      return {
        totalCount,
        totalPages,
        currentPage: currentPagination.pageNumber,
        pageSize: currentPagination.pageSize,
        nextPageUrl: currentPagination.pageNumber < totalPages ? `?pageNumber=${currentPagination.pageNumber + 1}` : null,
        previousPageUrl: currentPagination.pageNumber > 1 ? `?pageNumber=${currentPagination.pageNumber - 1}` : null,
        path: '',
        links: [],
        data: pageSlice,
      };
    }

    if (!dataSourceUrl) {
      return {
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: currentPagination.pageSize,
        data: [],
      };
    }

    // Build payload using target API format: pageNumber & pageSize
    const payload: Record<string, any> = {
      ...currentFilters,
      pageNumber: currentPagination.pageNumber,
      pageSize: currentPagination.pageSize,
    };

    if (globalSearch.trim()) {
      payload[filterable] = globalSearch.trim();
    }

    const finalPayload = parsePayload ? parsePayload(payload) : payload;

    let response;
    if (apiCallType === 'POST') {
      response = await api.post(dataSourceUrl, finalPayload);
    } else {
      response = await api.get(dataSourceUrl, { params: finalPayload });
    }

    if (dataMapper) {
      return dataMapper(response.data);
    }

    const raw = response.data || {};

    // Standard mapping adhering to target data structure
    const totalCount = raw.totalCount ?? raw.totalElements ?? raw.total ?? (Array.isArray(raw) ? raw.length : 0);
    const totalPages = raw.totalPages ?? Math.max(1, Math.ceil(totalCount / currentPagination.pageSize));
    const currentPage = raw.currentPage ?? raw.pageNumber ?? currentPagination.pageNumber;
    const pageSize = raw.pageSize ?? currentPagination.pageSize;
    const items = raw.data ?? raw.content ?? (Array.isArray(raw) ? raw : []);

    return {
      totalCount,
      totalPages,
      currentPage,
      pageSize,
      nextPageUrl: raw.nextPageUrl ?? null,
      previousPageUrl: raw.previousPageUrl ?? null,
      path: raw.path ?? '',
      links: raw.links ?? [],
      data: items,
    };
  };

  const queryKey = useMemo(
    () => [dataSourceUrl, filters, pagination, globalSearch, apiCallType],
    [dataSourceUrl, filters, pagination, globalSearch, apiCallType]
  );

  const {
    data: queryResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PaginatedDataResponse<TData>>({
    queryKey,
    queryFn: () => fetchTableData(filters, pagination),
    enabled: Boolean(dataSourceUrl || staticData),
  });

  // Client-side filtering when static data is supplied
  const resolvedTableData = useMemo(() => {
    if (staticData && globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      const filtered = staticData.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(q)
        )
      );
      const totalCount = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
      const start = (pagination.pageNumber - 1) * pagination.pageSize;
      const pageSlice = filtered.slice(start, start + pagination.pageSize);

      return {
        totalCount,
        totalPages,
        currentPage: pagination.pageNumber,
        pageSize: pagination.pageSize,
        data: pageSlice,
      };
    }
    return queryResult;
  }, [staticData, globalSearch, queryResult, pagination]);

  // Mutation for instant filter/search updates
  const mutation = useMutation({
    mutationFn: ({
      newFilters,
      newPagination,
    }: {
      newFilters: Record<string, any>;
      newPagination: { pageNumber: number; pageSize: number };
    }) => fetchTableData(newFilters, newPagination),
    onSuccess: (updatedData) => {
      queryClient.setQueryData(queryKey, updatedData);
    },
  });

  // Query parameter handler
  const handleQueryChange = useCallback(
    (keyOrAccessor: string | string[], value: any) => {
      // Pagination change
      if (keyOrAccessor === 'pageNumber' || keyOrAccessor === 'page') {
        const newPage = Number(value);
        setPagination((prev) => ({ ...prev, pageNumber: newPage }));
        return;
      }

      if (keyOrAccessor === 'pageSize' || keyOrAccessor === 'size') {
        const newSize = Number(value);
        setPagination({ pageNumber: 1, pageSize: newSize });
        return;
      }

      // Filter change: resets to page 1
      setFilters((prev) => {
        const next = { ...prev };
        if (Array.isArray(keyOrAccessor)) {
          keyOrAccessor.forEach((acc, idx) => {
            if (value[idx] === null || value[idx] === undefined || value[idx] === '') {
              delete next[acc];
            } else {
              next[acc] = value[idx];
            }
          });
        } else {
          if (value === null || value === undefined || value === '') {
            delete next[keyOrAccessor];
          } else {
            next[keyOrAccessor] = value;
          }
        }

        const nextPagination = { ...pagination, pageNumber: 1 };
        setPagination(nextPagination);
        mutation.mutate({ newFilters: next, newPagination: nextPagination });
        return next;
      });
    },
    [pagination, mutation]
  );

  // Sync to URL
  useEffect(() => {
    if (persistFiltersInUrl) {
      const params = new URLSearchParams(searchParams.toString());
      if (Object.keys(filters).length > 0) {
        params.set('filters', JSON.stringify(filters));
      } else {
        params.delete('filters');
      }

      if (globalSearch.trim()) {
        params.set('search', globalSearch.trim());
      } else {
        params.delete('search');
      }

      params.set('pageNumber', String(pagination.pageNumber));
      params.set('pageSize', String(pagination.pageSize));

      navigate(`${pathname}?${params.toString()}`, { replace: true });
    }
  }, [filters, globalSearch, pagination, persistFiltersInUrl, navigate, pathname, searchParams]);

  // Global table events
  useEffect(() => {
    const handleRefresh = () => refetch();
    const handleReset = () => {
      const resetFilters = initialPostData || {};
      setFilters(resetFilters);
      setGlobalSearch('');
      setPagination({ pageNumber: 1, pageSize: initialPageSize });
      mutation.mutate({
        newFilters: resetFilters,
        newPagination: { pageNumber: 1, pageSize: initialPageSize },
      });
    };

    document.addEventListener('tableRefreshEvent', handleRefresh);
    document.addEventListener('tableResetEvent', handleReset);
    return () => {
      document.removeEventListener('tableRefreshEvent', handleRefresh);
      document.removeEventListener('tableResetEvent', handleReset);
    };
  }, [refetch, initialPostData, initialPageSize, mutation]);

  // Active filters count
  const activeFiltersCount =
    extendedFilter?.filters?.filter((f) => {
      const key = Array.isArray(f.accessor) ? f.accessor[0] : f.accessor;
      const val = filters[key];
      return val !== undefined && val !== null && val !== '';
    }).length ?? 0;

  // Render individual extended filter input using our Flat Form Components
  const renderFilterControl = (filter: FilterParam) => {
    const accessorKey = Array.isArray(filter.accessor) ? filter.accessor[0] : filter.accessor;
    const value = filters[accessorKey];

    switch (filter.type) {
      case 'TextFilter':
        return (
          <FlatInputText
            label={filter.label}
            value={value || ''}
            onChange={(e) => handleQueryChange(filter.accessor, e.target.value)}
            placeholder={`Filter ${filter.label}`}
            {...filter.args}
          />
        );

      case 'SelectFilter':
        return (
          <FlatDropdown
            label={filter.label}
            value={value ?? null}
            options={filter.args?.options || []}
            optionLabel={filter.args?.optionLabel || 'label'}
            optionValue={filter.args?.optionValue || 'value'}
            onChange={(val) => handleQueryChange(filter.accessor, val)}
            placeholder={`Select ${filter.label}`}
            showClear
            {...filter.args}
          />
        );

      case 'MultiSelectFilter':
        return (
          <FlatMultiSelect
            label={filter.label}
            value={value ?? []}
            options={filter.args?.options || []}
            optionLabel={filter.args?.optionLabel || 'label'}
            optionValue={filter.args?.optionValue || 'value'}
            onChange={(val) => handleQueryChange(filter.accessor, val)}
            placeholder={`Select ${filter.label}`}
            display="chip"
            showClear
            {...filter.args}
          />
        );

      case 'DateFilter':
        return (
          <FlatDatePicker
            label={filter.label}
            value={value ? new Date(value) : null}
            onChange={(val) => handleQueryChange(filter.accessor, val ? new Date(val).toISOString() : null)}
            placeholder={`Pick ${filter.label}`}
            showIcon
            {...filter.args}
          />
        );

      case 'DateRangeFilter':
        return (
          <FlatDatePicker
            label={filter.label}
            value={value}
            selectionMode="range"
            onChange={(val) => handleQueryChange(filter.accessor, val)}
            placeholder={`Range for ${filter.label}`}
            showIcon
            {...filter.args}
          />
        );

      case 'MonthYearFilter':
        return (
          <FlatDatePicker
            label={filter.label}
            value={value ? new Date(value) : null}
            view="month"
            dateFormat="mm/yy"
            onChange={(val) => handleQueryChange(filter.accessor, val ? new Date(val).toISOString() : null)}
            placeholder={`Select ${filter.label}`}
            showIcon
            {...filter.args}
          />
        );

      default:
        return null;
    }
  };

  const tableDataList = resolvedTableData?.data || [];
  const totalCount = resolvedTableData?.totalCount || 0;
  const totalPages = resolvedTableData?.totalPages || 1;
  const currentPage = resolvedTableData?.currentPage || 1;
  const isBusy = isLoading || mutation.isPending;

  return (
    <div
      ref={tableRootRef}
      className={cn(
        'w-full font-sans text-white',
        stretchHeight ? 'flex flex-col h-full gap-4' : 'space-y-4',
        className
      )}
    >
      {/* 1. Error Banner */}
      {isError && showErrorAsBanner && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-4 flex items-center justify-between text-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-sm font-semibold">
              Failed to load table data: {(error as any)?.message || 'Network error'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 bg-red-accent hover:bg-red-accent-hover text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* 2. Flat Top Bar (Heading + Action + Header Notes) */}
      {(heading || hasAction || headerNotes) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-portal-border/60 pb-4">
          <div>
            {typeof heading === 'string' ? (
              <h2 className="text-xl font-bold tracking-tight text-white">{heading}</h2>
            ) : (
              heading
            )}
            {headerNotes && (
              <div className="text-xs text-portal-muted mt-1">{headerNotes}</div>
            )}
          </div>

          {hasAction && (
            <div>
              {actionOptions?.asLink ? (
                <button
                  type="button"
                  onClick={() => navigate(actionOptions.link)}
                  className="px-4 py-2 bg-portal-accent hover:bg-portal-accent-hover text-portal-canvas text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  {actionName}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAction}
                  className="px-4 py-2 bg-portal-accent hover:bg-portal-accent-hover text-portal-canvas text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  {actionName}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Flat Toolbar (Search + Extended Filters Toggle + View Action) */}
      {((enableTableFilter && filterablePlaceholder) || extendedFilter?.enable) && (
        <div className="bg-portal-surface border border-portal-border/60 rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box - matching user screenshot */}
          <div className="flex items-center gap-3 flex-1">
            {filterablePlaceholder && (
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-portal-muted absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQueryChange(filterable, globalSearch)}
                  placeholder={filterablePlaceholder}
                  className="w-full h-[38px] pl-10 pr-10 bg-portal-canvas border border-portal-border rounded text-xs text-white placeholder-portal-muted focus:outline-none focus:border-portal-accent transition box-border"
                />
                {globalSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setGlobalSearch('');
                      handleQueryChange(filterable, '');
                    }}
                    className="absolute right-3 text-portal-muted hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Extended Filter Toggle Button */}
            {extendedFilter?.enable && (
              <button
                type="button"
                onClick={() => setIsFilterVisible(!isFilterVisible)}
                className={cn(
                  'h-[38px] px-3 border text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 transition-colors cursor-pointer shrink-0',
                  isFilterVisible
                    ? 'bg-portal-accent border-portal-accent text-portal-canvas'
                    : 'bg-portal-canvas border-portal-border text-white hover:border-portal-border/80'
                )}
              >
                <ListFilter className="w-4 h-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-portal-accent text-portal-canvas text-[10px] font-bold flex items-center justify-center rounded">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            )}

            {/* Shortcut / Refresh icon button matching screenshot */}
            <button
              type="button"
              title="Refresh Records"
              onClick={() => refetch()}
              className="h-[38px] w-[38px] flex items-center justify-center bg-portal-canvas border border-portal-border rounded text-portal-muted hover:text-white hover:border-portal-border/80 cursor-pointer transition shrink-0"
            >
              <RotateCcw className={cn('w-4 h-4', isBusy && 'animate-spin text-portal-accent')} />
            </button>
          </div>

          {/* Quick Stats or Status */}
          <div className="flex items-center gap-2 text-xs font-mono text-[#e6edf3] shrink-0">
            {isBusy ? (
              <span className="flex items-center gap-1.5 text-portal-accent font-semibold">
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Loading...
              </span>
            ) : (
              <span>{totalCount} total records</span>
            )}
          </div>
        </div>
      )}

      {/* 4. Extended Filters Panel */}
      {extendedFilter?.enable && isFilterVisible && (
        <div className="bg-portal-surface border border-portal-border/60 rounded p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-portal-border/40 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Filter Parameters
            </h4>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilters({});
                  setPagination({ pageNumber: 1, pageSize: pagination.pageSize });
                  mutation.mutate({ newFilters: {}, newPagination: { pageNumber: 1, pageSize: pagination.pageSize } });
                }}
                className="text-xs text-red-accent hover:underline font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {extendedFilter.filters.map((f, idx) => (
              <div key={idx} className="w-full">
                {renderFilterControl(f)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Flat DataTable View */}
      <div className="border border-portal-border/60 bg-portal-surface rounded overflow-hidden shadow-none">
        {/* Desktop View */}
        <div className={cn(isMobile ? 'hidden' : 'block')}>
          <PrimeDataTable
            value={tableDataList}
            loading={isBusy}
            responsiveLayout="scroll"
            className="p-datatable-sm w-full"
            emptyMessage={
              <div className="py-16 flex flex-col items-center justify-center text-portal-muted">
                <Package className="w-12 h-12 mb-3 stroke-[1.5] text-portal-border" />
                <p className="font-semibold text-white text-sm">{emptyDataText}</p>
                {dataSourceUrl && (
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-3 px-3 py-1.5 border border-portal-border text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition"
                  >
                    Reload
                  </button>
                )}
              </div>
            }
            rowClassName={() => 'hover:bg-white/[0.04] transition-colors'}
            pt={{
              thead: { className: 'bg-portal-canvas border-b border-portal-border' },
              headerRow: { className: 'border-none' },
              column: {
                headerCell: {
                  className:
                    'bg-portal-canvas text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 border-b border-portal-border whitespace-nowrap text-left rounded-none',
                },
                bodyCell: {
                  className:
                    'py-3.5 px-4 text-xs text-[#e6edf3] border-b border-portal-border/40 font-normal rounded-none',
                },
              },
            }}
          >
            {columns.map((col) => (
              <Column
                key={col.field}
                field={col.field}
                header={
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{col.header}</span>
                    {sortableColumns?.find((s) => s.key === col.field) && (
                      <button
                        type="button"
                        onClick={() => {
                          const conf = sortableColumns.find((s) => s.key === col.field);
                          if (!conf) return;
                          const currentVal = filters[conf.accessor];
                          const nextVal = currentVal === 'asc' ? 'desc' : 'asc';
                          handleQueryChange(conf.accessor, nextVal);
                        }}
                        className="text-white/70 hover:text-portal-accent cursor-pointer transition"
                        title="Sort"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                }
                body={col.body}
                style={col.style}
                headerStyle={col.headerStyle}
                className={col.className}
              />
            ))}
          </PrimeDataTable>
        </div>

        {/* Mobile View: Flat Stacked Cards */}
        <div className={cn(isMobile ? 'block' : 'hidden')}>
          {tableDataList.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-portal-muted p-4">
              <Package className="w-12 h-12 mb-3 stroke-[1.5] text-portal-border" />
              <p className="font-semibold text-white text-sm">{emptyDataText}</p>
              {dataSourceUrl && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 px-3 py-1.5 border border-portal-border text-white text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
                >
                  Reload
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-portal-border/40">
              {tableDataList.map((item, rowIdx) => (
                <div
                  key={rowIdx}
                  className="p-4 space-y-2 hover:bg-white/[0.02] transition-colors bg-portal-surface"
                >
                  {columns.map((col) => (
                    <div
                      key={col.field}
                      className="grid grid-cols-3 gap-2 items-baseline text-xs"
                    >
                      <span className="font-bold text-white uppercase tracking-wider">
                        {col.header}
                      </span>
                      <div className="col-span-2 text-[#e6edf3] break-words font-medium">
                        {col.body ? col.body(item, { rowIndex: rowIdx }) : item[col.field]}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Flat Pagination Bar */}
        {enablePaginator && totalCount > 0 && (
          <div className="p-3 bg-portal-canvas border-t border-portal-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Info */}
            <div className="font-mono text-portal-muted">
              Page <span className="font-bold text-white">{currentPage}</span> of{' '}
              <span className="font-bold text-white">{totalPages}</span> •{' '}
              <span className="font-bold text-white">{totalCount}</span> records
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Page size select */}
              <div className="flex items-center gap-1.5">
                <span className="text-portal-muted uppercase font-semibold text-[11px]">Rows:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => handleQueryChange('pageSize', Number(e.target.value))}
                  className="px-2 py-1 bg-portal-surface border border-portal-border rounded text-xs text-white focus:outline-none focus:border-portal-accent cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1 || isBusy}
                  onClick={() => {
                    handleQueryChange('pageNumber', currentPage - 1);
                    scrollDataTableToTop();
                    scrollRootIntoViewIfNeeded();
                  }}
                  className="px-2.5 py-1.5 border border-portal-border bg-portal-surface hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-portal-surface text-white rounded flex items-center gap-1 cursor-pointer font-bold transition"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="px-2.5 py-1.5 bg-portal-accent text-portal-canvas font-mono font-bold rounded">
                  {currentPage}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages || isBusy}
                  onClick={() => {
                    handleQueryChange('pageNumber', currentPage + 1);
                    scrollDataTableToTop();
                    scrollRootIntoViewIfNeeded();
                  }}
                  className="px-2.5 py-1.5 border border-portal-border bg-portal-surface hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-portal-surface text-white rounded flex items-center gap-1 cursor-pointer font-bold transition"
                  aria-label="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlatDataTable;
