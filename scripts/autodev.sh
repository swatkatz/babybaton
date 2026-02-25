#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_USER="$(gh api user --jq '.login')"

cd "$REPO_DIR"

# Retry wrapper for claude CLI calls that may hit transient API errors (500, 429, 529)
# Usage: claude_with_retry <claude args...>
claude_with_retry() {
  local max_attempts=5
  local attempt=1
  local backoff=30

  while true; do
    local output
    local exit_code=0
    output=$(claude "$@" 2>&1) || exit_code=$?

    if [ "$exit_code" -eq 0 ]; then
      echo "$output"
      return 0
    fi

    # Check if the error is a retryable API error (500, 429, 529)
    if echo "$output" | grep -qE 'API Error: (500|429|529)'; then
      if [ "$attempt" -ge "$max_attempts" ]; then
        echo "ERROR: Claude API failed after ${max_attempts} attempts. Last output:"
        echo "$output"
        return 1
      fi
      echo "  Claude API error (attempt ${attempt}/${max_attempts}). Retrying in ${backoff}s..."
      sleep "$backoff"
      attempt=$((attempt + 1))
      backoff=$((backoff * 2))
    else
      # Non-retryable error — fail immediately
      echo "$output"
      return "$exit_code"
    fi
  done
}

echo "Starting autodev loop as @${GITHUB_USER} in ${REPO_DIR}"

while true; do
  # -------------------------------------------------------
  # Step 1: Find an issue ready to implement
  # -------------------------------------------------------
  echo ""
  echo "=== Looking for an issue to implement... ==="

  issue_json=$(
    gh issue list \
      --label "ready to implement" \
      --state open \
      --json number,title,url,labels \
    | jq '[.[] | select(.labels | map(.name) | index("in development") | not)]'
  )

  issue_count=$(echo "$issue_json" | jq 'length')

  # -------------------------------------------------------
  # Step 2: If none found, sleep and retry
  # -------------------------------------------------------
  if [ "$issue_count" -eq 0 ]; then
    echo "NO ISSUES FOUND — sleeping 60s..."
    sleep 60
    continue
  fi

  issue_number=$(echo "$issue_json" | jq -r '.[0].number')
  issue_title=$(echo "$issue_json" | jq -r '.[0].title')
  issue_url=$(echo "$issue_json" | jq -r '.[0].url')

  echo "Found issue #${issue_number}: ${issue_title}"
  echo "  ${issue_url}"

  # -------------------------------------------------------
  # Step 3: Label "in development" and assign to me
  # -------------------------------------------------------
  echo "=== Claiming issue #${issue_number}... ==="
  gh issue edit "$issue_number" --add-label "in development" --add-assignee "$GITHUB_USER"

  # -------------------------------------------------------
  # Step 4 & 5: Build the implementation and validate
  # -------------------------------------------------------
  echo "=== Implementing issue #${issue_number}... ==="

  branch_name="autodev/issue-${issue_number}"
  git checkout main
  git pull --ff-only
  git checkout -b "$branch_name"

  claude_with_retry -p "$(cat <<EOF
You are implementing GitHub issue #${issue_number}: "${issue_title}"
URL: ${issue_url}

Steps:
1. Read the issue details:  gh issue view ${issue_number} --json number,title,body,labels,comments
2. Understand the specification and any implementation plan posted as comments on the issue.
3. Explore the codebase to understand relevant code, patterns, and conventions.
4. Implement the changes described in the issue and its implementation plan.
5. After implementation, validate your work:
   - Run the test suite and fix any failures
   - Run the linter and fix any issues
   - Make sure the app builds without errors
6. Commit all your changes with a clear commit message referencing #${issue_number}.

Do NOT create a PR — just commit your work to the current branch.
EOF
)" \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep,Task" \
    --output-format text

  # -------------------------------------------------------
  # Step 6 & 7: Create a PR directly with gh
  # -------------------------------------------------------
  echo "=== Creating PR for issue #${issue_number}... ==="

  git push -u origin "$branch_name"

  # Build PR body from the commits on this branch
  commit_log=$(git log main.."$branch_name" --pretty=format:"- %s" 2>/dev/null || echo "- Implementation for #${issue_number}")

  pr_url=$(gh pr create \
    --base main \
    --head "$branch_name" \
    --title "Fix #${issue_number}: ${issue_title}" \
    --body "$(cat <<EOF
## Summary

Closes #${issue_number}

${commit_log}

## Test plan

- [ ] Verify the changes address the issue requirements
- [ ] CI checks pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)")

  echo "PR created: ${pr_url}"

  pr_number=$(echo "$pr_url" | grep -o '[0-9]*$')

  # -------------------------------------------------------
  # Step 8 & 9: Poll CI and iterate until it passes
  # -------------------------------------------------------
  echo "=== Waiting for CI checks on PR #${pr_number}... ==="

  max_fix_attempts=3
  fix_attempt=0

  while true; do
    # Wait for checks to complete
    while true; do
      sleep 30
      check_status=$(gh pr checks "$pr_number" --json name,state --jq '[.[].state] | unique | if all(. == "SUCCESS") then "pass" elif any(. == "PENDING") then "pending" else "fail" end' 2>/dev/null || echo "pending")

      echo "  CI status: ${check_status}"

      if [ "$check_status" != "pending" ]; then
        break
      fi
    done

    if [ "$check_status" = "pass" ]; then
      echo "=== CI passed! Merging PR #${pr_number}... ==="
      gh pr merge "$pr_number" --squash --delete-branch
      echo "PR #${pr_number} merged successfully."

      # Clean up: remove "in development" label
      gh issue edit "$issue_number" --remove-label "in development"
      break
    fi

    # CI failed — attempt to fix
    fix_attempt=$((fix_attempt + 1))
    echo "=== CI failed (attempt ${fix_attempt}/${max_fix_attempts}). Asking Claude to fix... ==="

    if [ "$fix_attempt" -gt "$max_fix_attempts" ]; then
      echo "=== Max fix attempts reached. Leaving PR open for manual review. ==="
      gh pr comment "$pr_number" --body "CI has failed after ${max_fix_attempts} automated fix attempts. Needs manual review. @${GITHUB_USER}"
      break
    fi

    git checkout "$branch_name"
    git pull --ff-only origin "$branch_name"

    claude_with_retry -p "$(cat <<EOF
The CI checks on PR #${pr_number} (for issue #${issue_number}) have failed.

Steps:
1. Check which CI checks failed:  gh pr checks ${pr_number}
2. Read the failure logs:  gh run view --log-failed  (find the run ID from the checks)
3. Understand what went wrong — it could be test failures, lint errors, build errors, or type errors.
4. Fix the issues in the code.
5. Re-run validation locally (tests, lint, build) to confirm your fix works.
6. Commit and push your fixes to the ${branch_name} branch.

Be thorough — make sure all checks will pass before pushing.
EOF
)" \
      --allowedTools "Bash,Read,Edit,Write,Glob,Grep,Task" \
      --output-format text

    git push origin "$branch_name"
  done

  # Back to main for next iteration
  git checkout main

  echo "=== Done with issue #${issue_number}. Looping back... ==="
done
