// VibeCheck Security - Mock Data
// This data is modular and easy to replace with real API calls

export interface Vulnerability {
  id: string;
  file: string;
  lineNumber: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  category: 'injection' | 'secrets' | 'misconfiguration' | 'dependency' | 'logic';
  description: string;
  codeSnippet: string;
  vulnerableLine: string;
  remediation: string;
  fixPrompt: string;
}

export interface ScanResult {
  id: string;
  repoName: string;
  repoUrl: string;
  vibeScore: number;
  status: 'go' | 'conditional-go' | 'no-go';
  scanDate: string;
  totalFiles: number;
  filesScanned: number;
  vulnerabilities: Vulnerability[];
  aiSummary: string;
}

export interface FileRisk {
  fileName: string;
  riskScore: number;
  linesFlagged: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface RecentScan {
  id: string;
  repoName: string;
  vibeScore: number;
  status: 'go' | 'conditional-go' | 'no-go';
  scanDate: string;
}

// Vulnerability severity counts
export const severityCounts = {
  critical: 3,
  high: 8,
  medium: 15,
  low: 24,
};

// Vulnerability category distribution
export const categoryDistribution = [
  { name: 'Injection', value: 12, color: 'var(--chart-5)' },
  { name: 'Secrets', value: 8, color: 'var(--chart-2)' },
  { name: 'Misconfiguration', value: 18, color: 'var(--chart-4)' },
  { name: 'Dependency Risk', value: 7, color: 'var(--chart-1)' },
  { name: 'Logic Flaws', value: 5, color: 'var(--chart-3)' },
];

// File risk density data
export const fileRiskDensity = [
  { file: 'auth.ts', risk: 85 },
  { file: 'db.ts', risk: 72 },
  { file: 'api.ts', risk: 65 },
  { file: 'config.ts', risk: 58 },
  { file: 'utils.ts', risk: 42 },
  { file: 'main.ts', risk: 35 },
  { file: 'index.ts', risk: 28 },
  { file: 'helpers.ts', risk: 18 },
];

// Most dangerous files
export const dangerousFiles: FileRisk[] = [
  { fileName: 'src/auth/login.ts', riskScore: 92, linesFlagged: 14, severity: 'critical' },
  { fileName: 'src/db/connection.ts', riskScore: 85, linesFlagged: 8, severity: 'critical' },
  { fileName: 'src/api/users.ts', riskScore: 78, linesFlagged: 11, severity: 'high' },
  { fileName: 'config/secrets.ts', riskScore: 75, linesFlagged: 6, severity: 'high' },
  { fileName: 'src/utils/crypto.ts', riskScore: 68, linesFlagged: 5, severity: 'medium' },
];

// Mock vulnerabilities
export const mockVulnerabilities: Vulnerability[] = [
  {
    id: 'vuln-001',
    file: 'src/auth/login.ts',
    lineNumber: 42,
    severity: 'critical',
    type: 'SQL Injection',
    category: 'injection',
    description: 'User input is directly concatenated into SQL query without sanitization, allowing potential SQL injection attacks.',
    codeSnippet: `const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;
const result = await db.query(query);`,
    vulnerableLine: `const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;`,
    remediation: 'Use parameterized queries or prepared statements to prevent SQL injection.',
    fixPrompt: 'Fix this SQL injection vulnerability by using parameterized queries. Current vulnerable code:\n\nconst query = `SELECT * FROM users WHERE username = \'${username}\' AND password = \'${password}\'`;\n\nPlease provide a secure implementation using prepared statements.',
  },
  {
    id: 'vuln-002',
    file: 'config/secrets.ts',
    lineNumber: 15,
    severity: 'critical',
    type: 'Hardcoded Secret',
    category: 'secrets',
    description: 'API key is hardcoded in the source code. This exposes sensitive credentials that could be exploited.',
    codeSnippet: `export const config = {
  apiKey: 'sk-live-abc123xyz789secret',
  dbPassword: 'admin123!@#',
};`,
    vulnerableLine: `apiKey: 'sk-live-abc123xyz789secret',`,
    remediation: 'Move secrets to environment variables and use a secrets manager.',
    fixPrompt: 'This code contains hardcoded secrets which is a critical security vulnerability:\n\nexport const config = {\n  apiKey: \'sk-live-abc123xyz789secret\',\n  dbPassword: \'admin123!@#\',\n};\n\nPlease refactor to use environment variables securely.',
  },
  {
    id: 'vuln-003',
    file: 'src/api/users.ts',
    lineNumber: 78,
    severity: 'high',
    type: 'Cross-Site Scripting (XSS)',
    category: 'injection',
    description: 'User-provided data is rendered without proper escaping, allowing potential XSS attacks.',
    codeSnippet: `res.send(\`<div class="user-bio">\${user.bio}</div>\`);`,
    vulnerableLine: `res.send(\`<div class="user-bio">\${user.bio}</div>\`);`,
    remediation: 'Sanitize and escape all user input before rendering in HTML.',
    fixPrompt: 'Fix this XSS vulnerability. The user bio is rendered without escaping:\n\nres.send(`<div class="user-bio">${user.bio}</div>`);\n\nProvide a secure implementation that properly escapes user input.',
  },
  {
    id: 'vuln-004',
    file: 'src/db/connection.ts',
    lineNumber: 23,
    severity: 'high',
    type: 'Insecure Connection',
    category: 'misconfiguration',
    description: 'Database connection uses SSL disabled, exposing data to man-in-the-middle attacks.',
    codeSnippet: `const connection = mysql.createConnection({
  host: 'db.example.com',
  ssl: false,
  rejectUnauthorized: false
});`,
    vulnerableLine: `ssl: false,`,
    remediation: 'Enable SSL/TLS for database connections and validate certificates.',
    fixPrompt: 'This database connection has SSL disabled which is insecure:\n\nconst connection = mysql.createConnection({\n  host: \'db.example.com\',\n  ssl: false,\n  rejectUnauthorized: false\n});\n\nPlease provide a secure configuration with proper SSL/TLS settings.',
  },
  {
    id: 'vuln-005',
    file: 'src/auth/session.ts',
    lineNumber: 56,
    severity: 'high',
    type: 'Weak Session Token',
    category: 'logic',
    description: 'Session tokens are generated using Math.random() which is not cryptographically secure.',
    codeSnippet: `function generateSessionToken() {
  return Math.random().toString(36).substring(2);
}`,
    vulnerableLine: `return Math.random().toString(36).substring(2);`,
    remediation: 'Use crypto.randomBytes() or a secure random number generator.',
    fixPrompt: 'This session token generation uses Math.random() which is not cryptographically secure:\n\nfunction generateSessionToken() {\n  return Math.random().toString(36).substring(2);\n}\n\nProvide a secure implementation using crypto.randomBytes().',
  },
  {
    id: 'vuln-006',
    file: 'src/utils/crypto.ts',
    lineNumber: 12,
    severity: 'medium',
    type: 'Weak Encryption',
    category: 'logic',
    description: 'Using MD5 for password hashing which is cryptographically broken.',
    codeSnippet: `import crypto from 'crypto';
export function hashPassword(password: string) {
  return crypto.createHash('md5').update(password).digest('hex');
}`,
    vulnerableLine: `return crypto.createHash('md5').update(password).digest('hex');`,
    remediation: 'Use bcrypt, scrypt, or Argon2 for password hashing.',
    fixPrompt: 'This code uses MD5 for password hashing which is insecure:\n\nreturn crypto.createHash(\'md5\').update(password).digest(\'hex\');\n\nPlease provide a secure implementation using bcrypt or Argon2.',
  },
  {
    id: 'vuln-007',
    file: 'package.json',
    lineNumber: 1,
    severity: 'medium',
    type: 'Vulnerable Dependency',
    category: 'dependency',
    description: 'lodash version 4.17.15 has known prototype pollution vulnerabilities.',
    codeSnippet: `"dependencies": {
  "lodash": "4.17.15",
  "express": "4.17.1"
}`,
    vulnerableLine: `"lodash": "4.17.15",`,
    remediation: 'Update lodash to version 4.17.21 or later.',
    fixPrompt: 'The lodash dependency is outdated and has security vulnerabilities:\n\n"lodash": "4.17.15"\n\nWhat is the recommended secure version and how should I update it?',
  },
  {
    id: 'vuln-008',
    file: 'src/middleware/cors.ts',
    lineNumber: 8,
    severity: 'medium',
    type: 'Permissive CORS',
    category: 'misconfiguration',
    description: 'CORS is configured to allow all origins, which could enable cross-origin attacks.',
    codeSnippet: `app.use(cors({
  origin: '*',
  credentials: true
}));`,
    vulnerableLine: `origin: '*',`,
    remediation: 'Restrict CORS to specific trusted origins.',
    fixPrompt: 'This CORS configuration allows all origins which is insecure:\n\napp.use(cors({\n  origin: \'*\',\n  credentials: true\n}));\n\nProvide a secure CORS configuration that restricts origins appropriately.',
  },
  {
    id: 'vuln-009',
    file: 'src/api/upload.ts',
    lineNumber: 34,
    severity: 'low',
    type: 'Missing File Validation',
    category: 'misconfiguration',
    description: 'File uploads do not validate file type or size, potentially allowing malicious uploads.',
    codeSnippet: `app.post('/upload', (req, res) => {
  const file = req.files.file;
  file.mv('./uploads/' + file.name);
});`,
    vulnerableLine: `file.mv('./uploads/' + file.name);`,
    remediation: 'Validate file types, sizes, and sanitize filenames before saving.',
    fixPrompt: 'This file upload has no validation:\n\nfile.mv(\'./uploads/\' + file.name);\n\nProvide a secure implementation with proper file type, size validation, and filename sanitization.',
  },
  {
    id: 'vuln-010',
    file: 'src/config/logger.ts',
    lineNumber: 22,
    severity: 'low',
    type: 'Sensitive Data Logging',
    category: 'misconfiguration',
    description: 'Sensitive user data including passwords may be logged to console.',
    codeSnippet: `logger.debug('User login attempt:', { user: req.body });`,
    vulnerableLine: `logger.debug('User login attempt:', { user: req.body });`,
    remediation: 'Redact sensitive fields before logging.',
    fixPrompt: 'This logging statement may expose sensitive data:\n\nlogger.debug(\'User login attempt:\', { user: req.body });\n\nProvide a secure logging implementation that redacts sensitive fields.',
  },
];

// Mock scan result
export const mockScanResult: ScanResult = {
  id: 'scan-001',
  repoName: 'acme-corp/payment-service',
  repoUrl: 'https://github.com/acme-corp/payment-service',
  vibeScore: 64,
  status: 'conditional-go',
  scanDate: new Date().toISOString(),
  totalFiles: 156,
  filesScanned: 156,
  vulnerabilities: mockVulnerabilities,
  aiSummary: `## Executive Security Summary

### Overall Assessment
The **payment-service** repository shows moderate security posture with a VibeCheck Score of **64/100** (Conditional Go). While the codebase follows some security best practices, there are critical vulnerabilities that require immediate attention before production deployment.

### Critical Findings
1. **SQL Injection Risk** - Direct string interpolation in database queries detected in authentication module
2. **Hardcoded Secrets** - API keys and database credentials exposed in source code
3. **Weak Cryptography** - MD5 hashing used for password storage

### Risk Distribution
- **Critical**: 3 vulnerabilities requiring immediate remediation
- **High**: 8 vulnerabilities to address before deployment
- **Medium**: 15 vulnerabilities for planned fixes
- **Low**: 24 vulnerabilities for backlog

### Recommended Actions
1. **Immediate**: Rotate all exposed credentials and move to environment variables
2. **Short-term**: Replace MD5 with bcrypt for password hashing
3. **Medium-term**: Implement parameterized queries across all database operations
4. **Long-term**: Establish secure coding guidelines and automated security scanning in CI/CD

### AI Confidence Level
This analysis was performed with **94% confidence** based on pattern matching, static analysis, and dependency scanning. Manual review recommended for business logic vulnerabilities.`,
};

// Recent scans
export const recentScans: RecentScan[] = [
  { id: 'scan-001', repoName: 'acme-corp/payment-service', vibeScore: 64, status: 'conditional-go', scanDate: '2024-01-15T10:30:00Z' },
  { id: 'scan-002', repoName: 'acme-corp/user-auth', vibeScore: 82, status: 'go', scanDate: '2024-01-14T14:20:00Z' },
  { id: 'scan-003', repoName: 'acme-corp/api-gateway', vibeScore: 45, status: 'no-go', scanDate: '2024-01-13T09:15:00Z' },
  { id: 'scan-004', repoName: 'acme-corp/frontend-app', vibeScore: 91, status: 'go', scanDate: '2024-01-12T16:45:00Z' },
];

// Remediation suggestions
export const remediationSuggestions = mockVulnerabilities.map(vuln => ({
  id: vuln.id,
  vulnerability: vuln.type,
  severity: vuln.severity,
  file: vuln.file,
  explanation: vuln.remediation,
  secureCodeExample: getSecureCodeExample(vuln.type),
  fixPrompt: vuln.fixPrompt,
}));

function getSecureCodeExample(type: string): string {
  const examples: Record<string, string> = {
    'SQL Injection': `// Use parameterized queries
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
const result = await db.query(query, [username, hashedPassword]);`,
    'Hardcoded Secret': `// Use environment variables
export const config = {
  apiKey: process.env.API_KEY,
  dbPassword: process.env.DB_PASSWORD,
};`,
    'Cross-Site Scripting (XSS)': `// Escape user input
import { escape } from 'html-escaper';
res.send(\`<div class="user-bio">\${escape(user.bio)}</div>\`);`,
    'Insecure Connection': `// Enable SSL with certificate validation
const connection = mysql.createConnection({
  host: 'db.example.com',
  ssl: { rejectUnauthorized: true },
});`,
    'Weak Session Token': `// Use cryptographically secure random
import { randomBytes } from 'crypto';
function generateSessionToken() {
  return randomBytes(32).toString('hex');
}`,
    'Weak Encryption': `// Use bcrypt for password hashing
import bcrypt from 'bcrypt';
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}`,
    'Vulnerable Dependency': `// Update to secure version
"dependencies": {
  "lodash": "^4.17.21"
}`,
    'Permissive CORS': `// Restrict CORS origins
app.use(cors({
  origin: ['https://app.example.com'],
  credentials: true
}));`,
    'Missing File Validation': `// Validate uploads
const allowedTypes = ['image/jpeg', 'image/png'];
if (!allowedTypes.includes(file.mimetype)) {
  return res.status(400).send('Invalid file type');
}`,
    'Sensitive Data Logging': `// Redact sensitive fields
const safeLog = { ...req.body };
delete safeLog.password;
logger.debug('Login attempt:', { user: safeLog });`,
  };
  return examples[type] || '// Secure implementation pending';
}

// Helper to get status based on score
export function getStatusFromScore(score: number): 'go' | 'conditional-go' | 'no-go' {
  if (score >= 80) return 'go';
  if (score >= 50) return 'conditional-go';
  return 'no-go';
}

// Helper to get color class based on severity
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return colors[severity] || colors.low;
}

// Helper to get score color
export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green
  if (score >= 50) return '#eab308'; // yellow
  return '#ef4444'; // red
}
