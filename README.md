# AI Naming Reviewer 🤖

An intelligent GitHub Action that reviews Pull Requests for poorly named variables, functions, and classes, then suggests improvements or automatically applies safe renames using AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

## ✨ Features

- 🔍 **Intelligent Analysis**: Uses LLM to understand code context and suggest meaningful names
- 🌐 **Multi-Language Support**: TypeScript, JavaScript, Python, and Go
- 🛡️ **Safe Refactoring**: Language-aware AST manipulation with verification
- 💬 **Inline Comments**: Posts GitHub Suggested Changes on PRs
- 🔧 **Auto-Fix Mode**: Automatically applies high-confidence renames
- 🔒 **Security First**: Never executes code from forks
- 💰 **Cost Efficient**: Caching and optimization keep costs under $0.05/PR
- ⚡ **Fast**: Completes in under 2 minutes for typical PRs

## 🚀 Quick Start

### 1. Add to Your Repository

Create `.github/workflows/ai-naming-review.yml`:

```yaml
name: AI Naming Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install AI Naming Reviewer
        run: |
          npm install -g ai-naming-reviewer
      
      - name: Run Review
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: ai-naming-review
```

### 2. Configure Secrets

Add to your repository secrets:
- `OPENAI_API_KEY`: Your OpenAI API key

### 3. Optional: Enable Auto-Fix

Create `.github/workflows/ai-naming-autofix.yml`:

```yaml
name: AI Naming Autofix

on:
  pull_request:
    types: [labeled]

permissions:
  contents: write
  pull-requests: write

jobs:
  autofix:
    if: contains(github.event.pull_request.labels.*.name, 'auto-naming-fix')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Run Autofix
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: ai-naming-autofix
```

## 📖 Usage

### Review Mode (Default)

The action runs on every PR and posts inline comments with naming suggestions:

```typescript
// Before
const data = await fetchUser(id);

// AI Suggestion (posted as comment):
// 🟢 Naming Suggestion (95% confidence)
// Current: data
// Suggested: userProfile
// Rationale: More descriptive name that indicates the data type
```

### Auto-Fix Mode

Add the `auto-naming-fix` label to a PR to enable automatic renames:

1. High-confidence suggestions (≥85%) are automatically applied
2. Changes are committed back to the PR branch
3. Type-checking and tests run before committing
4. Only works on same-repo PRs (not forks)

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *required* | OpenAI API key |
| `GITHUB_TOKEN` | *required* | GitHub token (auto-provided) |
| `LLM_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `MAX_TOKENS` | `1000` | Max tokens per request |
| `LLM_TEMPERATURE` | `0.3` | Model temperature (0-1) |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARN, ERROR) |

### Repository Variables

Set these in your repository settings under Variables:

```yaml
LLM_MODEL: gpt-4o-mini
MAX_TOKENS: 1000
LLM_TEMPERATURE: 0.3
```

## 🏗️ Architecture

```
┌─────────────────┐
│   GitHub PR     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Context        │  Parse diffs, extract symbols
│  Extraction     │  Build enriched context
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Analysis   │  Send context to OpenAI
│                 │  Get naming suggestions
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│Comment │ │ Auto-Fix │  Apply safe renames
│ Mode   │ │   Mode   │  Commit changes
└────────┘ └──────────┘
```

### Module Structure

```
src/
├── context/          # Extract naming context from PRs
│   ├── diff-parser.ts
│   ├── symbol-extractor.ts
│   └── context-builder.ts
├── llm/              # LLM integration
│   ├── client.ts
│   ├── prompts.ts
│   ├── schema.ts
│   └── config.ts
├── rename/           # Language-specific renamers
│   ├── typescript-renamer.ts
│   ├── python-renamer.ts
│   ├── go-renamer.ts
│   └── rename-orchestrator.ts
├── github/           # GitHub API integration
│   ├── api-client.ts
│   ├── comment-formatter.ts
│   ├── review.ts
│   └── autofix.ts
└── tests/            # Unit tests
```

## 🔧 Development

### Prerequisites

- Node.js 20+
- npm or yarn
- OpenAI API key

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-naming-reviewer.git
cd ai-naming-reviewer

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run locally
export OPENAI_API_KEY=your-key
export GITHUB_TOKEN=your-token
export PR_NUMBER=123
npm run review
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- diff-parser.test.ts

# Watch mode
npm run test:watch
```

## 🔒 Security

### Fork PRs

- **Review mode**: ✅ Safe - only reads code, posts comments
- **Auto-fix mode**: ❌ Disabled - never executes code from forks

### Permissions

- **Review workflow**: `contents: read`, `pull-requests: write`
- **Autofix workflow**: `contents: write`, `pull-requests: write`

### Best Practices

1. Never store API keys in code
2. Use repository secrets for sensitive data
3. Review auto-fix commits before merging
4. Test on draft PRs first

## 💰 Cost Optimization

- **Caching**: Responses cached for 1 hour
- **Smart filtering**: Only reviews meaningful symbols
- **Token limits**: Configurable max tokens per request
- **Batch processing**: Efficient API usage

**Typical costs**: $0.02-0.05 per PR with gpt-4o-mini

## 📊 Example Output

### Review Comment

```markdown
## 🟢 Naming Suggestion (92% confidence)

**Current name:** `data`
**Suggested name:** `userProfile`

**Rationale:** The variable holds a user profile object fetched from the API. 
"userProfile" is more descriptive and follows TypeScript camelCase convention.

**Safety Analysis:**
- API Surface: ✅ No
- Auto-fix Safe: ✅ Yes
- Reason: Local variable with clear scope and high confidence

**Alternative names:** `profileData`, `fetchedProfile`
```

### Auto-Fix Commit

```
🤖 AI Naming: Auto-fix 3 naming improvements

- data → userProfile (src/services/user.ts)
- calc → calculateDiscount (src/utils/pricing.ts)
- temp → validationResult (src/validators/schema.ts)

Applied by AI Naming Reviewer
```

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [ts-morph](https://github.com/dsherret/ts-morph) for TypeScript refactoring
- Uses [OpenAI API](https://openai.com/api/) for intelligent suggestions
- Powered by [Octokit](https://github.com/octokit/octokit.js) for GitHub integration

## 📞 Support

- 📖 [Documentation](docs/design.md)
- 🐛 [Issue Tracker](https://github.com/yourusername/ai-naming-reviewer/issues)
- 💬 [Discussions](https://github.com/yourusername/ai-naming-reviewer/discussions)

---

Made with ❤️ by the AI Naming Team
