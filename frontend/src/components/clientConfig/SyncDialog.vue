<template>
    <a-modal
        v-model:open="visible"
        title="同步配置"
        width="400px"
        :footer="null"
    >
        <p style="margin-bottom: 16px; color: var(--text-secondary);">
            检测到「{{ backupName }}」与本地配置不一致，请选择同步方向：
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <a-button
                block
                style="text-align: left; height: auto; padding: 12px 16px;"
                @click="handleSyncTo"
                :loading="loading === 'to'"
            >
                <CloudDownloadOutlined style="margin-right: 8px;" />
                把备份写入本地
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                    用备份中的配置覆盖本地客户端配置文件
                </div>
            </a-button>
            <a-button
                block
                style="text-align: left; height: auto; padding: 12px 16px;"
                @click="handleSyncFrom"
                :loading="loading === 'from'"
            >
                <CloudUploadOutlined style="margin-right: 8px;" />
                用本地数据更新备份
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                    读取本地客户端配置文件，更新当前备份
                </div>
            </a-button>
        </div>
    </a-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CloudUploadOutlined, CloudDownloadOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue/es';
import { applyClientConfig, syncFromLocal } from '@/api/clientConfig';
import type { ClientName } from '@/types/clientConfig';

const props = defineProps<{
    open: boolean;
    client: ClientName;
    backupId: number;
    backupName: string;
}>();

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void;
    (e: 'synced'): void;
}>();

const visible = computed({
    get: () => props.open,
    set: (val) => emit('update:open', val),
});

const loading = ref<'to' | 'from' | null>(null);

async function handleSyncTo(): Promise<void> {
    loading.value = 'to';
    try {
        await applyClientConfig({ client: props.client, backupId: props.backupId });
        message.success('已把备份写入本地');
        emit('synced');
        visible.value = false;
    } finally {
        loading.value = null;
    }
}

async function handleSyncFrom(): Promise<void> {
    loading.value = 'from';
    try {
        await syncFromLocal({ client: props.client, backupId: props.backupId });
        message.success('已用本地数据更新备份');
        emit('synced');
        visible.value = false;
    } finally {
        loading.value = null;
    }
}
</script>
