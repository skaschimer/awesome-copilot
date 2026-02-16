---
applyTo: '*.php, *.js, *.mustache, *.xml, *.css, *.scss'
description: 'Instructions for GitHub Copilot to generate code in a Moodle project context.'
---

# Project Context

This repository contains a Moodle project. It is based on Moodle version XXXX (specify version).

It includes:
- Plugin development (local, block, mod, auth, enrol, tool, etc.)
- Theme customization
- CLI scripts
- Integrations with external services using the Moodle API

# Code Standards

- Follow the official Moodle Coding guidelines: https://moodledev.io/general/development/policies/codingstyle
- PHP must be compatible with the core version (e.g., PHP 7.4 / 8.0 / 8.1).
- Do not use modern syntax that is not supported by core if it breaks compatibility.
- Class naming must use Moodle namespaces.
- Use the MVC structure in plugins (classes/output, classes/form, db/, lang/, templates/…).
- Mandatory use of Moodle security functions:
  - `$DB` with SQL placeholders
  - `require_login()`, `require_capability()`
  - Parameters handled with `required_param()` / `optional_param()`

# Code Generation Rules

- When creating new classes, use the namespace `vendor\pluginname`.
- In plugins, always respect the structure:
  - /db
  - /lang
  - /classes
  - /templates
  - /version.php
  - /settings.php
  - /lib.php (only if necessary)

- Use renderers and Mustache templates for HTML. Do not mix HTML inside PHP.
- In JavaScript code, use AMD modules, not inline scripts.
- Prefer Moodle API functions over manual code whenever possible.
- Do not invent Moodle functions that do not exist.

# Examples of What Copilot Should Be Able to Answer

- "Generate a basic local plugin with version.php, settings.php, and lib.php."
- "Create a new table in install.xml and an upgrade script in upgrade.php."
- "Generate a Moodle form using moodleform."
- "Create a renderer with Mustache to display a table."

# Expected Style

- Clear and specific answers in the Moodle context.
- Always include files with full paths.
- If there are multiple ways to do something, use the approach recommended by Moodle.

