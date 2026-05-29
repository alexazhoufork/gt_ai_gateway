import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { ConfigProvider } from 'ant-design-vue';
import App from './App.vue';
import router from './router';
import './style.css';
import { setBaseURL } from './utils/request';
import { setAuthToken } from './utils/authSession';

async function waitForBackend(url: string, timeout = 15000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const resp = await fetch(`${url}/welcome`);
            if (resp.ok) return;
        } catch {}
        await new Promise(r => setTimeout(r, 300));
    }
    throw new Error('Backend failed to start within timeout');
}


async function bootstrap() {
    // 在 Tauri 打包环境下，运行时从 Rust 侧获取实际后端地址和 auth token
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const url = await invoke<string>('get_backend_url');
            if (url) {
                setBaseURL(url);
                await waitForBackend(url);
            }
            // Desktop 模式自动登录：从 Rust 侧获取 root token 并写入本地存储
            const token = await invoke<string>('get_auth_token');
            if (token) {
                setAuthToken(token);
            }
        } catch (e) {
            alert(`Application initialization failed: ${e}`);
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
