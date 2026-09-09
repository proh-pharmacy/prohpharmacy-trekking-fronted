import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api-client';
import { type FlatInputSize, getInputSizeClasses } from './inputVariants';

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
}: FlatAsyncSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<T[]>(staticOptions || []);
  const [selectedItem, setSelectedItem] = useState<T | undefined>(initialSelectedItem);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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

  // Fetch page data (page 1 or subsequent pages)
  const loadData = useCallback(
    async (pageToLoad: number, isNewSearch = false) => {
      if (staticOptions && staticOptions.length > 0 && searchMode === 'local') {
        return;
      }

      if (pageToLoad === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        let resultItems: T[] = [];
        let fetchedTotalPages = 1;
        let fetchedTotalCount: number | undefined;

        if (fetchFn) {
          const res = await fetchFn({
            pageNumber: pageToLoad,
            pageSize,
            search: debouncedSearch || undefined,
          });
          resultItems = res.data || [];
          fetchedTotalPages = res.totalPages || 1;
          fetchedTotalCount = res.totalCount;
        } else if (endpointUrl) {
          const params: Record<string, any> = {
            ...defaultParams,
            pageNumber: pageToLoad,
            pageSize,
          };
          if (debouncedSearch) {
            params[searchParam] = debouncedSearch;
          }

          const res = await api.get<any>(endpointUrl, { params });
          const payload = res.data;

          if (Array.isArray(payload)) {
            resultItems = payload;
            fetchedTotalPages = 1;
            fetchedTotalCount = payload.length;
          } else if (payload && Array.isArray(payload.data)) {
            resultItems = payload.data;
            fetchedTotalPages = payload.totalPages || (payload.pageSize ? Math.ceil((payload.totalCount || 0) / payload.pageSize) : 1);
            fetchedTotalCount = payload.totalCount;
          } else {
            resultItems = [];
          }
        }

        setItems((prev) => {
          if (isNewSearch || pageToLoad === 1) {
            return resultItems;
          }
          // Avoid duplicate items by optionValue
          const existingIds = new Set(prev.map((i) => (optionValue in i ? i[optionValue] : JSON.stringify(i))));
          const newUnique = resultItems.filter((i) => !existingIds.has(optionValue in i ? i[optionValue] : JSON.stringify(i)));
          return [...prev, ...newUnique];
        });

        setCurrentPage(pageToLoad);
        setTotalPages(fetchedTotalPages);
        setTotalCount(fetchedTotalCount);
      } catch (err) {
        console.error('[FlatAsyncSelect] Fetch error:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [endpointUrl, defaultParams, fetchFn, pageSize, debouncedSearch, searchParam, searchMode, staticOptions, optionValue]
  );

  // Load page 1 whenever search changes or on open
  useEffect(() => {
    if (isOpen) {
      loadData(1, true);
    }
  }, [debouncedSearch, isOpen, loadData]);

  // Sync selectedItem if value exists and matching item is found in loaded items
  useEffect(() => {
    if (value !== undefined && value !== null) {
      const found = items.find((item) => (optionValue in item ? item[optionValue] === value : false));
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
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
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

    if (isNearBottom && !loading && !loadingMore && currentPage < totalPages) {
      loadData(currentPage + 1, false);
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

      {/* Main Trigger (Matches 38px FlatDropdown exactly) */}
      <div
        id={inputId}
        ref={triggerRef}
        onClick={toggleDropdown}
        className={`
          relative w-full border rounded flex items-center justify-between cursor-pointer transition-colors select-none
          ${effectiveSize === 'sm' ? 'h-[38px] text-xs' : effectiveSize === 'lg' ? 'h-[50px] text-base' : 'h-[44px] text-sm'}
          ${
            isDark
              ? 'bg-portal-canvas border-portal-border text-white hover:border-portal-border/80'
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
              <span className="truncate text-white font-medium">{getItemLabel(selectedItem)}</span>
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
              className="p-1 text-portal-muted hover:text-white rounded transition cursor-pointer"
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
            <div className="p-2 border-b border-portal-border/60 bg-portal-canvas flex items-center gap-2 shrink-0">
              <i className="pi pi-search text-portal-muted text-xs shrink-0 pl-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-portal-muted focus:ring-0"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-portal-muted hover:text-white cursor-pointer"
                >
                  <i className="pi pi-times text-[10px]" />
                </button>
              )}
              {loading && <i className="pi pi-spin pi-spinner text-portal-accent text-xs shrink-0 pr-1" />}
            </div>

            {/* Scrollable Items List Container */}
            <div
              onScroll={handleListScroll}
              className="max-h-64 overflow-y-auto custom-scrollbar p-1 divide-y divide-portal-border/20 text-xs"
            >
              {loading && items.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-portal-muted gap-2">
                  <i className="pi pi-spin pi-spinner text-portal-accent text-base" />
                  <span className="text-[11px]">Loading options...</span>
                </div>
              ) : displayedItems.length === 0 ? (
                <div className="py-6 text-center text-portal-muted text-xs">
                  No matching records found.
                </div>
              ) : (
                displayedItems.map((item, index) => {
                  const itemVal = getItemValue(item);
                  const isSelected = selectedItem ? getItemValue(selectedItem) === itemVal : false;

                  return (
                    <div
                      key={itemVal || index}
                      onClick={() => handleSelectItem(item)}
                      className={`
                        p-2.5 rounded cursor-pointer transition-colors flex items-center justify-between gap-3
                        ${
                          isSelected
                            ? 'bg-portal-accent/15 text-white font-semibold'
                            : 'text-portal-text hover:bg-white/[0.06] hover:text-white'
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        {itemTemplate ? itemTemplate(item, isSelected) : <span>{getItemLabel(item)}</span>}
                      </div>

                      {isSelected && (
                        <i className="pi pi-check text-portal-accent text-xs shrink-0" />
                      )}
                    </div>
                  );
                })
              )}

              {/* Bottom Infinite Scroll Loader */}
              {loadingMore && (
                <div className="py-2.5 flex items-center justify-center gap-2 text-portal-muted text-[11px] font-mono">
                  <i className="pi pi-spin pi-spinner text-portal-accent text-xs" />
                  <span>Loading more...</span>
                </div>
              )}

              {/* Count Indicator if available */}
              {!loading && !loadingMore && totalCount !== undefined && items.length > 0 && (
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
