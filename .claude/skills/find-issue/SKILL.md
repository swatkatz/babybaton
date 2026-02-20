---
name: find-issue
description: Find an open GitHub issue that is ready to implement
allowed-tools: Bash(gh *)
---

# Find an Issue Ready to Implement

Find the next open GitHub issue labeled "ready to implement" that is not already "in development", and print its URL.

## Steps

1. Fetch open issues with the "ready to implement" label, including their labels:
```
gh issue list --label "ready to implement" --state open --json number,title,url,labels
```

2. Filter out any issues that also have the "in development" label using `jq`:
```
gh issue list --label "ready to implement" --state open --json number,title,url,labels | jq '[.[] | select(.labels | map(.name) | index("in development") | not)]'
```

3. If the filtered list is non-empty, print the title and URL of the first matching issue.

4. If no issues match, print exactly: `NO ISSUES FOUND`
