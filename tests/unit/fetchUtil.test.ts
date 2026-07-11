import { describe, it, expect } from "vitest";
import fetchUtil from "../../src/util/fetchUtil";

describe("fetchUtil.getDispatcher", () => {
    it("returns undefined when skipTlsVerify is false", () => {
        const dispatcher = fetchUtil.getDispatcher(false);
        expect(dispatcher).toBeUndefined();
    });

    it("returns an Agent when skipTlsVerify is true", () => {
        const dispatcher = fetchUtil.getDispatcher(true);
        expect(dispatcher).toBeDefined();
        expect(dispatcher).not.toBeUndefined();
        // undici Agent 实例特征：有 dispatch / close / destroy 等方法
        expect(typeof (dispatcher as any).dispatch).toBe("function");
    });

    it("reuses the same Agent instance on multiple calls", () => {
        const d1 = fetchUtil.getDispatcher(true);
        const d2 = fetchUtil.getDispatcher(true);
        expect(d1).toBe(d2);
    });
});
