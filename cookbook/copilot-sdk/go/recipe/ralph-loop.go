package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	copilot "github.com/github/copilot-sdk/go"
)

// RalphLoop implements iterative self-referential feedback loops.
// The same prompt is sent repeatedly, with AI reading its own previous output.
// Loop continues until completion promise is detected in the response.
type RalphLoop struct {
	client            *copilot.Client
	iteration         int
	maxIterations     int
	completionPromise string
	LastResponse      string
}

// NewRalphLoop creates a new RALPH-loop instance.
func NewRalphLoop(maxIterations int, completionPromise string) *RalphLoop {
	return &RalphLoop{
		client:            copilot.NewClient(nil),
		maxIterations:     maxIterations,
		completionPromise: completionPromise,
	}
}

// Run executes the RALPH-loop until completion promise is detected or max iterations reached.
func (r *RalphLoop) Run(ctx context.Context, initialPrompt string) (string, error) {
	if err := r.client.Start(ctx); err != nil {
		return "", fmt.Errorf("failed to start client: %w", err)
	}
	defer r.client.Stop()

	session, err := r.client.CreateSession(ctx, &copilot.SessionConfig{
		Model: "gpt-5.1-codex-mini",
	})
	if err != nil {
		return "", fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Destroy()

	for r.iteration < r.maxIterations {
		r.iteration++
		fmt.Printf("\n=== Iteration %d/%d ===\n", r.iteration, r.maxIterations)

		currentPrompt := r.buildIterationPrompt(initialPrompt)
		fmt.Printf("Sending prompt (length: %d)...\n", len(currentPrompt))

		result, err := session.SendAndWait(ctx, copilot.MessageOptions{
			Prompt: currentPrompt,
		})
		if err != nil {
			return "", fmt.Errorf("send failed on iteration %d: %w", r.iteration, err)
		}

		if result != nil && result.Data.Content != nil {
			r.LastResponse = *result.Data.Content
		} else {
			r.LastResponse = ""
		}

		// Display response summary
		summary := r.LastResponse
		if len(summary) > 200 {
			summary = summary[:200] + "..."
		}
		fmt.Printf("Response: %s\n", summary)

		// Check for completion promise
		if strings.Contains(r.LastResponse, r.completionPromise) {
			fmt.Printf("\n✓ Success! Completion promise detected: '%s'\n", r.completionPromise)
			return r.LastResponse, nil
		}

		fmt.Printf("Iteration %d complete. Continuing...\n", r.iteration)
	}

	return "", fmt.Errorf("maximum iterations (%d) reached without detecting completion promise: '%s'",
		r.maxIterations, r.completionPromise)
}

func (r *RalphLoop) buildIterationPrompt(initialPrompt string) string {
	if r.iteration == 1 {
		return initialPrompt
	}

	return fmt.Sprintf(`%s

=== CONTEXT FROM PREVIOUS ITERATION ===
%s
=== END CONTEXT ===

Continue working on this task. Review the previous attempt and improve upon it.`,
		initialPrompt, r.LastResponse)
}

func main() {
	prompt := `You are iteratively building a small library. Follow these phases IN ORDER.
Do NOT skip ahead — only do the current phase, then stop and wait for the next iteration.

Phase 1: Design a DataValidator struct that validates records against a schema.
  - Schema defines field names, types (string, int, float, bool), and whether required.
  - Return a slice of validation errors per record.
  - Show the struct and method code only. Do NOT output COMPLETE.

Phase 2: Write at least 4 unit tests covering: missing required field, wrong type,
  valid record, and empty input. Show test code only. Do NOT output COMPLETE.

Phase 3: Review the code from phases 1 and 2. Fix any bugs, add doc comments, and add
  an extra edge-case test. Show the final consolidated code with all fixes.
  When this phase is fully done, output the exact text: COMPLETE`

	ctx := context.Background()
	loop := NewRalphLoop(5, "COMPLETE")

	result, err := loop.Run(ctx, prompt)
	if err != nil {
		log.Printf("Task did not complete: %v", err)
		log.Printf("Last attempt: %s", loop.LastResponse)
		return
	}

	fmt.Println("\n=== FINAL RESULT ===")
	fmt.Println(result)
}
