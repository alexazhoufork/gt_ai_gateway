const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");

const WRANGLER_CONFIG_PATH = "wrangler.toml";
const DEFAULT_DATABASE_NAME = "gt_ai_gateway";
const DEFAULT_D1_BINDING = "DB";
const options = {
    autoCreateDb: process.argv.includes("--auto-create-db"),
    migrate: process.argv.includes("--migrate"),
    autoRootToken: process.argv.includes("--auto-root-token"),
};

function run(command, args, options = {}) {
    return execFileSync(command, args, {
        encoding: "utf8",
        stdio: options.stdio || "pipe",
    });
}

function getConfiguredDatabaseName() {
    const toml = fs.readFileSync(WRANGLER_CONFIG_PATH, "utf8");
    const match = toml.match(/database_name\s*=\s*"([^"]+)"/);
    return match?.[1] || DEFAULT_DATABASE_NAME;
}

function getConfiguredWorkerName() {
    const toml = fs.readFileSync(WRANGLER_CONFIG_PATH, "utf8");
    const match = toml.match(/^name\s*=\s*"([^"]+)"/m);
    return match?.[1];
}

function getConfiguredD1Binding() {
    const toml = fs.readFileSync(WRANGLER_CONFIG_PATH, "utf8");
    const d1Block = toml.match(/\[\[d1_databases\]\]([\s\S]*?)(?:\n\[|$)/);
    const bindingMatch = d1Block?.[1]?.match(/binding\s*=\s*"([^"]+)"/);
    return bindingMatch?.[1] || DEFAULT_D1_BINDING;
}

function updateDatabaseId(databaseId) {
    const toml = fs.readFileSync(WRANGLER_CONFIG_PATH, "utf8");
    const nextToml = toml.replace(
        /database_id\s*=\s*".*?"/,
        `database_id = "${databaseId}"`,
    );

    if (nextToml === toml) {
        throw new Error(`Could not find database_id in ${WRANGLER_CONFIG_PATH}`);
    }

    fs.writeFileSync(WRANGLER_CONFIG_PATH, nextToml);
}

function listDatabases() {
    const dbListStr = run("npx", ["wrangler", "d1", "list", "--json"]);
    return JSON.parse(dbListStr);
}

function findDatabaseByName(databaseName) {
    return listDatabases().find((database) => database.name === databaseName);
}

function findDatabaseById(databaseId) {
    try {
        return listDatabases().find((database) =>
            database.uuid === databaseId || database.id === databaseId
        );
    } catch (err) {
        return null;
    }
}

function getCurrentProductionVersionId(workerName) {
    const args = ["wrangler", "deployments", "status", "--json"];
    if (workerName) {
        args.push("--name", workerName);
    }

    const status = JSON.parse(run("npx", args));
    const productionVersion = status.versions?.find((version) => version.percentage === 100) ||
        status.versions?.[0];

    return productionVersion?.version_id;
}

function getVersionBindings(workerName, versionId) {
    const args = ["wrangler", "versions", "view", versionId, "--json"];
    if (workerName) {
        args.push("--name", workerName);
    }

    const version = JSON.parse(run("npx", args));
    return version.resources?.bindings || [];
}

function findDeployedD1Binding(bindingName) {
    try {
        const workerName = getConfiguredWorkerName();
        const versionId = getCurrentProductionVersionId(workerName);

        if (!versionId) {
            return null;
        }

        const bindings = getVersionBindings(workerName, versionId);
        return bindings.find((binding) =>
            binding.type === "d1" && binding.name === bindingName
        ) || null;
    } catch (err) {
        console.log("No existing deployed D1 binding found.");
        return null;
    }
}

function resolveConfiguredDatabase(databaseName) {
    let database = findDatabaseByName(databaseName);

    if (database) {
        return database;
    }

    if (!options.autoCreateDb) {
        throw new Error(
            `D1 database ${databaseName} was not found. ` +
            "Pass --auto-create-db to create it automatically, or create/link a D1 database manually.",
        );
    }

    console.log(`Database ${databaseName} not found. Creating new D1 database...`);
    run("npx", ["wrangler", "d1", "create", databaseName], { stdio: "inherit" });

    database = findDatabaseByName(databaseName);
    if (!database) {
        throw new Error(`Failed to create or find D1 database: ${databaseName}`);
    }

    return database;
}

function setupDatabase() {
    const bindingName = getConfiguredD1Binding();
    const deployedBinding = findDeployedD1Binding(bindingName);

    if (deployedBinding) {
        const databaseId = deployedBinding.database_id || deployedBinding.id;

        if (!databaseId) {
            throw new Error(`Deployed D1 binding ${bindingName} does not include a database_id`);
        }

        const database = findDatabaseById(databaseId);
        const databaseLabel = database?.name || databaseId;
        console.log(`Reusing deployed D1 binding ${bindingName}: ${databaseLabel}`);
        updateDatabaseId(databaseId);

        runMigrations(bindingName);
        return;
    }

    const databaseName = getConfiguredDatabaseName();

    console.log(`Checking D1 database: ${databaseName}`);
    const database = resolveConfiguredDatabase(databaseName);
    const databaseId = database.uuid || database.id;

    if (!databaseId) {
        throw new Error(`D1 database ${databaseName} does not include an id`);
    }

    console.log(`Linking database ID ${databaseId} to ${WRANGLER_CONFIG_PATH}`);
    updateDatabaseId(databaseId);

    runMigrations(bindingName);
}

function runMigrations(bindingName) {
    if (!options.migrate) {
        console.log("Skipping D1 migrations. Pass --migrate to apply them.");
        return;
    }

    console.log(`Applying D1 migrations to binding ${bindingName}...`);
    run("npx", ["wrangler", "d1", "migrations", "apply", bindingName, "--remote"], {
        stdio: "inherit",
    });
}

function setupRootToken() {
    if (!options.autoRootToken) {
        console.log("Skipping ROOT_TOKEN setup. Pass --auto-root-token to create it automatically.");
        return;
    }

    console.log("Checking ROOT_TOKEN...");

    try {
        const secrets = run("npx", ["wrangler", "secret", "list"]);
        if (secrets.includes("ROOT_TOKEN")) {
            console.log("ROOT_TOKEN already exists.");
            return;
        }

        const newToken = crypto.randomUUID();
        console.log("Generating new ROOT_TOKEN...");
        execFileSync("npx", ["wrangler", "secret", "put", "ROOT_TOKEN"], {
            input: `${newToken}\n`,
            stdio: ["pipe", "inherit", "inherit"],
        });

        console.log("\n==========================================");
        console.log("    NEW ROOT_TOKEN GENERATED");
        console.log("==========================================");
        console.log(`Your new ROOT_TOKEN is: ${newToken}`);
        console.log("Please save this securely. You will need it to log in.");
        console.log("==========================================\n");
    } catch (err) {
        console.error("Error checking/setting secrets. Continuing deployment...", err.message);
    }
}

console.log("Running Cloudflare Setup...");

try {
    setupDatabase();
    setupRootToken();
} catch (error) {
    console.error("Setup failed:", error.message);
    process.exit(1);
}
