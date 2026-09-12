# GPT / Codex 多账号额度监控

运行 `npm start`，打开 `http://127.0.0.1:8787`。

在页面中填写账号标签、Refresh Token 和可选的 ChatGPT Account ID。程序用 RT 向 OpenAI OAuth 换取短期 access token，再读取该账号的 5 小时与周额度。

账号凭据保存在本目录 `accounts.json`，不要上传或分享该文件。额度接口属于未公开的内部接口，OpenAI 修改接口后可能需要同步调整。
