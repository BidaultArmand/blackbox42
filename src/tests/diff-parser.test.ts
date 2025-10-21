/**
 * Tests for diff parser
 */

import { describe, it, expect } from '@jest/globals';
import { parseDiff, detectLanguage, extractIdentifiers } from '../context/diff-parser.js';

describe('detectLanguage', () => {
  it('should detect TypeScript files', () => {
    expect(detectLanguage('src/index.ts')).toBe('typescript');
    expect(detectLanguage('components/Button.tsx')).toBe('typescript');
  });

  it('should detect JavaScript files', () => {
    expect(detectLanguage('src/index.js')).toBe('javascript');
    expect(detectLanguage('components/Button.jsx')).toBe('javascript');
  });

  it('should detect Python files', () => {
    expect(detectLanguage('main.py')).toBe('python');
  });

  it('should detect Go files', () => {
    expect(detectLanguage('main.go')).toBe('go');
  });

  it('should return null for unsupported files', () => {
    expect(detectLanguage('README.md')).toBeNull();
    expect(detectLanguage('config.json')).toBeNull();
  });
});

describe('parseDiff', () => {
  it('should parse a simple addition', () => {
    const diff = `@@ -1,3 +1,4 @@
 const x = 1;
+const data = fetchUser();
 const y = 2;`;

    const result = parseDiff(diff, 'test.ts');
    expect(result).not.toBeNull();
    expect(result?.additions).toHaveLength(1);
    expect(result?.additions[0].content).toBe('const data = fetchUser();');
  });

  it('should parse deletions', () => {
    const diff = `@@ -1,3 +1,2 @@
 const x = 1;
-const temp = 123;
 const y = 2;`;

    const result = parseDiff(diff, 'test.ts');
    expect(result).not.toBeNull();
    expect(result?.deletions).toHaveLength(1);
  });

  it('should return null for unsupported files', () => {
    const diff = `@@ -1,1 +1,1 @@
-old line
+new line`;

    const result = parseDiff(diff, 'README.md');
    expect(result).toBeNull();
  });
});

describe('extractIdentifiers', () => {
  it('should extract TypeScript variable names', () => {
    const code = 'const data = 123; let temp = "test"; var info = {};';
    const identifiers = extractIdentifiers(code, 'typescript');
    
    expect(identifiers).toContain('data');
    expect(identifiers).toContain('temp');
    expect(identifiers).toContain('info');
  });

  it('should extract function names', () => {
    const code = 'function calc() {} const process = () => {}';
    const identifiers = extractIdentifiers(code, 'typescript');
    
    expect(identifiers).toContain('calc');
    expect(identifiers).toContain('process');
  });

  it('should extract Python function names', () => {
    const code = 'def calc(): pass\nclass Data: pass';
    const identifiers = extractIdentifiers(code, 'python');
    
    expect(identifiers).toContain('calc');
    expect(identifiers).toContain('Data');
  });

  it('should filter out single-letter names', () => {
    const code = 'const x = 1; const y = 2;';
    const identifiers = extractIdentifiers(code, 'typescript');
    
    expect(identifiers).not.toContain('x');
    expect(identifiers).not.toContain('y');
  });
});
