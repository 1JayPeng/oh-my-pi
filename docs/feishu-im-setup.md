# 飞书 IM 配置指南

**使用方案**: OpenClaw Lark 插件（无回调模式）  
**版本**: 2026.7.9  
**状态**: ✅ 已配置完成

---

## 📋 配置信息

| 配置项 | 值 |
|--------|-----|
| **App ID** | `cli_aad0fb6917f8dcc8` |
| **Gateway 端口** | 19001 |
| **Gateway 地址** | `ws://127.0.0.1:19001` |
| **Dashboard** | `http://127.0.0.1:19001/` |
| **插件版本** | 2026.7.9 |

---

## 🚀 快速开始

### 1. 启动 Gateway

```bash
# 检查状态
openclaw gateway status

# 如果未运行，启动它
openclaw gateway start
```

### 2. 在飞书中发送消息

打开飞书 → 搜索你的 Bot → 直接发送：

```
你好
帮我写一个函数
这个项目的架构是什么
```

**不需要任何前缀！**

### 3. 首次配对

首次使用时会收到配对码：

```
Pairing code: XXXXXXXX
```

批准配对：

```bash
openclaw pairing approve feishu XXXXXXXX
```

---

## 🔧 管理命令

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

## 📦 安装/更新

```bash
# 安装插件
cd ~/oh-my-pi/openclaw-lark
npm run build
cd ~/oh-my-pi
openclaw plugins install ./openclaw-lark

# 更新插件
cd ~/oh-my-pi/openclaw-lark
git pull
npm install
npm run build
openclaw plugins update openclaw-lark
```

---

## 📂 文件位置

| 文件 | 路径 |
|------|------|
| **插件源码** | `~/oh-my-pi/openclaw-lark/` |
| **配置文件** | `~/.openclaw/openclaw.json` |
| **Gateway 日志** | `/tmp/openclaw-1002/openclaw-2026-07-18.log` |
| **官方文档** | https://docs.openclaw.ai/ |
| **插件文档** | `~/oh-my-pi/openclaw-lark/README.zh.md` |

---

## 🎯 特性

| 特性 | 说明 |
|------|------|
| ✅ **无回调** | 使用本地 Gateway，无需公网 IP |
| ✅ **官方插件** | 飞书开放平台团队开发维护 |
| ✅ **流式回复** | 支持实时流式响应 |
| ✅ **交互式卡片** | 支持卡片消息和确认按钮 |
| ✅ **权限策略** | 灵活的访问控制 |

---

## 🔍 故障排查

### Gateway 未启动

```bash
openclaw gateway status
# 如果显示 stopped，执行：
openclaw gateway start
```

### 插件未启用

```bash
openclaw plugins list | grep openclaw-lark
# 如果显示 disabled，执行：
openclaw plugins enable openclaw-lark
```

### 查看日志

```bash
# Gateway 日志
journalctl --user -u openclaw-gateway.service -n 100 --no-pager

# 查看最近错误
journalctl --user -u openclaw-gateway.service -n 50 --no-pager | grep error
```

---

## 📖 相关文档

- [OpenClaw 官方文档](https://docs.openclaw.ai/)
- [OpenClaw Lark 插件](https://github.com/larksuite/openclaw-lark)
- [配置指南](https://bytedance.larkoffice.com/docx/MFK7dDFLFoVlOGxWCv5cTXKmnMh)

---

**配置完成！在飞书中直接发消息试试吧！** 🎉