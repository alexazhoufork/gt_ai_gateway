import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { listRecords, latestRecords, getRecord } from '@/api/record';
import { getUser } from '@/api/user';
import { getModel } from '@/api/model';
import { getVendor } from '@/api/vendor';
import type { Record, RecordQuery, RecordDetail } from '@/types/record';


export const useRecordStore = defineStore('record', () => {
    // State
    const records = ref<Record[]>([]);
    const currentRecord = ref<RecordDetail | null>(null);
    const total = ref(0);
    const loading = ref(false);
    const autoRefresh = ref(false);

    // Getters
    const hasRecords = computed(() => records.value.length > 0);

    // Actions
    async function fetchRecords(query?: RecordQuery): Promise<void> {
        loading.value = true;
        try {
            const response = await listRecords(query);
            records.value = response.list || [];
            total.value = response.total || 0;
        } catch (error) {
            console.error('获取记录列表失败:', error);
            records.value = [];
            total.value = 0;
        } finally {
            loading.value = false;
        }
    }

    async function fetchLatest(limit: number = 10): Promise<void> {
        loading.value = true;
        try {
            const response = await latestRecords(limit);
            records.value = response || [];
        } catch (error) {
            console.error('获取最新记录失败:', error);
            records.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchRecordDetail(id: number): Promise<void> {
        loading.value = true;
        try {
            const record = await getRecord(id);

            // 准备详情数据
            const recordDetail: RecordDetail = {
                ...record,
                user_name: null,
                model_name: null,
                vendor_name: null,
            };

            // 并行查询用户、模型和供应商信息
            const promises: Promise<void>[] = [];

            if (record.user_id) {
                promises.push(
                    getUser(record.user_id).then(user => {
                        recordDetail.user_name = user.name;
                    }).catch(() => {
                        recordDetail.user_name = `用户${record.user_id}`;
                    })
                );
            }

            if (record.model_id) {
                promises.push(
                    getModel(record.model_id).then(model => {
                        recordDetail.model_name = model.name;
                        // 如果有供应商ID，查询供应商名称
                        if (model.vendor_id) {
                            return getVendor(model.vendor_id).then(vendor => {
                                recordDetail.vendor_name = vendor.name;
                            }).catch(() => {
                                recordDetail.vendor_name = `供应商${model.vendor_id}`;
                            });
                        }
                    }).catch(() => {
                        recordDetail.model_name = `模型${record.model_id}`;
                    })
                );
            }

            await Promise.all(promises);
            currentRecord.value = recordDetail;
        } catch (error) {
            console.error('获取记录详情失败:', error);
            currentRecord.value = null;
        } finally {
            loading.value = false;
        }
    }

    function setAutoRefresh(value: boolean): void {
        autoRefresh.value = value;
    }

    function clearCurrentRecord(): void {
        currentRecord.value = null;
    }

    return {
        records,
        currentRecord,
        total,
        loading,
        autoRefresh,
        hasRecords,
        fetchRecords,
        fetchLatest,
        fetchRecordDetail,
        setAutoRefresh,
        clearCurrentRecord,
    };
});
