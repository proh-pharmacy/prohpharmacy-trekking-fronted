import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DataTable as PrimeDataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useQuery } from '@tanstack/react-query';
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
  FlatAsyncSelect,
} from '../flat-form';

// --- Types ---

export type FilterType =
  | 'DateFilter'
  | 'SelectFilter'
  | 'MultiSelectFilter'
  | 'TextFilter'
  | 'DateRangeFilter'
  | 'MonthYearFilter'
  | 'AsyncSelectFilter';

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
  secondaryAction?: boolean;
  secondaryActionName?: string;
  secondaryActionIcon?: string;
  onSecondaryAction?: () => void;
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


// --- Helper to extract all known filter keys and legacy JSON filters from URL ---
const extractFiltersFromUrl = (
  params: URLSearchParams,
  filterDefs?: FilterParam[],
  initialFilters: Record<string, any> = {}
): Record<string, any> => {
  const extracted: Record<string, any> = { ...initialFilters };

  // 1. Support legacy/json "filters" parameter if present
  const jsonParam = params.get('filters');
  if (jsonParam) {
    try {
      Object.assign(extracted, JSON.parse(jsonParam));
    } catch {
      // ignore malformed JSON
    }
  }

  // 2. Extract individual query parameters based on extended filter accessors
  if (filterDefs && filterDefs.length > 0) {
    filterDefs.forEach((filter) => {
      const accessors = Array.isArray(filter.accessor) ? filter.accessor : [filter.accessor];
      accessors.forEach((acc) => {
        const val = params.get(acc);
        if (val !== null && val !== undefined && val !== '') {
          if (filter.type === 'MultiSelectFilter') {
            extracted[acc] = val.includes(',') ? val.split(',') : [val];
          } else if (filter.type === 'DateRangeFilter' && val.includes(',')) {
            extracted[acc] = val.split(',').map((s) => new Date(s));
          } else {
            extracted[acc] = val;
          }
        }
      });
    });
  }

  return extracted;
};

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
  secondaryAction,
  secondaryActionName = 'Import',
  secondaryActionIcon,
  onSecondaryAction,
  heading,
  headerNotes,
  isFilterVisibleOnStart = false,
  showErrorAsBanner = true,
  emptyDataText = 'No records found.',
  persistFiltersInUrl = false,
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
  const tableRootRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive mobile detector
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const initialFilters = useMemo(() => {
    if (persistFiltersInUrl) {
      return extractFiltersFromUrl(searchParams, extendedFilter?.filters, initialPostData);
    }
    return initialPostData || {};
  }, []);

  const singleFilter = (extendedFilter?.filters?.length ?? 0) === 1 && !filterablePlaceholder;
  const hasActiveFiltersInitially = Object.keys(initialFilters).length > 0;

  const [isFilterVisible, setIsFilterVisible] = useState(() => {
    const isCurrentlyMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    return isCurrentlyMobile ? false : isFilterVisibleOnStart || singleFilter || hasActiveFiltersInitially;
  });

  // 1. Search input state - globalSearch (immediate text) & debouncedSearch (API trigger)
  const initialSearchVal = persistFiltersInUrl
    ? searchParams.get('search') || searchParams.get(filterable) || ''
    : '';

  const [globalSearch, setGlobalSearch] = useState(initialSearchVal);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearchVal);

  // 2. Filter state
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);

  // 3. Pagination state
  const [pagination, setPagination] = useState({
    pageNumber: persistFiltersInUrl
      ? Number(searchParams.get('pageNumber')) || Number(searchParams.get('page')) || 1
      : 1,
    pageSize: persistFiltersInUrl
      ? Number(searchParams.get('pageSize')) || Number(searchParams.get('size')) || initialPageSize
      : initialPageSize,
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

  // --- Optional URL Sync helper (only used when persistFiltersInUrl is explicitly true) ---
  const updateUrl = useCallback(
    (updates: {
      search?: string | null;
      pageNumber?: number;
      pageSize?: number;
      filterUpdates?: Record<string, any>;
      clearAllFilters?: boolean;
    }) => {
      if (!persistFiltersInUrl) return;

      const params = new URLSearchParams(window.location.search);

      if (updates.search !== undefined) {
        if (updates.search && updates.search.trim()) {
          params.set('search', updates.search.trim());
          if (filterable !== 'search') params.delete(filterable);
        } else {
          params.delete('search');
          params.delete(filterable);
        }
      }

      if (updates.pageSize !== undefined) {
        params.set('pageSize', String(updates.pageSize));
      }

      if (updates.pageNumber !== undefined) {
        params.set('pageNumber', String(updates.pageNumber));
      }

      params.delete('filters');

      if (updates.clearAllFilters) {
        if (extendedFilter?.filters) {
          extendedFilter.filters.forEach((f) => {
            const accs = Array.isArray(f.accessor) ? f.accessor : [f.accessor];
            accs.forEach((k) => params.delete(k));
          });
        }
      } else if (updates.filterUpdates !== undefined) {
        Object.entries(updates.filterUpdates).forEach(([k, val]) => {
          if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
            params.delete(k);
          } else if (Array.isArray(val)) {
            params.set(
              k,
              val.map((v) => (v instanceof Date ? v.toISOString() : String(v))).join(',')
            );
          } else if (val instanceof Date) {
            params.set(k, val.toISOString());
          } else {
            params.set(k, String(val));
          }
        });
      }

      const newQuery = params.toString();
      const currentQuery = searchParams.toString();
      if (newQuery !== currentQuery) {
        navigate(`${pathname}?${newQuery}`, { replace: true });
      }
    },
    [persistFiltersInUrl, filterable, extendedFilter?.filters, searchParams, pathname, navigate]
  );

  // --- Two-way URL Sync (only active if persistFiltersInUrl is true) ---
  useEffect(() => {
    if (!persistFiltersInUrl) return;

    const urlSearch = searchParams.get('search') || searchParams.get(filterable) || '';
    setGlobalSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setDebouncedSearch((prev) => (prev !== urlSearch ? urlSearch : prev));

    const urlPage = Number(searchParams.get('pageNumber')) || Number(searchParams.get('page')) || 1;
    const urlSize = Number(searchParams.get('pageSize')) || Number(searchParams.get('size')) || initialPageSize;
    setPagination((prev) => {
      if (prev.pageNumber !== urlPage || prev.pageSize !== urlSize) {
        return { pageNumber: urlPage, pageSize: urlSize };
      }
      return prev;
    });

    const urlFilters = extractFiltersFromUrl(searchParams, extendedFilter?.filters, initialPostData);
    setFilters((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(urlFilters);
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((k) => JSON.stringify(prev[k]) === JSON.stringify(urlFilters[k]))
      ) {
        return prev;
      }
      return urlFilters;
    });
  }, [searchParams, filterable, extendedFilter?.filters, persistFiltersInUrl, initialPageSize, initialPostData]);

  // --- Data Fetching Logic ---
  const fetchTableData = async (
    currentFilters: Record<string, any>,
    currentPagination: { pageNumber: number; pageSize: number },
    currentSearch: string
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

    if (currentSearch.trim()) {
      payload[filterable] = currentSearch.trim();
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
    () => [dataSourceUrl, filters, pagination, debouncedSearch, apiCallType],
    [dataSourceUrl, filters, pagination, debouncedSearch, apiCallType]
  );

  const {
    data: queryResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PaginatedDataResponse<TData>>({
    queryKey,
    queryFn: () => fetchTableData(filters, pagination, debouncedSearch),
    enabled: Boolean(dataSourceUrl || staticData),
  });

  // Client-side filtering when static data is supplied
  const resolvedTableData = useMemo(() => {
    if (staticData && debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
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
  }, [staticData, debouncedSearch, queryResult, pagination]);

  // Clean Debounced Search Handler (zero route lag or jitter)
  const handleSearchChange = (val: string) => {
    setGlobalSearch(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPagination((prev) => ({ ...prev, pageNumber: 1 }));
      if (persistFiltersInUrl) {
        updateUrl({ search: val, pageNumber: 1 });
      }
    }, 300);
  };

  const handleSearchSubmit = (val: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    setDebouncedSearch(val);
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
    if (persistFiltersInUrl) {
      updateUrl({ search: val, pageNumber: 1 });
    }
  };

  const handleSearchClear = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    setGlobalSearch('');
    setDebouncedSearch('');
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
    if (persistFiltersInUrl) {
      updateUrl({ search: '', pageNumber: 1 });
    }
  };

  // Extended Filter Change Handler
  const handleFilterChange = useCallback(
    (keyOrAccessor: string | string[], value: any) => {
      const nextFilters = { ...filters };
      const updatesForUrl: Record<string, any> = {};

      if (Array.isArray(keyOrAccessor)) {
        keyOrAccessor.forEach((acc, idx) => {
          const v = value?.[idx];
          if (v === null || v === undefined || v === '') {
            delete nextFilters[acc];
          } else {
            nextFilters[acc] = v;
          }
          updatesForUrl[acc] = v;
        });
      } else {
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          delete nextFilters[keyOrAccessor];
        } else {
          nextFilters[keyOrAccessor] = value;
        }
        updatesForUrl[keyOrAccessor] = value;
      }

      setFilters(nextFilters);
      setPagination((prev) => ({ ...prev, pageNumber: 1 }));
      if (persistFiltersInUrl) {
        updateUrl({ filterUpdates: updatesForUrl, pageNumber: 1 });
      }
    },
    [filters, persistFiltersInUrl, updateUrl]
  );

  // Pagination Handlers
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPagination((prev) => ({ ...prev, pageNumber: newPage }));
      if (persistFiltersInUrl) {
        updateUrl({ pageNumber: newPage });
      }
      scrollRootIntoViewIfNeeded();
    },
    [persistFiltersInUrl, updateUrl, scrollRootIntoViewIfNeeded]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPagination({ pageNumber: 1, pageSize: newSize });
      if (persistFiltersInUrl) {
        updateUrl({ pageSize: newSize, pageNumber: 1 });
      }
    },
    [persistFiltersInUrl, updateUrl]
  );

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
    if (persistFiltersInUrl) {
      updateUrl({ clearAllFilters: true, pageNumber: 1 });
    }
  }, [persistFiltersInUrl, updateUrl]);

  // Global table events
  useEffect(() => {
    const handleRefresh = () => refetch();
    const handleReset = () => {
      const resetFilters = initialPostData || {};
      setFilters(resetFilters);
      setGlobalSearch('');
      setDebouncedSearch('');
      setPagination({ pageNumber: 1, pageSize: initialPageSize });
      if (persistFiltersInUrl) {
        updateUrl({
          search: '',
          pageNumber: 1,
          pageSize: initialPageSize,
          clearAllFilters: true,
        });
      }
    };

    document.addEventListener('tableRefreshEvent', handleRefresh);
    document.addEventListener('tableResetEvent', handleReset);
    return () => {
      document.removeEventListener('tableRefreshEvent', handleRefresh);
      document.removeEventListener('tableResetEvent', handleReset);
    };
  }, [refetch, initialPostData, initialPageSize, persistFiltersInUrl, updateUrl]);

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
            onChange={(e) => handleFilterChange(filter.accessor, e.target.value)}
            placeholder={`Filter ${filter.label}`}
            {...filter.args}
          />
        );

      case 'SelectFilter':
        return (
          <FlatDropdown
            label={filter.label}
            value={value !== undefined ? value : ''}
            options={filter.args?.options || []}
            optionLabel={filter.args?.optionLabel || 'label'}
            optionValue={filter.args?.optionValue || 'value'}
            onChange={(val) => handleFilterChange(filter.accessor, val)}
            placeholder={`Select ${filter.label}`}
            showClear
            {...filter.args}
          />
        );

      case 'MultiSelectFilter':
        return (
          <FlatMultiSelect
            label={filter.label}
            value={Array.isArray(value) ? value : value ? [value] : []}
            options={filter.args?.options || []}
            optionLabel={filter.args?.optionLabel || 'label'}
            optionValue={filter.args?.optionValue || 'value'}
            onChange={(val) => handleFilterChange(filter.accessor, val)}
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
            onChange={(val) => handleFilterChange(filter.accessor, val ? new Date(val).toISOString() : null)}
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
            onChange={(val) => handleFilterChange(filter.accessor, val)}
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
            onChange={(val) => handleFilterChange(filter.accessor, val ? new Date(val).toISOString() : null)}
            placeholder={`Select ${filter.label}`}
            showIcon
            {...filter.args}
          />
        );

      case 'AsyncSelectFilter':
        return (
          <FlatAsyncSelect
            label={filter.label}
            value={value || undefined}
            placeholder={filter.args?.placeholder || `Search ${filter.label}...`}
            endpointUrl={filter.args?.endpointUrl}
            fetchFn={filter.args?.fetchFn}
            optionValue={filter.args?.optionValue || 'id'}
            optionLabel={filter.args?.optionLabel || 'name'}
            pageSize={filter.args?.pageSize || 20}
            clearable
            size="sm"
            onChange={(val) => handleFilterChange(filter.accessor, val ?? '')}
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
  const isBusy = isLoading;

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

      {/* 2. Flat Top Bar (Heading + Action + Header Notes) styled as header card */}
      {(heading || hasAction || secondaryAction || headerNotes) && (
        <div className="bg-portal-surface border border-portal-border/60 rounded p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {typeof heading === 'string' ? (
              <h2 className="text-xl font-bold tracking-tight text-white">{heading}</h2>
            ) : (
              heading
            )}
            {headerNotes && (
              <p className="text-xs text-portal-muted max-w-2xl leading-relaxed mt-1">
                {headerNotes}
              </p>
            )}
          </div>

          {(hasAction || secondaryAction) && (
            <div className="flex items-center gap-2.5 shrink-0">
              {secondaryAction && (
                <button
                  type="button"
                  onClick={onSecondaryAction}
                  className="px-4 py-2 bg-portal-canvas hover:bg-portal-surface border border-portal-border text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer transition"
                >
                  {secondaryActionIcon && <i className={`${secondaryActionIcon} text-xs`} />}
                  {secondaryActionName}
                </button>
              )}
              {hasAction && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Flat Toolbar (Search + Extended Filters Toggle + View Action) */}
      {((enableTableFilter && filterablePlaceholder) || extendedFilter?.enable) && (
        <div className="bg-portal-surface border border-portal-border/60 rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-3 flex-1">
            {filterablePlaceholder && (
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-portal-muted absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(globalSearch)}
                  placeholder={filterablePlaceholder}
                  className="w-full h-[38px] pl-10 pr-10 bg-portal-canvas border border-portal-border rounded text-xs text-white placeholder-portal-muted focus:outline-none focus:border-portal-accent transition box-border"
                />
                {globalSearch && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
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

            {/* Shortcut / Refresh icon button */}
            <button
              type="button"
              title="Refresh Records"
              onClick={() => refetch()}
              className="h-[38px] w-[38px] flex items-center justify-center bg-portal-canvas border border-portal-border rounded text-portal-muted hover:text-white hover:border-portal-border/80 cursor-pointer transition shrink-0"
            >
              <RotateCcw className={cn('w-4 h-4', isBusy && 'animate-spin text-portal-accent')} />
            </button>
          </div>

          {/* Quick Loading Status */}
          {isBusy && (
            <div className="flex items-center gap-2 text-xs font-mono text-portal-text shrink-0">
              <span className="flex items-center gap-1.5 text-portal-accent font-semibold">
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Loading...
              </span>
            </div>
          )}
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
                onClick={handleResetFilters}
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
                    'py-3.5 px-4 text-xs text-portal-text border-b border-portal-border/40 font-normal rounded-none',
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
                          handleFilterChange(conf.accessor, nextVal);
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
                      <div className="col-span-2 text-portal-text break-words font-medium">
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
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-2 py-1 bg-portal-surface border border-portal-border rounded text-xs text-white focus:outline-none focus:border-portal-accent cursor-pointer"
                >
                  {[5, 10, 20, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                  {![5, 10, 20, 25, 50, 100].includes(pagination.pageSize) && (
                    <option value={pagination.pageSize}>{pagination.pageSize}</option>
                  )}
                </select>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1 || isBusy}
                  onClick={() => {
                    handlePageChange(currentPage - 1);
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
                    handlePageChange(currentPage + 1);
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
