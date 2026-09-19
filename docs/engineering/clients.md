# 接入与排障

源码构建与 CLI 注册见 [README](../../README.md#安装)。以下配置命令均在已构建的仓库根目录执行。

## Codex 配置文件

无 CLI 时可生成包含实际绝对路径的 TOML 配置：

```sh
node -e "const p=require('node:path'); console.log('[mcp_servers.diverdict]\ncommand = '+JSON.stringify(process.execPath)+'\nargs = ['+JSON.stringify(p.resolve('dist/cli.js'))+']')"
```

将 `mcp_servers.diverdict` 项合并到目标配置，保留其他设置：

- 用户级：默认 `~/.codex/config.toml`；设置 `CODEX_HOME` 时使用该目录。CLI 与桌面客户端共享此配置。
- 项目级：目标工作项目的 `.codex/config.toml`，仅在受信任项目中生效。

配置项及作用域见 [Codex 官方 MCP 文档](https://developers.openai.com/zh-Hans/docs/extend/mcp)。

## 通用 MCP 客户端

生成 stdio 服务配置：

```sh
node -e "console.log(JSON.stringify({command:process.execPath,args:[require('node:path').resolve('dist/cli.js')]},null,2))"
```

将输出作为名为 `diverdict` 的服务项，按宿主配置格式合并；例如部分客户端使用 `mcpServers.diverdict`。Node 和入口路径必须能被宿主访问。

连接后确认三个工具可调用，并读取最新 schema。完整生成还要求宿主支持同模型的独立实例，无历史继承、工具、文件或网络权限。原生子代理或独立无头会话均可，具体机制由宿主选择；只读文件沙箱不满足无工具权限要求。不具备隔离能力的宿主无法执行完整合议。

背景传递、材料归属与三轮执行见 [调用协议](../../README.md#调用协议)；具体字段和错误码见[完整协议](../architecture/protocol.md)。

## 本地安装包

```sh
npm pack
npm install --global /absolute/path/to/diverdict-0.1.0.tgz
diverdict --version
```

全局 bin 可用于支持该启动方式的客户端。Windows 建议用 Node 和安装包 `dist/cli.js` 的绝对路径，避免 `.cmd` 与 PATH 差异。

## 排障

| 现象 | 排查 |
| --- | --- |
| 启动后终端没有输出 | 默认等待 stdio MCP 输入；用 `npm run smoke` 测试 |
| 找不到入口 | 检查构建结果、绝对路径、Node 22+ 和桌面客户端的 PATH |
| Codex 没显示工具 | 用 `codex mcp get diverdict --json` 检查配置位置、启用状态、工具过滤与路径；刷新工具目录，必要时新开任务或重启客户端 |
| `SESSION_NOT_FOUND` | 会话过期、服务重启或换了连接；在当前连接重新 begin |
| 第三个工具后没有答案 | 尚未执行返回的贾诩 job；执行该 job，无需再次调用 verdict |
| 方略过长 | 缩小任务范围后重新开始；不得截断原文或用摘要替代 |
| 模型额度不足 | 额度来自宿主；服务没有 API 兜底通道 |
| 超过两小时 | 会话固定过期；重新开始，重试不续期 |

移除接入：`codex mcp remove diverdict`。这只移除配置，不删除仓库。
