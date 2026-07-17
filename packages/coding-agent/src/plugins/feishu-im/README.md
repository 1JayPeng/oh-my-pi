# OMP 飞书 IM 集成插件

## 功能概述

本插件将 OMP (Oh My Pi) 与飞书 (Feishu/Lark) 集成，允许用户通过飞书机器人远程操控 OMP。

### 主要功能

- **飞书 Bot 基础连接**: 基于 @larksuiteoapi/node-sdk 实现飞书 Bot 认证和消息收发
- **命令路由**: 将飞书消息映射到 OMP 命令（/omp prompt, /omp steer, /omp abort 等）
- **状态同步**: 定期同步 OMP 状态到飞书
- **输出格式化**: 将 OMP 输出转换为飞书卡片格式（文本/错误/成功/代码）
- **确认机制**: 危险操作需要飞书二次确认
- **多会话支持**: 支持多个 OMP 实例，每个实例独立飞书会话

### 支持的操作

| 操作 | 命令 | 说明 |
|------|------|------|
| Prompt | /omp prompt <消息> | 发送 prompt |
| Steer | /omp steer <消息> | 发送 steer |
| Follow-up | /omp follow-up <消息> | 发送 follow-up |
| Abort | /omp abort | 中止当前操作 |
| New Session | /omp new-session | 创建新会话 |
| Switch Session | /omp switch-session <ID> | 切换会话 |
| Branch | /omp branch | 显示 git 分支 |
| State | /omp state | 显示 OMP 状态 |
| Set Model | /omp set-model <模型> | 设置模型 |
| Compact | /omp compact | 压缩上下文 |
| Bash | /omp bash <命令> | 执行 bash 命令 |
| Handoff | /omp handoff <消息> | 发送 handoff |
| Messages | /omp messages [限制] | 获取消息历史 |

## 安装与配置

### 1. 安装依赖

```bash
cd packages/coding-agent/src/plugins/feishu-im
bun install
```

### 2. 配置环境变量

在 `.env` 文件中添加：

```bash
# 飞书应用配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 可选：事件订阅配置
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_ENCRYPT_KEY=your_encrypt_key
FEISHU_CALLBACK_URL=https://your-server.com/feishu/callback
```

### 3. 飞书开放平台配置

1. 创建飞书应用
2. 开启"机器人"能力
3. 配置事件订阅：
   - 订阅 `im.message.receive_v1` 事件
   - 设置回调地址（如果使用 HTTP 回调）
4. 获取 App ID 和 App Secret

### 4. 启用插件

在 OMP 配置中启用插件：

```bash
omp plugin enable feishu-im
```

## 使用方式

### 基本消息

直接在飞书中发送消息，会自动作为 prompt 发送给 OMP。

### 使用命令

```
/omp prompt 帮我分析一下这段代码
/omp steer 请使用更简洁的方案
/omp abort
/omp state
/omp bash git status
```

### 确认操作

对于危险操作，会发送确认卡片：

```
⚠️ 危险操作确认
操作描述：删除文件 xxx
风险等级：高
超时时间：30 秒

[确认执行] [取消]
```

## 架构设计

### 核心模块

- **feishu-client.ts**: 飞书 Bot 客户端，处理认证和消息收发
- **command-router.ts**: 命令路由器，解析飞书消息为 OMP 命令
- **state-sync.ts**: 状态同步器，定期同步 OMP 状态
- **output-formatter.ts**: 输出格式化器，转换 OMP 输出为飞书卡片
- **confirmation.ts**: 确认管理器，处理危险操作的二次确认
- **index.ts**: 插件入口，注册为 OMP 插件

### 数据流

```
飞书消息 → CommandRouter → OmpCommand → OMP → Response → OutputFormatter → 飞书卡片
```

## 开发指南

### 运行测试

```bash
bun test
```

### 类型检查

```bash
bun run check:types
```

### 添加新功能

1. 在 `src/` 目录下创建新模块
2. 在 `index.ts` 中注册
3. 更新 `types.ts` 添加新类型
4. 编写测试

## 安全考虑

- **签名验证**: 验证飞书事件回调的签名
- **加密解密**: 支持飞书事件加密（可选）
- **确认机制**: 危险操作需要二次确认
- **超时处理**: 确认请求有超时机制

## 限制与注意事项

1. **消息长度限制**: 飞书单条消息最长 4096 字符，长输出需要截断
2. **卡片复杂度**: 飞书卡片元素有限制，复杂输出需要简化
3. **网络要求**: 需要访问飞书 API，确保网络通畅
4. **并发限制**: 注意飞书 API 的并发限制

## 未来规划

- [ ] 流式输出支持
- [ ] 更多命令支持
- [ ] 文件传输功能
- [ ] 语音消息支持
- [ ] 群组功能增强

## 许可证

MIT License