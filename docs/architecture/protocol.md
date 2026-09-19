# 工具协议

传输为 stdio MCP。stdout 只传协议消息；显式 `--help` / `--version` 命令除外。协议使用官方 TypeScript SDK，支持当前协议协商和 2025-06-18 客户端。

## 1. `strategize_begin`

```json
{
  "problem": "先做客户试点还是公开发布？",
  "context": "两人团队，已有原型，六周窗口。",
  "request_id": "decision-001"
}
```

`problem` 必填，非空，最多 4,000 个 UTF-16 code units。`context` 可省略，默认空字符串，最多 16,000。`request_id` 可省略，最多 128，仅允许字母、数字、点、下划线、冒号和连字符。它是调用方生成的重试键，不是用户身份。

同一连接中，相同重试键和相同材料返回相同的出策包，即使会话已经推进。没有重试键时，每次 begin 都创建新会话。过期或进程重启后不再保留重试记录。

## 2. `strategize_submit`

```json
{
  "session_id": "由 begin 返回的 UUID",
  "proposals": {
    "strategist": "战略家的原始方略全文",
    "diplomat": "纵横家的原始方略全文",
    "schemer": "阴谋家的原始方略全文"
  }
}
```

三项必填，每项非空、最多 12,000 个 UTF-16 code units。不接受多余角色。值是自由文本，不规定模型答案结构。JSON 对象仅用于正确归属材料。

## 3. `strategize_verdict`

```json
{
  "session_id": "由 begin 返回的 UUID",
  "critiques": {
    "strategist": "战略家的质询全文",
    "diplomat": "纵横家的质询全文",
    "schemer": "阴谋家的质询全文"
  }
}
```

长度和必填规则与 proposals 相同。必须先提交方略。返回贾诩任务后，宿主执行最终生成；服务不要求第四次工具调用，不保存最终答案。

## 统一返回

成功响应同时包含等价的 JSON 文本 `content` 和 `structuredContent`，符合公开的 `outputSchema`：

```json
{
  "session_id": "UUID",
  "stage": "proposal",
  "expires_at": "2026-09-19T12:00:00.000Z",
  "instructions": "仅供宿主阅读的执行规则与下一步指令",
  "jobs": [
    {
      "role": "strategist",
      "name": "战略家",
      "system_prompt": "从 advisors.md 提取的身份原文",
      "user_prompt": "本轮任务及 JSON 编码的决策材料"
    }
  ],
  "next_tool": "strategize_submit"
}
```

该示例省略了另外两个 job。`proposal` 和 `critique` 各有 3 个 job；`verdict` 只有 `arbiter` 一个 job，`next_tool` 为 `null`。**null 表示没有下一次服务调用，不代表最终答案已生成。**

宿主只向单个实例传递该 job 的 `system_prompt` 和 `user_prompt`，不得转交整个响应、宿主指令或历史。若宿主没有独立 system 通道，可把身份置于实例指令，再传递 user 材料；保留原文和优先级，不引入额外角色。

## 状态与重试

```text
begin → 等待三家方略 → submit → 等待三家质询 → verdict → 宿主生成最终答案
```

submit 和 verdict 的相同输入均可重放，返回对应轮的相同任务包，不倒退状态。不同输入无法覆盖原材料。失败的校验不会推进状态。宿主因网络中断重试时，必须重用已生成的原文，不能默默重新生成后当作相同提交。

服务不会截断长文本。如果材料超限，由宿主处理输入规模后重新开始，不将已截断内容冒充完整原文。长度上限是传输与内存边界，不是提示词中的推理或回答格式要求。

## 错误

执行错误通过 `isError: true` 和 `content[0].text` 返回，文本结构为 `{"error":{"code":"...","message":"..."}}`。SDK 层的格式校验错误同样返回工具错误，但其文本格式由 SDK 决定，调用方不要假设所有错误都可解析为此 JSON。

| code | 含义 | 恢复 |
| --- | --- | --- |
| `SESSION_NOT_FOUND` | 未知、过期、其他连接或已重启的会话 | 当前连接重新 begin |
| `WRONG_STAGE` | 尚未提交方略就提交质询 | 先完成出策及 submit |
| `REQUEST_CONFLICT` | 重试键对应不同问题材料 | 使用新重试键 |
| `PROPOSALS_CONFLICT` | 已接收不同方略 | 新建会话 |
| `CRITIQUES_CONFLICT` | 已接收不同质询 | 新建会话，不复议旧案 |
| `CAPACITY_EXCEEDED` | 连接已占满 32 个未过期会话 | 等待过期或使用独立连接 |
| `INVALID_INPUT` | 领域层输入校验失败 | 修正字段后重试 |
| `INTERNAL_ERROR` | 未预期内部错误 | 重试；保留脱敏复现信息 |

会话自创建起 2 小时过期，重试不延长寿命。终轮后保留材料直到过期，便于交付中断时重试；没有持久化和恢复接口。
