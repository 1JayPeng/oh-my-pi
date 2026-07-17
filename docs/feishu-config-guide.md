# OMP 飞书 Bot 配置指南

## 快速配置

### 1. 获取 App Secret

从飞书开放平台获取你的 App Secret：

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入 [应用管理](https://open.feishu.cn/app)
3. 选择应用 `cli_aad0fb6917f8dcc8`
4. 进入「凭证与基础信息」页面
5. 复制「App Secret」

### 2. 设置环境变量

```bash
# 创建配置目录
mkdir -p ~/.omp/env.d

# 创建配置文件
cat > ~/.omp/env.d/feishu.env << EOF
# OMP 飞书插件配置
FEISHU_APP_ID=cli_aad0fb6917f8dcc8
FEISHU_APP_SECRET=your_app_secret_here
FEISHU_SERVER_PORT=18790
FEISHU_SERVER_HOST=0.0.0.0
FEISHU_CALLBACK_URL=http://your-server:18790/webhook/event
EOF
```

将 `your_app_secret_here` 替换为你的实际 App Secret。

### 3. 启动 OMP

```bash
# 加载环境变量
source ~/.omp/env.d/feishu.env

# 启动 OMP
cd /home/alice/oh-my-pi
omp
```

或者使用启动脚本：

```bash
~/.omp/start-feishu.sh
```

### 4. 配置飞书开放平台

在飞书开放平台配置事件订阅：

1. 进入 [应用管理](https://open.feishu.cn/app)
2. 选择应用 `cli_aad0fb6917f8dcc8`
3. 进入「事件订阅」页面
4. 点击「添加事件」
5. 搜索并添加 `im.message.receive_v1`（接收消息）
6. 设置回调地址：`http://你的服务器:18790/webhook/event`
7. 点击「保存」

### 5. 验证配置

```bash
# 测试健康检查
curl http://localhost:18790/health
# 应返回：OK

# 测试事件回调
curl -X POST http://localhost:18790/webhook/event \
  -H "Content-Type: application/json" \
  -d '{"header": {"event": {"type": "im.message.receive_v1"}}}'
# 应返回：{"status":"ok"}
```

## 在飞书中测试

1. 打开飞书
2. 搜索你的 Bot 名称
3. 发送消息：`你好`
4. Bot 应该会自动回复！

## 环境变量说明

| 变量 | 必需 | 说明 |
|------|------|------|
| `FEISHU_APP_ID` | ✅ | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | ✅ | 飞书应用 App Secret |
| `FEISHU_SERVER_PORT` | ❌ | HTTP 服务器端口（默认 18790） |
| `FEISHU_SERVER_HOST` | ❌ | 服务器绑定地址（默认 0.0.0.0） |
| `FEISHU_CALLBACK_URL` | ❌ | 回调地址（默认 http://localhost:18790/webhook/event） |
| `FEISHU_VERIFICATION_TOKEN` | ❌ | 事件验证 Token |
| `FEISHU_ENCRYPT_KEY` | ❌ | 事件加密 Key |

## 故障排除

### 问题 1：无法连接到飞书服务器

**症状**：飞书无法访问你的回调地址

**解决**：
- 确保服务器有公网 IP 或域名
- 确保防火墙允许 18790 端口
- 检查回调地址是否正确

### 问题 2：收到"appSecret or clientAssertionProvider is required"

**症状**：启动时出现此错误

**解决**：
- 确保 `FEISHU_APP_SECRET` 已正确设置
- 检查配置文件中的 Secret 是否有空格或换行

### 问题 3：Bot 不回复消息

**症状**：发送消息后 Bot 无反应

**解决**：
1. 检查 OMP 日志：`~/.omp/logs/omp.log`
2. 检查飞书事件订阅是否配置正确
3. 确认 Bot 已开启（应用管理 → 应用能力 → 机器人）

## 完整流程示例

```bash
# 1. 设置环境变量
export FEISHU_APP_ID=cli_aad0fb6917f8dcc8
export FEISHU_APP_SECRET=your_actual_secret
export FEISHU_SERVER_PORT=18790

# 2. 启动 OMP
cd /home/alice/oh-my-pi
omp

# 3. 在飞书中发送消息
# "你好"
# "帮我写一个函数"
# "这个项目的架构是什么"

# 4. Bot 自动回复
```

## 日志查看

```bash
# 实时查看 OMP 日志
tail -f ~/.omp/logs/omp.log | grep -i feishu

# 查看最近 100 行日志
tail -100 ~/.omp/logs/omp.log
```

## 安全建议

1. **不要将 App Secret 提交到 Git**
2. **使用环境变量或配置文件存储凭证**
3. **定期轮换 App Secret**
4. **限制回调地址的公网访问**

## 下一步

- 配置飞书事件订阅
- 启动 OMP
- 在飞书中发送消息测试
- 查看日志排查问题

## 联系方式

如有问题，请查看：
- OMP 文档：`/home/alice/oh-my-pi/README.md`
- 飞书文档：https://open.feishu.cn/document