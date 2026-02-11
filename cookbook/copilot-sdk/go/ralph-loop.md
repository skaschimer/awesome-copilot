# RALPH-loop: Iterative Self-Referential AI Loops

Implement self-referential feedback loops where an AI agent iteratively improves work by reading its own previous output.

> **Runnable example:** [recipe/ralph-loop.go](recipe/ralph-loop.go)
>
> ```bash
> cd go/recipe
> go run ralph-loop.go
> ```

## What is RALPH-loop?

RALPH-loop is a development methodology for iterative AI-powered task completion. Named after the Ralph Wiggum technique, it embodies the philosophy of persistent iteration:

- **One prompt, multiple iterations**: The same prompt is processed repeatedly
- **Self-referential feedback**: The AI reads its own previous work (file changes, git history)
- **Completion detection**: Loop exits when a completion promise is detected in output
- **Safety limits**: Always include a maximum iteration count to prevent infinite loops

## Example Scenario

You need to iteratively improve code until all tests pass. Instead of asking Claude to "write perfect code," you use RALPH-loop to:

1. Send the initial prompt with clear success criteria
2. Claude writes code and tests
3. Claude runs tests and sees failures
4. Loop automatically re-sends the prompt
5. Claude reads test output and previous code, fixes issues
6. Repeat until all tests pass and completion promise is output

## Basic Implementation

```go
package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	copilot "github.com/github/copilot-sdk/go"
)

type RalphLoop struct {
	client            *copilot.Client
	iteration         int
	maxIterations     int
	completionPromise string
	LastResponse      string
}

func NewRalphLoop(maxIterations int, completionPromise string) *RalphLoop {
	return &RalphLoop{
		client:            copilot.NewClient(nil),
		maxIterations:     maxIterations,
		completionPromise: completionPromise,
	}
}

func (r *RalphLoop) Run(ctx context.Context, initialPrompt string) (string, error) {
	if err := r.client.Start(ctx); err != nil {
		return "", err
	}
	defer r.client.Stop()

	session, err := r.client.CreateSession(ctx, &copilot.SessionConfig{
		Model: "gpt-5.1-codex-mini",
	})
	if err != nil {
		return "", err
	}
	defer session.Destroy()

	for r.iteration < r.maxIterations {
		r.iteration++
		fmt.Printf("\n--- Iteration %d/%d ---\n", r.iteration, r.maxIterations)

		prompt := r.buildIterationPrompt(initialPrompt)

		result, err := session.SendAndWait(ctx, copilot.MessageOptions{Prompt: prompt})
		if err != nil {
			return "", err
		}

		if result != nil && result.Data.Content != nil {
			r.LastResponse = *result.Data.Content
		}

		if strings.Contains(r.LastResponse, r.completionPromise) {
			fmt.Printf("✓ Completion promise detected: %s\n", r.completionPromise)
			return r.LastResponse, nil
		}
	}

	return "", fmt.Errorf("max iterations (%d) reached without completion promise",
		r.maxIterations)
}

// Usage
func main() {
	ctx := context.Background()
	loop := NewRalphLoop(5, "COMPLETE")
	result, err := loop.Run(ctx, "Your task here")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(result)
}
```

## With File Persistence

For tasks involving code generation, persist state to files so the AI can see changes:

```go
package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	copilot "github.com/github/copilot-sdk/go"
)

type PersistentRalphLoop struct {
	client        *copilot.Client
	workDir       string
	iteration     int
	maxIterations int
}

func NewPersistentRalphLoop(workDir string, maxIterations int) *PersistentRalphLoop {
	os.MkdirAll(workDir, 0755)
	return &PersistentRalphLoop{
		client:        copilot.NewClient(nil),
		workDir:       workDir,
		maxIterations: maxIterations,
	}
}

func (p *PersistentRalphLoop) Run(ctx context.Context, initialPrompt string) (string, error) {
	if err := p.client.Start(ctx); err != nil {
		return "", err
	}
	defer p.client.Stop()

	os.WriteFile(filepath.Join(p.workDir, "prompt.md"), []byte(initialPrompt), 0644)

	session, err := p.client.CreateSession(ctx, &copilot.SessionConfig{
		Model: "gpt-5.1-codex-mini",
	})
	if err != nil {
		return "", err
	}
	defer session.Destroy()

	for p.iteration < p.maxIterations {
		p.iteration++

		prompt := initialPrompt
		prevFile := filepath.Join(p.workDir, fmt.Sprintf("output-%d.txt", p.iteration-1))
		if data, err := os.ReadFile(prevFile); err == nil {
			prompt = fmt.Sprintf("%s\n\nPrevious iteration:\n%s", initialPrompt, string(data))
		}

		result, err := session.SendAndWait(ctx, copilot.MessageOptions{Prompt: prompt})
		if err != nil {
			return "", err
		}

		response := ""
		if result != nil && result.Data.Content != nil {
			response = *result.Data.Content
		}

		os.WriteFile(filepath.Join(p.workDir, fmt.Sprintf("output-%d.txt", p.iteration)),
			[]byte(response), 0644)

		if strings.Contains(response, "COMPLETE") {
			return response, nil
		}
	}

	return "", fmt.Errorf("max iterations reached")
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

```go
prompt := `Write a function that:
1. Parses CSV data
2. Validates required fields
3. Returns parsed records or error
4. Has unit tests
5. Output <promise>COMPLETE</promise> when done`

loop := NewRalphLoop(10, "COMPLETE")
result, err := loop.Run(context.Background(), prompt)
```

## Handling Failures

```go
ctx := context.Background()
loop := NewRalphLoop(5, "COMPLETE")
result, err := loop.Run(ctx, prompt)
if err != nil {
	log.Printf("Task failed: %v", err)
	log.Printf("Last attempt: %s", loop.LastResponse)
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
