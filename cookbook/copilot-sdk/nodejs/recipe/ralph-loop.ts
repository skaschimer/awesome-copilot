import { readFile } from "fs/promises";
import { execSync } from "child_process";
import { CopilotClient } from "@github/copilot-sdk";

/**
 * Ralph loop: autonomous AI task loop with fresh context per iteration.
 *
 * Two modes:
 *   - "plan": reads PROMPT_plan.md, generates/updates IMPLEMENTATION_PLAN.md
 *   - "build": reads PROMPT_build.md, implements tasks, runs tests, commits
 *
 * Each iteration creates a fresh session so the agent always operates in
 * the "smart zone" of its context window. State is shared between
 * iterations via files on disk (IMPLEMENTATION_PLAN.md, AGENTS.md, specs/*).
 *
 * Usage:
 *   npx tsx ralph-loop.ts              # build mode, 50 iterations
 *   npx tsx ralph-loop.ts plan         # planning mode
 *   npx tsx ralph-loop.ts 20           # build mode, 20 iterations
 *   npx tsx ralph-loop.ts plan 5       # planning mode, 5 iterations
 */

type Mode = "plan" | "build";

async function ralphLoop(mode: Mode, maxIterations: number) {
    const promptFile = mode === "plan" ? "PROMPT_plan.md" : "PROMPT_build.md";

    const client = new CopilotClient();
    await client.start();

    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();

    console.log("━".repeat(40));
    console.log(`Mode:   ${mode}`);
    console.log(`Prompt: ${promptFile}`);
    console.log(`Branch: ${branch}`);
    console.log(`Max:    ${maxIterations} iterations`);
    console.log("━".repeat(40));

    try {
        const prompt = await readFile(promptFile, "utf-8");

        for (let i = 1; i <= maxIterations; i++) {
            console.log(`\n=== Iteration ${i}/${maxIterations} ===`);

            // Fresh session — each task gets full context budget
            const session = await client.createSession({
                model: "claude-sonnet-4.5",
            });

            try {
                await session.sendAndWait({ prompt }, 600_000);
            } finally {
                await session.destroy();
            }

            // Push changes after each iteration
            try {
                execSync(`git push origin ${branch}`, { stdio: "inherit" });
            } catch {
                execSync(`git push -u origin ${branch}`, { stdio: "inherit" });
            }

            console.log(`\nIteration ${i} complete.`);
        }

        console.log(`\nReached max iterations: ${maxIterations}`);
    } finally {
        await client.stop();
    }
}

// Parse CLI args
const args = process.argv.slice(2);
const mode: Mode = args.includes("plan") ? "plan" : "build";
const maxArg = args.find((a) => /^\d+$/.test(a));
const maxIterations = maxArg ? parseInt(maxArg) : 50;

ralphLoop(mode, maxIterations).catch(console.error);
