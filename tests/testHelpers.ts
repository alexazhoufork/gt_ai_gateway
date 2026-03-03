/**
 * Test Helpers
 * Exposes database helpers for test files that need direct DB access
 */

import dbHelper from "./helpers/dbHelper";
import requestHelper from "./helpers/requestHelper";
import userFixtures from "./fixtures/userFixtures";

export default {
    query: dbHelper.query,
    execute: dbHelper.execute,
    truncateDatabase: dbHelper.truncate,
    /**
     * Setup test admin user
     * Creates an admin user directly in database and returns the token
     */
    async setupAdminUser() {
        const adminUser = userFixtures.USER_FIXTURES.admin;
        const now = new Date().toISOString();
        await dbHelper.execute(
            "INSERT INTO user (name, token, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            [adminUser.name, adminUser.token, adminUser.type, now, now],
        );
        return adminUser.token;
    },
};
