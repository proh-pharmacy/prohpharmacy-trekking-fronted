export interface PricingMarkupRule {
  id: string;
  productId: string | null;
  productName: string | null;
  markupPercentage: number;
  createdAt: string;
  updatedAt: string | null;
  regionId?: string;
  regionName?: string;
  customerId?: string;
  customerName?: string;
}

export interface UpsertPricingMarkupPayload {
  productId?: string | null;
  markupPercentage: number;
}

export interface PricingMarkupListParams {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
  customerId?: string;
  productId?: string;
}

export interface PaginatedPricingMarkupRules {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  data: PricingMarkupRule[];
}
