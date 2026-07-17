# OMP 飞书集成插件

**使用方案**: lark-cli event consume（无回调模式）  
**模型 ID**: `1`  
**状态**: 🚧 开发中

---

## 📋 概述

本插件将飞书消息直接集成到 OMP，使用 lark-cli 的 event consume 功能接收消息，无需公网 IP 和回调服务器。

### 架构

```
飞书用户 → 飞书服务器 → lark-cli event consume → OMP 插件 → 模型"1" → lark-cli API → 回复
```

---

## 🚀 快速开始

### 1. 安装 lark-cli

```bash
npm install -g @larksuite/cli
```

### 2. 配置飞书应用

```bash
export FEISHU_APP_ID="cli_aad0fb6917f8dcc8"
export FEISHU_APP_SECRET="your-app-secret"
```

### 3. 测试 lark-cli

```bash
lark-cli auth status
lark-cli event list
lark-cli event consume im.message.receive_v1
```

---

## 🔧 配置

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FEISHU_APP_ID` | 飞书应用 ID | `cli_aad0fb6917f8dcc8` |
| `FEISHU_APP_SECRET` | 飞书应用 Secret | - |

### 模型配置

编辑 `~/.omp/agent/models.yml`：

```yaml
providers:
  local:
    baseUrl: http://localhost:8000
    api: anthropic-messages
    apiKey: sk-local
    models:
      - id: "1"
        name: "Model 1"
        reasoning: true
        input:
          - text
        supportsTools: true
        contextWindow: 131072
        maxTokens: 8192
```

---

## 📂 文件结构

```
feishu-omp/
├── src/
│   ├── index.ts          # 插件入口
│   ├── feishu-client.ts  # lark-cli 集成
│   ├── message-parser.ts # 消息解析（待实现）
│   └── session-manager.ts # 会话管理（待实现）
├── package.json
└── README.md
```

---

## 🎯 功能特性

- ✅ 无回调模式（使用 lark-cli event consume）
- ✅ 直接集成到 OMP
- ✅ 使用 OMP 已有的模型配置
- 🚧 消息解析
- 🚧 会话管理
- 🚧 流式回复
- 🚧 富文本/卡片支持

---

## 🔄 与 OpenClaw 的区别

| 特性 | OpenClaw | OMP 插件 |
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

---

## 🐛 故障排查

### lark-cli 未找到

```bash
which lark-cli
# 如果未找到，执行：
npm install -g @larksuite/cli
```

### 权限不足

确保飞书应用已开通所需权限：
- `im:message`
- `im:message:send_as_bot`

---

**状态**: 🚧 开发中