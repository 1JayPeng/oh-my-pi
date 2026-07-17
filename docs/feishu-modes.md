# OMP 飞书集成模式对比

## 两种部署模式

### 1. 回调模式（feishu-im）

**工作原理**：
- OMP 启动 HTTP 服务器（端口 18790）
- 飞书开放平台发送事件到 `/webhook/event`
- 需要公网 IP 或域名

**配置要求**：
- ✅ 需要公网可访问的服务器
- ✅ 需要配置事件订阅回调地址
- ✅ 需要防火墙开放端口

**启动方式**：
```bash
~/.omp/start-feishu.sh
```

**配置文件**：
- `~/.omp/env.d/feishu.env`
- `packages/coding-agent/src/plugins/feishu-im/`

---

### 2. lark-cli 模式（feishu-im-lark）✨ 推荐

**工作原理**：
- 使用 `lark-cli event consume` 直接接收消息
- 无需回调服务器
- 无需公网 IP

**配置要求**：
- ✅ 仅需本地 lark-cli 配置
- ✅ 无需回调地址
- ✅ 无需防火墙配置

**启动方式**：
```bash
~/.omp/start-feishu-lark.sh
```

**配置文件**：
- `~/.omp/env.d/feishu-lark.env`
- `packages/coding-agent/src/plugins/feishu-im-lark/`

---

## 对比表

| 特性 | 回调模式 | lark-cli 模式 |
|------|----------|---------------|
| **公网 IP** | 必需 | 不需要 |
| **回调地址** | 必需 | 不需要 |
| **防火墙** | 需要配置 | 不需要 |
| **配置复杂度** | 高 | 低 |
| **消息接收** | HTTP 回调 | lark-cli event consume |
| **消息发送** | Feishu Client SDK | lark-cli api |
| **依赖** | 飞书 SDK | lark-cli |
| **适用场景** | 有公网服务器 | 本地开发/个人使用 |

---

## 推荐

**个人使用 / 本地开发** → 使用 **lark-cli 模式**
- 配置简单
- 无需公网 IP
- 无需回调地址
- 开箱即用

**生产环境 / 有公网服务器** → 使用 **回调模式**
- 更稳定
- 支持高并发
- 可横向扩展

---

## 快速开始（lark-cli 模式）

### 1. 配置环境变量

```bash
# 已配置好
cat ~/.omp/env.d/feishu-lark.env
```

### 2. 启动 OMP

```bash
~/.omp/start-feishu-lark.sh
```

### 3. 在飞书中发送消息

直接发送，不需要任何前缀：
```
你好
帮我写一个函数
```

---

## 故障排除

### lark-cli event consume 不输出

```bash
# 检查 lark-cli 状态
lark-cli event status

# 手动测试
lark-cli event consume im.message.receive_v1

# 检查认证
lark-cli auth status
```

### 消息无法发送

```bash
# 检查 lark-cli API
lark-cli api GET /open-apis/auth/v3/tenant_access_token/internal
```

---

## 总结

| 你想... | 选择 |
|---------|------|
| 快速测试/本地使用 | lark-cli 模式 |
| 有公网服务器/生产环境 | 回调模式 |
| 最简单配置 | lark-cli 模式 |

**个人使用强烈推荐 lark-cli 模式**！