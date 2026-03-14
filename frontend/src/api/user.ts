import request from '../utils/request';
import type { User, CreateUserRequest } from '../types/user';

export async function listUsers(): Promise<User[]> {
    return request.get('/user/list.json');
}

export async function fetchUsersByIds(ids: number[]): Promise<User[]> {
    return request.post('/user/batch.json', { ids });
}

export async function getUser(id: number): Promise<User> {
    return request.get(`/user/${id}`);
}

export async function createUser(data: CreateUserRequest): Promise<User> {
    return request.post('/user/create.json', data);
}
