const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

console.log('Running Cloudflare Setup...');

try {
  // 1. Ensure Database exists and fix wrangler.toml
  console.log('Checking D1 databases...');
  try {
    const dbListStr = execSync('npx wrangler d1 list --json', { encoding: 'utf8' });
    const dbList = JSON.parse(dbListStr);
    let myDb = dbList.find(d => d.name === 'gt_ai_gateway' || d.name === 'gt_ai_gateway_db');
    
    if (!myDb) {
      console.log('Database not found. Creating new D1 database...');
      execSync('npx wrangler d1 create gt_ai_gateway', { stdio: 'inherit' });
      const newListStr = execSync('npx wrangler d1 list --json', { encoding: 'utf8' });
      myDb = JSON.parse(newListStr).find(d => d.name === 'gt_ai_gateway');
    }

    if (myDb && myDb.uuid) {
      console.log(`Linking database ID: ${myDb.uuid} to wrangler.toml`);
      let toml = fs.readFileSync('wrangler.toml', 'utf8');
      toml = toml.replace(/database_id\s*=\s*".*?"/, `database_id = "${myDb.uuid}"`);
      fs.writeFileSync('wrangler.toml', toml);
    }
  } catch (err) {
    console.error('Error auto-linking database. Continuing anyway...', err.message);
  }

  // 2. Run migrations
  console.log('Applying D1 Migrations...');
  execSync('npx wrangler d1 migrations apply gt_ai_gateway --remote', { stdio: 'inherit' });

  // 3. Setup ROOT_TOKEN if not exists
  console.log('Checking ROOT_TOKEN...');
  try {
    const secrets = execSync('npx wrangler secret list', { encoding: 'utf8' });
    if (!secrets.includes('ROOT_TOKEN')) {
      const newToken = crypto.randomUUID();
      console.log('Generating new ROOT_TOKEN...');
      execSync(`echo "${newToken}" | npx wrangler secret put ROOT_TOKEN`, { stdio: 'inherit' });
      console.log('\n==========================================');
      console.log('    🔥 NEW ROOT_TOKEN GENERATED 🔥');
      console.log('==========================================');
      console.log(`Your new ROOT_TOKEN is: ${newToken}`);
      console.log('Please save this securely. You will need it to log in.');
      console.log('==========================================\n');
    } else {
      console.log('ROOT_TOKEN already exists.');
    }
  } catch (err) {
    console.error('Error checking/setting secrets. Continuing deployment...', err.message);
  }
} catch (error) {
  console.error('Setup failed:', error.message);
  process.exit(1);
}
