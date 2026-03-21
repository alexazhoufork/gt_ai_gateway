import type { ListResponse, ListResult } from '@/types';

export function isListResponse<T>(value: ListResult<T>): value is ListResponse<T> {
    return !Array.isArray(value);
}

export function normalizeListResponse<T>(value: ListResult<T>): ListResponse<T> {
    if (isListResponse(value)) {
        return value;
    }

    return {
        list: value,
        total: value.length,
    };
}
