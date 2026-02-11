# RALPH-loop: Iterative Self-Referential AI Loops

Implement self-referential feedback loops where an AI agent iteratively improves work by reading its own previous output.

> **Runnable example:** [recipe/ralph-loop.cs](recipe/ralph-loop.cs)
>
> ```bash
> cd dotnet
> dotnet run recipe/ralph-loop.cs
> ```

## What is RALPH-loop?

RALPH-loop is a development methodology for iterative AI-powered task completion. Named after the Ralph Wiggum technique, it embodies the philosophy of persistent iteration:

- **One prompt, multiple iterations**: The same prompt is processed repeatedly
- **Self-referential feedback**: The AI reads its own previous work (file changes, git history)
- **Completion detection**: Loop exits when a completion promise is detected in output
- **Safety limits**: Always include a maximum iteration count to prevent infinite loops

## Example Scenario

You need to iteratively improve code until all tests pass. Instead of asking the model to "write perfect code," you use RALPH-loop to:

1. Send the initial prompt with clear success criteria
2. The model writes code and tests
3. The model runs tests and sees failures
4. Loop automatically re-sends the prompt
5. The model reads test output and previous code, fixes issues
6. Repeat until all tests pass and completion promise is output

## Basic Implementation

```csharp
using GitHub.Copilot.SDK;

public class RalphLoop
{
    private readonly CopilotClient _client;
    private int _iteration = 0;
    private readonly int _maxIterations;
    private readonly string _completionPromise;
    private string? _lastResponse;

    public RalphLoop(int maxIterations = 10, string completionPromise = "COMPLETE")
    {
        _client = new CopilotClient();
        _maxIterations = maxIterations;
        _completionPromise = completionPromise;
    }

    public async Task<string> RunAsync(string prompt)
    {
        await _client.StartAsync();

        try
        {
            var session = await _client.CreateSessionAsync(
                new SessionConfig { Model = "gpt-5.1-codex-mini" });

            try
            {
                var done = new TaskCompletionSource<string>();
                session.On(evt =>
                {
                    if (evt is AssistantMessageEvent msg)
                    {
                        _lastResponse = msg.Data.Content;
                        done.TrySetResult(msg.Data.Content);
                    }
                });

                while (_iteration < _maxIterations)
                {
                    _iteration++;
                    Console.WriteLine($"\n--- Iteration {_iteration} ---");

                    done = new TaskCompletionSource<string>();

                    // Send prompt (on first iteration) or continuation
                    var messagePrompt = _iteration == 1 
                        ? prompt 
                        : $"{prompt}\n\nPrevious attempt:\n{_lastResponse}\n\nContinue iterating...";

                    await session.SendAsync(new MessageOptions { Prompt = messagePrompt });
                    var response = await done.Task;

                    // Check for completion promise
                    if (response.Contains(_completionPromise))
                    {
                        Console.WriteLine($"✓ Completion promise detected: {_completionPromise}");
                        return response;
                    }

                    Console.WriteLine($"Iteration {_iteration} complete. Continuing...");
                }

                throw new InvalidOperationException(
                    $"Max iterations ({_maxIterations}) reached without completion promise");
            }
            finally
            {
                await session.DisposeAsync();
            }
        }
        finally
        {
            await _client.StopAsync();
        }
    }
}

// Usage
var loop = new RalphLoop(maxIterations: 5, completionPromise: "COMPLETE");
var result = await loop.RunAsync("Your task here");
Console.WriteLine(result);
```

## With File Persistence

For tasks involving code generation, persist state to files so the AI can see changes:

```csharp
public class PersistentRalphLoop
{
    private readonly string _workDir;
    private readonly CopilotClient _client;
    private readonly int _maxIterations;
    private int _iteration = 0;

    public PersistentRalphLoop(string workDir, int maxIterations = 10)
    {
        _workDir = workDir;
        _maxIterations = maxIterations;
        Directory.CreateDirectory(_workDir);
        _client = new CopilotClient();
    }

    public async Task<string> RunAsync(string prompt)
    {
        await _client.StartAsync();

        try
        {
            var session = await _client.CreateSessionAsync(
                new SessionConfig { Model = "gpt-5.1-codex-mini" });

            try
            {
                // Store initial prompt
                var promptFile = Path.Combine(_workDir, "prompt.md");
                await File.WriteAllTextAsync(promptFile, prompt);

                var done = new TaskCompletionSource<string>();
                string response = "";
                session.On(evt =>
                {
                    if (evt is AssistantMessageEvent msg)
                    {
                        response = msg.Data.Content;
                        done.TrySetResult(msg.Data.Content);
                    }
                });

                while (_iteration < _maxIterations)
                {
                    _iteration++;
                    Console.WriteLine($"\n--- Iteration {_iteration} ---");

                    done = new TaskCompletionSource<string>();

                    // Build context including previous work
                    var contextBuilder = new StringBuilder(prompt);
                    var previousOutput = Path.Combine(_workDir, $"output-{_iteration - 1}.txt");
                    if (File.Exists(previousOutput))
                    {
                        contextBuilder.AppendLine($"\nPrevious iteration output:\n{await File.ReadAllTextAsync(previousOutput)}");
                    }

                    await session.SendAsync(new MessageOptions { Prompt = contextBuilder.ToString() });
                    await done.Task;

                    // Persist output
                    await File.WriteAllTextAsync(
                        Path.Combine(_workDir, $"output-{_iteration}.txt"), 
                        response);

                    if (response.Contains("COMPLETE"))
                    {
                        return response;
                    }
                }

                throw new InvalidOperationException("Max iterations reached");
            }
            finally
            {
                await session.DisposeAsync();
            }
        }
        finally
        {
            await _client.StopAsync();
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

```csharp
var prompt = @"Write a function that:
1. Parses CSV data
2. Validates required fields
3. Returns parsed records or error
4. Has unit tests
5. Output <promise>COMPLETE</promise> when done";

var loop = new RalphLoop(maxIterations: 10, completionPromise: "COMPLETE");
var result = await loop.RunAsync(prompt);
```

## Handling Failures

```csharp
try
{
    var result = await loop.RunAsync(prompt);
    Console.WriteLine("Task completed successfully!");
}
catch (InvalidOperationException ex) when (ex.Message.Contains("Max iterations"))
{
    Console.WriteLine("Task did not complete within iteration limit.");
    Console.WriteLine($"Last response: {loop.LastResponse}");
    // Document what was attempted and suggest alternatives
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
