import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { ConfigProvider } from 'ant-design-vue';
import App from './App.vue';
import router from './router';
import './style.css';
import { setBaseURL } from './utils/request';
import { setAuthToken } from './utils/authSession';
import posthog from 'posthog-js';

async function bootstrap() {
    // Desktop 模式下，Splash Screen 已经将参数存入 localStorage
    const storedUrl = localStorage.getItem('backendBaseURL');
    if (storedUrl) {
        setBaseURL(storedUrl);
    }
    const token = localStorage.getItem('adminToken');
    if (token) {
        setAuthToken(token);
    }

    const app = createApp(App);
    const pinia = createPinia();
    
    posthog.init('phc_ugm7dcRiZDbQhggrmJZFMuzmRaGUbnE2t4KgqM62FEyA', {
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        autocapture: true,
        capture_pageview: true,
        disable_session_recording: true,
    });
    
    // Default to opt-in, we will opt-out later if the config says so
    // We attach it to window for easy access
    (window as any).posthog = posthog;

    app.use(pinia);
    app.use(router);
    app.component('AConfigProvider', ConfigProvider);
    app.mount('#app');
}

bootstrap();
