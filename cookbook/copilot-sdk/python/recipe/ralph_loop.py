#!/usr/bin/env python3

import asyncio

from copilot import CopilotClient, MessageOptions, SessionConfig


class RalphLoop:
    """
    RALPH-loop implementation: Iterative self-referential AI loops.

    The same prompt is sent repeatedly, with AI reading its own previous output.
    Loop continues until completion promise is detected in the response.
    """

    def __init__(self, max_iterations=10, completion_promise="COMPLETE"):
        """Initialize RALPH-loop with iteration limits and completion detection."""
        self.client = CopilotClient()
        self.iteration = 0
        self.max_iterations = max_iterations
        self.completion_promise = completion_promise
        self.last_response = None

    async def run(self, initial_prompt):
        """
        Run the RALPH-loop until completion promise is detected or max iterations reached.
        """
        session = None
        await self.client.start()
        try:
            session = await self.client.create_session(
                SessionConfig(model="gpt-5.1-codex-mini")
            )

            try:
                while self.iteration < self.max_iterations:
                    self.iteration += 1
                    print(f"\n=== Iteration {self.iteration}/{self.max_iterations} ===")

                    current_prompt = self._build_iteration_prompt(initial_prompt)
                    print(f"Sending prompt (length: {len(current_prompt)})...")

                    result = await session.send_and_wait(
                        MessageOptions(prompt=current_prompt),
                        timeout=300,
                    )

                    self.last_response = result.data.content if result else ""

                    # Display response summary
                    summary = (
                        self.last_response[:200] + "..."
                        if len(self.last_response) > 200
                        else self.last_response
                    )
                    print(f"Response: {summary}")

                    # Check for completion promise
                    if self.completion_promise in self.last_response:
                        print(
                            f"\n✓ Success! Completion promise detected: '{self.completion_promise}'"
                        )
                        return self.last_response

                    print(
                        f"Iteration {self.iteration} complete. Checking for next iteration..."
                    )

                raise RuntimeError(
                    f"Maximum iterations ({self.max_iterations}) reached without "
                    f"detecting completion promise: '{self.completion_promise}'"
                )

            except Exception as e:
                print(f"\nError during RALPH-loop: {e}")
                raise
            finally:
                if session is not None:
                    await session.destroy()
        finally:
            await self.client.stop()

    def _build_iteration_prompt(self, initial_prompt):
        """Build the prompt for the current iteration, including previous output as context."""
        if self.iteration == 1:
            return initial_prompt

        return f"""{initial_prompt}

=== CONTEXT FROM PREVIOUS ITERATION ===
{self.last_response}
=== END CONTEXT ===

Continue working on this task. Review the previous attempt and improve upon it."""


async def main():
    """Example usage demonstrating RALPH-loop."""
    prompt = """You are iteratively building a small library. Follow these phases IN ORDER.
Do NOT skip ahead — only do the current phase, then stop and wait for the next iteration.

Phase 1: Design a DataValidator class that validates records against a schema.
  - Schema defines field names, types (str, int, float, bool), and whether required.
  - Return a list of validation errors per record.
  - Show the class code only. Do NOT output COMPLETE.

Phase 2: Write at least 4 unit tests covering: missing required field, wrong type,
  valid record, and empty input. Show test code only. Do NOT output COMPLETE.

Phase 3: Review the code from phases 1 and 2. Fix any bugs, add docstrings, and add
  an extra edge-case test. Show the final consolidated code with all fixes.
  When this phase is fully done, output the exact text: COMPLETE"""

    loop = RalphLoop(max_iterations=5, completion_promise="COMPLETE")

    try:
        result = await loop.run(prompt)
        print("\n=== FINAL RESULT ===")
        print(result)
    except RuntimeError as e:
        print(f"\nTask did not complete: {e}")
        if loop.last_response:
            print(f"\nLast attempt:\n{loop.last_response}")


if __name__ == "__main__":
    asyncio.run(main())
