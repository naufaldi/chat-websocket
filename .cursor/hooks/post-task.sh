#!/bin/bash

# post-task.sh - Cursor stop hook to run lint and tests on affected packages
# This script runs after the AI agent completes a task
#
# IMPORTANT: All diagnostic output must go to stderr (>&2)
# Only valid JSON should go to stdout at the end

# Read JSON input from stdin (Cursor hook input)
read -r input

# Parse status from input
status=$(echo "$input" | jq -r '.status // "unknown"')

# Log to stderr (never stdout - stdout must be valid JSON for Cursor)
echo "" >&2
echo "==========================================" >&2
echo "  Post-Task Validation Starting..." >&2
echo "==========================================" >&2
echo "" >&2
echo "Session status: $status" >&2
echo "" >&2

# Detect changed files using git
cd "$CURSOR_PROJECT_DIR" || exit 0

# Get list of changed files compared to HEAD
changed_files=$(git diff --name-only HEAD 2>/dev/null || git status --porcelain | awk '{print $2}')

if [ -z "$changed_files" ]; then
  echo "No files changed in this session. Skipping validation." >&2
  # Output valid JSON to stdout for Cursor
  echo '{}'
  exit 0
fi

echo "Changed files detected:" >&2
echo "$changed_files" | while read -r file; do
  echo "  - $file" >&2
done
echo "" >&2

# Determine affected packages (map paths to package names)
# Turbo uses package names from package.json, not directory paths
affected_packages=()

# Check for server changes (package name is @chat/server, not apps/server)
if echo "$changed_files" | grep -q "^apps/server/"; then
  affected_packages+=("@chat/server")
fi

# Check for web changes (package name is @chat/web)
if echo "$changed_files" | grep -q "^apps/web/"; then
  affected_packages+=("@chat/web")
fi

# Check for shared package changes (package name is @chat/shared)
if echo "$changed_files" | grep -q "^packages/shared/"; then
  if [[ ! " ${affected_packages[*]} " =~ " @chat/server " ]]; then
    affected_packages+=("@chat/server")
  fi
  if [[ ! " ${affected_packages[*]} " =~ " @chat/web " ]]; then
    affected_packages+=("@chat/web")
  fi
fi

# Check for db package changes (package name is @chat/db)
if echo "$changed_files" | grep -q "^packages/db/"; then
  if [[ ! " ${affected_packages[*]} " =~ " @chat/server " ]]; then
    affected_packages+=("@chat/server")
  fi
fi

if [ ${#affected_packages[@]} -eq 0 ]; then
  echo "No lintable/testable packages affected. Skipping validation." >&2
  echo '{}'
  exit 0
fi

echo "Affected packages:" >&2
for pkg in "${affected_packages[@]}"; do
  echo "  - $pkg" >&2
done
echo "" >&2

# Run lint and test for each affected package
exit_code=0
validation_errors=""

for pkg in "${affected_packages[@]}"; do
  echo "==========================================" >&2
  echo "  Processing: $pkg" >&2
  echo "==========================================" >&2
  echo "" >&2

  # Run lint - output to stderr only
  echo "Running lint for $pkg..." >&2
  lint_output=$(bun run lint --filter="$pkg" 2>&1)
  lint_exit=$?

  if [ $lint_exit -eq 0 ]; then
    echo "  Lint passed for $pkg" >&2
  else
    echo "  Lint failed for $pkg" >&2
    echo "$lint_output" >&2
    exit_code=1
    validation_errors="${validation_errors}Lint failed for $pkg. "
  fi
  echo "" >&2

  # Run test - output to stderr only
  echo "Running tests for $pkg..." >&2
  test_output=$(bun run test --filter="$pkg" 2>&1)
  test_exit=$?

  if [ $test_exit -eq 0 ]; then
    echo "  Tests passed for $pkg" >&2
  else
    echo "  Tests failed for $pkg" >&2
    echo "$test_output" >&2
    exit_code=1
    validation_errors="${validation_errors}Tests failed for $pkg. "
  fi
  echo "" >&2
done

echo "==========================================" >&2
if [ $exit_code -eq 0 ]; then
  echo "  All validations passed!" >&2
  echo "==========================================" >&2
  echo "" >&2
  # Output valid JSON to stdout
  echo '{}'
else
  echo "  Some validations failed." >&2
  echo "==========================================" >&2
  echo "" >&2
  # Output valid JSON with followup_message
  # Use jq if available, otherwise use printf with proper escaping
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg msg "$validation_errors" '{followup_message: $msg}'
  else
    # Fallback: manually construct JSON (basic escaping for newlines and quotes)
    escaped_msg=$(echo "$validation_errors" | sed 's/"/\\"/g' | tr '\n' ' ')
    printf '{"followup_message": "%s"}' "$escaped_msg"
  fi
fi

# Always exit 0 (don't block task completion)
exit 0
