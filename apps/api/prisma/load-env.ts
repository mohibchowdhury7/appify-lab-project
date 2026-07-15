import { readFileSync } from 'fs';
import { resolve } from 'path';
const envPath = resolve(__dirname, '.env');
const env = readFileSync(envPath, 'utf-8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}
