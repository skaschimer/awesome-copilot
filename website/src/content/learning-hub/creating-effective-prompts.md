---
title: 'Creating Effective Prompts'
description: 'Master the art of writing reusable, shareable prompt templates that deliver consistent results across your team.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2025-12-02'
estimatedReadingTime: '9 minutes'
tags:
  - prompts
  - customization
  - fundamentals
relatedArticles:
  - ./what-are-agents-prompts-instructions.md
  - ./defining-custom-instructions.md
  - ./building-custom-agents.md
prerequisites:
  - Basic understanding of GitHub Copilot chat
---

Prompts are reusable templates that package specific tasks into shareable chat commands. They enable teams to standardize common workflows tasks like generating tests, reviewing code, or creating documentation, ensuring consistent, high-quality results across all team members.

This article shows you how to design, structure, and optimize prompts that solve real development challenges.

## What Are Prompts?

Prompts (`*.prompt.md`) are markdown files that define:

- **Command name**: How users invoke the prompt (e.g., `/code-review`)
- **Task description**: What the prompt accomplishes
- **Execution mode**: Whether it acts as an agent or simple ask
- **Tool requirements**: Which Copilot capabilities it needs (codebase search, terminal, etc.)
- **Message template**: The actual instructions Copilot executes

**Key Points**:
- Prompts require explicit invocation (unlike instructions which apply automatically)
- They capture proven workflows as reusable templates
- They can accept user input variables for customization
- They work across different codebases without modification

### How Prompts Differ from Other Customizations

**Prompts vs Instructions**:
- Prompts are invoked explicitly; instructions apply automatically
- Prompts drive specific tasks; instructions provide ongoing context
- Use prompts for workflows you trigger on demand; use instructions for standards that always apply

**Prompts vs Agents**:
- Prompts are task-focused templates; agents are specialized personas
- Prompts work with standard Copilot tools; agents may require MCP servers or custom integrations
- Use prompts for repeatable tasks; use agents for complex multi-step workflows

## Anatomy of a Prompt

Every effective prompt has three parts: frontmatter configuration, task description, and execution instructions.

**Example - Simple Prompt**:

```markdown
---
description: 'Generate unit tests for the selected code'
tools: ['codebase']
---

Generate comprehensive unit tests for the selected code.

Requirements:
- Cover happy path, edge cases, and error conditions
- Use the testing framework already present in the codebase
- Follow existing test file naming conventions
- Include descriptive test names explaining what is being tested
- Add assertions for all expected behaviors
```

**Why This Works**:
- Clear description tells users what the prompt does
- `tools` array specifies codebase access is needed
- Requirements provide specific, actionable guidance
- Template is generic enough to work across different projects

## Frontmatter Configuration

The YAML frontmatter controls how Copilot executes your prompt.

### Essential Fields

**agent**: Execution mode for the prompt
```yaml
agent: 'agent'  # Full agent capabilities with tools
# OR
agent: 'ask'    # Simple question/answer without tool execution
# OR
agent: 'My Custom Agent'  # Use a specific custom agent
```

**description**: Brief summary of what the prompt does
```yaml
description: 'Generate conventional commit messages from staged changes'
```

**tools**: Array of capabilities the prompt needs
```yaml
tools: ['codebase', 'runCommands', 'edit']
```

**model**: Preferred AI model (optional but recommended)
```yaml
model: Claude Sonnet 4
```

### Common Tool Combinations

**Code Generation**:
```yaml
tools: ['codebase', 'edit', 'search']
```

**Testing**:
```yaml
tools: ['codebase', 'runCommands', 'testFailure']
```

**Git Operations**:
```yaml
tools: ['runCommands/runInTerminal', 'changes']
```

**Documentation**:
```yaml
tools: ['codebase', 'search', 'edit', 'fetch']
```

**Code Review**:
```yaml
tools: ['changes', 'codebase', 'problems', 'search']
```

## Real Examples from the Repository

The awesome-copilot-hub repository includes over 110 prompt files demonstrating production patterns.

### Conventional Commits

See [conventional-commit.prompt.md](https://github.com/github/awesome-copilot/blob/main/prompts/conventional-commit.prompt.md) for automating commit messages:

```markdown
---
description: 'Generate conventional commit messages from staged changes'
tools: ['runCommands/runInTerminal', 'runCommands/getTerminalOutput']
---

### Workflow

Follow these steps:

1. Run `git status` to review changed files
2. Run `git diff --cached` to inspect changes
3. Construct commit message using Conventional Commits format
4. Execute commit command automatically

### Commit Message Structure

<type>(scope): description

Types: feat|fix|docs|style|refactor|perf|test|build|ci|chore

### Examples

- feat(parser): add ability to parse arrays
- fix(ui): correct button alignment
- docs: update README with usage instructions
```

This prompt automates a repetitive task (writing commit messages) with a proven template.

### Specification Creation

See [create-specification.prompt.md](https://github.com/github/awesome-copilot/blob/main/prompts/create-specification.prompt.md) for structured documentation:

```markdown
---
mode: 'agent'
description: 'Create a new specification file optimized for AI consumption'
tools: ['codebase', 'search', 'edit', 'fetch']
---

Your goal is to create a specification file for ${input:SpecPurpose}.

The specification must:
- Use precise, unambiguous language
- Follow structured formatting for easy parsing
- Define all acronyms and domain terms
- Include examples and edge cases
- Be self-contained without external dependencies

Save in /spec/ directory as: spec-[purpose].md
```

This prompt uses a variable (`${input:SpecPurpose}`) to customize each invocation.

### Code Review Automation

See [review-and-refactor.prompt.md](https://github.com/github/awesome-copilot/blob/main/prompts/review-and-refactor.prompt.md) for systematic code analysis:

```markdown
---
mode: 'agent'
description: 'Comprehensive code review and refactoring suggestions'
tools: ['changes', 'codebase', 'problems', 'search']
model: Claude Sonnet 4
---

Review the current changes or selected code for:

1. **Code Quality**: Readability, maintainability, complexity
2. **Best Practices**: Language idioms, framework patterns
3. **Performance**: Algorithm efficiency, resource usage
4. **Security**: Input validation, authentication, sensitive data
5. **Testing**: Test coverage, edge cases, error handling

Provide specific refactoring suggestions with code examples.
```

This prompt combines multiple analysis dimensions into a single repeatable workflow.

## Writing Effective Prompt Templates

### Structure Your Prompts

**1. Start with clear objectives**:
```markdown
Your goal is to [specific task] for [specific target].
```

**2. Define requirements explicitly**:
```markdown
Requirements:
- Must follow [standard/pattern]
- Should include [specific element]
- Avoid [anti-pattern]
```

**3. Provide examples**:
```markdown
### Good Example
[Show desired output]

### What to Avoid
[Show problematic patterns]
```

**4. Specify output format**:
```markdown
Output format:
- File location: [path pattern]
- Naming convention: [format]
- Structure: [expected sections]
```

### Use Variables for Customization

Prompts can accept user input through variables:

**Simple variable**:
```markdown
Generate a ${input:ComponentType} component named ${input:ComponentName}.
```

**Variable with context**:
```markdown
Create tests for ${selection} using the ${input:TestFramework} framework.
```

**Referencing files**:
```markdown
Update the documentation in ${file:README.md} based on changes in ${selection}.
```

## Best Practices

- **One purpose per prompt**: Focus on a single task or workflow
- **Make it generic**: Write prompts that work across different projects
- **Be explicit**: Avoid ambiguous language; specify exact requirements
- **Include context**: Reference patterns, standards, or examples from the codebase
- **Name descriptively**: Use clear, action-oriented names: `generate-tests.prompt.md`, not `helper.prompt.md`
- **Test thoroughly**: Verify prompts work with different inputs and codebases
- **Document tools needed**: Specify all required Copilot capabilities
- **Version your prompts**: Update lastUpdated when making changes

### Writing Style Guidelines

**Use imperative mood**:
- ✅ "Generate unit tests for the selected function"
- ❌ "You should generate some tests"

**Be specific about requirements**:
- ✅ "Use Jest with React Testing Library"
- ❌ "Use whatever testing framework"

**Provide guardrails**:
- ✅ "Do not modify existing test files; create new ones"
- ❌ "Update tests as needed"

**Structure complex prompts**:
```markdown
## Step 1: Analysis
[Analyze requirements]

## Step 2: Generation
[Generate code]

## Step 3: Validation
[Check output]
```

## Common Patterns

### Agent Mode with Multi-Step Workflow

```markdown
---
mode: 'agent'
description: 'Scaffold new feature with tests and documentation'
tools: ['codebase', 'edit', 'search']
---

Create a complete feature implementation:

1. **Analyze**: Review existing patterns in codebase
2. **Generate**: Create implementation files following project structure
3. **Test**: Generate comprehensive test coverage
4. **Document**: Add inline comments and update relevant docs
5. **Validate**: Check for common issues and anti-patterns

Use the existing code style and conventions found in the codebase.
```

### Ask Mode for Quick Questions

```markdown
---
mode: 'ask'
description: 'Explain code architecture and design patterns'
---

Analyze the selected code and explain:

1. Overall architecture and design patterns used
2. Key components and their responsibilities
3. Data flow and dependencies
4. Potential improvements or concerns

Keep explanations concise and developer-focused.
```

### Terminal Automation

```markdown
---
description: 'Run test suite and report failures'
tools: ['runCommands/runInTerminal', 'testFailure']
---

Execute the project's test suite:

1. Identify the test command from package.json or build files
2. Run tests in the integrated terminal
3. Parse test output for failures
4. Summarize failed tests with relevant file locations
5. Suggest potential fixes based on error messages
```

## Common Questions

**Q: How do I invoke a prompt?**

A: In VS Code, open Copilot Chat and type the filename without extension. For example, `/code-review` invokes `code-review.prompt.md`. Alternatively, use the Copilot prompt picker UI.

**Q: Can prompts modify multiple files?**

A: Yes, if the prompt uses `agent: 'agent'` and includes the `edit` tool. The prompt can analyze, generate, and apply changes across multiple files.

**Q: How do I share prompts with my team?**

A: Store prompts in your repository's `.github/prompts/` directory. They're automatically available to all team members with Copilot access when working in that repository.

**Q: Can I chain multiple prompts together?**

A: Not directly, but you can create a comprehensive prompt that incorporates multiple steps. For complex workflows spanning many operations, consider creating a custom agent instead.

**Q: Should prompts include code examples?**

A: Yes, for clarity. Show examples of desired output format, patterns to follow, or anti-patterns to avoid. Keep examples focused and relevant.

## Common Pitfalls to Avoid

- ❌ **Too generic**: "Review this code" doesn't provide enough guidance  
  ✅ **Instead**: Specify what to review: quality, security, performance, style

- ❌ **Too specific**: Hardcoding file paths, names, or project-specific details  
  ✅ **Instead**: Use variables and pattern matching: `${input:FileName}`, `${selection}`

- ❌ **Missing tools**: Prompt needs codebase access but doesn't declare it  
  ✅ **Instead**: Explicitly list all required tools in frontmatter

- ❌ **Ambiguous language**: "Fix issues if you find any"  
  ✅ **Instead**: "Identify code smells and suggest specific refactorings with examples"

- ❌ **No examples**: Abstract requirements without concrete guidance  
  ✅ **Instead**: Include "Good Example" and "What to Avoid" sections

## Next Steps

Now that you understand effective prompts, you can:

- **Explore Repository Examples**: Browse [Prompts Directory](../prompts/) - Over 110 production prompts for diverse workflows
- **Learn About Agents**: Building Custom Agents _(coming soon)_ - When to upgrade from prompts to full agents
- **Understand Instructions**: [Defining Custom Instructions](../learning-hub/defining-custom-instructions/) - Complement prompts with automatic context
- **Decision Framework**: Choosing the Right Customization _(coming soon)_ - When to use prompts vs other types

**Suggested Reading Order**:
1. This article (creating effective prompts)
2. Building Custom Agents _(coming soon)_ - More sophisticated workflows
3. Choosing the Right Customization _(coming soon)_ - Decision guidance

---
