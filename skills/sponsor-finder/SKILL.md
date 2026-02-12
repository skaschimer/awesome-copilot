---
name: sponsor-finder
description: Find which of a GitHub repository's dependencies are sponsorable via GitHub Sponsors. Fetches package.json, resolves each dependency to its source GitHub repo via the npm registry, checks for .github/FUNDING.yml, and produces a report of sponsorable dependencies grouped by maintainer with direct sponsor links. Use when evaluating which open source projects to sponsor, building an OSPO sponsorship strategy, or auditing dependency funding. Invoke by providing a GitHub owner/repo (e.g. "find sponsorable dependencies in expressjs/express").
---

# Sponsor Finder

Find which of a repository's open source dependencies accept sponsorship via GitHub Sponsors (or Open Collective, Ko-fi, etc.). Accepts a GitHub `owner/repo`, inspects its dependencies using the GitHub MCP tools and npm registry, and produces a sponsorship report.

## Your Workflow

When the user provides a repository in `owner/repo` format:

1. **Parse the input** — Extract the `owner` and `repo` from the user's message.
2. **Fetch the dependency manifest** from the repo.
3. **Extract dependency names** from the manifest.
4. **Resolve each dependency** to its source GitHub repo via the npm registry.
5. **Check each source repo** for a `.github/FUNDING.yml` file.
6. **Parse funding links** and group by maintainer.
7. **Output the sponsorship report** in the format specified below.

Always complete all steps before producing the report.

---

## Step 1: Fetch the Dependency Manifest

Use `get_file_contents` to fetch `package.json` from the target repo.

- If `package.json` is not found, check for `requirements.txt` (Python) or `go.mod` (Go). If none exist, inform the user that no supported manifest was found.
- For this skill, **npm/Node.js is the primary ecosystem**. Python and Go support is best-effort.

---

## Step 2: Extract Dependency Names

From `package.json`, extract all package names from:
- `dependencies` (production deps — these are the most important)
- `devDependencies` (optional — include if user asks or if there are fewer than 30 production deps)

Collect the full list of dependency names.

---

## Step 3: Resolve Dependencies to GitHub Repos AND Collect Funding Info

For each dependency, query the npm registry to find the source GitHub repository **and** any funding metadata.

Use `web_fetch` on `https://registry.npmjs.org/{package-name}/latest` for each dependency.

From the JSON response, extract **two things**:

### 3a: Source GitHub repo
Extract `repository.url` — typically in the format `git+https://github.com/{owner}/{repo}.git` or `https://github.com/{owner}/{repo}`

Parse the URL to extract the GitHub `owner/repo`. Handle these common formats:
- `git+https://github.com/{owner}/{repo}.git` → `{owner}/{repo}`
- `https://github.com/{owner}/{repo}.git` → `{owner}/{repo}`
- `https://github.com/{owner}/{repo}` → `{owner}/{repo}`
- `git://github.com/{owner}/{repo}.git` → `{owner}/{repo}`
- `git+ssh://git@github.com/{owner}/{repo}.git` → `{owner}/{repo}`

### 3b: npm `funding` field (IMPORTANT — primary funding source)
Many packages declare funding directly in their package.json. The registry response may include a `funding` field in these formats:
- **String:** `"funding": "https://github.com/sponsors/sindresorhus"` → use as sponsor URL
- **Object:** `"funding": {"type": "opencollective", "url": "https://opencollective.com/express"}` → use the `url`
- **Array:** `"funding": [{"type": "...", "url": "..."}, ...]` → collect all URLs

**Record funding info from the registry immediately.** This is often the richest source — many projects have npm `funding` but no FUNDING.yml.

### Efficiency rules
- Process dependencies in batches of **10 at a time** to stay efficient.
- If a dependency has no `repository.url` or it doesn't point to GitHub, skip it and count it as "unresolvable".
- If there are more than **60 production dependencies**, sample the first 60 and note in the output that results are a sample.
- **Deduplicate** GitHub repos — multiple npm packages may come from the same repo.

---

## Step 4: Check for FUNDING.yml (supplementary)

For dependencies that did NOT have a `funding` field in the npm registry, check their GitHub repo for a FUNDING.yml.

For each such repo, use `get_file_contents` to fetch `{owner}/{repo}` path `.github/FUNDING.yml`.

Also check the org-level `.github` repo: `{org}/.github` path `.github/FUNDING.yml`.

If the file exists, it contains sponsorship information. If it returns 404, the project has no funding file.

### Efficiency rules
- **Skip repos that already have funding info from Step 3b** — no need to double-check.
- Process remaining repos in batches of **10 at a time**.
- Keep a running list of repos already checked to avoid duplicate lookups.

---

## Step 5: Parse Funding Information

### From npm `funding` field (Step 3b)
Parse the URL to determine the platform:
- Contains `github.com/sponsors/` → GitHub Sponsors (💜)
- Contains `opencollective.com/` → Open Collective (🟠)
- Contains `ko-fi.com/` → Ko-fi (☕)
- Contains `tidelift.com/` → Tidelift (🔗)
- Contains `patreon.com/` → Patreon (🔗)
- Other URLs → Custom (🔗)

### From FUNDING.yml (Step 4)
FUNDING.yml is a YAML file with these possible fields:

```yaml
github: [username]           # GitHub Sponsors — can be a string or list
open_collective: slug        # Open Collective
ko_fi: username              # Ko-fi
tidelift: platform/package   # Tidelift
liberapay: username          # Liberapay
custom: [url1, url2]         # Custom URLs
```

For each field present, generate the appropriate sponsor link:
- `github: ljharb` → `https://github.com/sponsors/ljharb`
- `github: [ljharb, other]` → links for each
- `open_collective: express` → `https://opencollective.com/express`
- `ko_fi: username` → `https://ko-fi.com/username`
- `custom: ["https://..."]` → use as-is

**Prioritize GitHub Sponsors** — this is the most actionable for GitHub users.

---

## Step 6: Group by Maintainer

After checking all repos, group sponsorable dependencies by their GitHub Sponsors username (from the `github` field in FUNDING.yml).

For each maintainer, track:
- Their GitHub Sponsors URL
- How many dependencies they maintain (from this repo's dependency tree)
- The names of those dependencies

Sort maintainers by **number of dependencies** (most impact first).

---

## Output Format

Always produce the report in this exact format:

```
## 💜 Sponsor Finder Report

**Repository:** {owner}/{repo}
**Scanned:** {current date}

---

### Summary

- **{total_deps}** dependencies found in package.json
- **{resolved}** resolved to GitHub repos ({unresolved} could not be resolved)
- **💜 {sponsorable}** of {resolved} dependencies have funding info ({percentage}%)
- **{maintainer_count}** unique funding destinations

---

### Sponsorable Dependencies

| Dependency | GitHub Repo | Funding |
|------------|-------------|---------|
| {dep_name} | [{owner}/{repo}](https://github.com/{owner}/{repo}) | 💜 [GitHub Sponsors](https://github.com/sponsors/{username}) |
| {dep_name} | [{owner}/{repo}](https://github.com/{owner}/{repo}) | 🟠 [Open Collective](https://opencollective.com/{slug}) |
| ... | ... | ... |

---

### Funding Destinations (by impact)

| Destination | Dependencies | Link |
|-------------|-------------|------|
| Open Collective: {name} | {count} deps ({dep1}, {dep2}, ...) | [opencollective.com/{name}](https://opencollective.com/{name}) |
| @{username} | {count} deps ({dep1}, ...) | [github.com/sponsors/{username}](https://github.com/sponsors/{username}) |
| ... | ... | ... |

---

### 💜 {percentage}% funding coverage · {destination_count} funding destinations · {sponsorable} dependencies
```

### Format notes
- In the **Funding** column, use 💜 for GitHub Sponsors, 🟠 for Open Collective, ☕ for Ko-fi, and 🔗 for other/custom platforms.
- If a dependency has multiple funding sources, show the GitHub Sponsors link preferentially.
- Only include sponsorable dependencies in the table (skip non-sponsorable ones).
- If zero dependencies are sponsorable, say so clearly and skip the tables.

---

## For Python Repositories (Best-Effort)

If the repo has `requirements.txt` but no `package.json`:

1. Parse `requirements.txt` for package names (ignore version specifiers, comments, `-r` includes).
2. For each package, use `web_fetch` on `https://pypi.org/pypi/{package}/json`.
3. From the response, check `info.project_urls` for a `Source`, `Repository`, or `Homepage` URL pointing to GitHub.
4. Proceed with FUNDING.yml check as normal.

---

## Error Handling

- If `get_file_contents` returns 404 for the repo itself → inform user the repo may not exist or is private.
- If `package.json` has no dependencies → report "No dependencies found."
- If npm registry is unreachable for a dep → skip it, note in output.
- If FUNDING.yml exists but can't be parsed → count as sponsorable but note "unparseable FUNDING.yml".
- If rate-limited → report what was completed and note that results are partial.
- Always produce a report even if partial — never fail silently.

---

## Important Rules

1. **Always use the GitHub MCP tools** (`get_file_contents`) and `web_fetch` — never try to clone or shell out.
2. **Be efficient** — batch registry lookups, deduplicate GitHub repos, and respect the sampling limits above.
3. **Focus on GitHub Sponsors** — this is the most actionable platform. Show others but prioritize `github` field.
4. **Be accurate** — only mark a dependency as sponsorable if you actually found and confirmed a FUNDING.yml file.
5. **Stay in scope** — report on funding availability, not on whether the user should sponsor. Don't make value judgments about which projects "deserve" sponsorship.
6. **Deduplicate** — Many npm packages share maintainers. Group by maintainer to show actual impact of sponsoring one person.
