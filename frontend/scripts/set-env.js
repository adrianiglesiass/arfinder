const fs = require('fs');
const path = require('path');

// Load .env variables
const envPath = path.resolve(__dirname, '../.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const targetPath = path.resolve(__dirname, '../src/environments/environment.ts');
const targetProdPath = path.resolve(__dirname, '../src/environments/environment.prod.ts');

const envConfigFile = `export const environment = {
  production: false,
  APIURL: '${envVars.NG_APP_API_URL || 'http://localhost:8000'}',
  insforge: {
    url: '${envVars.NG_APP_INSFORGE_URL || ''}',
    apiKey: '${envVars.NG_APP_INSFORGE_API_KEY || ''}',
    redirectUri: 'http://localhost:4200/auth/callback',
  },
};
`;

const envConfigProdFile = `export const environment = {
  production: true,
  APIURL: '${envVars.NG_APP_API_URL || 'https://api.dominio.com'}',
  insforge: {
    url: '${envVars.NG_APP_INSFORGE_URL || ''}',
    apiKey: '${envVars.NG_APP_INSFORGE_API_KEY || ''}',
    redirectUri: 'http://localhost:4200/auth/callback',
  },
};
`;

console.log('Generating environment files...');

fs.writeFileSync(targetPath, envConfigFile);
fs.writeFileSync(targetProdPath, envConfigProdFile);

console.log(`Output generated at ${targetPath}`);
console.log(`Output generated at ${targetProdPath}`);
