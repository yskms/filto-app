import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDir = resolve(projectDir, '..');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const appVersion = readJson(resolve(projectDir, 'app.json')).expo.version;
const packageVersion = readJson(resolve(projectDir, 'package.json')).version;
const lockfile = readJson(resolve(projectDir, 'package-lock.json'));
const lockfileVersions = [lockfile.version, lockfile.packages?.['']?.version];

const errors = [];
if (packageVersion !== appVersion) {
  errors.push(`package.json: ${packageVersion}`);
}
lockfileVersions.forEach((version, index) => {
  if (version !== appVersion) {
    errors.push(`package-lock.json version ${index + 1}: ${version}`);
  }
});

for (const name of ['README.md', 'README_EN.md']) {
  const contents = readFileSync(resolve(repositoryDir, name), 'utf8');
  if (!contents.includes(`v${appVersion}`)) {
    errors.push(`${name}: v${appVersion} not found`);
  }
}

if (errors.length > 0) {
  console.error(`Version mismatch (app.json: ${appVersion})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`✓ バージョン表記OK（v${appVersion}）`);
