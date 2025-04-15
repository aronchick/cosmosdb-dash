#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to package.json
const packageJsonPath = path.resolve(process.cwd(), 'package.json');

// Function to get latest version of a package
function getLatestVersion(packageName) {
  try {
    const output = execSync(`npm view ${packageName} version`, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error(`Error getting version for ${packageName}:`, error.message);
    return null;
  }
}

// Main function
async function pinVersions() {
  console.log('📌 Pinning package versions...');
  
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update dependencies
  await updateDependencies(packageJson.dependencies);
  await updateDependencies(packageJson.devDependencies);
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Done pinning versions. To install the pinned versions, run:');
  console.log('   npm install --legacy-peer-deps');
  console.log('   or');
  console.log('   pnpm install');
}

// Function to update dependencies object
async function updateDependencies(deps) {
  if (!deps) return;
  
  for (const [name, version] of Object.entries(deps)) {
    if (version === 'latest') {
      const latestVersion = getLatestVersion(name);
      if (latestVersion) {
        deps[name] = latestVersion;
        console.log(`${name}: latest → ${latestVersion}`);
      }
    } else if (version.startsWith('~') || version.startsWith('^')) {
      // For packages with range specifiers, get the exact version
      const packageName = name.replace(/^@/, '').replace(/\//g, '%2F');
      try {
        const exactVersion = version.substring(1);
        deps[name] = exactVersion;
        console.log(`${name}: ${version} → ${exactVersion}`);
      } catch (error) {
        console.error(`Error processing ${name}:`, error.message);
      }
    }
  }
}

// Run the script
pinVersions().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});