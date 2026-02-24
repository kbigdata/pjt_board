#!/bin/bash
# scripts/hooks/lint-changed.sh
# PostToolUse에서 파일 수정 후 자동 실행

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# TypeScript/JavaScript 파일만 처리
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  # Prettier 포맷팅
  npx prettier --write "$FILE_PATH" 2>/dev/null

  # ESLint 자동 수정
  npx eslint --fix "$FILE_PATH" 2>/dev/null
fi

exit 0
