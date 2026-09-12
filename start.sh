#!/usr/bin/env bash
set -e
cd "$(dirname "$(readlink -f "$0")")"

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js，请先安装 Node.js 18+"
  exit 1
fi

if ! curl -fsS http://127.0.0.1:8787/api/accounts >/dev/null 2>&1; then
  nohup node server.js > monitor.log 2>&1 &
fi

for i in {1..20}; do
  if curl -fsS http://127.0.0.1:8787/api/accounts >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

URL="http://127.0.0.1:8787"
if command -v wslview >/dev/null 2>&1; then
  wslview "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
else
  echo "服务已启动：$URL"
fi
