---
title: 'Using the Copilot Coding Agent'
description: 'Learn how to use GitHub Copilot coding agent to autonomously work on issues, generate pull requests, and automate development tasks.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2026-02-26'
estimatedReadingTime: '9 minutes'
tags:
  - coding-agent
  - automation
  - agentic
relatedArticles:
  - ./building-custom-agents.md
  - ./automating-with-hooks.md
prerequisites:
  - Understanding of GitHub Copilot agents
  - Repository with GitHub Copilot enabled
---

The Copilot coding agent is an autonomous agent that can work on GitHub issues without continuous human guidance. You assign it an issue, it spins up a cloud environment, writes code, runs tests, and opens a pull request—all while you focus on other work. Think of it as a junior developer who never sleeps, handles the well-defined tasks, and always asks for review.

This article explains how the coding agent works, how to set it up, and best practices for getting the most out of autonomous coding sessions.

## How It Works

The coding agent follows a straightforward workflow:

```
1. You assign an issue to Copilot (or @mention it)
         ↓
2. Copilot spins up a cloud dev environment
         ↓
3. It reads the issue, your instructions, and codebase
         ↓
4. It plans and implements a solution
         ↓
5. It runs tests and validates the changes
         ↓
6. It opens a pull request for your review
```

The agent works in its own branch, in an isolated environment. It can't merge code or deploy—it always produces a PR that a human must review and approve.

**Key characteristics**:
- Runs in a secure, sandboxed cloud environment
- Uses your repository's instructions, agents, and skills for context
- Executes hooks (linting, formatting) automatically
- Creates a PR with a summary of what it did and why
- Supports iterating—you can comment on the PR and the agent will refine

## Setting Up the Environment

The coding agent needs to know how to set up your project. Define this in `.github/copilot-setup-steps.yml`:

```yaml
# .github/copilot-setup-steps.yml
steps:
  - name: Install dependencies
    run: npm ci

  - name: Build the project
    run: npm run build

  - name: Verify tests pass
    run: npm test
```

### What to Include

Think of this file as bootstrapping instructions for a new developer joining the project:

**Language runtimes**: If your project needs a specific Node.js, Python, or Go version, install it here.

**Dependencies**: Install all project dependencies (`npm ci`, `pip install -r requirements.txt`, `bundle install`).

**Build step**: Compile the project if needed, so the agent can verify its changes build successfully.

**Test command**: Run the test suite so the agent can validate its changes don't break existing functionality.

**Example for a Python project**:
```yaml
steps:
  - name: Set up Python
    uses: actions/setup-python@v5
    with:
      python-version: '3.12'

  - name: Install dependencies
    run: pip install -r requirements.txt

  - name: Run tests
    run: pytest
```

**Example for a multi-language project**:
```yaml
steps:
  - name: Install Node.js dependencies
    run: npm ci

  - name: Install Python dependencies
    run: pip install -r requirements.txt

  - name: Build frontend
    run: npm run build

  - name: Run all tests
    run: npm test && pytest
```

## Assigning Work to the Coding Agent

There are several ways to trigger the coding agent:

### From a GitHub Issue

1. Create a well-described issue with clear acceptance criteria
2. Assign the issue to **Copilot** (it appears as an assignee option)
3. The agent starts working within minutes

### From a Comment

On any issue, comment:
```
@copilot work on this
```

Or provide more specific direction:
```
@copilot implement the user avatar upload feature described above.
Use the existing FileUpload component and S3 service.
```

### Specifying an Agent

You can direct the coding agent to use a specific custom agent:

```
@copilot use the terraform-expert agent to implement this infrastructure change
```

The agent will adopt the persona, tools, and guardrails defined in that agent file.

## Writing Effective Issues for the Coding Agent

The coding agent is only as good as the issue it receives. Well-structured issues lead to better results.

### Good Issue Structure

```markdown
## Summary
Add a rate limiter to the /api/login endpoint to prevent brute force attacks.

## Requirements
- Limit to 5 attempts per IP address per 15-minute window
- Return HTTP 429 with a Retry-After header when limit is exceeded
- Use the existing Redis cache for rate tracking
- Log rate limit violations to our security audit log

## Acceptance Criteria
- [ ] Rate limiter middleware is applied to POST /api/login
- [ ] Tests cover: normal login, rate limit hit, rate limit reset
- [ ] Existing login tests continue to pass

## Context
- Rate limiter utility exists at src/middleware/rate-limiter.ts
- Redis client is configured in src/config/redis.ts
- Security audit logger is at src/utils/security-logger.ts
```

### Tips for Better Results

- **Be specific**: "Add input validation" is vague. "Validate email format and password length (8+ chars) on the registration endpoint" is actionable.
- **Point to existing code**: Reference files, utilities, and patterns the agent should use.
- **Define done**: List acceptance criteria or test cases that verify the work is complete.
- **Scope appropriately**: Single-feature issues work best. Break large features into smaller issues.
- **Include constraints**: If there are things the agent should NOT do ("don't modify the database schema"), say so explicitly.

## Working with the Pull Request

When the coding agent finishes, it opens a PR with:

- A description of changes and the reasoning behind them
- File-by-file summaries of what changed
- References back to the original issue

### Reviewing the PR

Review coding agent PRs like any other:

1. **Read the summary**: Understand what the agent did and why
2. **Check the diff**: Verify the implementation matches your expectations
3. **Run tests locally**: Confirm tests pass in your environment
4. **Leave comments**: If something needs to change, comment on the PR

### Iterating with Comments

If the PR needs adjustments, comment directly:

```
@copilot the rate limiter should use a sliding window, not a fixed window.
Also, add a test for the Retry-After header value.
```

The agent will read your feedback, make changes, and push new commits to the same PR.

## Hooks and the Coding Agent

Hooks are especially valuable with the coding agent because they provide deterministic guardrails for autonomous work:

- **`copilotAgentCommit`**: Format code, run linters, and validate changes before every commit the agent makes
- **`sessionStart`**: Log the start of autonomous sessions for governance
- **`sessionEnd`**: Send notifications when the agent finishes

See [Automating with Hooks](../learning-hub/automating-with-hooks/) for configuration details.

## Best Practices

### Setting Up for Success

- **Invest in `copilot-setup-steps.yml`**: A reliable setup means the agent can build and test confidently. If tests are flaky, the agent will struggle.
- **Add comprehensive instructions**: The agent reads your `.github/instructions/` files. The more context you provide about patterns and conventions, the better the output.
- **Define hooks for formatting**: Hooks ensure the agent's code meets your style requirements automatically, reducing review friction.

### Choosing the Right Tasks

The coding agent excels at:
- ✅ Well-defined feature implementations with clear acceptance criteria
- ✅ Bug fixes with reproducible steps
- ✅ Adding tests to existing code
- ✅ Refactoring with specific goals (extract function, rename, etc.)
- ✅ Documentation updates based on code changes

It's less suited for:
- ❌ Ambiguous design decisions that need team discussion
- ❌ Large architectural changes spanning many files
- ❌ Tasks requiring access to external systems not in the dev environment
- ❌ Performance optimization without clear metrics

### Security Considerations

- The coding agent works in an isolated environment—it can't access your local machine
- It can only modify code in its branch—it can't push to main or deploy
- All changes go through PR review before merging
- Use hooks to enforce security scanning on every commit
- Scope repository permissions appropriately

## Common Questions

**Q: How long does the coding agent take?**

A: Typically 5–30 minutes depending on the complexity of the task and the size of the codebase. You'll receive a notification when the PR is ready.

**Q: Can I use the coding agent with private repositories?**

A: Yes. The coding agent works with both public and private repositories where GitHub Copilot is enabled.

**Q: What if the agent gets stuck?**

A: The agent has built-in timeouts. If it can't make progress, it will open a PR with what it has and explain what it couldn't resolve. You can then comment with guidance or take over manually.

**Q: Can I assign multiple issues at once?**

A: Yes. The coding agent can work on multiple issues in parallel, each in its own branch. Use Mission Control on GitHub.com to track all active agent sessions.

**Q: Does the coding agent use my custom agents?**

A: Yes. You can specify which agent to use when assigning work. The coding agent adopts that agent's persona, tools, and guardrails for the session.

## Next Steps

- **Set Up Your Environment**: Create `.github/copilot-setup-steps.yml` for your project
- **Add Guardrails**: [Automating with Hooks](../learning-hub/automating-with-hooks/) — Ensure code quality in autonomous sessions
- **Build Custom Agents**: [Building Custom Agents](../learning-hub/building-custom-agents/) — Create specialized agents for the coding agent to use
- **Explore Configuration**: [Copilot Configuration Basics](../learning-hub/copilot-configuration-basics/) — Set up repository-level customizations

---
