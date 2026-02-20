---
name: file-issue
description: File a GitHub issue for a product feature or bug. Use when the user wants to create, draft, or file a GitHub issue. Issues focus on product requirements and user-facing behavior, not implementation details.
argument-hint: [description or context]
allowed-tools: Bash(gh *)
---

# File a GitHub Issue

Create a single GitHub issue scoped to one implementation task. The issue should describe **what** the product should do, not **how** to build it.

## Input

The user will provide one of:
- A description of a feature or bug
- A product spec or excerpt to distill into an issue
- A bug report or user feedback
- Context from code, logs, or screenshots

Use `$ARGUMENTS` as the starting context if provided.

## Writing the Issue

### Title
- Short, specific, action-oriented (e.g., "Add push notification when partner logs a feeding")
- Written from the product perspective, not the code perspective
- Bad: "Add WebSocket handler for feed events" / Good: "Show real-time updates when partner logs activity"

### Body Structure

Use this template:

```markdown
## Summary
One or two sentences describing the feature or bug from the user's perspective.

## Current Behavior
(For bugs) What happens today. Include reproduction steps if known.
(For features) What the experience is like without this feature, or "N/A" for net-new work.

## Expected Behavior
What should happen. Be specific about user-facing outcomes.

## Requirements
- [ ] Concrete, testable requirements written as checklist items
- [ ] Each item describes a user-visible behavior or outcome
- [ ] Include edge cases and error states the user would encounter

## Design Notes
(Optional) Mockups, screenshots, or descriptions of how it should look/feel.

## Architecture Considerations
(Optional, only if critical) Include ONLY if there are important technical constraints
that affect the product direction — e.g., "Requires offline support" or "Must work
without a backend connection." Do NOT include implementation specifics like
"use Redux" or "add a new database column."

## Context
(Optional) Links to related issues, user feedback, product specs, or conversations.
```

### Principles
- **Product voice**: Write as a PM, not an engineer. Focus on user outcomes.
- **Right-sized**: Each issue should be completable as a single implementation task by Claude Code — not too big (epic-level), not too small (a one-line tweak).
- **Testable**: Every requirement should be verifiable from the user's perspective.
- **No implementation leakage**: Don't specify frameworks, libraries, file paths, function names, or architecture unless it's in the "Architecture Considerations" section and genuinely affects product direction.

## Metadata

After drafting the body, determine appropriate metadata:

- **Labels**: Suggest from existing repo labels. Use `gh label list` to see available labels. Suggest creating new ones if needed (e.g., `bug`, `feature`, `enhancement`, `ux`).
- **Milestone**: Check `gh api repos/{owner}/{repo}/milestones` for existing milestones. Suggest one if appropriate.
- **Assignees**: Ask the user if they want to assign someone.
- **Project**: Check `gh project list` for available projects. Suggest one if appropriate.

## Workflow

1. **Draft**: Write the full issue (title, body, metadata) and present it to the user.
2. **Iterate**: The user may request changes. Revise and re-present.
3. **File**: Only after the user approves, create the issue using `gh issue create`.
4. **Confirm**: Show the created issue URL.

When filing, use this pattern:
```
gh issue create --title "..." --body "$(cat <<'EOF'
...
EOF
)" --label "..." [--milestone "..." --assignee "..." --project "..."]
```

## Important

- NEVER file an issue without showing the user a preview first and getting explicit approval.
- If the user's description is vague, ask clarifying questions about the product behavior before drafting.
- If the user starts describing implementation details, gently reframe toward product requirements — unless they're genuine architecture constraints.
