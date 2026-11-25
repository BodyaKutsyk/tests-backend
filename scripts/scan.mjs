import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const image = process.env.SCAN_IMAGE ?? 'api_image:build-secret-demo';
const thresholdValue = process.env.SCAN_THRESHOLD ?? '10';

if (!/^\d+$/.test(thresholdValue)) {
  console.error('SCAN_THRESHOLD must be a non-negative integer');
  process.exit(2);
}

const threshold = Number(thresholdValue);

if (!Number.isSafeInteger(threshold)) {
  console.error('SCAN_THRESHOLD is too large');
  process.exit(2);
}

const reportPath = 'reports/trivy-report.json';

mkdirSync('reports', { recursive: true });

console.log(`Scanning image: ${image}`);

const scan = spawnSync(
  'trivy',
  [
    'image',
    '--scanners',
    'vuln',
    '--ignore-unfixed',
    '--format',
    'json',
    '--output',
    reportPath,
    '--exit-code',
    '0',
    image,
  ],
  { stdio: 'inherit' },
);

if (scan.error) {
  console.error(`Failed to start Trivy: ${scan.error.message}`);
  process.exit(2);
}

if (scan.status !== 0) {
  console.error(`Trivy scan failed, exit code: ${scan.status}`);
  process.exit(2);
}

let report;

try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (error) {
  console.error(`Cannot read Trivy report: ${error.message}`);
  process.exit(2);
}

if (!report || typeof report !== 'object' || Array.isArray(report)) {
  console.error('Invalid Trivy report');
  process.exit(2);
}

if (report.Results !== undefined && !Array.isArray(report.Results)) {
  console.error('Invalid Results field in Trivy report');
  process.exit(2);
}

const counts = {
  HIGH: 0,
  CRITICAL: 0,
};

for (const result of report.Results ?? []) {
  if (
    result.Vulnerabilities !== undefined &&
    !Array.isArray(result.Vulnerabilities)
  ) {
    console.error('Invalid Vulnerabilities field in Trivy report');
    process.exit(2);
  }

  for (const vulnerability of result.Vulnerabilities ?? []) {
    if (vulnerability.Severity === 'HIGH') {
      counts.HIGH++;
    } else if (vulnerability.Severity === 'CRITICAL') {
      counts.CRITICAL++;
    }
  }
}

const total = counts.HIGH + counts.CRITICAL;
const passed = total <= threshold;

console.log(`HIGH: ${counts.HIGH}`);
console.log(`CRITICAL: ${counts.CRITICAL}`);
console.log(`TOTAL: ${total}`);
console.log(`THRESHOLD: ${threshold}`);
console.log(`RESULT: ${passed ? 'PASS' : 'FAIL'}`);
console.log(`REPORT: ${reportPath}`);

process.exit(passed ? 0 : 1);
