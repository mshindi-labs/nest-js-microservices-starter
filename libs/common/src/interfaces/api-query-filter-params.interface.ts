export interface DateRangeQueryParams {
  date?: string;
  start_date?: string;
  end_date?: string;
}

export interface ApiQueryFilterParams extends DateRangeQueryParams {
  page?: number;
  size?: number;
  search?: string;
}
