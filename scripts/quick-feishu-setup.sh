#!/bin/bash
# =============================================================================
# OMP 飞书 Bot 快速配置
# =============================================================================
# 此脚本会自动配置环境变量并验证服务器

echo "=== OMP 飞书 Bot 快速配置 ==="
echo ""

# 检查 lark-cli
if ! command -v lark-cli &> /dev/null; then
    echo "❌ lark-cli 未安装"
    echo "请运行: npm install -g @larksuite/cli"
    exit 1
fi

echo "✅ lark-cli 已安装"

# 获取 App ID 和 Secret
APP_ID=$(cat ~/.lark-cli/config.json | grep -o '"appId": "[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$APP_ID" ]; then
    echo "❌ 未找到 lark-cli 配置"
    echo "请运行: lark-cli config init"
    exit 1
fi

echo "✅ 应用 ID: $APP_ID"

# 创建配置文件
CONFIG_DIR="$HOME/.omp/env.d"
mkdir -p "$CONFIG_DIR"
CONFIG_FILE="$CONFIG_DIR/feishu.env"

echo ""
echo "📝 创建配置文件..."
cat > "$CONFIG_FILE" << EOF
# OMP 飞书插件配置
# 创建于 $(date)
# 应用 ID: $APP_ID

FEISHU_APP_ID=$APP_ID
# ⚠️  请手动设置 FEISHU_APP_SECRET（安全考虑，不自动获取）
FEISHU_APP_SECRET=your_secret_here
FEISHU_SERVER_PORT=18790
FEISHU_SERVER_HOST=0.0.0.0
EOF

chmod 600 "$CONFIG_FILE"
echo "✅ 配置文件：$CONFIG_FILE"

# 创建启动脚本
START_SCRIPT="$HOME/.omp/start-feishu.sh"
mkdir -p "$HOME/.omp"
cat > "$START_SCRIPT" << 'EOF'
#!/bin/bash
# OMP 飞书插件启动脚本

# 加载配置
if [ -f "$HOME/.omp/env.d/feishu.env" ]; then
    # 检查 Secret 是否已设置
    if grep -q "your_secret_here" "$HOME/.omp/env.d/feishu.env"; then
        echo "⚠️  请先编辑配置文件并设置 FEISHU_APP_SECRET"
        echo "运行: nano ~/.omp/env.d/feishu.env"
        exit 1
    fi
    export $(grep -v '^#' "$HOME/.omp/env.d/feishu.env" | xargs)
fi

echo "🚀 启动 OMP 飞书插件..."
echo "   应用 ID: $FEISHU_APP_ID"
echo "   服务器端口：$FEISHU_SERVER_PORT"
echo "   回调地址：${FEISHU_CALLBACK_URL:-http://localhost:$FEISHU_SERVER_PORT/webhook/event}"

# 启动 OMP
cd /home/alice/oh-my-pi
omp "$@"
EOF

chmod +x "$START_SCRIPT"
echo "✅ 启动脚本：$START_SCRIPT"

# 验证
echo ""
echo "=========================================="
echo "✅ 配置完成！"
echo "=========================================="
echo ""
echo "下一步："
echo ""
echo "1️⃣  编辑配置文件，设置 FEISHU_APP_SECRET"
echo "   运行：nano ~/.omp/env.d/feishu.env"
echo ""
echo "2️⃣  在飞书开放平台配置事件订阅"
echo "   - 地址：https://open.feishu.cn/app"
echo "   - 应用：$APP_ID"
echo "   - 添加事件：im.message.receive_v1"
echo "   - 回调地址：http://你的服务器:18790/webhook/event"
echo ""
echo "3️⃣  启动 OMP"
echo "   运行：~/.omp/start-feishu.sh"
echo ""
echo "4️⃣  在飞书中发送消息测试"
echo ""
echo "📖 详细文档：docs/feishu-config-guide.md"
echo ""