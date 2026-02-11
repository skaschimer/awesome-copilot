#:package GitHub.Copilot.SDK@*
#:property PublishAot=false

using System.Diagnostics;
using GitHub.Copilot.SDK;

// Ralph loop: autonomous AI task loop with fresh context per iteration.
//
// Two modes:
//   - "plan": reads PROMPT_plan.md, generates/updates IMPLEMENTATION_PLAN.md
//   - "build": reads PROMPT_build.md, implements tasks, runs tests, commits
//
// Each iteration creates a fresh session so the agent always operates in
// the "smart zone" of its context window. State is shared between
// iterations via files on disk (IMPLEMENTATION_PLAN.md, AGENTS.md, specs/*).
//
// Usage:
//   dotnet run                      # build mode, 50 iterations
//   dotnet run plan                 # planning mode
//   dotnet run 20                   # build mode, 20 iterations
//   dotnet run plan 5               # planning mode, 5 iterations

var mode = args.Contains("plan") ? "plan" : "build";
var maxArg = args.FirstOrDefault(a => int.TryParse(a, out _));
var maxIterations = maxArg != null ? int.Parse(maxArg) : 50;
var promptFile = mode == "plan" ? "PROMPT_plan.md" : "PROMPT_build.md";

var client = new CopilotClient();
await client.StartAsync();

var branchProc = Process.Start(new ProcessStartInfo("git", "branch --show-current")
    { RedirectStandardOutput = true })!;
var branch = (await branchProc.StandardOutput.ReadToEndAsync()).Trim();
await branchProc.WaitForExitAsync();

Console.WriteLine(new string('━', 40));
Console.WriteLine($"Mode:   {mode}");
Console.WriteLine($"Prompt: {promptFile}");
Console.WriteLine($"Branch: {branch}");
Console.WriteLine($"Max:    {maxIterations} iterations");
Console.WriteLine(new string('━', 40));

try
{
    var prompt = await File.ReadAllTextAsync(promptFile);

    for (var i = 1; i <= maxIterations; i++)
    {
        Console.WriteLine($"\n=== Iteration {i}/{maxIterations} ===");

        // Fresh session — each task gets full context budget
        var session = await client.CreateSessionAsync(
            new SessionConfig { Model = "claude-sonnet-4.5" });

        try
        {
            var done = new TaskCompletionSource<string>();
            session.On(evt =>
            {
                if (evt is AssistantMessageEvent msg)
                    done.TrySetResult(msg.Data.Content);
            });

            await session.SendAsync(new MessageOptions { Prompt = prompt });
            await done.Task;
        }
        finally
        {
            await session.DisposeAsync();
        }

        // Push changes after each iteration
        try
        {
            Process.Start("git", $"push origin {branch}")!.WaitForExit();
        }
        catch
        {
            Process.Start("git", $"push -u origin {branch}")!.WaitForExit();
        }

        Console.WriteLine($"\nIteration {i} complete.");
    }

    Console.WriteLine($"\nReached max iterations: {maxIterations}");
}
finally
{
    await client.StopAsync();
}
