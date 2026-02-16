#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");

const VALID_ITEM_KINDS = ["prompt", "agent", "instruction", "skill", "hook"];

// Validation functions
function validateName(name, folderName) {
  const errors = [];
  if (!name || typeof name !== "string") {
    errors.push("name is required and must be a string");
    return errors;
  }
  if (name.length < 1 || name.length > 50) {
    errors.push("name must be between 1 and 50 characters");
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push("name must contain only lowercase letters, numbers, and hyphens");
  }
  if (name !== folderName) {
    errors.push(`name "${name}" must match folder name "${folderName}"`);
  }
  return errors;
}

function validateDescription(description) {
  if (!description || typeof description !== "string") {
    return "description is required and must be a string";
  }
  if (description.length < 1 || description.length > 500) {
    return "description must be between 1 and 500 characters";
  }
  return null;
}

function validateVersion(version) {
  if (!version || typeof version !== "string") {
    return "version is required and must be a string";
  }
  return null;
}

function validateTags(tags) {
  if (tags === undefined) return null;
  if (!Array.isArray(tags)) {
    return "tags must be an array";
  }
  if (tags.length > 10) {
    return "maximum 10 tags allowed";
  }
  for (const tag of tags) {
    if (typeof tag !== "string") {
      return "all tags must be strings";
    }
    if (!/^[a-z0-9-]+$/.test(tag)) {
      return `tag "${tag}" must contain only lowercase letters, numbers, and hyphens`;
    }
    if (tag.length < 1 || tag.length > 30) {
      return `tag "${tag}" must be between 1 and 30 characters`;
    }
  }
  return null;
}

function validateFeatured(featured) {
  if (featured === undefined) return null;
  if (typeof featured !== "boolean") {
    return "featured must be a boolean";
  }
  return null;
}

function validateDisplay(display) {
  if (display === undefined) return null;
  if (typeof display !== "object" || Array.isArray(display) || display === null) {
    return "display must be an object";
  }
  if (display.ordering !== undefined) {
    if (!["manual", "alpha"].includes(display.ordering)) {
      return "display.ordering must be 'manual' or 'alpha'";
    }
  }
  if (display.show_badge !== undefined) {
    if (typeof display.show_badge !== "boolean") {
      return "display.show_badge must be a boolean";
    }
  }
  return null;
}

function validateItems(items) {
  if (items === undefined) return [];
  const errors = [];
  if (!Array.isArray(items)) {
    errors.push("items must be an array");
    return errors;
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== "object") {
      errors.push(`items[${i}] must be an object`);
      continue;
    }
    if (!item.path || typeof item.path !== "string") {
      errors.push(`items[${i}] must have a path string`);
    }
    if (!item.kind || typeof item.kind !== "string") {
      errors.push(`items[${i}] must have a kind string`);
    } else if (!VALID_ITEM_KINDS.includes(item.kind)) {
      errors.push(
        `items[${i}] kind must be one of: ${VALID_ITEM_KINDS.join(", ")}`
      );
    }
    // Validate referenced path exists relative to repo root
    if (item.path && typeof item.path === "string") {
      const filePath = path.join(ROOT_FOLDER, item.path);
      if (!fs.existsSync(filePath)) {
        errors.push(`items[${i}] file does not exist: ${item.path}`);
      }
    }
  }
  return errors;
}

function validatePlugin(folderName) {
  const pluginDir = path.join(PLUGINS_DIR, folderName);
  const errors = [];

  // Rule 1: Must have .github/plugin/plugin.json
  const pluginJsonPath = path.join(pluginDir, ".github", "plugin", "plugin.json");
  if (!fs.existsSync(pluginJsonPath)) {
    errors.push("missing required file: .github/plugin/plugin.json");
    return errors;
  }

  // Rule 2: Must have README.md
  const readmePath = path.join(pluginDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    errors.push("missing required file: README.md");
  }

  // Parse plugin.json
  let plugin;
  try {
    const raw = fs.readFileSync(pluginJsonPath, "utf-8");
    plugin = JSON.parse(raw);
  } catch (err) {
    errors.push(`failed to parse plugin.json: ${err.message}`);
    return errors;
  }

  // Rule 3 & 4: name, description, version
  const nameErrors = validateName(plugin.name, folderName);
  errors.push(...nameErrors);

  const descError = validateDescription(plugin.description);
  if (descError) errors.push(descError);

  const versionError = validateVersion(plugin.version);
  if (versionError) errors.push(versionError);

  // Rule 5: tags
  const tagsError = validateTags(plugin.tags);
  if (tagsError) errors.push(tagsError);

  // Rule 8: featured
  const featuredError = validateFeatured(plugin.featured);
  if (featuredError) errors.push(featuredError);

  // Rule 9: display
  const displayError = validateDisplay(plugin.display);
  if (displayError) errors.push(displayError);

  // Rule 6 & 7: items
  const itemErrors = validateItems(plugin.items);
  errors.push(...itemErrors);

  return errors;
}

// Main validation function
function validatePlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.log("No plugins directory found - validation skipped");
    return true;
  }

  const pluginDirs = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (pluginDirs.length === 0) {
    console.log("No plugin directories found - validation skipped");
    return true;
  }

  console.log(`Validating ${pluginDirs.length} plugins...\n`);

  let hasErrors = false;
  const seenNames = new Set();

  for (const dir of pluginDirs) {
    console.log(`Validating ${dir}...`);

    const errors = validatePlugin(dir);

    if (errors.length > 0) {
      console.error(`❌ ${dir}:`);
      errors.forEach((e) => console.error(`   - ${e}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${dir} is valid`);
    }

    // Rule 10: duplicate names
    if (seenNames.has(dir)) {
      console.error(`❌ Duplicate plugin name "${dir}"`);
      hasErrors = true;
    } else {
      seenNames.add(dir);
    }
  }

  if (!hasErrors) {
    console.log(`\n✅ All ${pluginDirs.length} plugins are valid`);
  }

  return !hasErrors;
}

// Run validation
try {
  const isValid = validatePlugins();
  if (!isValid) {
    console.error("\n❌ Plugin validation failed");
    process.exit(1);
  }
  console.log("\n🎉 Plugin validation passed");
} catch (error) {
  console.error(`Error during validation: ${error.message}`);
  process.exit(1);
}
