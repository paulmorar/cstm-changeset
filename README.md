# cstm-changeset

[![npm version](https://img.shields.io/npm/v/cstm-changeset.svg)](https://www.npmjs.com/package/cstm-changeset)
[![license](https://img.shields.io/npm/l/cstm-changeset.svg)](./LICENSE.md)

A wrapper around the [changesets](https://github.com/changesets/changesets) CLI that adds structured business context prompts to the `add` command — because changelogs should tell the _why_, not just the _what_.

## Why?

Changesets is a fantastic tool for managing versioning and changelogs. But out of the box, it only captures _what_ changed. When a teammate (or future you) looks back at the changelog, questions like these often go unanswered:

- What business value did this change bring?
- Did this affect clients? How?
- Was it tested? How thoroughly?

**cstm-changeset** fixes that by adding a quick interactive prompt after `changeset add`, appending structured context directly to your changeset file.

## Installation

```bash
npm install -D cstm-changeset
```

> **Note:** Requires Node.js 24+ and `@changesets/cli` as a peer dependency.

## Usage

Use `cstm-changeset` as a drop-in replacement for `changeset`:

```bash
npx cstm-changeset [command] [options]
```

### Commands

| Command             | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `add`               | Create a changeset with business context prompts **(default)** |
| `status`            | Show changeset status                                          |
| `version`           | Apply changesets and update package versions                   |
| `publish`           | Publish packages to npm                                        |
| `init`              | Initialize changesets in your project                          |
| `pre <enter\|exit>` | Enter or exit prerelease mode                                  |
| `tag`               | Create git tags for published packages                         |

All commands (except `add`) pass through directly to the underlying `changeset` CLI.

### Options

| Option          | Description         |
| --------------- | ------------------- |
| `-h, --help`    | Show help message   |
| `-v, --version` | Show version number |

### Examples

```bash
# Create a changeset with business context prompts
npx cstm-changeset
npx cstm-changeset add

# Check changeset status
npx cstm-changeset status

# Apply changesets and bump versions
npx cstm-changeset version

# Publish to npm
npx cstm-changeset publish

# Initialize changesets in a new project
npx cstm-changeset init
```

## The Add Flow

When you run `npx cstm-changeset` (or `npx cstm-changeset add`), the CLI will:

1. Run the standard `changeset add` flow (package selection, bump type, summary)
2. Prompt you with follow-up questions about business context
3. Append the answers to the newly created changeset file

### Business Context Questions

1. **What value does this change bring to the business?**
2. **Does this carry client impact?** (if yes, describe it)
3. **Has this been tested?** (if yes, describe how)

### Example Output

Here's what gets appended to your changeset:

```markdown
## Business Context

**Business value:** Improves checkout conversion by reducing page load time

**Client impact:** Yes — Clients using the legacy API will need to migrate

**Tested:** Yes — Ran load tests simulating 10k concurrent users
```

## Requirements

- Node.js **24+**
- `@changesets/cli` **2+** (peer dependency)

## License

[MIT](./LICENSE.md)
