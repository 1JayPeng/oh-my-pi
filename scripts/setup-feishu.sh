#!/bin/bash
# =============================================================================
# 飞书 Bot 配置脚本
# =============================================================================
# 此脚本帮助配置 OMP 飞书插件的完整环境

set -e

echo "=== OMP 飞书 Bot 配置 ==="
echo ""

# 检查 lark-cli 是否安装
if ! command -v lark-cli &> /dev/null; then
    echo "❌ lark-cli 未安装"
    echo "请运行: npm install -g @larksuite/cli"
    exit 1
fi

echo "✅ lark-cli 已安装: $(lark-cli --version)"

# 检查 lark-cli 配置
echo ""
echo "📋 检查 lark-cli 配置..."
lark-cli config show > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ lark-cli 配置已存在"
    echo "   App ID: $(lark-cli config show | grep appId | cut -d'\"' -f4)"
else
    echo "❌ lark-cli 配置不存在"
    echo "请运行: lark-cli config init"
    exit 1
fi

# 检查 lark-cli 认证
echo ""
echo "📋 检查 lark-cli 认证状态..."
AUTH_STATUS=$(lark-cli auth status 2>&1)
if echo "$AUTH_STATUS" | grep -q '"identity": "bot"'; then
    echo "✅ Bot 身份已就绪"
else
    echo "⚠️  Bot 身份未就绪，需要配置"
    echo "请运行: lark-cli config bind --identity bot-only"
fi

# 创建 OMP 环境变量文件
echo ""
echo "📝 创建 OMP 环境变量配置..."
OMP_ENV_FILE="$HOME/.omp/env.d/feishu.env"
mkdir -p "$HOME/.omp/env.d"

cat > "$OMP_ENV_FILE" << EOF
# OMP 飞书插件配置
# 自动创建于 $(date -Iseconds)

# 飞书应用配置（必需）
FEISHU_APP_ID=cli_aad0fb6917f8dcc8
FEISHU_APP_SECRET=your_app_secret_here  # 从 lark-cli 配置中获取

# 可选配置
# FEISHU_VERIFICATION_TOKEN=your_verification_token
# FEISHU_ENCRYPT_KEY=your_encrypt_key
# FEISHU_CALLBACK_URL=http://your-server:18790/webhook/event
# FEISHU_SERVER_PORT=18790
# FEISHU_SERVER_HOST=0.0.0.0
EOF

echo "✅ 配置文件已创建：$OMP_ENV_FILE"
echo ""
echo "⚠️  请编辑此文件，将 FEISHU_APP_SECRET 设置为你的实际 App Secret"
echo ""

# 获取 App Secret
APP_SECRET=$(lark-cli config show | grep -o '"appSecret": "[^"]*"' | cut -d'"' -f4)
if [ "$APP_SECRET" != "null" ] && [ -n "$APP_SECRET" ]; then
    sed -i "s|FEISHU_APP_SECRET=your_app_secret_here|FEISHU_APP_SECRET=$APP_SECRET|" "$OMP_ENV_FILE"
    echo "✅ App Secret 已从 lark-cli 配置中复制"
else
    echo "⚠️  无法从 lark-cli 获取 App Secret"
    echo "请手动编辑 $OMP_ENV_FILE 并设置 FEISHU_APP_SECRET"
fi

# 创建启动脚本
echo ""
echo "📝 创建启动脚本..."
START_SCRIPT="$HOME/.omp/start-feishu.sh"
cat > "$START_SCRIPT" << 'EOF'
#!/bin/bash
# OMP 飞书插件启动脚本

# 加载环境变量
if [ -f "$HOME/.omp/env.d/feishu.env" ]; then
    export $(cat "$HOME/.omp/env.d/feishu.env" | grep -v '^#' | xargs)
fi

# 检查必要的环境变量
if [ -z "$FEISHU_APP_ID" ] || [ -z "$FEISHU_APP_SECRET" ]; then
    echo "❌ 缺少必要的环境变量"
    echo "请编辑 ~/.omp/env.d/feishu.env 并设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET"
    exit 1
fi

echo "🚀 启动 OMP 飞书插件..."
echo "   App ID: $FEISHU_APP_ID"
echo "   回调地址：${FEISHU_CALLBACK_URL:-http://localhost:18790/webhook/event}"

# 启动 OMP
omp "$@"
EOF

chmod +x "$START_SCRIPT"
echo "✅ 启动脚本已创建：$START_SCRIPT"

# 配置飞书开放平台指引
echo ""
echo "=========================================="
echo "📖 飞书开放平台配置指引"
echo "=========================================="
echo ""
echo "1. 登录飞书开放平台：https://open.feishu.cn/"
echo "2. 进入应用管理：https://open.feishu.cn/app"
echo "3. 选择应用：cli_aad0fb6917f8dcc8"
echo "4. 配置事件订阅："
echo "   - 进入「事件订阅」页面"
echo "   - 添加事件：im.message.receive_v1"
echo "   - 设置回调地址：http://你的服务器:18790/webhook/event"
echo "   - 保存配置"
echo ""
echo "5. 验证配置："
echo "   - 确保 Bot 已开启"
echo "   - 确保应用已发布"
echo ""
echo "=========================================="
echo "✅ 配置完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 编辑 ~/.omp/env.d/feishu.env 确保配置正确"
echo "2. 在飞书开放平台配置事件订阅"
echo "3. 运行 ~/.omp/start-feishu.sh 启动 OMP"
echo "4. 在飞书中发送消息测试"
echo ""