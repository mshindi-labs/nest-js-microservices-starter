import { Injectable } from '@nestjs/common';
import { PaginationResponse } from '../../dto/paginated-response.dto';

export interface PaginationOptions<T> {
  page?: number;
  size?: number;
  dataFetcher: (skip: number, take: number) => Promise<T[]>;
  countFetcher?: () => Promise<number>;
  defaultSize?: number;
  maxSize?: number;
}

@Injectable()
export class PaginationService {
  private readonly DEFAULT_SIZE = 20;
  private readonly MAX_SIZE = 100;

  async paginate<T>(
    options: PaginationOptions<T>,
  ): Promise<PaginationResponse<T>> {
    const {
      page = 1,
      size = options.defaultSize || this.DEFAULT_SIZE,
      dataFetcher,
      countFetcher,
      maxSize = this.MAX_SIZE,
    } = options;

    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedSize = Math.min(Math.max(1, Math.floor(size)), maxSize);

    const skip = (normalizedPage - 1) * normalizedSize;
    const take = normalizedSize;

    const records = await dataFetcher(skip, take);

    const response: PaginationResponse<T> = {
      records,
      page: normalizedPage,
      size: normalizedSize,
      count: records.length,
    };

    if (countFetcher) {
      const totalCount = await countFetcher();
      response.count = totalCount;
      response.pages = Math.ceil(totalCount / normalizedSize);
    }

    return response;
  }

  calculatePaginationMetadata(
    page: number = 1,
    size: number = this.DEFAULT_SIZE,
    totalCount: number,
  ): {
    skip: number;
    take: number;
    page: number;
    size: number;
    pages: number;
    totalCount: number;
  } {
    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedSize = Math.min(
      Math.max(1, Math.floor(size)),
      this.MAX_SIZE,
    );

    const skip = (normalizedPage - 1) * normalizedSize;
    const take = normalizedSize;
    const pages = Math.ceil(totalCount / normalizedSize);

    return {
      skip,
      take,
      page: normalizedPage,
      size: normalizedSize,
      pages,
      totalCount,
    };
  }

  pageToSkipTake(
    page: number = 1,
    size: number = this.DEFAULT_SIZE,
  ): { skip: number; take: number } {
    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedSize = Math.min(
      Math.max(1, Math.floor(size)),
      this.MAX_SIZE,
    );

    return {
      skip: (normalizedPage - 1) * normalizedSize,
      take: normalizedSize,
    };
  }

  getDefaultSize(): number {
    return this.DEFAULT_SIZE;
  }

  getMaxSize(): number {
    return this.MAX_SIZE;
  }
}
