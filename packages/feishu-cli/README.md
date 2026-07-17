# @oh-my-pi/feishu-cli

飞书 CLI 集成插件 - 通过命令行与飞书机器人交互

## 功能概述

本插件将 OMP (Oh My Pi) 与飞书 (Feishu/Lark) 集成，允许用户通过命令行与飞书机器人交互。

### 主要功能

- **消息发送**: 向飞书用户或群组发送文本和卡片消息
- **状态查询**: 查看飞书连接状态和配置信息
- **消息历史**: 获取最近的飞书消息记录
- **配置管理**: 动态更新飞书应用配置
- **事件回调**: 接收和处理飞书事件推送

### 支持的命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `/feishu-send` | 发送消息到飞书 | `/feishu-send chat123 你好` |
| `/feishu-status` | 查看飞书连接状态 | `/feishu-status` |
| `/feishu-config` | 配置飞书应用 | `/feishu-config app_id your_app_id` |
| `/feishu-messages` | 获取消息历史 | `/feishu-messages 20` |

### 工具注册

插件注册了以下工具供 LLM 调用：

- `feishu_send_message`: 向飞书发送消息
- `feishu_get_status`: 获取飞书状态
- `feishu_get_messages`: 获取消息历史

## 安装与配置

### 1. 安装插件

```bash
# 方式一：从本地路径链接
omp plugin link ./packages/feishu-cli

# 方式二：从 npm 安装
omp plugin install @oh-my-pi/feishu-cli
```

### 2. 配置环境变量

在 `.env` 文件或 OMP 配置中添加：

```bash
# 飞书应用配置（必需）
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 可选配置
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_ENCRYPT_KEY=your_encrypt_key
FEISHU_CALLBACK_URL=https://your-server.com/feishu/callback
FEISHU_SERVER_PORT=18790
FEISHU_SERVER_HOST=0.0.0.0
```

### 3. 飞书开放平台配置

1. 创建飞书应用
2. 开启"机器人"能力
3. 配置事件订阅：
   - 订阅 `im.message.receive_v1` 事件
   - 设置回调地址：`http://your-server:18790/webhook/event`
4. 获取 App ID 和 App Secret

## 使用方式

### 基本消息发送

```bash
# 通过 CLI 命令
/feishu-send <chat_id> <message>

# 示例
/feishu-send o_a1b2c3d4e5f6 你好，这是一条测试消息
```

### 查看状态

```bash
/feishu-status
```

### 获取消息历史

```bash
# 获取最近 10 条消息（默认）
/feishu-messages

# 获取最近 20 条消息
/feishu-messages 20
```

### 配置管理

```bash
# 设置 App ID
/feishu-config app_id your_app_id

# 设置 App Secret
/feishu-config app_secret your_app_secret
```

## 后端服务器

插件内置 HTTP 服务器，提供以下 API 端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/status` | GET | 获取状态 |
| `/api/send` | POST | 发送消息 |
| `/api/messages` | GET | 获取消息历史 |
| `/api/config` | POST | 更新配置 |
| `/webhook/event` | POST | 飞书事件回调 |

### API 示例

#### 发送消息

```bash
curl -X POST http://localhost:18790/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "o_a1b2c3d4e5f6",
    "message": "你好",
    "msgType": "text"
  }'
```

#### 获取状态

```bash
curl http://localhost:18790/api/status
```

#### 获取消息历史

```bash
curl "http://localhost:18790/api/messages?limit=20"
```

## 开发指南

### 项目结构

```
packages/feishu-cli/
├── package.json          # 插件清单
├── src/
│   ├── index.ts          # 扩展入口
│   ├── server.ts         # 后端服务器
│   └── types.ts          # 类型定义
└── README.md             # 使用说明
```

### 运行测试

```bash
cd packages/feishu-cli
bun test
```

### 类型检查

```bash
bun run check
```

## 依赖

- `@larksuiteoapi/node-sdk`: 飞书官方 SDK
- `@oh-my-pi/coding-agent`: OMP 扩展 API

## 许可证

MIT License