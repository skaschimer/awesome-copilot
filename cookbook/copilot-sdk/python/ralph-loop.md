# RALPH-loop: Iterative Self-Referential AI Loops

Implement self-referential feedback loops where an AI agent iteratively improves work by reading its own previous output.

> **Runnable example:** [recipe/ralph_loop.py](recipe/ralph_loop.py)
>
> ```bash
> cd recipe && pip install -r requirements.txt
> python ralph_loop.py
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

```python
import asyncio
from copilot import CopilotClient, MessageOptions, SessionConfig

class RalphLoop:
    """Iterative self-referential feedback loop using Copilot."""
    
    def __init__(self, max_iterations=10, completion_promise="COMPLETE"):
        self.client = CopilotClient()
        self.iteration = 0
        self.max_iterations = max_iterations
        self.completion_promise = completion_promise
        self.last_response = None

    async def run(self, initial_prompt):
        """Run the RALPH-loop until completion promise detected or max iterations reached."""
        await self.client.start()
        session = await self.client.create_session(
            SessionConfig(model="gpt-5.1-codex-mini")
        )

        try:
            while self.iteration < self.max_iterations:
                self.iteration += 1
                print(f"\n--- Iteration {self.iteration}/{self.max_iterations} ---")

                # Build prompt including previous response as context
                if self.iteration == 1:
                    prompt = initial_prompt
                else:
                    prompt = f"{initial_prompt}\n\nPrevious attempt:\n{self.last_response}\n\nContinue improving..."

                result = await session.send_and_wait(
                    MessageOptions(prompt=prompt), timeout=300
                )

                self.last_response = result.data.content if result else ""
                print(f"Response ({len(self.last_response)} chars)")

                # Check for completion promise
                if self.completion_promise in self.last_response:
                    print(f"✓ Completion promise detected: {self.completion_promise}")
                    return self.last_response

                print(f"Continuing to iteration {self.iteration + 1}...")

            raise RuntimeError(
                f"Max iterations ({self.max_iterations}) reached without completion promise"
            )
        finally:
            await session.destroy()
            await self.client.stop()

# Usage
async def main():
    loop = RalphLoop(5, "COMPLETE")
    result = await loop.run("Your task here")
    print(result)

asyncio.run(main())
```

## With File Persistence

For tasks involving code generation, persist state to files so the AI can see changes:

```python
import asyncio
from pathlib import Path
from copilot import CopilotClient, MessageOptions, SessionConfig

class PersistentRalphLoop:
    """RALPH-loop with file-based state persistence."""
    
    def __init__(self, work_dir, max_iterations=10):
        self.client = CopilotClient()
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.iteration = 0
        self.max_iterations = max_iterations

    async def run(self, initial_prompt):
        """Run the loop with persistent state."""
        await self.client.start()
        session = await self.client.create_session(
            SessionConfig(model="gpt-5.1-codex-mini")
        )

        try:
            # Store initial prompt
            (self.work_dir / "prompt.md").write_text(initial_prompt)

            while self.iteration < self.max_iterations:
                self.iteration += 1
                print(f"\n--- Iteration {self.iteration} ---")

                # Build context from previous outputs
                context = initial_prompt
                prev_output = self.work_dir / f"output-{self.iteration - 1}.txt"
                if prev_output.exists():
                    context += f"\n\nPrevious iteration:\n{prev_output.read_text()}"

                result = await session.send_and_wait(
                    MessageOptions(prompt=context), timeout=300
                )
                response = result.data.content if result else ""

                # Persist output
                output_file = self.work_dir / f"output-{self.iteration}.txt"
                output_file.write_text(response)

                if "COMPLETE" in response:
                    return response

            raise RuntimeError("Max iterations reached")
        finally:
            await session.destroy()
            await self.client.stop()
```

## Best Practices

1. **Write clear completion criteria**: Include exactly what "done" looks like
2. **Use output markers**: Include `<promise>COMPLETE</promise>` or similar in completion condition
3. **Always set max iterations**: Prevents infinite loops on impossible tasks
4. **Persist state**: Save files so AI can see what changed between iterations
5. **Include context**: Feed previous iteration output back as context
6. **Monitor progress**: Log each iteration to track what's happening

## Example: Iterative Code Generation

```python
prompt = """Write a function that:
1. Parses CSV data
2. Validates required fields
3. Returns parsed records or error
4. Has unit tests
5. Output <promise>COMPLETE</promise> when done"""

async def main():
    loop = RalphLoop(10, "COMPLETE")
    result = await loop.run(prompt)

asyncio.run(main())
```

## Handling Failures

```python
try:
    result = await loop.run(prompt)
    print("Task completed successfully!")
except RuntimeError as e:
    print(f"Task failed: {e}")
    if loop.last_response:
        print(f"\nLast attempt:\n{loop.last_response}")
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
