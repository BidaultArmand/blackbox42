# Setup Guide - AI Naming Reviewer

Complete setup instructions for getting the AI Naming Reviewer running in your repository.

## 📋 Prerequisites

- GitHub repository with pull requests
- OpenAI API account and API key
- Node.js 20+ (for local development)

## 🚀 Quick Setup (5 minutes)

### Step 1: Add Workflow Files

Create `.github/workflows/ai-naming-review.yml` in your repository:

```yaml
name: AI Naming Review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Clone AI Naming Reviewer
        run: |
          git clone https://github.com/yourusername/ai-naming-reviewer.git /tmp/reviewer
          cd /tmp/reviewer
          npm ci
          npm run build
      
      - name: Run Review
        working-directory: /tmp/reviewer
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          GITHUB_REPOSITORY_OWNER: ${{ github.repository_owner }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: npm run review
```

### Step 2: Add Secrets

1. Go to your repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Add new repository secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-`)

### Step 3: Test It!

1. Create a test PR with some code changes
2. The action will run automatically
3. Check for inline comments with naming suggestions

## 🔧 Optional: Enable Auto-Fix

### Step 1: Add Auto-Fix Workflow

Create `.github/workflows/ai-naming-autofix.yml`:

```yaml
name: AI Naming Autofix

on:
  pull_request:
    types: [labeled, synchronize]

permissions:
  contents: write
  pull-requests: write

jobs:
  autofix:
    if: |
      github.event.pull_request.head.repo.full_name == github.repository &&
      contains(github.event.pull_request.labels.*.name, 'auto-naming-fix')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      
      - name: Install Tools
        run: |
          pip install rope || true
          go install golang.org/x/tools/gopls@latest || true
      
      - name: Clone and Run Autofix
        run: |
          git clone https://github.com/yourusername/ai-naming-reviewer.git /tmp/reviewer
          cd /tmp/reviewer
          npm ci
          npm run build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          GITHUB_REPOSITORY_OWNER: ${{ github.repository_owner }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
      
      - name: Run Autofix
        working-directory: /tmp/reviewer
        run: npm run autofix
```

### Step 2: Create Label

1. Go to your repository
2. Navigate to **Issues** → **Labels**
3. Create new label:
   - Name: `auto-naming-fix`
   - Color: `#0E8A16` (green)
   - Description: "Enable automatic naming fixes"

### Step 3: Use Auto-Fix

1. Create a PR
2. Add the `auto-naming-fix` label
3. High-confidence suggestions will be automatically applied and committed

## ⚙️ Configuration

### Basic Configuration

Set repository variables for customization:

1. Go to **Settings** → **Secrets and variables** → **Actions** → **Variables**
2. Add variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_MODEL` | `gpt-4o-mini` | OpenAI model |
| `MAX_TOKENS` | `1000` | Max tokens per request |
| `LLM_TEMPERATURE` | `0.3` | Model temperature |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

### Advanced Configuration

Create `.ai-naming-config.json` in your repository root:

```json
{
  "model": "gpt-4o-mini",
  "maxTokens": 1000,
  "temperature": 0.3,
  "minConfidence": 0.3,
  "autofixThreshold": 0.85,
  "excludePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/mocks/**"
  ],
  "customRules": {
    "typescript": {
      "preferCamelCase": true,
      "avoidAbbreviations": true
    }
  }
}
```

## 🔍 Verification

### Check Action Runs

1. Go to **Actions** tab in your repository
2. Look for "AI Naming Review" workflow
3. Click on a run to see logs

### View Comments

1. Open a PR
2. Look for inline comments from the bot
3. Comments will have a 🟢/🟡/🔴 indicator

### Check Costs

Monitor your OpenAI usage:
1. Visit [OpenAI Usage Dashboard](https://platform.openai.com/usage)
2. Check API calls and costs
3. Typical cost: $0.02-0.05 per PR

## 🐛 Troubleshooting

### Action Not Running

**Problem**: Workflow doesn't trigger on PRs

**Solutions**:
- Check workflow file is in `.github/workflows/`
- Verify YAML syntax is correct
- Ensure PR triggers are configured
- Check repository permissions

### No Comments Posted

**Problem**: Action runs but no comments appear

**Solutions**:
- Verify `GITHUB_TOKEN` has write permissions
- Check PR is not from a fork (for autofix)
- Review action logs for errors
- Ensure code changes include identifiers

### API Key Errors

**Problem**: "Invalid API key" or authentication errors

**Solutions**:
- Verify `OPENAI_API_KEY` is set correctly
- Check key hasn't expired
- Ensure key has sufficient credits
- Test key with curl:
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer $OPENAI_API_KEY"
  ```

### High Costs

**Problem**: OpenAI costs are too high

**Solutions**:
- Switch to `gpt-4o-mini` (cheaper)
- Reduce `MAX_TOKENS` to 500-800
- Add exclude patterns for test files
- Enable caching (automatic)
- Increase `minConfidence` threshold

### TypeScript Errors

**Problem**: Rename fails with TypeScript errors

**Solutions**:
- Ensure `tsconfig.json` is valid
- Check all dependencies are installed
- Verify code compiles before rename
- Review action logs for specific errors

### Python/Go Rename Failures

**Problem**: Renames fail for Python or Go files

**Solutions**:
- Verify `rope` is installed (Python)
- Verify `gopls` is installed (Go)
- Check file syntax is valid
- Review fallback regex behavior

## 📊 Monitoring

### Action Logs

View detailed logs:
```bash
# In action run
- Context extraction: 2.3s
- LLM analysis: 5.1s (3 API calls)
- Comment posting: 1.2s
- Total: 8.6s
- Cost: $0.023
```

### Metrics to Track

- Suggestions per PR
- Auto-fix success rate
- Developer acceptance rate
- Average cost per PR
- Average execution time

## 🔐 Security Best Practices

1. **Never commit API keys** to repository
2. **Use repository secrets** for sensitive data
3. **Review auto-fix commits** before merging
4. **Limit auto-fix** to same-repo PRs only
5. **Monitor API usage** regularly
6. **Rotate keys** periodically

## 🎓 Next Steps

1. ✅ Set up review workflow
2. ✅ Test on a draft PR
3. ✅ Configure settings
4. ✅ Enable auto-fix (optional)
5. ✅ Monitor costs and performance
6. ✅ Customize for your team

## 📚 Additional Resources

- [Full Documentation](../README.md)
- [Architecture Guide](design.md)
- [Examples](examples.md)
- [Contributing Guide](../CONTRIBUTING.md)

## 💬 Support

Need help?
- 📖 Check [documentation](../README.md)
- 🐛 [Report issues](https://github.com/yourusername/ai-naming-reviewer/issues)
- 💬 [Ask questions](https://github.com/yourusername/ai-naming-reviewer/discussions)

---

**Setup complete!** 🎉 Your repository now has AI-powered naming review.
