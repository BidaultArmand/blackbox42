# AI Naming Reviewer - Usage Guide

## 🚀 Using as a Reusable GitHub Action

This action can be called from any repository to review naming conventions in Pull Requests.

### Review Mode (Comment Only)

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
      
      - name: AI Naming Review
        uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
          mode: review
```

### Auto-Fix Mode (Apply Renames)

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
      - name: Checkout PR
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: AI Naming Autofix
        uses: yourusername/ai-naming-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
          mode: autofix
```

## 📝 Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `mode` | No | `review` | Operation mode: `review` or `autofix` |
| `github-token` | Yes | - | GitHub token for API access |
| `blackbox-api-key` | Yes | - | BlackBox AI API key |
| `pr-number` | No | Auto-detected | PR number to review |
| `llm-model` | No | `gpt-4o-mini` | OpenAI model to use |
| `max-tokens` | No | `1000` | Max tokens per request |
| `temperature` | No | `0.3` | LLM temperature (0.0-1.0) |
| `log-level` | No | `INFO` | Logging level |
| `autofix-label` | No | `auto-naming-fix` | Label for auto-fix |

## 📤 Action Outputs

| Output | Description |
|--------|-------------|
| `suggestions-count` | Number of suggestions generated |
| `autofixes-applied` | Number of auto-fixes applied |
| `estimated-cost` | Estimated OpenAI cost in USD |

## 🔧 Advanced Configuration

### Custom Model and Settings

```yaml
- name: AI Naming Review
  uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
    mode: review
    llm-model: gpt-4o
    max-tokens: 1500
    temperature: 0.2
    log-level: DEBUG
```

### Using Outputs

```yaml
- name: AI Naming Review
  id: naming-review
  uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
    mode: review

- name: Report Results
  run: |
    echo "Suggestions: ${{ steps.naming-review.outputs.suggestions-count }}"
    echo "Cost: ${{ steps.naming-review.outputs.estimated-cost }}"
```

## 🔐 Setup

### 1. Add BlackBox AI API Key

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `BLACKBOX_API_KEY`
4. Value: Your BlackBox AI API key (starts with `sk-`)

### 2. Create Auto-Fix Label (Optional)

1. Go to **Issues** → **Labels**
2. Click **New label**
3. Name: `auto-naming-fix`
4. Color: `#0E8A16`
5. Description: "Enable automatic naming fixes"

## 📊 Example Output

### Review Comment
```markdown
## 🟢 Naming Suggestion (92% confidence)

**Current name:** `data`
**Suggested name:** `userProfile`

**Rationale:** More descriptive name that indicates the data type

**Safety Analysis:**
- API Surface: ✅ No
- Auto-fix Safe: ✅ Yes
- Reason: Local variable with clear scope

**Alternative names:** `profileData`, `fetchedProfile`
```

### Auto-Fix Commit
```
🤖 AI Naming: Auto-fix 2 naming improvements

- data → userProfile (src/services/user.ts)
- calc → calculateDiscount (src/utils/pricing.ts)

Applied by AI Naming Reviewer
```

## 🛡️ Security

- ✅ Fork PRs: Review mode only (safe)
- ❌ Fork PRs: Auto-fix disabled (security)
- ✅ Same-repo PRs: Both modes available
- ✅ Label-gated: Auto-fix requires label

## 💰 Cost

- Typical PR: $0.02-0.05
- Uses caching to reduce costs
- Configurable token limits
- Cost tracking in outputs

## 📚 More Information

- [Full Documentation](README.md)
- [Architecture Guide](docs/design.md)
- [Examples](docs/examples.md)
- [Setup Guide](docs/SETUP.md)

---

Made with ❤️ by the AI Naming Team
