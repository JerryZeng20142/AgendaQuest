# Agenda Quest Web

Agenda Quest 的 React 19 + Vite 8 + TypeScript 6 Web 客户端，UI 使用 Shadcn/ui `radix-nova`。

## 本地开发

```bash
npm install
npm run dev
```

本地预览必须显式设置 `VITE_DATA_MODE=preview`，同时不得设置 `VITE_API_BASE_URL`。预览数据不会持久化，长期记忆、Agent、截图分析服务和云同步均显示为未连接。未声明数据模式时，客户端会阻止进入业务页，不会自行选择或回退数据来源。

## 云端模式

根据 `.env.example` 设置：

- `VITE_DATA_MODE=cloud`
- `VITE_API_BASE_URL=https://api.example.com`

云端认证使用 HttpOnly Cookie。API Key 只提交给后端密钥服务，不写入 Local Storage、Session Storage 或 IndexedDB。生产环境未配置 API 地址时，客户端会阻止进入业务页，不会静默切换预览数据。

### 云端接口不变量

前端契约集中在 `src/api/agenda-api.ts`，运行时响应由 `src/api/schemas.ts` 校验。服务端接入必须保证：

- `POST /records` 只有在原始内容完成持久化后才返回成功；附件上传和 AI 分析是后续独立操作，失败不得回滚或删除原文。
- 任务开始、延期和完成分别使用 `/tasks/:id/commands/start`、`postpone`、`complete`。服务端在同一事务中生成时间、延期次数、修订号、提醒终止和审计事件。
- 任务详情使用带 `If-Match` 的 `PATCH /tasks/:id`；冲突必须返回可识别的 `409` 或 `412`，不得静默覆盖其他客户端的修订。
- `POST /tasks` 将 `clientRequestId` 同时作为请求体字段与 `Idempotency-Key`。服务端按当前登录用户隔离幂等键：同键同内容必须返回首次结果，同键不同内容或跨记录复用必须拒绝。
- 永久删除任务时必须同时解除原始记录的 `taskId`，并清理周报和 Agent 运行引用；永久删除原始记录时必须处理所有反向引用。
- Agent 计划必须返回稳定动作 ID、短时有效的 `confirmationId` 与 `expiresAt`。授权请求回传 `confirmationId`、授权范围和逐项确认的动作 ID；服务端必须拒绝过期、重复或不属于该计划的确认。
- 附件读取通过 `/records/:recordId/attachments/:attachmentId/download` 返回短时有效的 HTTPS 地址，不能在快照中长期暴露对象存储地址。
- `/settings/ai/models` 由后端使用受保护的密钥查询真实模型；长期记忆、Agent、截图分析和同步状态只能返回实际观测结果。
- `/events` 使用携带 Cookie 的 SSE，消息体为 `{ "scope": "agenda" | "sync" | "all" }`；前端收到事件后重新校验云端状态，并以定期轮询作为断线兜底。
- 归档保留策略由 `/settings/retention` 保存并在云端执行，前端不以本地定时器模拟删除。

原始证据状态遵循以下字段不变量，服务端不得用摘要冒充原文：

| `evidenceState`     | `rawContent`  | `retainedSummary` |
| ------------------- | ------------- | ----------------- |
| `full`              | 必须存在      | 可选              |
| `summary-only`      | 必须为 `null` | 必须存在          |
| `deleted-by-policy` | 必须为 `null` | 必须不存在        |

## 质量检查

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
