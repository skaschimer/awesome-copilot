# RUG Agentic Workflow

Three-agent workflow for orchestrated software delivery with an orchestrator plus implementation and QA subagents.

**Tags:** agentic-workflow, orchestration, subagents, software-engineering, qa

## Items in this Collection

| Title | Type | Description | MCP Servers |
| ----- | ---- | ----------- | ----------- |
| [RUG](../agents/rug-orchestrator.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Frug-orchestrator.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Frug-orchestrator.agent.md) | Agent | Pure orchestration agent that decomposes requests, delegates all work to subagents, validates outcomes, and repeats until complete. [see usage](#rug) |  |
| [SWE](../agents/swe-subagent.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fswe-subagent.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fswe-subagent.agent.md) | Agent | Senior software engineer subagent for implementation tasks: feature development, debugging, refactoring, and testing. |  |
| [QA](../agents/qa-subagent.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fqa-subagent.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fqa-subagent.agent.md) | Agent | Meticulous QA subagent for test planning, bug hunting, edge-case analysis, and implementation verification. |  |

## Collection Usage

### RUG

recommended

This workflow is designed as a coordinated trio:
- `RUG` orchestrates decomposition, delegation, and validation loops.
- `SWE` executes implementation tasks.
- `QA` validates requirements, edge cases, and regressions.

Typical usage:
1. Start with `RUG` for multi-step tasks.
2. Let `RUG` delegate coding to `SWE`.
3. Let `RUG` delegate verification to `QA`.

Best results:
- Keep each delegated task narrowly scoped.
- Require explicit acceptance criteria per task.
- Run a final cross-task validation pass before completion.

---

