/**
 * Auto-update version script
 * Runs before each build to increment patch version and update build date
 */

const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '..', 'lib', 'version.ts');
const swFilePath = path.join(__dirname, '..', 'public', 'sw.js');

// Read current version file
const content = fs.readFileSync(versionFilePath, 'utf8');

// Extract current version
const versionMatch = content.match(/APP_VERSION\s*=\s*'(\d+)\.(\d+)\.(\d+)'/);
if (!versionMatch) {
    console.error('❌ Could not find APP_VERSION in version.ts');
    process.exit(1);
}

const major = parseInt(versionMatch[1]);
const minor = parseInt(versionMatch[2]);
const patch = parseInt(versionMatch[3]) + 1; // Increment patch version

const newVersion = `${major}.${minor}.${patch}`;

// Get current date in YYYYMMDD format
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const buildDate = `${year}${month}${day}`;

// Create new content for version.ts
const newContent = `// App version configuration
export const APP_VERSION = '${newVersion}';
export const BUILD_NUMBER = '${buildDate}'; // YYYYMMDD format

export const getFullVersion = () => {
  return \`v\${APP_VERSION} (\${BUILD_NUMBER})\`;
};
`;

// Write updated version file
fs.writeFileSync(versionFilePath, newContent, 'utf8');

// Update sw.js with new version
if (fs.existsSync(swFilePath)) {
    let swContent = fs.readFileSync(swFilePath, 'utf8');
    swContent = swContent.replace(
        /const APP_VERSION = '[^']+';/,
        `const APP_VERSION = '${newVersion}';`
    );
    fs.writeFileSync(swFilePath, swContent, 'utf8');
    console.log(`✅ Service Worker version updated to: ${newVersion}`);
}

console.log(`✅ Version updated: ${versionMatch[0].match(/'[\d.]+'/)[0]} → '${newVersion}'`);
console.log(`✅ Build date: ${buildDate}`);
