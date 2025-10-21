/**
 * LLM prompt templates for naming suggestions
 */

import { NamingContext, LanguageType } from '../types/index.js';

/**
 * System prompt for the naming expert
 */
export const SYSTEM_PROMPT = `You are a senior software engineer and naming expert with deep knowledge of code readability, maintainability, and language-specific conventions.

Your task is to analyze code identifiers (variables, functions, classes) and suggest more expressive, clear names that:
1. Accurately describe the purpose and behavior
2. Follow language-specific naming conventions
3. Improve code readability and maintainability
4. Avoid ambiguity and generic terms

You must respond ONLY with valid JSON matching this exact schema:
{
  "oldName": string,
  "newName": string,
  "confidence": number (0.0 to 1.0),
  "rationale": string,
  "safety": {
    "isApiSurface": boolean,
    "shouldAutofix": boolean,
    "reason": string
  },
  "alternatives": string[]
}

Guidelines:
- confidence: 0.8+ for clear improvements, 0.5-0.8 for moderate, <0.5 for uncertain
- isApiSurface: true if the symbol is exported or part of public API
- shouldAutofix: true only if confidence > 0.85 AND not API surface AND local scope
- alternatives: provide 2-3 alternative names
- If the current name is already good, set confidence < 0.5 and explain why`;

/**
 * Language-specific naming conventions
 */
const LANGUAGE_CONVENTIONS: Record<LanguageType, string> = {
  typescript: `TypeScript conventions:
- Variables/functions: camelCase (e.g., getUserData, isValid)
- Classes/Interfaces: PascalCase (e.g., UserService, DataProvider)
- Constants: SCREAMING_SNAKE_CASE (e.g., MAX_RETRIES)
- Private members: prefix with _ or use private keyword
- Boolean variables: use is/has/should prefix (e.g., isActive, hasPermission)
- Async functions: consider async prefix or suffix (e.g., fetchUserAsync)`,

  javascript: `JavaScript conventions:
- Variables/functions: camelCase (e.g., getUserData, isValid)
- Classes: PascalCase (e.g., UserService, DataProvider)
- Constants: SCREAMING_SNAKE_CASE (e.g., MAX_RETRIES)
- Boolean variables: use is/has/should prefix (e.g., isActive, hasPermission)
- Callback functions: descriptive names (e.g., handleClick, onUserLogin)`,

  python: `Python conventions (PEP 8):
- Variables/functions: snake_case (e.g., get_user_data, is_valid)
- Classes: PascalCase (e.g., UserService, DataProvider)
- Constants: SCREAMING_SNAKE_CASE (e.g., MAX_RETRIES)
- Private members: prefix with _ (e.g., _internal_method)
- Boolean variables: use is/has/should prefix (e.g., is_active, has_permission)
- Avoid single letter names except for iterators (i, j, k)`,

  go: `Go conventions:
- Variables/functions: camelCase or mixedCaps (e.g., getUserData, isValid)
- Exported symbols: PascalCase (e.g., UserService, DataProvider)
- Unexported: lowercase start (e.g., internalHelper)
- Acronyms: all caps (e.g., HTTPServer, URLParser)
- Interface names: often end with -er (e.g., Reader, Writer)
- Short variable names acceptable in small scopes (e.g., i, err, ok)`,
};

/**
 * Build user prompt from naming context
 */
export function buildUserPrompt(context: NamingContext): string {
  const conventions = LANGUAGE_CONVENTIONS[context.language];

  return `PROJECT LANGUAGE: ${context.language}
FILE: ${context.file}
PR TITLE: ${context.prTitle}
${context.prBody ? `PR DESCRIPTION: ${context.prBody.substring(0, 200)}` : ''}

${conventions}

SYMBOL TO REVIEW: ${context.oldName}

DECLARATION:
\`\`\`${context.language}
${context.declaration}
\`\`\`

${context.usages.length > 0 ? `USAGE EXAMPLES:
${context.usages.slice(0, 3).map((usage, i) => `${i + 1}. \`${usage}\``).join('\n')}` : ''}

${context.neighbors.length > 0 ? `NEIGHBORING SYMBOLS: ${context.neighbors.slice(0, 5).join(', ')}` : ''}

${context.enclosingScopes.length > 0 ? `ENCLOSING SCOPES: ${context.enclosingScopes.join(' > ')}` : ''}

${Object.keys(context.types).length > 0 ? `TYPE INFORMATION:
${Object.entries(context.types).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : ''}

Analyze this symbol and suggest a better name if needed. Consider:
1. Does the name clearly convey the purpose?
2. Does it follow ${context.language} conventions?
3. Is it specific enough (avoid generic terms like 'data', 'info', 'temp')?
4. Does it match the PR's intent?

Respond with JSON only.`;
}

/**
 * Few-shot examples for better results
 */
export const FEW_SHOT_EXAMPLES = [
  {
    context: {
      language: 'typescript',
      oldName: 'data',
      declaration: 'const data = await fetchUserProfile(userId);',
      prTitle: 'Add user profile caching',
    },
    response: {
      oldName: 'data',
      newName: 'userProfile',
      confidence: 0.95,
      rationale: 'The variable holds a user profile, not generic data. "userProfile" is more descriptive and follows TypeScript camelCase convention.',
      safety: {
        isApiSurface: false,
        shouldAutofix: true,
        reason: 'Local variable with clear scope and high confidence',
      },
      alternatives: ['profileData', 'fetchedProfile'],
    },
  },
  {
    context: {
      language: 'python',
      oldName: 'calc',
      declaration: 'def calc(x, y):',
      prTitle: 'Add discount calculation',
    },
    response: {
      oldName: 'calc',
      newName: 'calculate_discount',
      confidence: 0.92,
      rationale: 'Function name should be descriptive and follow Python snake_case. "calculate_discount" clearly indicates the purpose based on PR context.',
      safety: {
        isApiSurface: true,
        shouldAutofix: false,
        reason: 'Function appears to be part of public API, requires manual review',
      },
      alternatives: ['compute_discount', 'get_discount_amount'],
    },
  },
];

/**
 * Format few-shot examples for inclusion in prompt
 */
export function formatFewShotExamples(): string {
  return FEW_SHOT_EXAMPLES.map((example, i) => {
    return `Example ${i + 1}:
Context: ${example.context.language} - "${example.context.oldName}" in "${example.context.prTitle}"
Response: ${JSON.stringify(example.response, null, 2)}`;
  }).join('\n\n');
}
