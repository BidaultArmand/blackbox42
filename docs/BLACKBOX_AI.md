# BlackBox AI Integration

This document explains how the AI Naming Reviewer uses BlackBox AI to power its intelligent naming suggestions.

## 🔌 What is BlackBox AI?

BlackBox AI is an AI platform that provides access to various Large Language Models (LLMs) including OpenAI's GPT models. The AI Naming Reviewer uses BlackBox AI as the backend service to analyze code and generate naming suggestions.

## 🏗️ Architecture

```
AI Naming Reviewer
       ↓
BlackBox AI API
       ↓
OpenAI Models (GPT-4o, GPT-4o-mini, etc.)
```

### How It Works

1. **Code Analysis**: The action extracts code context from PR diffs
2. **API Request**: Sends context to BlackBox AI API
3. **LLM Processing**: BlackBox AI forwards the request to OpenAI models
4. **Response**: Returns structured naming suggestions
5. **Action**: Posts comments or applies renames based on suggestions

## 🔑 API Key Setup

### Getting Your BlackBox AI API Key

1. Visit [BlackBox AI Platform](https://www.blackbox.ai)
2. Sign up or log in to your account
3. Navigate to API settings
4. Generate a new API key
5. Copy the key (starts with `sk-`)

### Adding to GitHub Repository

1. Go to your repository **Settings**
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `BLACKBOX_API_KEY`
5. Value: Your BlackBox AI API key
6. Click **Add secret**

## 💻 Usage in Code

### Environment Variable

The action expects the API key in the `BLACKBOX_API_KEY` environment variable:

```typescript
const apiKey = process.env.BLACKBOX_API_KEY;
if (!apiKey) {
  throw new Error('BLACKBOX_API_KEY environment variable is required');
}
```

### OpenAI Client Initialization

The action uses the OpenAI SDK with the BlackBox AI key:

```typescript
import OpenAI from 'openai';

// Initialize with BlackBox AI key
const openai = new OpenAI({ apiKey: config.apiKey });

// Make requests as usual
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
});
```

## 🎯 Supported Models

BlackBox AI provides access to these OpenAI models:

| Model | Input Cost | Output Cost | Best For |
|-------|-----------|-------------|----------|
| `gpt-4o-mini` | $0.15/1M | $0.60/1M | **Recommended** - Fast & cost-effective |
| `gpt-4o` | $2.50/1M | $10.00/1M | Higher quality analysis |
| `gpt-4-turbo` | $10.00/1M | $30.00/1M | Maximum capability |
| `gpt-3.5-turbo` | $0.50/1M | $1.50/1M | Budget option |

### Model Selection

Configure the model in your workflow:

```yaml
- uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
    llm-model: gpt-4o-mini  # Change model here
```

## 💰 Cost Management

### Typical Costs

- **Small PR** (1-5 files): $0.01-0.02
- **Medium PR** (5-15 files): $0.02-0.05
- **Large PR** (15+ files): $0.05-0.10

### Cost Optimization Features

1. **Caching**: Responses cached for 1 hour
2. **Smart Filtering**: Only reviews poorly-named symbols
3. **Token Limits**: Configurable max tokens per request
4. **Batch Processing**: Efficient context building

### Monitoring Costs

The action outputs estimated costs:

```yaml
- name: AI Naming Review
  id: review
  uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}

- name: Report Cost
  run: echo "Cost: \$${{ steps.review.outputs.estimated-cost }}"
```

## 🔒 Security

### API Key Protection

- ✅ Stored as GitHub secret (encrypted)
- ✅ Never logged or exposed in output
- ✅ Only accessible to workflow runs
- ✅ Can be rotated anytime

### Best Practices

1. **Never commit** API keys to repository
2. **Use repository secrets** for storage
3. **Rotate keys** periodically
4. **Monitor usage** on BlackBox AI dashboard
5. **Set spending limits** if available

## 🚨 Troubleshooting

### Invalid API Key Error

```
Error: BLACKBOX_API_KEY environment variable is required
```

**Solution**: Verify the secret is named exactly `BLACKBOX_API_KEY` in repository settings.

### Authentication Failed

```
Error: 401 Unauthorized
```

**Solutions**:
- Check API key is valid and not expired
- Verify key has sufficient credits
- Test key manually with curl:
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer YOUR_BLACKBOX_KEY"
  ```

### Rate Limiting

```
Error: 429 Too Many Requests
```

**Solutions**:
- Reduce `max-tokens` setting
- Add delays between requests
- Upgrade BlackBox AI plan
- Use caching (automatic)

### High Costs

**Solutions**:
- Use `gpt-4o-mini` instead of `gpt-4o`
- Reduce `max-tokens` to 500-800
- Lower `temperature` to 0.1-0.2
- Filter file types to review
- Monitor `estimated-cost` output

## 📊 API Request Example

### Request Format

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are a senior engineer and naming expert...'
    },
    {
      role: 'user',
      content: `
        PROJECT LANGUAGE: TypeScript
        FILE: src/auth.ts
        DECLARATION: const data = await fetchUser();
        ...
      `
    }
  ],
  temperature: 0.3,
  max_tokens: 1000,
  response_format: { type: 'json_object' }
});
```

### Response Format

```json
{
  "oldName": "data",
  "newName": "userProfile",
  "confidence": 0.92,
  "rationale": "More descriptive name that indicates the data type",
  "safety": {
    "isApiSurface": false,
    "shouldAutofix": true,
    "reason": "Local variable with clear scope"
  },
  "alternatives": ["profileData", "fetchedProfile", "userData"]
}
```

## 🔄 Migration from OpenAI

If you previously used OpenAI directly, migration is simple:

### Before (OpenAI)
```yaml
- uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### After (BlackBox AI)
```yaml
- uses: yourusername/ai-naming-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    blackbox-api-key: ${{ secrets.BLACKBOX_API_KEY }}
```

**Steps**:
1. Get BlackBox AI API key
2. Add as `BLACKBOX_API_KEY` secret
3. Update workflow file
4. Remove old `OPENAI_API_KEY` secret (optional)

## 📚 Additional Resources

- [BlackBox AI Documentation](https://www.blackbox.ai/docs)
- [OpenAI Models Guide](https://platform.openai.com/docs/models)
- [Action Usage Guide](ACTION_USAGE.md)
- [Cost Optimization Tips](../README.md#cost-optimization)

## 💬 Support

For BlackBox AI-specific issues:
- 📧 BlackBox AI Support: support@blackbox.ai
- 📖 BlackBox AI Docs: https://www.blackbox.ai/docs

For action-related issues:
- 🐛 [Report Issues](https://github.com/yourusername/ai-naming-reviewer/issues)
- 💬 [Discussions](https://github.com/yourusername/ai-naming-reviewer/discussions)

---

**Last Updated:** 2024
**Action Version:** v1.0.0
