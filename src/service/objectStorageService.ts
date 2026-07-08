import ormService from "./ormService";
import { SgStorageRecord } from "../model/sgStorageRecord";
import customError from "../util/customError";

interface StoredObject {
    object_key: string;
    data: Uint8Array;
    size_bytes: number;
    created_at?: string | Date;
    updated_at?: string | Date;
}

let r2Bucket: R2Bucket | null = null;

function setR2Bucket(bucket: R2Bucket | null | undefined) {
    r2Bucket = bucket ?? null;
}

function assertValidKey(key: string) {
    if (!key || !key.trim()) {
        throw new customError.AppError("object key is required", 400);
    }
}

function normalizeBytes(data: unknown): Uint8Array {
    if (data instanceof Uint8Array) {
        return new Uint8Array(data);
    }

    if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }

    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    if (typeof data === "string") {
        return new TextEncoder().encode(data);
    }

    throw new customError.AppError("unsupported object data type", 500);
}

function getWorkerBucket(): R2Bucket {
    if (!r2Bucket) {
        throw new customError.AppError("R2 object bucket is not configured", 500);
    }
    return r2Bucket;
}

function toDatabaseBytes(data: Uint8Array): Uint8Array {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(data);
    }
    return data;
}

async function putToTable(key: string, data: Uint8Array) {
    const existing = await SgStorageRecord.query().where("object_key", key).first();

    if (existing) {
        await existing.update({
            size_bytes: data.byteLength,
            data: toDatabaseBytes(data),
            updated_at: new Date(),
        });
        return;
    }

    await SgStorageRecord.query().create({
        object_key: key,
        size_bytes: data.byteLength,
        data: toDatabaseBytes(data),
    });
}

async function getFromTable(key: string): Promise<StoredObject | null> {
    const row = await SgStorageRecord.query().where("object_key", key).first();

    if (!row) {
        return null;
    }

    return {
        object_key: row.object_key,
        size_bytes: Number(row.size_bytes ?? 0),
        created_at: row.created_at,
        updated_at: row.updated_at,
        data: normalizeBytes(row.data),
    };
}

async function deleteFromTable(key: string) {
    await SgStorageRecord.query().where("object_key", key).delete();
}

async function put(key: string, data: Uint8Array) {
    assertValidKey(key);

    if (ormService.isWorker) {
        await getWorkerBucket().put(key, data);
        return;
    }

    await putToTable(key, data);
}

async function get(key: string): Promise<Uint8Array | null> {
    assertValidKey(key);

    if (ormService.isWorker) {
        const object = await getWorkerBucket().get(key);
        if (!object) {
            return null;
        }
        return new Uint8Array(await object.arrayBuffer());
    }

    const object = await getFromTable(key);
    return object?.data ?? null;
}

async function deleteObject(key: string) {
    assertValidKey(key);

    if (ormService.isWorker) {
        await getWorkerBucket().delete(key);
        return;
    }

    await deleteFromTable(key);
}

async function putText(key: string, text: string) {
    await put(key, new TextEncoder().encode(text));
}

async function getText(key: string): Promise<string | null> {
    const data = await get(key);
    if (!data) {
        return null;
    }
    return new TextDecoder().decode(data);
}

export type { StoredObject };

export default {
    setR2Bucket,
    put,
    get,
    delete: deleteObject,
    putText,
    getText,
};
