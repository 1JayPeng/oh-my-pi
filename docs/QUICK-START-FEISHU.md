# 快速开始 - OMP 飞书集成

**分支**: `feat/feishu-im-integration`  
**迁移状态**: ✅ 已推送到远端

---

## 🚀 在新位置使用

### 1. 克隆仓库

```bash
git clone https://github.com/1JayPeng/oh-my-pi.git
cd oh-my-pi
git checkout feat/feishu-im-integration
```

### 2. 配置敏感信息

```bash
cd packages/coding-agent/src/plugins/feishu-omp
cp .env.example .env
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

### 3. 配置模型

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

### 4. 安装依赖

```bash
npm install -g @larksuite/cli
```

### 5. 启动 OMP

```bash
cd ~/oh-my-pi
omp --plugin feishu-omp
```

---

## 📌 分支策略

### 方案 A: 使用当前分支（推荐）

```bash
git checkout feat/feishu-im-integration
# 直接在此分支上开发
```

### 方案 B: 设为私有仓库主分支

```bash
# 重命名主分支
git branch -m main private-main

# 或
git checkout feat/feishu-im-integration
git branch -m main
git push -u origin main
```

---

## 🔒 敏感信息

| 文件 | 说明 |
|------|------|
| `.env` | ❌ 不要提交，包含 Secret |
| `.env.example` | ✅ 模板，不含真实值 |
| `.gitignore` | ✅ 确保 .env 不被提交 |

---

## 📂 文件结构

```
packages/coding-agent/src/plugins/feishu-omp/
├── src/
│   ├── index.ts          # 插件入口
│   ├── feishu-client.ts  # lark-cli 集成
│   └── message-parser.ts # 消息解析（待实现）
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

---

## ✅ 检查清单

- [ ] 已克隆仓库
- [ ] 已切换到 `feat/feishu-im-integration` 分支
- [ ] 已创建 `.env` 文件
- [ ] 已配置飞书 Secret
- [ ] 已配置模型 `~/.omp/agent/models.yml`
- [ ] 已安装 lark-cli
- [ ] 已启动 OMP
- [ ] 已测试飞书消息

---

## 🐛 故障排查

```bash
# 检查 lark-cli
lark-cli auth status

# 查看 OMP 日志
journalctl -f | grep "feishu-omp"

# 查看模型配置
cat ~/.omp/agent/models.yml
```

---

**状态**: ✅ 可迁移