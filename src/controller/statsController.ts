import { Context } from "hono";
import { SgRecord } from "../model/sgRecord";
import { SgRecordStatus } from "../constants";
import ormService from "../service/ormService";
import { parsePaginationQuery } from "../util/pagination";

function toSafeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

async function dashboardStats(c: Context) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCutoff = today.toISOString().slice(0, 19).replace("T", " ");

    // Aggregate in DB to avoid loading all records into memory on large datasets.
    const sql = `
        SELECT
            COUNT(*) AS total_requests,
            SUM(CASE WHEN created_at >= '${todayCutoff}' THEN 1 ELSE 0 END) AS today_requests,
            SUM(CASE WHEN created_at >= '${todayCutoff}' AND status = '${SgRecordStatus.SUCCESS}' THEN 1 ELSE 0 END) AS success_count,
            SUM(CASE WHEN created_at >= '${todayCutoff}' AND status = '${SgRecordStatus.FAILED}' THEN 1 ELSE 0 END) AS failed_count,
            COUNT(DISTINCT CASE WHEN created_at >= '${todayCutoff}' THEN user_id END) AS active_users,
            COUNT(DISTINCT CASE WHEN created_at >= '${todayCutoff}' THEN model_id END) AS active_models
        FROM record
    `;

    const statsRow = await Promise.resolve(ormService.dbAdapter.prepare(sql).first()) as Record<string, unknown> | undefined;

    const totalRequests = toSafeNumber(statsRow?.total_requests);
    const todayTotalRequests = toSafeNumber(statsRow?.today_requests);
    const successCount = toSafeNumber(statsRow?.success_count);
    const failedCount = toSafeNumber(statsRow?.failed_count);
    const activeUsers = toSafeNumber(statsRow?.active_users);
    const activeModels = toSafeNumber(statsRow?.active_models);
    const successRate = todayTotalRequests > 0 ? successCount / todayTotalRequests : null;

    return c.json({
        total_requests: totalRequests,
        success_count: successCount,
        failed_count: failedCount,
        success_rate: successRate,
        active_users: activeUsers,
        active_models: activeModels,
        today_requests: todayTotalRequests,
    });
}

async function recentRecords(c: Context) {
    const query = c.req.query();
    const { pageSize } = parsePaginationQuery(query, 10);

    const records = await SgRecord.query()
        .orderBy('id', 'desc')
        .limit(pageSize)
        .get();

    // 简化返回数据
    const simplified = records.map(r => ({
        id: r.id,
        user_id: r.user_id,
        model_id: r.model_id,
        status: r.status,
        created_at: r.created_at,
    }));

    return c.json(simplified);
}

export default {
    dashboardStats,
    recentRecords,
};
