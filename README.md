# 异策 · Diverdict

**三家独立出策，交叉质询，一锤定策。**

[English](README.en.md) · [文档入口](docs/README.md) · [接入指南](docs/engineering/clients.md) · [工具协议](docs/architecture/protocol.md) · [架构](docs/architecture/README.md) · [贡献](CONTRIBUTING.md) · [MIT](LICENSE)

异策（Diverdict）是一个轻量的 MCP server。战略家看时间，纵横家看关系，阴谋家看风险；三家各自出策、交叉质询，再由贾诩结合全部材料给出最终方略及最脆弱的一环。

模型、认证和生成能力来自你正在使用的智能体。服务只负责提示词拼装与流程推进，无模型 API、无 API key、无遥测、无远程后端。

```mermaid
flowchart LR
    Q[问题与背景] --> A[三家并行独立出策]
    A --> B[三家并行交叉质询]
    B --> C[贾诩独立收敛]
    C --> D[最终方略 + 最脆弱的一环]
```

## 五分钟接入 Codex

需要 **Node.js 22+**、npm，以及已经登录的 Codex。下载或克隆本仓库后，在仓库根目录运行：

```sh
npm ci
npm run build
npm run smoke
```

注册本地入口。路径必须是你机器上的**绝对路径**，不依赖 Codex 当前工作目录：

```sh
codex mcp add diverdict -- node /absolute/path/diverdict/dist/cli.js
```

Windows 示例：

```powershell
codex mcp add diverdict -- node E:\DEV\diverdict\dist\cli.js
codex mcp get diverdict
```

在 Codex 中新开一个任务；若当前客户端尚未刷新 MCP 配置，重新启动客户端。然后说：

> 用 diverdict 帮我做一次策略合议：我们是一个两人团队，已有可用原型，只有六周时间。应该先服务三家明确有需求的客户，还是先公开发布？请执行完整的独立出策、质询、贾诩收敛流程，给出最终方略和最脆弱的一环。

Codex 负责选择自己的隔离执行机制并完成生成，不需要你手工搬运三家的答案。工具目录中应出现 `strategize_begin`、`strategize_submit`、`strategize_verdict`。

**接入 MCP 不等于获得隔离能力。** 宿主还需要能运行同模型的独立实例，按要求禁用其工具、文件和网络权限。只读文件沙箱不等于无工具权限。能力由宿主提供，本服务不假装替宿主保证隔离，也不加入执行机制审计。[接入边界与排障](docs/engineering/clients.md)

> 当前交付支持从源码或本地 `.tgz` 安装。尚未发布到公共 npm registry；不要假设 `npx diverdict` 已可用。

## 如何工作

| 步骤 | MCP 工具 | 服务返回 | 宿主执行 |
| --- | --- | --- | --- |
| 出策 | `strategize_begin` | 三个独立角色的提示词和共同问题材料 | 并行生成三家方略 |
| 质询 | `strategize_submit` | 每家身份、自己的方略、另两家方略、质询纪律 | 并行生成三家质询 |
| 收敛 | `strategize_verdict` | 贾诩身份与全部方略、质询 | 独立生成最终决断，呈现给用户 |

共 **3 + 3 + 1 次生成**。第三个工具返回的是贾诩的任务，宿主仍需完成这次生成，不能把提示词当成最终答案。

已用 Codex 与 GPT-6 Astra 运行公开案例：[查看真实最终方略](docs/delivery/pilot-result.md)。完整验证条件与宿主调度观察见[验证记录](docs/delivery/validation.md)。

第一轮三家互不可见。第二轮只共享第一轮材料，不共享尚未完成的同轮质询。所有实例使用同一个模型，仅收到对应任务材料，不继承宿主对话，也不在同一上下文中连续扮演角色。

流程固定，无循环，无动态打回。质询纪律保留原文：只攻不和；修订只许因被击中；贾诩终审，无二审。

## 名称

产品名为「异策 · Diverdict」，仓库、目录、npm 包、命令行入口与 MCP 服务标识统一使用 `diverdict`。Diverdict 结合 diverge（分歧）与 verdict（裁断）的词意，表达从分歧走向决断。原始核心及交接文档保留历史名称，不随产品改名重写。

## 核心资产

[`advisors.md`](docs/product/advisors.md) 是四位角色和工作纪律的唯一正文来源。运行时直接读取，代码不维护第二份角色提示词。测试固定该文件的 SHA-256，防止工程修改意外改变已定的产品核心。

设计遵循“相信模型、留白”：明确身份和规则，把思考与执行机制留给模型。现有角色中的补充指引原样保留。文档中标为“非落地依据”的未来推演不会进入运行提示词。

源码仓库中的 `docs/origin/HANDOFF.md` 保留实现前的设计交接历史，不随 npm 包分发；其中的待办和宿主支持判断属于当时记录。当前实现状态以本 README、[验证说明](docs/delivery/validation.md)和[变更记录](CHANGELOG.md)为准。

## 数据与生命周期

- 服务进程只读随包分发的 `advisors.md` 与版本信息；不执行命令，不请求模型，不写决策日志。
- 每条 MCP 连接维护独立的内存会话，最多 32 个；每个会话自创建起 2 小时有效，后续请求会清理过期数据。进程退出即丢失全部材料。
- 重启或过期后重新开始合议。相同提交可重试，不同材料不会覆盖已经用于下一轮的材料。
- 模型生成由宿主执行，会消耗宿主的订阅或模型额度；宿主自己的对话保存策略仍然适用。

字段长度和错误恢复见[工具协议](docs/architecture/protocol.md)。

## 开发与验证

```sh
npm ci
npm run check          # 类型检查、格式/静态检查、单元及真实 stdio 测试
npm run test:coverage  # Node 内置覆盖率报告
npm run package:check  # 打包、独立安装、从安装包运行完整协议烟测
```

自动测试覆盖角色原文、隔离材料、3+3+1 流程、缺失输入、乱序调用、重试冲突、过期、容量、并发会话、CLI 和新旧 MCP 客户端握手。

协议测试使用明确标注的夹具；它们验证工程行为，不证明多视角策略一定优于单模型回答。真实生成需要另做[效果评估](docs/engineering/evaluation.md)。

## 项目边界

首版提供通用的“意图指令 + 宿主自选执行”形态。无 UI、长期记忆、多模型路由、动态讨论、角色阵容配置或内置模型通道。CLI 进程编排可以作为宿主的执行方法，不是服务的隐藏依赖。

欢迎提交缺陷复现、接入验证和可重复的效果评估。开始前请读[贡献指南](CONTRIBUTING.md)；安全问题请按[安全政策](SECURITY.md)处理。发布流程见[维护指南](docs/engineering/releasing.md)。

## 许可

[MIT](LICENSE)。代码、角色提示词与工作流程文档一并适用。
