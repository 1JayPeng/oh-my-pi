# OMP 飞书集成迁移指南

**日期**: 2026-07-18  
**状态**: ✅ 可迁移

---

## 📦 迁移内容

### 1. 插件代码
```
packages/coding-agent/src/plugins/feishu-omp/
├── src/
│   ├── index.ts              # 插件入口
│   ├── feishu-client.ts      # lark-cli 集成
│   └── message-parser.ts     # 消息解析（待实现）
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

### 2. 模型配置
```
~/.omp/agent/models.yml
```
添加了模型 ID `"1"`

---

## 🚀 快速迁移

### 步骤 1: 克隆仓库

```bash
git clone https://github.com/1JayPeng/oh-my-pi.git
cd oh-my-pi
```

### 步骤 2: 配置敏感信息

```bash
cd packages/coding-agent/src/plugins/feishu-omp
cp .env.example .env
```

编辑 `.env` 文件：
```bash
nano .env
```

填入：
```
FEISHU_APP_ID=cli_aad0fb6917f8dcc8
FEISHU_APP_SECRET=your-app-secret-here
MODEL_ID=1
LOCAL_MODEL_BASE_URL=http://localhost:8000
LOCAL_MODEL_API_KEY=sk-local
```

### 步骤 3: 配置本地模型

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
        cost:
          input: 0
          output: 0
          cacheRead: 0
          cacheWrite: 0
        contextWindow: 131072
        maxTokens: 8192
```

### 步骤 4: 安装 lark-cli

```bash
npm install -g @larksuite/cli
```

### 步骤 5: 测试 lark-cli

```bash
lark-cli auth status
```

### 步骤 6: 启动 OMP

```bash
cd ~/oh-my-pi
omp --plugin feishu-omp
```

---

## 🔒 敏感信息管理

### 敏感信息位置

| 文件 | 是否提交 | 说明 |
|------|----------|------|
| `.env` | ❌ 否 | 飞书 Secret 等敏感信息 |
| `.env.example` | ✅ 是 | 模板文件，不含真实值 |
| `.gitignore` | ✅ 是 | 确保 .env 不被提交 |

### 如何设置敏感信息

1. **复制模板**: `cp .env.example .env`
2. **编辑**: `nano .env`
3. **填入真实值**: 应用 Secret 等
4. **验证**: 确保 `.git status` 不显示 `.env`

---

## 📌 分支策略

### 方案 A: 使用当前分支（推荐）

当前分支 `feat/feishu-im-integration` 包含所有飞书集成代码。

```bash
# 查看当前分支
git branch

# 切换到主分支
git checkout main

# 合并当前分支
git merge feat/feishu-im-integration
```

### 方案 B: 标记为私有仓库主分支

如果这是私有仓库，可以直接使用当前分支作为主分支：

```bash
# 重命名主分支
git branch -m main private-main

# 推送
git push -u origin private-main
```

### 方案 C: 创建新分支

```bash
# 创建新分支
git checkout -b feishu-integration

# 推送
git push -u origin feishu-integration
```

---

## 🧪 测试清单

### 本地测试

- [ ] `lark-cli auth status` 显示 `bot identity: ready`
- [ ] `lark-cli event list` 显示事件类型
- [ ] 环境变量配置正确
- [ ] 模型配置正确

### 远程测试

- [ ] 代码推送到远端
- [ ] 在另一个位置克隆
- [ ] 配置 `.env`
- [ ] 启动 OMP
- [ ] 飞书发送消息测试

---

## 📊 文件清单

### 需要提交的代码

```
packages/coding-agent/src/plugins/feishu-omp/
├── src/
│   ├── index.ts
│   ├── feishu-client.ts
│   └── message-parser.ts
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

### 不需要提交的配置

```
.env                  # 敏感信息
node_modules/         # 依赖
dist/                # 构建输出
```

---

## 🔧 故障排查

### lark-cli 未找到

```bash
npm install -g @larksuite/cli
```

### 权限不足

确保飞书应用已开通：
- `im:message`
- `im:message:send_as_bot`

### 模型未找到

检查 `~/.omp/agent/models.yml` 中模型 ID 是否正确。

---

## 📝 备注

- **敏感信息**: 使用 `.env` 文件，不要提交
- **分支**: 建议使用 `feat/feishu-im-integration` 分支
- **私有仓库**: 可以直接重命名为主分支
- **迁移**: 复制 `.env.example` 为 `.env` 并填入真实值

---

**状态**: ✅ 可迁移