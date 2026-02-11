# RALPH-loop: Iterative Self-Referential AI Loops

Implement self-referential feedback loops where an AI agent iteratively improves work by reading its own previous output.

> **Runnable example:** [recipe/ralph-loop.ts](recipe/ralph-loop.ts)
>
> ```bash
> cd recipe && npm install
> npx tsx ralph-loop.ts
> ```

## What is RALPH-loop?

RALPH-loop is a development methodology for iterative AI-powered task completion. Named after the Ralph Wiggum technique, it embodies the philosophy of persistent iteration:

- **One prompt, multiple iterations**: The same prompt is processed repeatedly
- **Self-referential feedback**: The AI reads its own previous work (file changes, git history)
- **Completion detection**: Loop exits when a completion promise is detected in output
- **Safety limits**: Always include a maximum iteration count to prevent infinite loops

## Example Scenario

You need to iteratively improve code until all tests pass. Instead of asking Copilot to "write perfect code," you use RALPH-loop to:

1. Send the initial prompt with clear success criteria
2. Copilot writes code and tests
3. Copilot runs tests and sees failures
4. Loop automatically re-sends the prompt
5. Copilot reads test output and previous code, fixes issues
6. Repeat until all tests pass and completion promise is output

## Basic Implementation

```typescript
import { CopilotClient } from "@github/copilot-sdk";

class RalphLoop {
    private client: CopilotClient;
    private iteration: number = 0;
    private maxIterations: number;
    private completionPromise: string;
    private lastResponse: string | null = null;

    constructor(maxIterations: number = 10, completionPromise: string = "COMPLETE") {
        this.client = new CopilotClient();
        this.maxIterations = maxIterations;
        this.completionPromise = completionPromise;
    }

    async run(initialPrompt: string): Promise<string> {
        await this.client.start();
        const session = await this.client.createSession({ model: "gpt-5.1-codex-mini" });

        try {
            while (this.iteration < this.maxIterations) {
                this.iteration++;
                console.log(`\n--- Iteration ${this.iteration}/${this.maxIterations} ---`);

                // Build prompt including previous response as context
                const prompt = this.iteration === 1
                    ? initialPrompt
                    : `${initialPrompt}\n\nPrevious attempt:\n${this.lastResponse}\n\nContinue improving...`;

                const response = await session.sendAndWait({ prompt });
                this.lastResponse = response?.data.content || "";

                console.log(`Response (${this.lastResponse.length} chars)`);

                // Check for completion promise
                if (this.lastResponse.includes(this.completionPromise)) {
                    console.log(`✓ Completion promise detected: ${this.completionPromise}`);
                    return this.lastResponse;
                }

                console.log(`Continuing to iteration ${this.iteration + 1}...`);
            }

            throw new Error(
                `Max iterations (${this.maxIterations}) reached without completion promise`
            );
        } finally {
            await session.destroy();
            await this.client.stop();
        }
    }
}

// Usage
const loop = new RalphLoop(5, "COMPLETE");
const result = await loop.run("Your task here");
console.log(result);
```

## With File Persistence

For tasks involving code generation, persist state to files so the AI can see changes:

```typescript
import fs from "fs/promises";
import path from "path";
import { CopilotClient } from "@github/copilot-sdk";

class PersistentRalphLoop {
    private client: CopilotClient;
    private workDir: string;
    private iteration: number = 0;
    private maxIterations: number;

    constructor(workDir: string, maxIterations: number = 10) {
        this.client = new CopilotClient();
        this.workDir = workDir;
        this.maxIterations = maxIterations;
    }

    async run(initialPrompt: string): Promise<string> {
        await fs.mkdir(this.workDir, { recursive: true });
        await this.client.start();
        const session = await this.client.createSession({ model: "gpt-5.1-codex-mini" });

        try {
            // Store initial prompt
            await fs.writeFile(path.join(this.workDir, "prompt.md"), initialPrompt);

            while (this.iteration < this.maxIterations) {
                this.iteration++;
                console.log(`\n--- Iteration ${this.iteration} ---`);

                // Build context from previous outputs
                let context = initialPrompt;
                const prevOutputFile = path.join(this.workDir, `output-${this.iteration - 1}.txt`);
                try {
                    const prevOutput = await fs.readFile(prevOutputFile, "utf-8");
                    context += `\n\nPrevious iteration:\n${prevOutput}`;
                } catch {
                    // No previous output yet
                }

                const response = await session.sendAndWait({ prompt: context });
                const output = response?.data.content || "";

                // Persist output
                await fs.writeFile(
                    path.join(this.workDir, `output-${this.iteration}.txt`),
                    output
                );

                if (output.includes("COMPLETE")) {
                    return output;
                }
            }

            throw new Error("Max iterations reached");
        } finally {
            await session.destroy();
            await this.client.stop();
        }
    }
}
```

## Best Practices

1. **Write clear completion criteria**: Include exactly what "done" looks like
2. **Use output markers**: Include `<promise>COMPLETE</promise>` or similar in completion condition
3. **Always set max iterations**: Prevents infinite loops on impossible tasks
4. **Persist state**: Save files so AI can see what changed between iterations
5. **Include context**: Feed previous iteration output back as context
6. **Monitor progress**: Log each iteration to track what's happening

## Example: Iterative Code Generation

```typescript
const prompt = `Write a function that:
1. Parses CSV data
2. Validates required fields
3. Returns parsed records or error
4. Has unit tests
5. Output <promise>COMPLETE</promise> when done`;

const loop = new RalphLoop(10, "COMPLETE");
const result = await loop.run(prompt);
```

## Handling Failures

```typescript
try {
    const result = await loop.run(prompt);
    console.log("Task completed successfully!");
} catch (error) {
    console.error("Task failed:", error.message);
    // Analyze what was attempted and suggest alternatives
}
```

## When to Use RALPH-loop

**Good for:**
- Code generation with automatic verification (tests, linters)
- Tasks with clear success criteria
- Iterative refinement where each attempt learns from previous failures
- Unattended long-running improvements

**Not good for:**
- Tasks requiring human judgment or design input
- One-shot operations
- Tasks with vague success criteria
- Real-time interactive debugging
