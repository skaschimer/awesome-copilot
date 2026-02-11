import { CopilotClient } from "@github/copilot-sdk";

/**
 * RALPH-loop implementation: Iterative self-referential AI loops.
 * The same prompt is sent repeatedly, with AI reading its own previous output.
 * Loop continues until completion promise is detected in the response.
 */
class RalphLoop {
    private client: CopilotClient;
    private iteration: number = 0;
    private readonly maxIterations: number;
    private readonly completionPromise: string;
    public lastResponse: string | null = null;

    constructor(maxIterations: number = 10, completionPromise: string = "COMPLETE") {
        this.client = new CopilotClient();
        this.maxIterations = maxIterations;
        this.completionPromise = completionPromise;
    }

    /**
     * Run the RALPH-loop until completion promise is detected or max iterations reached.
     */
    async run(initialPrompt: string): Promise<string> {
        await this.client.start();
        const session = await this.client.createSession({
            model: "gpt-5.1-codex-mini"
        });

        try {
            while (this.iteration < this.maxIterations) {
                this.iteration++;
                console.log(`\n=== Iteration ${this.iteration}/${this.maxIterations} ===`);

                // Build the prompt for this iteration
                const currentPrompt = this.buildIterationPrompt(initialPrompt);
                console.log(`Sending prompt (length: ${currentPrompt.length})...`);

                const response = await session.sendAndWait({ prompt: currentPrompt }, 300_000);
                this.lastResponse = response?.data.content || "";

                // Display response summary
                const summary = this.lastResponse.length > 200
                    ? this.lastResponse.substring(0, 200) + "..."
                    : this.lastResponse;
                console.log(`Response: ${summary}`);

                // Check for completion promise
                if (this.lastResponse.includes(this.completionPromise)) {
                    console.log(`\n✓ Success! Completion promise detected: '${this.completionPromise}'`);
                    return this.lastResponse;
                }

                console.log(`Iteration ${this.iteration} complete. Checking for next iteration...`);
            }

            // Max iterations reached without completion
            throw new Error(
                `Maximum iterations (${this.maxIterations}) reached without detecting completion promise: '${this.completionPromise}'`
            );
        } catch (error) {
            console.error(`\nError during RALPH-loop: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        } finally {
            await session.destroy();
            await this.client.stop();
        }
    }

    /**
     * Build the prompt for the current iteration, including previous output as context.
     */
    private buildIterationPrompt(initialPrompt: string): string {
        if (this.iteration === 1) {
            // First iteration: just the initial prompt
            return initialPrompt;
        }

        // Subsequent iterations: include previous output as context
        return `${initialPrompt}

=== CONTEXT FROM PREVIOUS ITERATION ===
${this.lastResponse}
=== END CONTEXT ===

Continue working on this task. Review the previous attempt and improve upon it.`;
    }
}

// Example usage demonstrating RALPH-loop
async function main() {
    const prompt = `You are iteratively building a small library. Follow these phases IN ORDER.
Do NOT skip ahead — only do the current phase, then stop and wait for the next iteration.

Phase 1: Design a DataValidator class that validates records against a schema.
  - Schema defines field names, types (str, int, float, bool), and whether required.
  - Return a list of validation errors per record.
  - Show the class code only. Do NOT output COMPLETE.

Phase 2: Write at least 4 unit tests covering: missing required field, wrong type,
  valid record, and empty input. Show test code only. Do NOT output COMPLETE.

Phase 3: Review the code from phases 1 and 2. Fix any bugs, add docstrings, and add
  an extra edge-case test. Show the final consolidated code with all fixes.
  When this phase is fully done, output the exact text: COMPLETE`;

    const loop = new RalphLoop(5, "COMPLETE");

    try {
        const result = await loop.run(prompt);
        console.log("\n=== FINAL RESULT ===");
        console.log(result);
    } catch (error) {
        console.error(`\nTask did not complete: ${error instanceof Error ? error.message : String(error)}`);
        if (loop.lastResponse) {
            console.log(`\nLast attempt:\n${loop.lastResponse}`);
        }
    }
}

main().catch(console.error);
