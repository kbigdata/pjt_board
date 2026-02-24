#!/bin/bash
# scripts/hooks/block-dangerous.sh
# PreToolUse에서 위험 명령어 차단

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

DANGEROUS_PATTERNS=(
  "rm -rf /"
  "rm -rf /*"
  "DROP DATABASE"
  "DROP TABLE"
  "TRUNCATE"
  "docker system prune -af"
  "> /dev/sda"
  "mkfs"
  ":(){:|:&};:"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qi "$pattern"; then
    echo "[BLOCKED] 위험 명령어 감지: $COMMAND" >&2
    exit 2  # exit 2 = 명령 차단
  fi
done

# 운영 DB 직접 접근 차단 (개발 DB만 허용)
if echo "$COMMAND" | grep -q "5432" && echo "$COMMAND" | grep -qi "psql\|pg_dump\|prisma"; then
  echo "[BLOCKED] 운영 DB 직접 접근 금지. 개발 DB(:5433)를 사용하세요." >&2
  exit 2
fi

exit 0
