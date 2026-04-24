import { PAGINATION_SIZES } from '../constants';

export const getPagination = (pagination: { page: number; size: number }) => {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.size) || PAGINATION_SIZES.DEFAULT;
  const skip = (page - 1) * limit;
  return { offset: page, take: limit, skip };
};
