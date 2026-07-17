# OpenClaw Lark 配置总结

**日期**: 2026-07-18  
**状态**: ✅ 已完成

---

## 📋 已完成配置

### 1. 安装 openclaw-lark 插件

```bash
# Clone 仓库
git clone https://github.com/1JayPeng/openclaw-lark.git ~/oh-my-pi/openclaw-lark

# 安装依赖
cd ~/oh-my-pi/openclaw-lark
npm install --legacy-peer-deps

# 构建
npm run build

# 安装到 OpenClaw
cd ~/oh-my-pi
openclaw plugins install ./openclaw-lark
```

### 2. 配置 OpenClaw

**配置文件**: `~/.openclaw/openclaw.json`

```json
{
  "channels": {
    "feishu": {
      "appId": "cli_aad0fb6917f8dcc8",
      "appSecret": "iTXD3cItKQ4vVBNo81GKzhbsuQNCNuwl"
    }
  }
}
```

### 3. 启动 Gateway 服务

```bash
# 安装服务
openclaw gateway install

# 启动
openclaw gateway start

# 验证状态
openclaw gateway status
```

### 4. 用户配对

在飞书中发送消息后，会收到配对码：

```
Pairing code: 9L7ZP924
```

批准配对：

```bash
openclaw pairing approve feishu 9L7ZP924
```

---

## 🎯 当前状态

| 组件 | 状态 | 版本 |
|------|------|------|
| **openclaw-lark 插件** | ✅ 已安装 | 2026.7.9 |
| **Gateway 服务** | ✅ 运行中 | 2026.7.1 |
| **飞书频道** | ✅ 已配置 | - |
| **用户配对** | ✅ 已批准 | - |

---

## 📱 使用方法

### 直接发送消息

打开飞书 → 搜索你的 Bot → 发送消息：

```
你好
帮我写一个函数
这个项目的架构是什么
```

**不需要任何前缀**，直接发送即可！

### 管理命令

```bash
# 检查 Gateway 状态
openclaw gateway status

# 查看插件
openclaw plugins list

# 查看频道
openclaw channels list

# 查看日志
journalctl --user -u openclaw-gateway.service -n 100 --no-pager

# 重启 Gateway
openclaw gateway restart
```

---

## 🔌 与 OMP 的关系

### 当前架构

```
飞书用户
   ↓
飞书服务器
   ↓ (WebSocket)
openclaw-lark 插件
   ↓
OpenClaw Gateway (localhost:19001)
   ↓
OpenClaw Agent
   ↓
返回回复
```

### 与 OMP 集成

目前 openclaw-lark 是**独立运行**的，不直接集成到 OMP 内部。

**优势**：
- ✅ 使用官方插件，维护良好
- ✅ 无回调模式，无需公网 IP
- ✅ 功能丰富（消息、文档、表格等）
- ✅ 支持流式回复和交互式卡片

**限制**：
- ⚠️ 不直接集成到 OMP 插件系统
- ⚠️ 需要通过 OpenClaw 中转

---

## 🗂️ 文件位置

| 文件 | 路径 |
|------|------|
| **插件源码** | `~/oh-my-pi/openclaw-lark/` |
| **插件配置** | `~/.openclaw/openclaw.json` |
| **Gateway 日志** | `/tmp/openclaw-1002/openclaw-2026-07-18.log` |
| **OpenClaw 配置** | `~/.openclaw/` |
| **官方文档** | https://docs.openclaw.ai/ |

---

## 📦 旧插件状态

以下旧插件可以保留或删除：

### 1. feishu-im (回调模式)
**路径**: `packages/coding-agent/src/plugins/feishu-im/`

- 需要 HTTP 回调服务器
- **已废弃** - 使用 openclaw-lark 替代

### 2. feishu-im-lark (lark-cli 模式)
**路径**: `packages/coding-agent/src/plugins/feishu-im-lark/`

- 使用 lark-cli event consume
- **已废弃** - 使用 openclaw-lark 替代

---

## ✅ 下一步

1. **测试飞书消息** - 在飞书中发送消息验证
2. **清理旧插件** - 删除 `feishu-im` 和 `feishu-im-lark` 目录
3. **更新文档** - 更新 IMPLEMENTATION.md 和 README.md

---

## 🎉 配置完成

现在你可以在飞书中直接给 Bot 发消息了，不需要任何前缀，不需要回调服务器！