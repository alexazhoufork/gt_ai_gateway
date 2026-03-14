<template>
    <a-modal
        v-model:open="visible"
        title="供应商连通性测试"
        :footer="null"
        width="600px"
    >
        <div class="test-dialog">
            <div class="test-config">
                <a-form layout="vertical">
                    <a-form-item label="测试格式">
                        <a-radio-group v-model:value="format">
                            <a-radio-button value="openai">OpenAI</a-radio-button>
                            <a-radio-button value="anthropic">Anthropic</a-radio-button>
                        </a-radio-group>
                    </a-form-item>
                    <a-button
                        type="primary"
                        :loading="loading"
                        @click="handleTest"
                        block
                    >
                        开始测试
                    </a-button>
                </a-form>
            </div>

            <div v-if="result" class="test-result">
                <a-divider>测试结果</a-divider>
                <div class="result-summary">
                    <a-space>
                        <a-badge :status="result.success ? 'success' : 'error'" />
                        <span :class="['status-text', result.success ? 'success' : 'error']">
                            {{ result.success ? '连接成功' : '连接失败' }}
                        </span>
                        <span v-if="result.status" class="status-code">
                            HTTP {{ result.status }}
                        </span>
                        <span v-if="result.duration" class="duration">
                            耗时: {{ result.duration }}ms
                        </span>
                    </a-space>
                </div>

                <div class="result-detail">
                    <div class="detail-label">响应详情:</div>
                    <pre class="response-body">{{ formattedResponse }}</pre>
                </div>
            </div>
        </div>
    </a-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';
import { testVendor } from '@/api/vendor';
import type { Vendor } from '@/types/vendor';

const visible = ref(false);
const loading = ref(false);
const format = ref('openai');
const result = ref<any>(null);
const currentVendor = ref<Vendor | null>(null);

const formattedResponse = computed(() => {
    const data = result.value?.response || result.value?.error;
    if (!data) return '';
    try {
        if (typeof data === 'object') {
            return JSON.stringify(data, null, 2);
        }
        return String(data);
    } catch {
        return String(data);
    }
});

function open(vendor: Vendor) {
    currentVendor.value = vendor;
    visible.value = true;
    result.value = null;
    // 根据供应商类型预设格式
    if (vendor.type === 'anthropic') {
        format.value = 'anthropic';
    } else {
        format.value = 'openai';
    }
}

async function handleTest() {
    if (!currentVendor.value) return;

    loading.value = true;
    result.value = null;
    try {
        const res = await testVendor(currentVendor.value.id, format.value);
        result.value = res;
        if (res.success) {
            message.success('测试完成，连接正常');
        } else {
            message.warning(`测试完成，但上游返回错误 (HTTP ${res.status})`);
        }
    } catch (error: any) {
        console.error('Test failed:', error);
        result.value = {
            success: false,
            error: error.message || '请求失败'
        };
        message.error('测试请求发送失败');
    } finally {
        loading.value = false;
    }
}

defineExpose({ open });
</script>

<style scoped>
.test-dialog {
    padding: 8px 0;
}

.test-result {
    margin-top: 24px;
}

.result-summary {
    margin-bottom: 16px;
    padding: 12px;
    background: #f6f8fa;
    border-radius: 4px;
}

.status-text {
    font-weight: bold;
}

.status-text.success {
    color: #52c41a;
}

.status-text.error {
    color: #ff4d4f;
}

.status-code, .duration {
    color: #8c8c8c;
    font-size: 13px;
    margin-left: 8px;
}

.result-detail {
    margin-top: 16px;
}

.detail-label {
    font-size: 13px;
    color: #8c8c8c;
    margin-bottom: 8px;
}

.response-body {
    background: #282c34;
    color: #abb2bf;
    padding: 12px;
    border-radius: 4px;
    font-size: 12px;
    max-height: 300px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-all;
}
</style>
