---
title: 'What are Agents, Prompts, and Instructions'
description: 'Understand the primary customization primitives that extend GitHub Copilot for specific workflows.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2025-11-25'
estimatedReadingTime: '7 minutes'
---

Building great experiences with GitHub Copilot starts with understanding the core primitives that shape how Copilot behaves in different contexts. This article clarifies what each artifact does, how it is packaged inside this repository, and when to use it.

## Agents

Agents are configuration files (`*.agent.md`) that describe:

- The tasks they specialize in (for example, "Terraform Expert" or "LaunchDarkly Flag Manager").
- Which tools or MCP servers they can invoke.
- Optional instructions that guide the conversation style or guardrails.

When you assign an issue to Copilot or open the **Agents** panel in VS Code, these configurations let you swap in a specialized assistant. Each agent in this repo lives under `agents/` and includes metadata about the tools it depends on.

### When to reach for an agent

- You have a recurring workflow that benefits from deep tooling integrations.
- You want Copilot to proactively execute commands or fetch context via MCP.
- You need persona-level guardrails that persist throughout a coding session.

## Prompts

Prompts (`*.prompt.md`) capture reusable chat macros. They define:

- A short name (used as `/command` in VS Code Chat).
- Optional mode and model hints (for example, `plan` vs `code` or `gpt-4.1-mini`).
- Recommended tools to enable before running the prompt.
- The actual message template Copilot should execute.

Prompts shine when you want consistency across teammates—think "Create release notes" or "Audit accessibility". Store them in `prompts/` and trigger them directly from VS Code.

### When to reach for a prompt

- You want to standardize how Copilot responds to a task.
- You prefer to drive the conversation, but with guardrails.
- You do not need Copilot to maintain long-lived state beyond a single invocation.

## Instructions

Instructions (`*.instructions.md`) provide background context that Copilot reads whenever it works on matching files. They often contain:

- Coding standards or style guides (naming conventions, testing strategy).
- Framework-specific hints (Angular best practices, .NET analyzers to suppress).
- Repository-specific rules ("never commit secrets", "feature flags must live in `flags/`").

Instructions sit under `instructions/` and can be scoped globally, per language, or per directory using glob patterns. They help Copilot align with your engineering playbook automatically.

### When to reach for instructions

- You need persistent guidance that applies across many sessions.
- You are codifying architecture decisions or compliance requirements.
- You want Copilot to understand patterns without manually pasting context.

## How the artifacts work together

Think of these artifacts as complementary layers:

1. **Instructions** lay the groundwork with long-lived guardrails.
2. **Prompts** let you trigger quick workflows or templates on demand.
3. **Agents** bring the most opinionated behavior, bundling tools and instructions into a single persona.

By combining all three, teams can achieve:

- Consistent onboarding for new developers.
- Repeatable operations tasks with reduced context switching.
- Tailored experiences for specialized domains (security, infrastructure, data science, etc.).

## Next steps

- Explore the rest of the **Fundamentals** track for deeper dives on chat modes, collections, and MCP servers.
- Browse the [Awesome Agents](../agents/), [Prompts](../prompts/), and [Instructions](../instructions/) directories for inspiration.
- Try generating your own artifacts, then add them to the repo to keep the Learning Hub evolving.

---
