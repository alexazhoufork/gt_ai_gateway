import request from '../utils/request';
import type { ListResult } from '../types';
import type { RechargeRecord, RechargeRecordsQuery } from '../types/billing';

export async function listRechargeRecords(params?: RechargeRecordsQuery): Promise<ListResult<RechargeRecord>> {
    return request.get('/balance/recharge/list.json', { params });
}

export async function getRechargeRecord(id: number): Promise<RechargeRecord> {
    return request.get(`/balance/recharge/${id}`);
}
