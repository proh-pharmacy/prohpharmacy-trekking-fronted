import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../../api-client';
import { type FlatInputSize, getInputSizeClasses } from './inputVariants';

// Stable identity per fetchFn reference so it can participate in the query key.
// When the caller's useCallback deps change, the new ref gets a new id,
// which naturally invalidates the cache for that query.
const fetchFnIds = new WeakMap<object, string>();
let nextFnId = 0;
function getFetchFnId(fn: object): string {
  let id = fetchFnIds.get(fn);
  if (!id) {
    id = 'fn_' + (++nextFnId).toString(36);
    fetchFnIds.set(fn, id);
  }
  return id;
}

export interface FlatAsyncSelectProps<T = any> {
  id?: string;
  label?: string;
  required?: boolean;
  errorMessage?: string;
  helperText?: string;
  placeholder?: string;
  value?: any;
  onChange?: (value: any, selectedItem?: T) => void;
  endpointUrl?: string;
  defaultParams?: Record<string, any>;
  fetchFn?: (params: { pageNumber: number; pageSize: number; search?: string }) => Promise<{
    data: T[];
    totalPages?: number;
    totalCount?: number;
    currentPage?: number;
  }>;
  pageSize?: number;
  searchParam?: string;
  searchMode?: 'remote' | 'local';
  optionValue?: keyof T | string;
  optionLabel?: keyof T | string | ((item: T) => string);
  optionDisabled?: (item: T) => boolean;
  itemTemplate?: (item: T, isSelected: boolean) => React.ReactNode;
  selectedItemTemplate?: (item: T) => React.ReactNode;
  initialSelectedItem?: T;
  staticOptions?: T[];
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  fullWidth?: boolean;
  size?: FlatInputSize;
  variant?: 'dark' | 'default' | 'white';
  filter?: {
    label: string;
    value: string;
    options: { label: string; value: string; disabled?: boolean }[];
    onChange: (value: string) => void;
  };
}

interface PageResult<T> {
  data: T[];
  totalPages: number;
  totalCount?: number;
  currentPage: number;
}

export function FlatAsyncSelect<T extends Record<string, any> = any>({
  id,
  label,
  required,
  errorMessage,
  helperText,
  placeholder = 'Select an option...',
  value,
  onChange,
  endpointUrl,
  defaultParams,
  fetchFn,
  pageSize = 10,
  searchParam = 'search',
  searchMode = 'remote',
  optionValue = 'id',
  optionLabel = 'name',
  optionDisabled,
  itemTemplate,
  selectedItemTemplate,
  initialSelectedItem,
  staticOptions,
  disabled = false,
  clearable = true,
  className = '',
  fullWidth = true,
  size = 'sm',
  variant = 'dark',
  filter,
}: FlatAsyncSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<T | undefined>(initialSelectedItem);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isDark = variant === 'dark';
  const effectiveSize: FlatInputSize = size || 'sm';
  const sizeConfig = getInputSizeClasses(effectiveSize);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const useStaticOnly = Boolean(staticOptions && staticOptions.length > 0 && searchMode === 'local');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Keep selectedItem in sync if initialSelectedItem changes
  useEffect(() => {
    if (initialSelectedItem) {
      setSelectedItem(initialSelectedItem);
    }
  }, [initialSelectedItem]);

  const sourceKey = endpointUrl ?? (fetchFn ? getFetchFnId(fetchFn) : 'none');

  const queryKey = useMemo(
    () => [
      'flat-async-select',
      sourceKey,
      defaultParams ?? null,
      pageSize,
      searchParam,
      debouncedSearch,
    ],
    [sourceKey, defaultParams, pageSize, searchParam, debouncedSearch]
  );

  const infiniteQuery = useInfiniteQuery<PageResult<T>>({
    queryKey,
    enabled: isOpen && !useStaticOnly && (Boolean(endpointUrl) || Boolean(fetchFn)),
    initialPageParam: 1,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) =>
      lastPage.currentPage < lastPage.totalPages ? lastPage.currentPage + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      if (fetchFn) {
        const res = await fetchFn({
          pageNumber: page,
          pageSize,
          search: debouncedSearch || undefined,
        });
        return {
          data: res.data || [],
          totalPages: res.totalPages || 1,
          totalCount: res.totalCount,
          currentPage: page,
        };
      }
      if (endpointUrl) {
        const params: Record<string, any> = {
          ...defaultParams,
          pageNumber: page,
          pageSize,
        };
        if (debouncedSearch) params[searchParam] = debouncedSearch;
        const res = await api.get<any>(endpointUrl, { params });
        const payload = res.data;
        if (Array.isArray(payload)) {
          return { data: payload, totalPages: 1, totalCount: payload.length, currentPage: page };
        }
        if (payload && Array.isArray(payload.data)) {
          const totalPages =
            payload.totalPages ||
            (payload.pageSize ? Math.ceil((payload.totalCount || 0) / payload.pageSize) : 1);
          return {
            data: payload.data,
            totalPages,
            totalCount: payload.totalCount,
            currentPage: page,
          };
        }
        return { data: [], totalPages: 1, totalCount: 0, currentPage: page };
      }
      return { data: [], totalPages: 1, totalCount: 0, currentPage: page };
    },
  });

  // Flatten and dedupe pages into a single items list
  const items = useMemo<T[]>(() => {
    if (useStaticOnly) return staticOptions || [];
    if (!infiniteQuery.data) return [];
    const seen = new Set<any>();
    const flat: T[] = [];
    for (const page of infiniteQuery.data.pages) {
      for (const item of page.data) {
        const key = (optionValue as string) in item ? item[optionValue as keyof T] : JSON.stringify(item);
        if (seen.has(key)) continue;
        seen.add(key);
        flat.push(item);
      }
    }
    return flat;
  }, [infiniteQuery.data, useStaticOnly, staticOptions, optionValue]);

  const totalCount = useStaticOnly
    ? staticOptions?.length
    : infiniteQuery.data?.pages[infiniteQuery.data.pages.length - 1]?.totalCount;

  // Spinner only for first-ever fetch of a key (no cache yet).
  // Background refetches on reopen are silent — cached data stays visible.
  const showFirstLoad = infiniteQuery.isLoading && items.length === 0;
  const isLoadingMore = infiniteQuery.isFetchingNextPage;

  // Sync selectedItem if value exists and matching item is found in loaded items
  useEffect(() => {
    if (value !== undefined && value !== null) {
      const found = items.find((item) =>
        (optionValue as string) in item ? item[optionValue as keyof T] === value : false
      );
      if (found) {
        setSelectedItem(found);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [value, items, optionValue]);

  // Update dropdown position relative to trigger
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  // Handle open/close
  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setIsOpen(false);
      setIsFilterOpen(false);
    }
  };

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsFilterOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsFilterOpen(false);
      }
    };

    const handleResizeOrScroll = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, updatePosition]);

  // Scroll listener for infinite scroll
  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 30;

    if (isNearBottom && !isLoadingMore && infiniteQuery.hasNextPage) {
      void infiniteQuery.fetchNextPage();
    }
  };

  // Helper to extract label text
  const getItemLabel = (item: T): string => {
    if (typeof optionLabel === 'function') {
      return optionLabel(item);
    }
    if (typeof optionLabel === 'string' && optionLabel in item) {
      return String(item[optionLabel]);
    }
    return String(item.name || item.fullName || item.title || item.label || '');
  };

  // Helper to extract value
  const getItemValue = (item: T): any => {
    if (typeof optionValue === 'string' && optionValue in item) {
      return item[optionValue];
    }
    return item.id || item.value || item;
  };

  // Filter items for local search
  const displayedItems = useMemo(() => {
    if (searchMode === 'local' && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return items.filter((item) => {
        const text = getItemLabel(item).toLowerCase();
        return text.includes(term);
      });
    }
    return items;
  }, [items, searchMode, searchTerm]);

  // Select an item
  const handleSelectItem = (item: T) => {
    const val = getItemValue(item);
    setSelectedItem(item);
    onChange?.(val, item);
    setIsOpen(false);
    setIsFilterOpen(false);
    setSearchTerm('');
  };

  // Clear selected item
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(undefined);
    onChange?.(undefined, undefined);
  };

  return (
    <div className={`flex flex-col ${sizeConfig.container} ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`font-medium tracking-wider uppercase flex items-center gap-1 ${sizeConfig.label} ${
            isDark ? 'text-portal-muted' : 'text-slate-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Trigger (Matches the selected FlatDropdown size) */}
      <div
        id={inputId}
        ref={triggerRef}
        onClick={toggleDropdown}
        className={`
          relative w-full border rounded flex items-center justify-between cursor-pointer transition-colors select-none
          ${effectiveSize === 'sm' ? 'h-[42px] sm:h-[38px] text-base sm:text-xs' : effectiveSize === 'lg' ? 'h-[50px] text-base' : 'h-[44px] text-base sm:text-sm'}
          ${
            isDark
              ? 'bg-portal-canvas border-portal-border text-portal-heading hover:border-portal-border/80'
              : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400'
          }
          ${isOpen ? (isDark ? '!border-portal-accent ring-0' : '!border-primary-green') : ''}
          ${errorMessage ? '!border-red-500' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
          ${className}
        `}
      >
        {/* Selected Display / Placeholder */}
        <div className="flex-1 px-3 py-1 flex items-center min-w-0 truncate">
          {selectedItem ? (
            selectedItemTemplate ? (
              selectedItemTemplate(selectedItem)
            ) : (
              <span className="truncate text-portal-heading font-medium">{getItemLabel(selectedItem)}</span>
            )
          ) : (
            <span className="text-portal-muted truncate">{placeholder}</span>
          )}
        </div>

        {/* Right Controls: Clear & Chevron */}
        <div className="flex items-center pr-2.5 gap-1 shrink-0">
          {clearable && selectedItem && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-portal-muted hover:text-portal-heading rounded transition cursor-pointer"
              title="Clear selection"
            >
              <i className="pi pi-times text-[10px]" />
            </button>
          )}
          <span className="w-5 h-5 flex items-center justify-center text-portal-muted pointer-events-none">
            <i className={`pi pi-chevron-down text-[11px] transition-transform duration-200 ${isOpen ? 'rotate-180 text-portal-accent' : ''}`} />
          </span>
        </div>
      </div>

      {/* Portal-Mounted Floating Dropdown Panel */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${Math.max(260, dropdownPosition.width)}px`,
              zIndex: 99999,
            }}
            className="bg-portal-surface border border-portal-border rounded shadow-2xl overflow-hidden animate-scaleIn font-sans flex flex-col"
          >
            {/* Search Input Filter Container */}
            <div className="px-2 border-b border-portal-border/60 bg-portal-canvas flex items-center gap-2 shrink-0">
              <span className="inline-flex self-stretch shrink-0 items-center justify-center pl-1 text-portal-muted" aria-hidden="true">
                <i className="pi pi-search block text-xs leading-none" />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="flat-async-select-search h-[42px] sm:h-[38px] min-w-0 flex-1 bg-transparent border-none outline-none text-base sm:text-xs text-portal-heading placeholder-portal-muted focus:ring-0"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-portal-muted hover:text-portal-heading cursor-pointer"
                >
                  <i className="pi pi-times text-[10px]" />
                </button>
              )}
              {showFirstLoad && <i className="pi pi-spin pi-spinner text-portal-accent text-xs shrink-0 pr-1" />}
              {filter && (
                <button
                  type="button"
                  aria-label={`Filter ${label || 'options'}`}
                  aria-expanded={isFilterOpen}
                  title={`Filter ${label || 'options'}`}
                  onClick={() => setIsFilterOpen((open) => !open)}
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors cursor-pointer ${isFilterOpen || filter.value !== filter.options[0]?.value ? 'text-portal-accent bg-portal-accent/10' : 'text-portal-muted hover:text-portal-text hover:bg-white/[0.06]'}`}
                >
                  <i className="pi pi-filter text-xs" />
                </button>
              )}
            </div>

            {filter && isFilterOpen && (
              <div className="max-h-48 overflow-y-auto custom-scrollbar border-b border-portal-border/60 bg-portal-surface p-2 shrink-0">
                <p className="px-2 pb-1 text-[11px] font-medium text-portal-muted">{filter.label}</p>
                {filter.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => { filter.onChange(option.value); setIsFilterOpen(false); }}
                    className={`w-full flex items-center justify-between rounded px-2 py-2 text-left text-base sm:text-xs transition-colors ${option.disabled ? 'text-portal-muted/50 cursor-not-allowed' : option.value === filter.value ? 'bg-portal-accent/10 text-portal-accent' : 'text-portal-text hover:bg-white/[0.06] cursor-pointer'}`}
                  >
                    <span>{option.label}</span>
                    {option.value === filter.value && <i className="pi pi-check text-[11px]" />}
                  </button>
                ))}
              </div>
            )}

            {/* Scrollable Items List Container */}
            <div
              onScroll={handleListScroll}
              className="max-h-64 overflow-y-auto custom-scrollbar p-1 divide-y divide-portal-border/20 text-base sm:text-xs"
            >
              {showFirstLoad ? (
                <div className="py-8 flex flex-col items-center justify-center text-portal-muted gap-2">
                  <i className="pi pi-spin pi-spinner text-portal-accent text-base" />
                  <span className="text-[11px]">Loading options...</span>
                </div>
              ) : displayedItems.length === 0 ? (
                <div className="py-6 text-center text-portal-muted text-base sm:text-xs">
                  No matching records found.
                </div>
              ) : (
                displayedItems.map((item, index) => {
                  const itemVal = getItemValue(item);
                  const isSelected = selectedItem ? getItemValue(selectedItem) === itemVal : false;
                  const isItemDisabled = optionDisabled?.(item) ?? false;

                  return (
                    <div
                      key={itemVal || index}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isItemDisabled}
                      onClick={() => { if (!isItemDisabled) handleSelectItem(item); }}
                      className={`
                        px-3 py-2.5 md:py-3 rounded transition-colors flex items-center justify-between gap-3
                        ${
                          isItemDisabled
                            ? 'cursor-not-allowed opacity-45 text-portal-muted'
                            : isSelected
                            ? 'bg-portal-accent/15 text-portal-heading font-semibold'
                            : 'cursor-pointer text-portal-text hover:bg-portal-hover hover:text-portal-heading'
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        {itemTemplate ? itemTemplate(item, isSelected) : <span>{getItemLabel(item)}</span>}
                      </div>

                      {isItemDisabled ? (
                        <span className="shrink-0 text-[10px] font-medium text-portal-muted">Already added</span>
                      ) : isSelected && (
                        <i className="pi pi-check text-portal-accent text-xs shrink-0" />
                      )}
                    </div>
                  );
                })
              )}

              {/* Bottom Infinite Scroll Loader */}
              {isLoadingMore && (
                <div className="py-2.5 flex items-center justify-center gap-2 text-portal-muted text-[11px] font-mono">
                  <i className="pi pi-spin pi-spinner text-portal-accent text-xs" />
                  <span>Loading more...</span>
                </div>
              )}

              {/* Count Indicator if available */}
              {!showFirstLoad && !isLoadingMore && totalCount !== undefined && items.length > 0 && (
                <div className="py-1.5 px-2 text-[10px] text-portal-muted/60 text-right font-mono">
                  Showing {items.length} of {totalCount}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {errorMessage ? (
        <span className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
          <i className="pi pi-exclamation-circle text-[11px]" />
          {errorMessage}
        </span>
      ) : helperText ? (
        <span className={`text-xs mt-0.5 ${isDark ? 'text-portal-muted' : 'text-slate-500'}`}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export default FlatAsyncSelect;
