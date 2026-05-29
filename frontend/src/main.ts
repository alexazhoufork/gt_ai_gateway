import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { ConfigProvider } from 'ant-design-vue';
import App from './App.vue';
import router from './router';
import './style.css';
import { setBaseURL } from './utils/request';

async function bootstrap() {
    // 在 Tauri 打包环境下，运行时从 Rust 侧获取实际后端地址（支持自定义端口/host）
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const url = await invoke<string>('get_backend_url');
            if (url) {
                setBaseURL(url);
            }
        } catch (e) {
            console.warn('[tauri] Failed to get backend url, using default.', e);
        }
    }

    const app = createApp(App);
    const pinia = createPinia();

    app.use(pinia);
    app.use(router);
    app.component('AConfigProvider', ConfigProvider);
    app.mount('#app');
}

bootstrap();
