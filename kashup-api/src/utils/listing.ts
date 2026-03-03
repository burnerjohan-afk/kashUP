import { ParsedUrlQuery } from 'querystring';
import { ParsedQs } from 'qs';
import { toStringParam } from './queryParams';

export type SortDirection = 'asc' | 'desc';

export type ListParams = {
  page: number;
  pageSize: number;
  sortField: string;
  sortDirection: SortDirection;
  updatedSince?: Date;
  includeDeleted?: boolean;
};

export type ListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ListQueryOptions = {
  defaultPageSize?: number;
  maxPageSize?: number;
  defaultSort?: string; // ex: "-updatedAt"
};

const DEFAULT_OPTIONS: Required<ListQueryOptions> = {
  defaultPageSize: 50,
  maxPageSize: 200,
  defaultSort: '-updatedAt'
};

const normalizeListParams = (params?: ListParams): ListParams => {
  return (
    params ?? {
      page: 1,
      pageSize: DEFAULT_OPTIONS.defaultPageSize,
      sortField: 'updatedAt',
      sortDirection: 'desc',
      updatedSince: undefined,
      includeDeleted: false
    }
  );
};

/**
 * Parse les paramètres de liste (pagination, tri, delta sync).
 * Accepte ParsedUrlQuery (querystring) ou ParsedQs (qs) pour compatibilité Express
 */
export const parseListParams = (
  query: ParsedUrlQuery | ParsedQs,
  options: ListQueryOptions = {}
): ListParams => {
  const { defaultPageSize, maxPageSize, defaultSort } = { ...DEFAULT_OPTIONS, ...options };

  // Utiliser toStringParam pour gérer ParsedQs
  const pageStr = toStringParam(query.page);
  const pageSizeStr = toStringParam(query.pageSize);
  const sortStr = toStringParam(query.sort);
  const updatedSinceStr = toStringParam(query.updatedSince);
  const includeDeletedStr = toStringParam(query.includeDeleted);

  const page = Math.max(1, Number(pageStr) || 1);
  const requestedSize = Number(pageSizeStr) || defaultPageSize;
  const pageSize = Math.min(Math.max(1, requestedSize), maxPageSize);

  const sortRaw = sortStr || defaultSort;
  const isDesc = sortRaw.startsWith('-');
  const sortField = sortRaw.replace(/^-/, '') || 'updatedAt';
  const sortDirection: SortDirection = isDesc ? 'desc' : 'asc';

  const updatedSince =
    updatedSinceStr && !Number.isNaN(Date.parse(updatedSinceStr))
      ? new Date(updatedSinceStr)
      : undefined;

  const includeDeleted = includeDeletedStr?.toLowerCase() === 'true';

  return {
    page,
    pageSize,
    sortField,
    sortDirection,
    updatedSince,
    includeDeleted
  };
};

/**
 * Construit la clause where/orderBy/skip/take pour Prisma.
 */
export const buildListQuery = <TWhere extends Record<string, any>>(
  baseWhere: TWhere,
  params: ListParams | undefined,
  options?: { softDelete?: boolean }
) => {
  const safeParams = normalizeListParams(params);

  const where: Record<string, any> = { ...baseWhere };

  if (safeParams.updatedSince) {
    where.updatedAt = { gt: safeParams.updatedSince };
  }

  // Soft delete par défaut : exclure deletedAt sauf demande explicite
  if (options?.softDelete && !safeParams.includeDeleted) {
    where.deletedAt = null;
  }

  const orderBy = { [safeParams.sortField]: safeParams.sortDirection } as Record<string, any>;
  const skip = (safeParams.page - 1) * safeParams.pageSize;
  const take = safeParams.pageSize;

  return { where, orderBy, skip, take };
};

export const buildListMeta = (total: number, params: ListParams): ListMeta => {
  const safeParams = normalizeListParams(params);
  const totalPages = Math.max(1, Math.ceil(total / safeParams.pageSize));
  return {
    page: safeParams.page,
    pageSize: safeParams.pageSize,
    total,
    totalPages,
    hasNextPage: safeParams.page < totalPages,
    hasPrevPage: safeParams.page > 1
  };
};

