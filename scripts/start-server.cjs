#!/usr/bin/env node
/**
 * Server startup script for Shopping & Switching Dashboard.
 * Prompts for Motor and Home data files (defaulting to last used).
 * Copies chosen files to dist/data/, writes config.json, then starts the web server.
 *
 * Usage: node scripts/start-server.cjs
 *        DATA_DIR=./data node scripts/start-server.cjs   # custom data directory
 *
 * Expected structure:
 *   ./
 *     dist/           # built app (from npm run build)
 *     data/           # your CSV files (motor_*.csv, home_*.csv, etc.)
 *     scripts/
 *       start-server.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data');
const DIST_DIR = path.resolve(ROOT, process.env.DIST_DIR || 'dist');
const CONFIG_PATH = path.join(ROOT, 'data-config.json');

function prompt(question, defaultVal) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const def = defaultVal || '';
    rl.question(`${question}${def ? ` [${def}]` : ''}: `, (ans) => {
      rl.close();
      resolve(ans.trim() || def);
    });
  });
}

function listCsvFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.csv'))
    .sort();
}

async function main() {
  console.log('\n--- Shopping & Switching Dashboard ---\n');

  let lastConfig = { motorFile: 'motor_main_data_demo.csv', homeFile: 'all home data.csv' };
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      lastConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (_) {}
  }

  const csvFiles = listCsvFiles(DATA_DIR);
  if (csvFiles.length > 0) {
    console.log('Available CSV files in data/:');
    csvFiles.forEach((f) => console.log(`  - ${f}`));
    console.log('');
  }

  const motorFile = await prompt('Motor data file', lastConfig.motorFile);
  const homeFile = await prompt('Home data file', lastConfig.homeFile);

  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ motorFile, homeFile }, null, 2));
  console.log(`\nSaved: motor="${motorFile}", home="${homeFile}"`);

  const distData = path.join(DIST_DIR, 'data');
  if (!fs.existsSync(distData)) {
    fs.mkdirSync(distData, { recursive: true });
  }

  const motorSrc = path.join(DATA_DIR, motorFile);
  const homeSrc = path.join(DATA_DIR, homeFile);

  if (fs.existsSync(motorSrc)) {
    fs.copyFileSync(motorSrc, path.join(distData, motorFile));
    console.log(`  Copied motor: ${motorFile}`);
  } else {
    console.warn(`  WARNING: Motor file not found: ${motorSrc}`);
  }
  if (fs.existsSync(homeSrc)) {
    fs.copyFileSync(homeSrc, path.join(distData, homeFile));
    console.log(`  Copied home: ${homeFile}`);
  } else {
    console.warn(`  WARNING: Home file not found: ${homeSrc}`);
  }

  const appConfig = { motorFile, homeFile };
  fs.writeFileSync(path.join(DIST_DIR, 'config.json'), JSON.stringify(appConfig, null, 2));
  console.log('  Wrote dist/config.json\n');

  console.log('Starting server...\n');
  execSync('npx serve .', { stdio: 'inherit', cwd: DIST_DIR });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
