import ormService from "./service/ormService";
import app from "./routes";
import vendorDefaultUrls from "./service/vendorDefaultUrls";

// 初始化云端配置
await ormService.init({ mode: "cloud" });

// 预加载 vendor 默认 URL 配置
vendorDefaultUrls.loadDefaultUrls();

export default app;
