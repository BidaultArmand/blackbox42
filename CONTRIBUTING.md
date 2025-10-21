# Contributing to AI Naming Reviewer

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Git
- OpenAI API key (for testing)

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/ai-naming-reviewer.git
   cd ai-naming-reviewer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Build and Test**
   ```bash
   npm run build
   npm test
   ```

## 📝 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### 2. Make Changes

- Write clean, documented code
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test
npm test -- diff-parser.test.ts

# Check types
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

### 4. Commit Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add support for Rust language"
git commit -m "fix: handle empty PR diffs correctly"
git commit -m "docs: update installation instructions"
```

Commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference any related issues
- Screenshots/examples if applicable
- Checklist of changes

## 🏗️ Project Structure

```
ai-naming-reviewer/
├── src/
│   ├── context/       # PR diff parsing and symbol extraction
│   ├── llm/          # LLM integration and prompts
│   ├── rename/       # Language-specific renamers
│   ├── github/       # GitHub API integration
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   └── tests/        # Test files
├── docs/             # Documentation
├── .github/          # GitHub Actions workflows
└── package.json      # Dependencies and scripts
```

## 🧪 Testing Guidelines

### Writing Tests

1. **Unit Tests**: Test individual functions
   ```typescript
   describe('detectLanguage', () => {
     it('should detect TypeScript files', () => {
       expect(detectLanguage('test.ts')).toBe('typescript');
     });
   });
   ```

2. **Integration Tests**: Test module interactions
   ```typescript
   describe('buildContextsFromPR', () => {
     it('should build contexts from PR diff', async () => {
       // Mock GitHub API
       // Test full flow
     });
   });
   ```

3. **Mock External Services**
   ```typescript
   jest.mock('../llm/client', () => ({
     askLLM: jest.fn().mockResolvedValue(mockSuggestion),
   }));
   ```

### Test Coverage

- Aim for 70%+ coverage
- Focus on critical paths
- Test edge cases and error handling

## 📚 Documentation

### Code Documentation

```typescript
/**
 * Parse GitHub PR diff and extract changed symbols
 * 
 * @param diffText - Unified diff format from GitHub API
 * @param filePath - File path relative to repo root
 * @returns Parsed diff with additions/deletions or null if unsupported
 * 
 * @example
 * ```typescript
 * const diff = parseDiff(diffText, 'src/index.ts');
 * console.log(diff.additions);
 * ```
 */
export function parseDiff(diffText: string, filePath: string): PRDiff | null {
  // Implementation
}
```

### README Updates

When adding features, update:
- Feature list
- Usage examples
- Configuration options
- Troubleshooting section

## 🎨 Code Style

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use explicit types for function parameters and returns
- Avoid `any` type
- Use meaningful variable names

```typescript
// ✅ Good
async function getUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// ❌ Bad
async function get(id: any) {
  const data = await fetch(`/api/users/${id}`);
  return data.json();
}
```

### Naming Conventions

- **Files**: kebab-case (`diff-parser.ts`)
- **Classes**: PascalCase (`SymbolExtractor`)
- **Functions**: camelCase (`extractSymbolInfo`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase (`NamingContext`)

### Error Handling

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error(`Operation failed: ${error}`);
  throw new Error(`Failed to complete operation: ${error}`);
}
```

## 🐛 Bug Reports

### Before Submitting

1. Check existing issues
2. Verify it's reproducible
3. Test with latest version

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Create PR with...
2. Run action...
3. See error...

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Environment**
- Node.js version:
- OS:
- Action version:

**Logs**
```
Paste relevant logs here
```

**Additional context**
Any other relevant information.
```

## 💡 Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Any other relevant information.
```

## 🔍 Code Review Process

### For Contributors

- Respond to feedback promptly
- Make requested changes
- Keep PR scope focused
- Update tests and docs

### For Reviewers

- Be constructive and respectful
- Explain reasoning for changes
- Approve when ready
- Test changes locally if needed

## 🎯 Areas for Contribution

### High Priority

- [ ] Add support for more languages (Rust, Java, C++)
- [ ] Improve Python/Go rename accuracy
- [ ] Add custom naming rules configuration
- [ ] Performance optimizations
- [ ] Better error messages

### Medium Priority

- [ ] IDE integration (VSCode extension)
- [ ] Analytics dashboard
- [ ] Team conventions learning
- [ ] Multi-file refactoring
- [ ] Conflict resolution

### Good First Issues

- [ ] Add more test cases
- [ ] Improve documentation
- [ ] Fix typos
- [ ] Add examples
- [ ] Update dependencies

## 📞 Getting Help

- 💬 [GitHub Discussions](https://github.com/yourusername/ai-naming-reviewer/discussions)
- 🐛 [Issue Tracker](https://github.com/yourusername/ai-naming-reviewer/issues)
- 📧 Email: support@ai-naming-reviewer.dev

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AI Naming Reviewer! 🎉
