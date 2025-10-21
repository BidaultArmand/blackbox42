# Using AI Naming Reviewer Action from Another Repository

This guide explains how to use the AI Naming Reviewer GitHub Action in your own repository.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Complete Input Reference](#complete-input-reference)
- [Complete Output Reference](#complete-output-reference)
- [Usage Examples](#usage-examples)
- [Advanced Configurations](#advanced-configurations)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Step 1: Add the Workflow

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
      - name: Checkout PR
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      
      - name: Run AI Naming Review
        uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
```

### Step 2: Add BlackBox AI API Key

1. Go to your repository **Settings**
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `BLACKBOX_API_KEY`
5. Value: Your BlackBox AI API key (starts with `sk-`)
6. Click **Add secret**

### Step 3: Test It

1. Create a Pull Request with code changes
2. The action will run automatically
3. Check for inline comments with naming suggestions

---

## 📥 Complete Input Reference

### Required Inputs

#### `github-token`
- **Type:** String
- **Required:** Yes
- **Description:** GitHub token for API access (commenting, reading PRs)
- **Default:** None
- **Example:** `${{ secrets.GITHUB_TOKEN }}`
- **Notes:** Automatically provided by GitHub Actions

#### `blackbox-api-key`
- **Type:** String
- **Required:** Yes
- **Description:** BlackBox AI API key for LLM access
- **Default:** None
- **Example:** `${{ secrets.BLACKBOX_API_KEY }}`
- **Notes:** Must be added to repository secrets

### Optional Inputs

#### `mode`
- **Type:** String
- **Required:** No
- **Default:** `review`
- **Options:** `review` | `autofix`
- **Description:** Operation mode
  - `review`: Posts comments only (safe for all PRs)
  - `autofix`: Applies renames and commits (same-repo PRs only)
- **Example:**
  ```yaml
  mode: review
  ```

#### `pr-number`
- **Type:** Number
- **Required:** No
- **Default:** `${{ github.event.pull_request.number }}`
- **Description:** Pull request number to review
- **Example:**
  ```yaml
  pr-number: 123
  ```
- **Notes:** Auto-detected from PR context

#### `llm-model`
- **Type:** String
- **Required:** No
- **Default:** `gpt-4o-mini`
- **Options:** `gpt-4o-mini` | `gpt-4o` | `gpt-4-turbo` | `gpt-3.5-turbo`
- **Description:** LLM model to use for analysis
- **Cost Comparison:**
  - `gpt-4o-mini`: $0.15/$0.60 per 1M tokens (recommended)
  - `gpt-4o`: $2.50/$10.00 per 1M tokens
  - `gpt-4-turbo`: $10.00/$30.00 per 1M tokens
  - `gpt-3.5-turbo`: $0.50/$1.50 per 1M tokens
- **Example:**
  ```yaml
  llm-model: gpt-4o-mini
  ```

#### `max-tokens`
- **Type:** Number
- **Required:** No
- **Default:** `1000`
- **Range:** 100-4000
- **Description:** Maximum tokens per LLM request
- **Impact:** Higher = more context but higher cost
- **Example:**
  ```yaml
  max-tokens: 1500
  ```

#### `temperature`
- **Type:** Number
- **Required:** No
- **Default:** `0.3`
- **Range:** 0.0-1.0
- **Description:** LLM temperature (creativity vs consistency)
  - `0.0-0.3`: More consistent, deterministic (recommended)
  - `0.4-0.7`: Balanced
  - `0.8-1.0`: More creative, varied
- **Example:**
  ```yaml
  temperature: 0.2
  ```

#### `log-level`
- **Type:** String
- **Required:** No
- **Default:** `INFO`
- **Options:** `DEBUG` | `INFO` | `WARN` | `ERROR`
- **Description:** Logging verbosity
  - `DEBUG`: Detailed execution logs
  - `INFO`: Standard operation logs
  - `WARN`: Warnings only
  - `ERROR`: Errors only
- **Example:**
  ```yaml
  log-level: DEBUG
  ```

#### `autofix-label`
- **Type:** String
- **Required:** No
- **Default:** `auto-naming-fix`
- **Description:** Label name required for autofix mode
- **Example:**
  ```yaml
  autofix-label: auto-rename
  ```
- **Notes:** Only used in autofix mode

---

## 📤 Complete Output Reference

All outputs are available after the action completes. Access them using `steps.<step-id>.outputs.<output-name>`.

#### `suggestions-count`
- **Type:** Number
- **Description:** Total number of naming suggestions generated
- **Example Value:** `5`
- **Usage:**
  ```yaml
  - name: AI Naming Review
    id: naming
    uses: yourusername/ai-naming-reviewer@v1
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
  
  - name: Check Results
    run: echo "Found ${{ steps.naming.outputs.suggestions-count }} suggestions"
  ```

#### `autofixes-applied`
- **Type:** Number
- **Description:** Number of automatic fixes applied and committed
- **Example Value:** `3`
- **Notes:** Only populated in autofix mode
- **Usage:**
  ```yaml
  - name: Report Fixes
    run: echo "Applied ${{ steps.naming.outputs.autofixes-applied }} fixes"
  ```

#### `estimated-cost`
- **Type:** String (decimal)
- **Description:** Estimated BlackBox AI API cost in USD
- **Example Value:** `0.0234`
- **Format:** Decimal number (e.g., "0.0234" = $0.0234)
- **Usage:**
  ```yaml
  - name: Report Cost
    run: echo "Cost: \$${{ steps.naming.outputs.estimated-cost }}"
  ```

---

## 💡 Usage Examples

### Example 1: Basic Review Mode

```yaml
name: AI Naming Review

on:
  pull_request:
    types: [opened, synchronize]

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
      
      - uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
```

### Example 2: Review with Custom Model

```yaml
- uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
    llm-model: gpt-4o
    max-tokens: 1500
    temperature: 0.2
```

### Example 3: Autofix Mode with Label

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
      
      - uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
          mode: autofix
```

### Example 4: Using Outputs

```yaml
- name: AI Naming Review
  id: naming-review
  uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}

- name: Report Results
  run: |
    echo "📊 Suggestions: ${{ steps.naming-review.outputs.suggestions-count }}"
    echo "💰 Cost: \$${{ steps.naming-review.outputs.estimated-cost }}"

- name: Fail if Too Many Issues
  if: steps.naming-review.outputs.suggestions-count > 10
  run: |
    echo "Too many naming issues found!"
    exit 1
```

### Example 5: Debug Mode

```yaml
- uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
    log-level: DEBUG
```

### Example 6: Cost-Optimized Configuration

```yaml
- uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
    llm-model: gpt-4o-mini
    max-tokens: 800
    temperature: 0.1
```

### Example 7: Multiple Jobs with Different Modes

```yaml
name: AI Naming Review & Autofix

on:
  pull_request:
    types: [opened, synchronize, labeled]

permissions:
  contents: write
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      
      - name: Review Mode
        uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
          mode: review

  autofix:
    if: contains(github.event.pull_request.labels.*.name, 'auto-naming-fix')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}
      
      - name: Autofix Mode
        uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
          mode: autofix
```

---

## 🔧 Advanced Configurations

### Configuration Matrix

Test multiple configurations:

```yaml
jobs:
  review:
    strategy:
      matrix:
        model: [gpt-4o-mini, gpt-4o]
        temperature: [0.2, 0.5]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
          llm-model: ${{ matrix.model }}
          temperature: ${{ matrix.temperature }}
```

### Conditional Execution

Run only on specific file types:

```yaml
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check for code changes
        id: changes
        run: |
          FILES=$(git diff --name-only ${{ github.event.pull_request.base.sha }} ${{ github.event.pull_request.head.sha }})
          if echo "$FILES" | grep -E '\.(ts|js|py|go)$'; then
            echo "has_code=true" >> $GITHUB_OUTPUT
          fi
      
      - name: AI Naming Review
        if: steps.changes.outputs.has_code == 'true'
        uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
```

### Cost Tracking

Track costs across PRs:

```yaml
- name: AI Naming Review
  id: review
  uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}

- name: Update Cost Tracking
  run: |
    COST=${{ steps.review.outputs.estimated-cost }}
    echo "PR #${{ github.event.pull_request.number }}: \$$COST" >> costs.log
    git add costs.log
    git commit -m "Track AI review cost"
```

---

## 🐛 Troubleshooting

### Action Not Running

**Problem:** Workflow doesn't trigger

**Solutions:**
- Verify workflow file is in `.github/workflows/`
- Check YAML syntax with a validator
- Ensure PR triggers are correct
- Check repository permissions

### Authentication Errors

**Problem:** "Invalid API key" or "Unauthorized"

**Solutions:**
- Verify `BLACKBOX_API_KEY` is set in repository secrets
- Check key hasn't expired
- Ensure key has sufficient credits
- Test key manually:
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer sk-your-key"
  ```

### No Comments Posted

**Problem:** Action runs but no comments appear

**Solutions:**
- Check workflow has `pull-requests: write` permission
- Verify PR is not from a fork (for autofix)
- Review action logs for errors
- Ensure code changes include identifiers to review

### High Costs

**Problem:** API costs are too high

**Solutions:**
- Use `gpt-4o-mini` instead of `gpt-4o`
- Reduce `max-tokens` to 500-800
- Lower `temperature` to 0.1-0.2
- Add file type filters
- Monitor `estimated-cost` output

### Autofix Not Working

**Problem:** Autofix mode doesn't apply changes

**Solutions:**
- Verify PR is from same repository (not fork)
- Check PR has the required label (`auto-naming-fix`)
- Ensure workflow has `contents: write` permission
- Review logs for rename failures
- Check language tools are installed (rope, gopls)

### Rate Limiting

**Problem:** "Rate limit exceeded" errors

**Solutions:**
- Add delays between API calls
- Use caching (automatic)
- Reduce number of symbols reviewed
- Upgrade BlackBox AI plan

---

## 📊 Input/Output Quick Reference

### Inputs Summary Table

| Input | Required | Default | Type | Description |
|-------|----------|---------|------|-------------|
| `github-token` | ✅ Yes | - | String | GitHub API token |
| `blackbox-api-key` | ✅ Yes | - | String | BlackBox AI API key |
| `mode` | ❌ No | `review` | String | `review` or `autofix` |
| `pr-number` | ❌ No | Auto | Number | PR number |
| `llm-model` | ❌ No | `gpt-4o-mini` | String | Model name |
| `max-tokens` | ❌ No | `1000` | Number | Token limit |
| `temperature` | ❌ No | `0.3` | Number | 0.0-1.0 |
| `log-level` | ❌ No | `INFO` | String | Log verbosity |
| `autofix-label` | ❌ No | `auto-naming-fix` | String | Label name |

### Outputs Summary Table

| Output | Type | Description | Example |
|--------|------|-------------|---------|
| `suggestions-count` | Number | Suggestions generated | `5` |
| `autofixes-applied` | Number | Fixes applied | `3` |
| `estimated-cost` | String | Cost in USD | `0.0234` |

---

## 📚 Additional Resources

- [Main README](../README.md) - Full documentation
- [Architecture Guide](design.md) - Technical details
- [Examples](examples.md) - Real-world scenarios
- [Setup Guide](SETUP.md) - Installation instructions

---

## 💬 Support

- 🐛 [Report Issues](https://github.com/yourusername/ai-naming-reviewer/issues)
- 💬 [Discussions](https://github.com/yourusername/ai-naming-reviewer/discussions)
- 📧 Email: support@ai-naming-reviewer.dev

---

**Last Updated:** 2024
**Action Version:** v1.0.0
