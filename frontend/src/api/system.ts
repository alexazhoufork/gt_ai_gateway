import request from '@/utils/request';
import type { StatusResponse, WelcomeResponse, UpdateStatusResponse } from '@/types/system';

export function welcome(): Promise<WelcomeResponse> {
    return request.get('/welcome');
}

export function status(): Promise<StatusResponse> {
    return request.get('/status.json');
}

export function checkUpdate(): Promise<UpdateStatusResponse> {
    return request.get('/update.json');
}
