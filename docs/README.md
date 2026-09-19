# 文档入口

从 [项目 README](../README.md) 了解三思和快速接入方式。下表按需要查找权威文档；目录仅在有实际内容时创建。

| 需要了解什么 | 文档 | 职责 |
| --- | --- | --- |
| 四位角色、工作纪律与产品核心 | [核心原文](product/advisors.md) | 唯一核心正文，运行时直接读取；禁止在整理文档时改写、拆分或复制成另一份权威 |
| 服务如何实现、宿主与服务的边界 | [架构与边界](architecture/README.md) | 数据流、代码职责、隔离、状态与演进边界 |
| 三个 MCP 工具如何调用 | [工具协议](architecture/protocol.md) | 输入输出、字段限制、调用顺序、错误与重试合同 |
| 如何接入 Codex 或其他 MCP 宿主 | [接入与排障](engineering/clients.md) | 安装配置、宿主能力要求与运行排障 |
| 如何评估真实生成效果 | [效果评估](engineering/evaluation.md) | 可复现输入、观察准则与证据边界；不进入运行提示词 |
| 如何准备和发布版本 | [发布与维护](engineering/releasing.md) | 托管准备、制品检查、发布权限与回滚 |
| 当前交付实际验证了什么 | [验证记录](delivery/validation.md) | 验收环境、实际结果、未验证范围与复跑方式 |
| 真实生成的方略是什么样 | [试点客户案例](delivery/pilot-result.md) | 一次真实运行的最终原文，与验证记录相互引用 |

## 原始交接

源码仓库中的 `docs/origin/HANDOFF.md` 保留实现前的需求背景、设计取舍与交接记录，不随 npm 包分发。它的待办、名称和宿主能力判断属于当时记录，不能替代当前实现状态。

两份原始文件只迁移位置，字节、标题和正文均保持不变。交接文中提到的 `advisors.md` 指向上表的核心原文；其余文档只解释实现与使用，不重定义角色和工作纪律。核心原文标记为未来推演的部分仍不作为当前实现依据。

## 目录边界

- `product/` 保存产品核心；`origin/` 保存原始背景和交接材料。
- `architecture/` 说明实现结构与协议合同；`engineering/` 说明接入、评估和维护方法。
- `delivery/` 保存交付验证及其真实案例；评估方法留在 `engineering/`，避免把单次结果当成普遍规则。
- 根目录保留 [贡献指南](../CONTRIBUTING.md)、[安全政策](../SECURITY.md)、[行为准则](../CODE_OF_CONDUCT.md)、[变更记录](../CHANGELOG.md) 和 [许可证](../LICENSE) 等标准开源入口。
- `examples/` 只放可直接使用的 [MCP 配置](../examples/mcp.json) 和 [公开案例输入](../examples/pilot-decision.json)，生成结果归入 `delivery/`。

当前未建立的目录不补空文件。文档新建、归属判断或迁移遵循源码仓库中的 `.agents/skills/maintain-project-docs/SKILL.md`；目标职责明确的普通内容修改不触发目录重组。
