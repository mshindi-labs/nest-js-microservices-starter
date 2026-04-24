import 'dotenv/config';

export const DB_CREDENTIALS = {
  host: process.env.DB_HOST || '',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || '',
};

export const DB_ADAPTER = process.env.DB_ADAPTER as 'pg' | 'neon';
export const DATABASE_URL = process.env.DATABASE_URL as string;

export const PAGINATION_SIZES = {
  DEFAULT: 100,
  XS: 10,
  SM: 25,
  MD: 50,
  LG: 100,
  XL: 200,
  _2XL: 500,
  _3XL: 1000,
  _4XL: 2500,
} as const;

export const ISO_TIME_STAMP = '2024-06-15T20:06:48.113Z';

export const DATE_RANGE_API_QUERY_PARAMETERS = [
  {
    name: 'date',
    required: false,
    description: 'The date to filter records',
    type: 'string',
  },
  {
    name: 'start_date',
    required: false,
    description: 'The start date to filter records',
    type: 'string',
  },
  {
    name: 'end_date',
    required: false,
    description: 'The end date to filter records',
    type: 'string',
  },
];

export const PAGINATION_API_QUERY_PARAMETERS = [
  {
    name: 'page',
    required: false,
    description: 'The page number',
    type: 'number',
  },
  {
    name: 'size',
    required: false,
    description: 'The page size',
    type: 'number',
  },
  {
    name: 'search',
    required: false,
    description: 'The search query',
    type: 'string',
  },
];

export const DEFAULT_API_QUERY_PARAMETERS = [
  ...PAGINATION_API_QUERY_PARAMETERS,
  ...DATE_RANGE_API_QUERY_PARAMETERS,
];

export * from './auth-constants';
