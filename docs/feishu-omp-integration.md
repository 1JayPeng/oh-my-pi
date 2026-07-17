# OMP 飞书集成方案

**目标**: 飞书消息直接集成到 OMP，无需 OpenClaw

---

## 🏗️ 架构

```
飞书用户
   ↓
飞书服务器 (WebSocket)
   ↓
lark-cli event consume (事件消费)
   ↓
OMP 插件 (feishu-omp)
   ↓
OMP Agent 会话
   ↓
本地模型 (Qwen3.6-27B)
   ↓
lark-cli API (消息发送)
   ↓
飞书用户
```

---

## 📦 组件

### 1. lark-cli event consume
- 使用 `@larksuite/cli` 的 event consume 功能
- 监听飞书事件（`im.message.receive_v1`）
- 输出 JSON 格式消息到 stdout

### 2. OMP 飞书插件
- 位置：`packages/coding-agent/src/plugins/feishu-omp/`
- 功能：
  - 启动 lark-cli event consume 进程
  - 解析飞书消息
  - 路由到 OMP 会话
  - 调用本地模型
  - 发送回复

### 3. 本地模型
- OMP 已配置：Qwen3.6-27B (localhost:8000)
- 无需额外 API Key

---

## 🔧 实现步骤

### Phase 1: 基础插件框架

1. 创建插件目录结构
2. 实现 HookFactory
3. 实现 lark-cli 进程管理
4. 实现消息解析

### Phase 2: 消息处理

1. 解析飞书消息
2. 创建 OMP 会话
3. 调用模型
4. 流式回复

### Phase 3: 消息发送

1. 使用 lark-cli API 发送文本
2. 支持富文本/卡片
3. 支持确认按钮

---

## 📂 文件结构

```
packages/coding-agent/src/plugins/feishu-omp/
├── src/
│   ├── index.ts          # 插件入口
│   ├── feishu-client.ts  # lark-cli 集成
│   ├── message-parser.ts # 消息解析
│   └── session-manager.ts # 会话管理
├── package.json
└── README.md
```

---

## 🚀 启动命令

```bash
# 安装插件
omp plugin install ./packages/coding-agent/src/plugins/feishu-omp

# 启动
omp --plugin feishu-omp
```

---

## 📝 配置

在 `~/.omp/plugins/feishu-omp.json` 中配置：

```json
{
  "appId": "cli_aad0fb6917f8dcc8",
  "appSecret": "your-app-secret",
  "models": {
    "default": "local/Qwen3.6-27B"
  }
}
```

---

## ✅ 优势

- ✅ 无需公网 IP（使用 lark-cli event consume）
- ✅ 直接集成到 OMP（无需 OpenClaw）
- ✅ 使用 OMP 已有的模型配置
- ✅ 支持 OMP 的所有功能（会话、工具、命令）

---

## 🔄 与 OpenClaw 的区别

| 特性 | OpenClaw | OMP 集成 |
|------|----------|----------|
| 消息路由 | 飞书 → OpenClaw → 模型 | 飞书 → OMP → 模型 |
| 会话管理 | OpenClaw 会话 | OMP 会话 |
| 模型配置 | 独立配置 | 使用 OMP 配置 |
| 工具支持 | 基础工具 | 完整工具集 |
| 命令支持 | 基础命令 | 完整命令集 |

---

## 📖 参考

- [lark-cli 文档](https://github.com/larksuite/cli)
- [OMP 插件系统](../packages/coding-agent/src/extensibility/hooks/)
- [本地模型配置](~/.omp/agent/models.yml)