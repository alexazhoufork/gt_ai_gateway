import { Context } from "hono";
import { SgRecord } from "../model/sgRecord";
import recordService from "../service/recordService";
import { parsePaginationQuery } from "../util/pagination";

function normalizeTimestampField(value: unknown): string | number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    return value as string | number;
}

function serializeRecord(record: SgRecord) {
    const data = record.toData() as Record<string, unknown>;
    const rawAttributes = (record as any).getAttributes?.() as Record<string, unknown> | undefined;

    return {
        ...data,
        start_at: normalizeTimestampField(rawAttributes?.start_at ?? data.start_at),
        end_at: normalizeTimestampField(rawAttributes?.end_at ?? data.end_at),
    };
}

async function listRecords(c: Context) {
    const query = c.req.query();
    const { pageSize, offset } = parsePaginationQuery(query);

    // 使用 COUNT 查询获取总数
    const countQuery = SgRecord.query();
    const countResult = await countQuery.clone().count();
    const total = Number(countResult || 0);

    // 分页获取数据
    const records = await SgRecord.query()
        .orderBy("id", "desc")
        .limit(pageSize)
        .offset(offset)
        .get();

    return c.json({
        list: records.map(serializeRecord),
        total: total,
    });
}

async function latestRecords(c: Context) {
    const query = c.req.query();
    const { pageSize } = parsePaginationQuery(query, 10);
    const records = await recordService.latest(pageSize);
    return c.json(records.map(serializeRecord));
}

async function getRecord(c: Context) {
    const id = c.req.param("id");
    const recordId = parseInt(id, 10);
    console.log("id", id, "recordId", recordId);

    if (isNaN(recordId)) {
        return c.json({ error: "Invalid ID format" }, 400);
    }

    const record = await SgRecord.query().find(recordId);

    if (!record) {
        return c.json({ error: "Record not found" }, 404);
    }

    return c.json(serializeRecord(record));
}

export default {
    listRecords,
    latestRecords,
    getRecord,
};
