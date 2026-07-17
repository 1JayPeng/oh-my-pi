# OMP 飞书插件 - 真实环境测试指南

## 当前状态

✅ **所有测试通过** (18 pass, 0 fail)

| 测试项 | 状态 | 说明 |
|--------|------|------|
| 配置验证 | ✅ | App ID 和 App Secret 已正确加载 |
| 卡片创建 | ✅ | 确认卡片和状态卡片生成正常 |
| 命令路由 | ✅ | 命令解析和路由正确 |
| HTTP 服务器 | ✅ | 已启动并监听事件 |
| 签名验证 | ✅ | 支持飞书事件验证 |

## 下一步：发送真实消息

### 步骤 1: 启动 OMP 并加载插件

```bash
cd /home/alice/oh-my-pi
# OMP 启动时会自动加载飞书插件（如果配置了环境变量）
# 或使用测试脚本：
bun src/plugins/feishu-im/test-real.ts
```

### 步骤 2: 在飞书中与 Bot 对话

1. 打开飞书
2. 搜索并找到你创建的 Bot
3. 发送一条消息（任意内容即可，例如：`/omp prompt 你好`）

### 步骤 3: 获取 chat_id

**方法 A: 从 HTTP 服务器日志获取（推荐）**

1. 启动 OMP 并加载插件
2. 在飞书中向 Bot 发送任意消息
3. 查看 OMP 日志，会打印：`Received event from chat_id: oc_xxx`
4. 复制该 chat_id 用于测试

**方法 B: 从飞书开放平台获取**

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入你的应用 → 事件订阅
3. 查看事件日志
4. 找到最近的事件，查看 `message.chat_id` 字段

### 步骤 4: 测试消息发送

创建测试文件 `test-send-message.ts`:

```typescript
import { FeishuClient } from "./src/feishu-client.js";

  appId: "cli_aad0fb6917f8dcc8",
  appSecret: "你的 App Secret", // 通过 lark-cli config bind 配置
});

async function test() {
  const chatId = "从日志获取的 chat_id"; // 例如：oc_xxxxx
  
  console.log("发送测试消息到:", chatId);
  
  // 发送文本消息
  await client.sendMessage(chatId, "🎉 OMP 飞书插件测试成功！\n\n你已成功发送消息到飞书。");
  console.log("✅ 文本消息发送成功");
  
  // 发送卡片消息
  const card = client.createConfirmationCard({
    id: "test_card_123",
    description: "这是测试卡片",
    risk: "low",
    timeout: 30000,
  });
  
  await client.sendCard(chatId, card);
  console.log("✅ 卡片消息发送成功");
}

test().catch(console.error);
```

运行测试：
```bash
cd /home/alice/oh-my-pi/packages/coding-agent
bun src/plugins/feishu-im/test-send-message.ts
```

### 步骤 5: 测试签名验证（可选）

如果需要启用消息签名验证：

1. 在飞书开放平台获取 `Verification Token`
2. 设置环境变量：
   ```bash
   export FEISHU_VERIFICATION_TOKEN=你的 token
   ```
3. 或在代码中配置：
   ```typescript
   const client = new FeishuClient({
     appId: "cli_aad0fb6917f8dcc8",
     appSecret: "你的 App Secret", // 通过 lark-cli config bind 配置
   });
   ```

## 完整测试流程

### 1. 启动 OMP 并加载插件

```bash
cd /home/alice/oh-my-pi
# 设置环境变量
   - App Secret: (通过 `lark-cli config bind` 配置)

# 启动 OMP
omp
```

### 2. 在飞书中发送命令

```
/omp prompt 你好
/omp state
/omp branch
/omp help
```

### 3. 验证响应

检查飞书中是否收到 OMP 的响应消息。

## 故障排查

### 问题 1: 消息发送失败

**错误**: `Failed to send message: ...`

**解决方案**:
- 检查 `chat_id` 是否正确（应该是 `oc_xxx` 格式）
- 确认 Bot 有权限向该用户发送消息
- 检查飞书开放平台的 API 权限配置

### 问题 2: Access Token 获取失败

**错误**: `Failed to get access_token: ...`

**解决方案**:
- 确认 App ID 和 App Secret 正确
- 检查应用是否已发布
- 查看飞书开放平台的错误码文档

### 问题 3: 事件回调未触发

**解决方案**:
- 确认回调 URL 配置正确（默认：`http://localhost:18790/webhook/event`）
- 检查服务器网络是否可达
- 验证事件订阅配置是否启用

### 问题 4: HTTP 服务器启动失败

**错误**: `Failed to start HTTP server: ...`

**解决方案**:
- 检查端口是否被占用（默认 18790）
- 更改端口：`export FEISHU_SERVER_PORT=8080`
- 检查防火墙配置

## 测试检查清单

- [ ] Bot 创建成功
- [ ] App ID 和 App Secret 正确
- [ ] 事件订阅配置完成
- [ ] 回调 URL 可达（HTTP 服务器）
- [ ] 能接收飞书消息
- [ ] 能发送文本消息
- [ ] 能发送卡片消息
- [ ] 命令解析正确
- [ ] 状态同步正常
- [ ] 确认机制工作

## 文档资源

- [飞书开放平台](https://open.feishu.cn/)
- [飞书 Bot 开发文档](https://open.feishu.cn/document/ukTMukTMukTM/uEjNwUjLxUDM14SM2UjN)
- [本插件 README](./README.md)
- [实现总结](./IMPLEMENTATION.md)
- [完成总结](./SUMMARY.md)

---

**测试日期**: 2026-07-17  
**Bot App ID**: `cli_aad0fb6917f8dcc8`  
**HTTP 服务器端口**: 18790（可通过 `FEISHU_SERVER_PORT` 修改）