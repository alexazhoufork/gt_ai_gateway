const { spawnSync } = require("child_process");
const fs = require("fs");

const args = process.argv.slice(2);
const setupArgs = [];
const wranglerArgs = [];
const WRANGLER_CONFIG_PATH = "wrangler.toml";
const DATABASE_ID_PLACEHOLDER = "replace-with-your-d1-database-id";
const SETUP_FLAGS = new Set(["--auto-create-db", "--migrate", "--auto-root-token"]);

function printHelp() {
    console.log("Usage:");
    console.log("  npm run deploy:cloudflare");
    console.log("  npm run deploy:cloudflare -- --migrate");
    console.log("  npm run deploy:cloudflare -- --auto-create-db --migrate --auto-root-token");
    console.log("");
    console.log("Options:");
    console.log("  --auto-create-db  Create the configured D1 database if no existing database can be resolved.");
    console.log("  --migrate         Apply D1 migrations before deploy.");
    console.log("  --auto-root-token Create ROOT_TOKEN if it does not already exist.");
    console.log("  --help, -h        Show this help message.");
    console.log("");
    console.log("Unknown options are forwarded to `wrangler deploy`.");
}

for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
        printHelp();
        process.exit(0);
    }

    if (SETUP_FLAGS.has(arg)) {
        setupArgs.push(arg);
        continue;
    }

    wranglerArgs.push(arg);
}

function run(command, commandArgs) {
    console.log(`> ${[command, ...commandArgs].join(" ")}`);
    const result = spawnSync(command, commandArgs, {
        stdio: "inherit",
        shell: process.platform === "win32",
    });

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

function ensureDatabaseIdConfigured() {
    const toml = fs.readFileSync(WRANGLER_CONFIG_PATH, "utf8");
    if (!toml.includes(`database_id = "${DATABASE_ID_PLACEHOLDER}"`)) {
        return;
    }

    console.error(`${WRANGLER_CONFIG_PATH} still contains the D1 database_id placeholder.`);
    console.error("Run `npm run deploy:cloudflare -- --auto-create-db` to create/link D1 automatically,");
    console.error("or manually create a D1 database and replace database_id before deploying.");
    process.exit(1);
}

if (setupArgs.length === 0) {
    ensureDatabaseIdConfigured();
}

run("npm", ["run", "frontend:build"]);

if (setupArgs.length > 0) {
    run("node", ["scripts/cf-setup.js", ...setupArgs]);
}

run("npx", ["wrangler", "deploy", "--minify", ...wranglerArgs]);
