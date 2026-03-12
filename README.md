# cstm-changeset

[![npm version](https://img.shields.io/npm/v/cstm-changeset.svg)](https://www.npmjs.com/package/cstm-changeset)
[![license](https://img.shields.io/npm/l/cstm-changeset.svg)](./LICENSE.md)

A CLI wrapper around `changeset add` that prompts for structured business context — because changelogs should tell the _why_, not just the _what_.

## Why?

[Changesets](https://github.com/changesets/changesets) is a fantastic tool for managing versioning and changelogs. But out of the box, it only captures _what_ changed. When a teammate (or future you) looks back at the changelog, questions like these often go unanswered:

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

Instead of running `npx changeset add`, run:

```bash
npx cstm-changeset
```

The CLI will:

1. Run the standard `changeset add` flow (package selection, bump type, summary)
2. Prompt you with a few follow-up questions about business context
3. Append the answers to the newly created changeset file

## Example

Here's what gets appended to your changeset:

```markdown
## Business Context

**Business value:** Improves checkout conversion by reducing page load time

**Client impact:** Yes — Clients using the legacy API will need to migrate

**Tested:** Yes — Ran load tests simulating 10k concurrent users
```

## How It Works

1. Detects your `.changeset` directory
2. Runs `npx changeset add` under the hood
3. Identifies the newly created changeset file
4. Asks three quick questions:
   - What value does this change bring to the business?
   - Does this carry client impact? (if yes, describe it)
   - Has this been tested? (if yes, describe how)
5. Appends a "Business Context" section to the changeset

## Requirements

- Node.js **24+**
- `@changesets/cli` **2+** (peer dependency)

## License

[MIT](./LICENSE.md)
