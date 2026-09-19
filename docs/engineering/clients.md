# 接入与排障

## Codex

先在仓库运行 `npm ci`、`npm run build`、`npm run smoke`。用本机实际 Node 路径和仓库绝对路径注册可减少 PATH 差异：

```powershell
codex mcp add diverdict -- "C:\path\to\node.exe" "E:\DEV\diverdict\dist\cli.js"
codex mcp get diverdict
```

macOS / Linux：

```sh
codex mcp add diverdict -- /absolute/path/to/node /absolute/path/to/diverdict/dist/cli.js
```

也可以编辑 Codex 的用户配置：

```toml
[mcp_servers.diverdict]
command = "node"
args = ["/absolute/path/to/diverdict/dist/cli.js"]
```

官方说明中，CLI 与桌面客户端共享 MCP 配置。默认位置为 `~/.codex/config.toml`；设置 `CODEX_HOME` 时使用该目录。新开任务读取工具目录；若旧客户端没有刷新，重启客户端。具体配置见 [Codex 官方 MCP 文档](https://developers.openai.com/codex/mcp)。

使用请求：

> 用 diverdict 对以下问题做完整策略合议：……。背景：……。执行三家并行独立出策、三家质询、贾诩收敛，再给我最终方略和最脆弱的一环。

用户不必重新复述此前已经提供的背景。宿主调用 `strategize_begin` 前，必须将当前需求写入 `problem`，将当前可用对话及已读材料中的相关背景写入 `context`，不能省略或传空白。例如，用户此前说过“两人团队、六周窗口”，后来更正为“四周”，最后只问“先试点还是公开发布”，应提交两人团队和最新四周期限，而不是只提交问题或旧期限。材料必须让未见过对话的实例也能理解，不能只给“刚才的方案”、文件路径或链接。[完整背景传递规则](../architecture/protocol.md)

确无额外背景时明确说明，不编造。关键背景缺失且影响判断时才先澄清，不重复询问已有信息；用户要求直接判断时注明未知与信息局限后继续。服务说明、开始工具描述和字段说明均在调用前提供这项指引，但服务本身无法读取宿主历史或验证信息是否完整。旧调用方需要补上 `context`；接入更新后刷新工具目录或重连 MCP。

宿主可选择原生隔离子代理或独立无头会话。**本项目不要求某个固定的宿主工具名称。** 无头模式若启用，只能作为宿主自身的执行机制，服务仍不持有模型认证或直接调用模型。

不要把以下情况视为合规隔离：

- 主对话自己连续扮演三家。
- 子实例继承了宿主全部历史或其他角色的提示词。
- 只读沙箱仍允许实例读取文件、运行命令或联网。
- 子实例的默认模型不同于本轮其他实例。

服务不会要求宿主提交“我用了什么机制”的报告。若宿主确实没有所需能力，它应如实说明当前无法执行，而不是返回伪造的三家结果。

## 通用 MCP 客户端

多数客户端接受类似以下本地 stdio 配置，具体顶层键以客户端文档为准：

```json
{
  "mcpServers": {
    "diverdict": {
      "command": "node",
      "args": ["/absolute/path/to/diverdict/dist/cli.js"]
    }
  }
}
```

这只建立协议连接，不证明该客户端能完成 3+3+1 隔离生成。未对所有品牌客户端做兼容性承诺；新增已验证接入方式请附上版本、操作系统和复现步骤。

## 本地安装包

```sh
npm pack
npm install --global /absolute/path/to/diverdict-0.1.0.tgz
diverdict --version
```

全局 bin 可用于支持该启动方式的客户端。Windows 上为避免 `.cmd` 与 PATH 差异，建议仍用 `node` 加安装包 `dist/cli.js` 的绝对路径。`npm run package:check` 会在独立临时目录安装 tarball 并运行协议烟测。

## 排障

| 现象 | 排查 |
| --- | --- |
| 启动后终端没有输出 | 默认等待 stdio MCP 输入，这是正常行为；用 `npm run smoke` 测试 |
| 找不到入口 | 先 build；检查绝对路径、Node 22+ 和桌面客户端的 PATH |
| Codex 没显示工具 | `codex mcp get diverdict`；确认 CODEX_HOME；新开任务或重启客户端 |
| SESSION_NOT_FOUND | 会话过期、服务重启或换了连接；当前连接重新 begin |
| 第三个工具后没有答案 | 宿主漏执行贾诩 job；要求执行该 job，而不是再次调用 verdict |
| 方略过长 | 服务不截断；减少本次任务材料范围后重启合议 |
| 模型额度不足 | 额度来自宿主；服务没有 API 兜底通道 |
| 超过两小时 | 会话固定过期；重新开始，重试不续期 |

移除接入：`codex mcp remove diverdict`。这只移除配置，不删除仓库。
