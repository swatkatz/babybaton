---
name: plan-issue
description: Take an open GitHub issue and plan its implementation. Reads the issue spec, explores the repo, writes a detailed plan with a TODO list, iterates with the user, then posts the finalized plan as a comment on the issue.
argument-hint: <issue number or URL>
allowed-tools: Bash(gh *), Read, Glob, Grep, Task, EnterPlanMode, ExitPlanMode, AskUserQuestion
---

# Plan a GitHub Issue Implementation

Given an open GitHub issue, create a detailed implementation plan by analyzing the issue requirements against the current codebase, then post the finalized plan as a comment on the issue.

## Input

The user will provide one of:
- A GitHub issue number (e.g., `42`)
- A GitHub issue URL
- A reference to an issue by title or description

Use `$ARGUMENTS` as the starting context if provided.

## Step 1: Fetch the Issue

Retrieve the full issue details:
```
gh issue view <number> --json number,title,body,labels,comments,assignees
```

Display the issue title and number to the user so they can confirm it's the right one.

## Step 2: Analyze the Issue

Read and understand the issue's:
- Summary and expected behavior
- Requirements checklist
- Architecture considerations
- Any existing comments with additional context

## Step 3: Explore the Codebase

Use plan mode (`EnterPlanMode`) to thoroughly explore the codebase and understand:
- **Relevant existing code**: Find files, components, services, and modules related to the issue
- **Patterns and conventions**: Understand how similar features are built in this repo
- **Data models**: Check database schemas, API types, and state management relevant to the feature
- **Dependencies**: Identify libraries, services, or external APIs involved
- **Test patterns**: See how existing features are tested

Be thorough — read the actual code, don't just list file names.

## Step 4: Write the Implementation Plan

Draft a plan using this structure:

```markdown
## Implementation Plan (TDD) for #<number>: <title>

### Overview
Brief summary of the approach — 2-3 sentences on the strategy.

### Key Files
List the existing files that will be modified and any new files to create, with brief descriptions of the changes.

| File | Action | Description |
|------|--------|-------------|
| `path/to/file.ts` | Modify | Add new handler for X |
| `path/to/new-file.ts` | Create | New service for Y |

### Implementation (TDD)
Group changes into logical phases. Each phase follows Red-Green:
write failing tests first, then implement to make them pass.

#### Phase 1: <name>

**Red — Write failing tests:**
- [ ] Test: `TestName` — description of what it asserts
- [ ] Test: `TestName2` — description of what it asserts
- [ ] Run tests — confirm they fail

**Green — Implement:**
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Run tests — confirm they pass

#### Phase 2: <name>
(Repeat Red-Green pattern for each logical group of changes)

### Edge Cases & Error Handling
- List edge cases to handle
- Error states and how to handle them

### Final Verification
- [ ] Run full test suite — all tests pass (new + existing)
- [ ] Build succeeds
- [ ] Manual smoke test steps if applicable

### Open Questions
(If any) Questions that need answering before or during implementation.
```

### Writing Principles
- **Concrete and specific**: Reference actual file paths, function names, and patterns from the repo
- **Ordered logically**: Steps should be in a sensible implementation order (e.g., data model before UI)
- **Right-sized steps**: Each TODO item should be ~one meaningful unit of work, not too granular (not "add import statement") and not too broad (not "build the feature")
- **Grounded in the codebase**: The plan should reflect how this repo actually works, not generic advice

## Step 5: Iterate with the User

Present the plan and ask the user to review it. Use `AskUserQuestion` or natural conversation to:
- Get feedback on the approach
- Clarify any open questions
- Adjust scope, ordering, or details
- Add or remove steps

Continue iterating until the user is satisfied. Do NOT post the plan to GitHub until the user explicitly approves.

## Step 6: Post to GitHub

**CRITICAL: This is the final step of the skill. After `ExitPlanMode` approval, you MUST post the plan to GitHub before doing anything else. Do NOT begin implementation — that is a separate task.**

Once the user approves, post the plan as a comment on the issue:
```
gh issue comment <number> --body "$(cat <<'EOF'
<plan content>
EOF
)"
```

Then label the issue as ready to implement:
```
gh issue edit <number> --add-label "ready to implement"
```

Confirm the comment was posted and the label was added by showing the issue URL.

**The skill ends here.** Implementation is a separate step the user will initiate.

## Important

- NEVER post the plan to GitHub without explicit user approval.
- NEVER begin implementation as part of this skill — posting the plan is the terminal action.
- ALWAYS explore the actual codebase — don't write a generic plan based only on the issue description.
- If the issue is vague or missing requirements, flag this to the user and suggest clarifying the issue first.
- If the issue is too large for a single implementation plan, suggest breaking it into sub-issues.
