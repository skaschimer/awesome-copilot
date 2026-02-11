#:package GitHub.Copilot.SDK@*
#:property PublishAot=false

using GitHub.Copilot.SDK;
using System.Text;

// RALPH-loop: Iterative self-referential AI loops.
// The same prompt is sent repeatedly, with AI reading its own previous output.
// Loop continues until completion promise is detected in the response.

var prompt = @"You are iteratively building a small library. Follow these phases IN ORDER.
Do NOT skip ahead — only do the current phase, then stop and wait for the next iteration.

Phase 1: Design a DataValidator class that validates records against a schema.
  - Schema defines field names, types (string, int, float, bool), and whether required.
  - Return a list of validation errors per record.
  - Show the class code only. Do NOT output COMPLETE.

Phase 2: Write at least 4 unit tests covering: missing required field, wrong type,
  valid record, and empty input. Show test code only. Do NOT output COMPLETE.

Phase 3: Review the code from phases 1 and 2. Fix any bugs, add docstrings, and add
  an extra edge-case test. Show the final consolidated code with all fixes.
  When this phase is fully done, output the exact text: COMPLETE";

var loop = new RalphLoop(maxIterations: 5, completionPromise: "COMPLETE");

try
{
    var result = await loop.RunAsync(prompt);
    Console.WriteLine("\n=== FINAL RESULT ===");
    Console.WriteLine(result);
}
catch (InvalidOperationException ex)
{
    Console.WriteLine($"\nTask did not complete: {ex.Message}");
    if (loop.LastResponse != null)
    {
        Console.WriteLine($"\nLast attempt:\n{loop.LastResponse}");
    }
}

// --- RalphLoop class definition ---

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

    public string? LastResponse => _lastResponse;

    public async Task<string> RunAsync(string initialPrompt)
    {
        await _client.StartAsync();
        var session = await _client.CreateSessionAsync(new SessionConfig 
        { 
            Model = "gpt-5.1-codex-mini"
        });

        try
        {
            while (_iteration < _maxIterations)
            {
                _iteration++;
                Console.WriteLine($"\n=== Iteration {_iteration}/{_maxIterations} ===");

                var done = new TaskCompletionSource<string>();
                session.On(evt =>
                {
                    if (evt is AssistantMessageEvent msg)
                    {
                        _lastResponse = msg.Data.Content;
                        done.SetResult(msg.Data.Content);
                    }
                });

                var currentPrompt = BuildIterationPrompt(initialPrompt);
                Console.WriteLine($"Sending prompt (length: {currentPrompt.Length})...");

                await session.SendAsync(new MessageOptions { Prompt = currentPrompt });
                var response = await done.Task;

                var summary = response.Length > 200 
                    ? response.Substring(0, 200) + "..." 
                    : response;
                Console.WriteLine($"Response: {summary}");

                if (response.Contains(_completionPromise))
                {
                    Console.WriteLine($"\n✓ Completion promise detected: '{_completionPromise}'");
                    return response;
                }

                Console.WriteLine($"Iteration {_iteration} complete. Continuing...");
            }

            throw new InvalidOperationException(
                $"Max iterations ({_maxIterations}) reached without completion promise: '{_completionPromise}'");
        }
        finally
        {
            await session.DisposeAsync();
            await _client.StopAsync();
        }
    }

    private string BuildIterationPrompt(string initialPrompt)
    {
        if (_iteration == 1)
            return initialPrompt;

        var sb = new StringBuilder();
        sb.AppendLine(initialPrompt);
        sb.AppendLine();
        sb.AppendLine("=== CONTEXT FROM PREVIOUS ITERATION ===");
        sb.AppendLine(_lastResponse);
        sb.AppendLine("=== END CONTEXT ===");
        sb.AppendLine();
        sb.AppendLine("Continue working on this task. Review the previous attempt and improve upon it.");
        return sb.ToString();
    }
}
