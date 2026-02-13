---
name: sponsor-finder
description: Find which of a GitHub repository's dependencies are sponsorable via GitHub Sponsors. Resolves dependencies to source GitHub repos, checks npm funding metadata, FUNDING.yml files, and web search. Verifies every link before presenting. Supports npm, Python, Rust, Go, and Ruby. Use when evaluating which open source projects to sponsor, building an OSPO sponsorship strategy, or auditing dependency funding. Invoke by providing a GitHub owner/repo (e.g. "find sponsorable dependencies in expressjs/express").
---

# Sponsor Finder

Find which of a repository's open source dependencies accept sponsorship via GitHub Sponsors (or Open Collective, Ko-fi, etc.). Accepts a GitHub `owner/repo`, inspects its dependencies using the GitHub MCP tools, npm/PyPI registries, and web search, and produces a verified sponsorship report.

## Your Workflow

When the user provides a repository in `owner/repo` format:

1. **Parse the input** — Extract the `owner` and `repo` from the user's message.
2. **Fetch the dependency manifest** from the repo.
3. **Extract dependency names** from the manifest.
4. **Resolve each dependency** to its source GitHub repo via registry APIs.
5. **Check funding sources** — registry `funding` field, `.github/FUNDING.yml`, and web search fallback.
6. **Verify every link** — fetch each funding URL to confirm it's live.
7. **Group by maintainer** and produce the report.

Always complete all steps before producing the report.

---

## Step 1: Fetch the Dependency Manifest

Use `get_file_contents` to look for dependency files in this order (stop at first match):

| Ecosystem | File | Priority |
|-----------|------|----------|
| Node.js/npm | `package.json` | 1st |
| Python | `requirements.txt`, `pyproject.toml` | 2nd |
| Rust | `Cargo.toml` | 3rd |
| Go | `go.mod` | 4th |
| Ruby | `Gemfile` | 5th |

If none exist, inform the user that no supported manifest was found.

---

## Step 2: Extract Dependency Names

### Node.js (`package.json`)
Extract package names from `dependencies` (production — most important) and optionally `devDependencies` (include if user asks or fewer than 30 production deps).

### Python (`requirements.txt`)
Extract package names before version specifiers (`==`, `>=`, `~=`). Ignore comments (`#`), blank lines, and `-r` includes.

### Python (`pyproject.toml`)
Extract from `[project.dependencies]` or `[tool.poetry.dependencies]`.

### Rust (`Cargo.toml`)
Extract package names from `[dependencies]` section.

### Go (`go.mod`)
Extract module paths from `require` statements. The GitHub repo is usually the module path itself (e.g., `github.com/gin-gonic/gin`).

### Ruby (`Gemfile`)
Extract gem names from `gem` statements.

---

## Step 3: Resolve Dependencies to GitHub Repos AND Collect Funding Info

For each dependency, query the appropriate registry to find the source GitHub repository **and** any funding metadata.

### Node.js (npm)
Use `web_fetch` on `https://registry.npmjs.org/{package-name}/latest`.

From the JSON response, extract:
- **`repository.url`** → parse to `owner/repo` (handle `git+https://`, `git://`, `git+ssh://` formats)
- **`funding` field** → primary funding source (string URL, object with `url`, or array)

### Python (PyPI)
Use `web_fetch` on `https://pypi.org/pypi/{package}/json`.

From the response, extract:
- **`info.project_urls`** → look for `Source`, `Repository`, `Homepage`, or `GitHub` keys pointing to github.com
- **`info.project_urls.Funding`** → if present, use as funding URL directly

### Rust (crates.io)
Use `web_fetch` on `https://crates.io/api/v1/crates/{package}`.

From the response, extract:
- **`crate.repository`** → parse GitHub URL to `owner/repo`

### Go
Module paths starting with `github.com/` already contain the `owner/repo`. No registry lookup needed.

### Ruby (RubyGems)
Use `web_fetch` on `https://rubygems.org/api/v1/gems/{gem}.json`.

From the response, extract:
- **`source_code_uri`** or **`homepage_uri`** → parse GitHub URL to `owner/repo`

### URL parsing
Handle these common repository URL formats:
- `git+https://github.com/{owner}/{repo}.git` → `{owner}/{repo}`
- `https://github.com/{owner}/{repo}.git` → `{owner}/{repo}`
- `https://github.com/{owner}/{repo}` → `{owner}/{repo}`
- `git://github.com/{owner}/{repo}.git` → `{owner}/{repo}`
- `git+ssh://git@github.com/{owner}/{repo}.git` → `{owner}/{repo}`

### Efficiency rules
- Process dependencies in batches of **10 at a time**.
- If a dependency has no repository URL or it doesn't point to GitHub, skip it and count it as "unresolvable".
- If there are more than **60 production dependencies**, sample the first 60 and note in the output.
- **Deduplicate** GitHub repos — multiple packages may come from the same repo.

---

## Step 4: Check for FUNDING.yml

For dependencies that did NOT have a `funding` field from the registry, check their GitHub repo for a FUNDING.yml.

Use `get_file_contents` to fetch `{owner}/{repo}` path `.github/FUNDING.yml`.

Also check the org-level `.github` repo: `{org}/.github` path `.github/FUNDING.yml`.

FUNDING.yml is a YAML file with these possible fields:

```yaml
github: [username]           # GitHub Sponsors
open_collective: slug        # Open Collective
ko_fi: username              # Ko-fi
tidelift: platform/package   # Tidelift
liberapay: username          # Liberapay
patreon: username            # Patreon
custom: [url1, url2]         # Custom URLs
```

Generate sponsor links:
- `github: ljharb` → `https://github.com/sponsors/ljharb`
- `open_collective: express` → `https://opencollective.com/express`
- `ko_fi: username` → `https://ko-fi.com/username`
- `custom: ["https://..."]` → use as-is

### Efficiency rules
- **Skip repos that already have funding info from Step 3.**
- Process remaining repos in batches of **10 at a time**.

---

## Step 5: Web Search Fallback

For dependencies that still have NO funding info after Steps 3 and 4, use `web_search` as a fallback:

```
"{package name}" github sponsors OR open collective OR funding
```

Look for:
- Links to `github.com/sponsors/{user}`
- Links to `opencollective.com/{project}`
- Funding sections on official project websites

Only use results from authoritative sources (GitHub, Open Collective, official project sites).

### Efficiency rules
- Only search for the **top 10 most important unfunded dependencies** (by download count or centrality).
- Skip packages known to be corporate-maintained (e.g., `react` by Meta, `typescript` by Microsoft, `@types/*` by DefinitelyTyped).

---

## Step 6: Verify Every Link (CRITICAL)

**Before including ANY funding link in the report, verify it exists by fetching the URL.**

Use `web_fetch` on each funding URL:
- **Valid page** (returns content about sponsoring/donating) → ✅ Include it
- **404, "not found", "not enrolled"** → ❌ Do NOT include it
- **Redirect to a valid page** → ✅ Include the final URL

This is critical because:
- GitHub Sponsors pages only exist if the user enrolled
- Open Collective pages only exist if the project created one
- Funding URLs in FUNDING.yml or npm metadata may be stale

### Efficiency rules
- Verify in batches of **5 at a time**.
- If verification fails, exclude the link silently — don't show broken links.

---

## Step 7: Parse and Group Results

After verifying all links, determine the platform for each:
- Contains `github.com/sponsors/` → GitHub Sponsors (💜)
- Contains `opencollective.com/` → Open Collective (🟠)
- Contains `ko-fi.com/` → Ko-fi (☕)
- Contains `tidelift.com/` → Tidelift (🔗)
- Contains `patreon.com/` → Patreon (🔗)
- Other URLs → Custom (🔗)

Group sponsorable dependencies by their funding destination. For GitHub Sponsors, group by username. For Open Collective, group by project.

Sort by **number of dependencies** (most impact first).

---

## Output Format

Always produce the report in this exact format:

```
## 💜 Sponsor Finder Report

**Repository:** {owner}/{repo}
**Scanned:** {current date}

---

### Summary

- **{total_deps}** dependencies found
- **{resolved}** resolved to GitHub repos ({unresolved} could not be resolved)
- **💜 {sponsorable}** have verified funding links ({percentage}%)
- **{destination_count}** unique funding destinations
- All links verified ✅

---

### Verified Funding Links

| Dependency | GitHub Repo | Funding | How Verified |
|------------|-------------|---------|--------------|
| {dep_name} | [{owner}/{repo}](https://github.com/{owner}/{repo}) | 💜 [GitHub Sponsors](https://github.com/sponsors/{username}) | FUNDING.yml |
| {dep_name} | [{owner}/{repo}](https://github.com/{owner}/{repo}) | 🟠 [Open Collective](https://opencollective.com/{slug}) | npm funding field |
| {dep_name} | [{owner}/{repo}](https://github.com/{owner}/{repo}) | 💜 [GitHub Sponsors](https://github.com/sponsors/{username}) | Web search |
| ... | ... | ... | ... |

---

### Funding Destinations (by impact)

| Destination | Dependencies | Link |
|-------------|-------------|------|
| 🟠 Open Collective: {name} | {count} deps ({dep1}, {dep2}, ...) | [opencollective.com/{name}](https://opencollective.com/{name}) |
| 💜 @{username} | {count} deps ({dep1}, ...) | [github.com/sponsors/{username}](https://github.com/sponsors/{username}) |
| ... | ... | ... |

---

### No Verified Funding Found

These dependencies don't have discoverable funding pages:
- {package} (corporate-maintained by {company})
- {package} (no FUNDING.yml or funding metadata)
- ...

---

### 💜 {percentage}% verified funding coverage · {destination_count} destinations · {sponsorable} dependencies
```

### Format notes
- The **How Verified** column shows the data source: `FUNDING.yml`, `npm funding field`, `PyPI metadata`, `Web search`.
- Use 💜 for GitHub Sponsors, 🟠 for Open Collective, ☕ for Ko-fi, 🔗 for other platforms.
- If a dependency has multiple funding sources, show the GitHub Sponsors link preferentially.
- Only include dependencies with **verified** funding links in the main table.
- List unfunded deps separately with a note on why (corporate, no metadata, etc.).

---

## Error Handling

- If `get_file_contents` returns 404 for the repo itself → inform user the repo may not exist or is private.
- If the manifest has no dependencies → report "No dependencies found."
- If a registry is unreachable for a dep → skip it, note in output.
- If FUNDING.yml exists but can't be parsed → attempt to extract any URLs, note "unparseable".
- If rate-limited → report what was completed and note that results are partial.
- If link verification fails → exclude the link, do NOT present unverified URLs.
- Always produce a report even if partial — never fail silently.

---

## Critical Rules

1. **NEVER present unverified links.** Every funding URL must be fetched and confirmed live before showing it. 5 verified links are better than 20 guessed links.
2. **NEVER guess from training knowledge.** Don't assume `opencollective.com/{package}` or `github.com/sponsors/{user}` exists — always check.
3. **Be transparent about verification.** Show the "How Verified" column so users know the data source.
4. **Always use the GitHub MCP tools** (`get_file_contents`), `web_fetch`, and `web_search` — never try to clone or shell out.
5. **Be efficient** — batch lookups, deduplicate GitHub repos, respect sampling limits.
6. **Focus on GitHub Sponsors** — most actionable platform. Show others but prioritize `github` field.
7. **Deduplicate** — group by maintainer to show actual impact of sponsoring one person.
8. **Stay in scope** — report on funding availability, not on whether projects "deserve" sponsorship.
