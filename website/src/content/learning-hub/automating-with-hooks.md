---
title: 'Automating with Hooks'
description: 'Learn how to use hooks to automate lifecycle events like formatting, linting, and governance checks during Copilot agent sessions.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2026-02-26'
estimatedReadingTime: '8 minutes'
tags:
  - hooks
  - automation
  - fundamentals
relatedArticles:
  - ./building-custom-agents.md
  - ./what-are-agents-skills-instructions.md
prerequisites:
  - Basic understanding of GitHub Copilot agents
---

Hooks let you run automated scripts at key moments during a Copilot agent session—when a session starts, when the user submits a prompt, or when the agent is about to commit code. They're the glue between Copilot's AI capabilities and your team's existing tooling: linters, formatters, governance scanners, and notification systems.

This article explains how hooks work, how to configure them, and practical patterns for common automation needs.

## What Are Hooks?

Hooks are shell commands or scripts that run automatically in response to lifecycle events during a Copilot agent session. They execute outside the AI model—they're deterministic, repeatable, and under your full control.

**Key characteristics**:
- Hooks run as shell commands on the user's machine
- They execute synchronously—the agent waits for them to complete
- They can block actions (e.g., prevent commits that fail linting)
- They're defined in a `hooks.json` configuration file
- They can include bundled scripts for complex logic

### When to Use Hooks vs Other Customizations

| Use Case | Best Tool |
|----------|-----------|
| Run a linter after every code change | **Hook** |
| Teach Copilot your coding standards | **Instruction** |
| Automate a multi-step workflow | **Skill** or **Agent** |
| Scan prompts for sensitive data | **Hook** |
| Format code before committing | **Hook** |
| Generate tests for new code | **Skill** |

Hooks are ideal for **deterministic automation** that must happen reliably—things you don't want to depend on the AI remembering to do.

## Anatomy of a Hook

Each hook in this repository is a folder containing:

```
hooks/
└── my-hook/
    ├── README.md          # Documentation with frontmatter
    ├── hooks.json         # Hook configuration
    └── scripts/           # Optional bundled scripts
        └── check.sh
```

### README.md

The README provides metadata and documentation:

```markdown
---
name: 'Auto Format'
description: 'Automatically formats code using project formatters before commits'
tags: ['formatting', 'code-quality']
---

# Auto Format

Runs your project's configured formatter (Prettier, Black, gofmt, etc.)
automatically before the agent commits changes.

## Setup

1. Ensure your formatter is installed and configured
2. Copy the hooks.json to your `.copilot/hooks.json`
3. Adjust the formatter command for your project
```

### hooks.json

The configuration defines which events trigger which commands:

```json
{
  "version": 1,
  "hooks": {
    "copilotAgentCommit": [
      {
        "type": "command",
        "bash": "npx prettier --write .",
        "cwd": ".",
        "timeoutSec": 30
      }
    ]
  }
}
```

## Hook Events

Hooks can trigger on several lifecycle events:

| Event | When It Fires | Common Use Cases |
|-------|---------------|------------------|
| `sessionStart` | Agent session begins | Initialize logging, check prerequisites |
| `sessionEnd` | Agent session ends | Clean up temp files, send notifications |
| `userPromptSubmitted` | User sends a message | Scan for sensitive data, log for governance |
| `copilotAgentCommit` | Agent is about to commit | Format code, run linters, validate changes |

### Event Configuration

Each hook entry supports these fields:

```json
{
  "type": "command",
  "bash": "./scripts/my-check.sh",
  "cwd": ".",
  "timeoutSec": 10,
  "env": {
    "CUSTOM_VAR": "value"
  }
}
```

**type**: Always `"command"` for shell-based hooks.

**bash**: The command or script to execute. Can be inline or reference a script file.

**cwd**: Working directory for the command. Use `"."` for the repository root.

**timeoutSec**: Maximum execution time. The hook is killed if it exceeds this limit.

**env**: Additional environment variables passed to the command.

## Practical Examples

### Auto-Format Before Commit

Ensure all code is formatted before the agent commits:

```json
{
  "version": 1,
  "hooks": {
    "copilotAgentCommit": [
      {
        "type": "command",
        "bash": "npx prettier --write . && git add -A",
        "cwd": ".",
        "timeoutSec": 30
      }
    ]
  }
}
```

### Lint Check Before Commit

Run ESLint and block the commit if there are errors:

```json
{
  "version": 1,
  "hooks": {
    "copilotAgentCommit": [
      {
        "type": "command",
        "bash": "npx eslint . --max-warnings 0",
        "cwd": ".",
        "timeoutSec": 60
      }
    ]
  }
}
```

If the lint command exits with a non-zero status, the commit is blocked.

### Governance Audit

Scan user prompts for potential security threats and log session activity:

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "command",
        "bash": ".github/hooks/governance-audit/audit-session-start.sh",
        "cwd": ".",
        "timeoutSec": 5
      }
    ],
    "userPromptSubmitted": [
      {
        "type": "command",
        "bash": ".github/hooks/governance-audit/audit-prompt.sh",
        "cwd": ".",
        "env": {
          "GOVERNANCE_LEVEL": "standard",
          "BLOCK_ON_THREAT": "false"
        },
        "timeoutSec": 10
      }
    ],
    "sessionEnd": [
      {
        "type": "command",
        "bash": ".github/hooks/governance-audit/audit-session-end.sh",
        "cwd": ".",
        "timeoutSec": 5
      }
    ]
  }
}
```

This pattern is useful for enterprise environments that need to audit AI interactions for compliance.

### Notification on Session End

Send a Slack or Teams notification when an agent session completes:

```json
{
  "version": 1,
  "hooks": {
    "sessionEnd": [
      {
        "type": "command",
        "bash": "curl -X POST \"$SLACK_WEBHOOK_URL\" -H 'Content-Type: application/json' -d '{\"text\": \"Copilot agent session completed\"}'",
        "cwd": ".",
        "env": {
          "SLACK_WEBHOOK_URL": "${input:slackWebhook}"
        },
        "timeoutSec": 5
      }
    ]
  }
}
```

## Writing Hook Scripts

For complex logic, use bundled scripts instead of inline bash commands:

```bash
#!/usr/bin/env bash
# scripts/pre-commit-check.sh
set -euo pipefail

echo "Running pre-commit checks..."

# Format code
npx prettier --write .

# Run linter
npx eslint . --fix

# Run type checker
npx tsc --noEmit

# Stage any formatting changes
git add -A

echo "Pre-commit checks passed ✅"
```

**Tips for hook scripts**:
- Use `set -euo pipefail` to fail fast on errors
- Keep scripts focused—one responsibility per script
- Make scripts executable: `chmod +x scripts/pre-commit-check.sh`
- Test scripts manually before adding them to hooks.json
- Use reasonable timeouts—formatting a large codebase may need 30+ seconds

## Best Practices

- **Keep hooks fast**: Hooks run synchronously, so slow hooks delay the agent. Set tight timeouts and optimize scripts.
- **Use non-zero exit codes to block**: If a hook exits with a non-zero code, the triggering action is blocked. Use this for must-pass checks.
- **Bundle scripts in the hook folder**: Keep related scripts alongside the hooks.json for portability.
- **Document setup requirements**: If hooks depend on tools being installed (Prettier, ESLint), document this in the README.
- **Test locally first**: Run hook scripts manually before relying on them in agent sessions.
- **Layer hooks, don't overload**: Use multiple hook entries for independent checks rather than one monolithic script.

## Common Questions

**Q: Where do I put hooks.json?**

A: Place it at `.copilot/hooks.json` in your repository root. This makes hooks available to all team members.

**Q: Can hooks access the user's prompt text?**

A: Yes, for `userPromptSubmitted` events the prompt content is available to the hook script via environment variables. See the [GitHub Copilot hooks documentation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks) for details.

**Q: What happens if a hook times out?**

A: The hook is terminated and the agent continues. Set `timeoutSec` appropriately for your scripts.

**Q: Can I have multiple hooks for the same event?**

A: Yes. Hooks for the same event run in the order they appear in the array. If any hook fails (non-zero exit), subsequent hooks for that event may be skipped.

**Q: Do hooks work with the Copilot coding agent?**

A: Yes. Hooks are especially valuable with the coding agent because they provide deterministic guardrails for autonomous operations. See [Using the Copilot Coding Agent](../learning-hub/using-copilot-coding-agent/) for details.

## Next Steps

- **Explore Examples**: Browse the [Hooks Directory](../hooks/) for ready-to-use hook configurations
- **Build Agents**: [Building Custom Agents](../learning-hub/building-custom-agents/) — Create agents that complement hooks
- **Automate Further**: [Using the Copilot Coding Agent](../learning-hub/using-copilot-coding-agent/) — Run hooks in autonomous agent sessions

---
