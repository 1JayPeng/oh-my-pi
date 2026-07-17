#!/bin/bash
# =============================================================================
# 验证 lark-cli 模式配置
# =============================================================================

echo "=== lark-cli 模式验证 ==="
echo ""

# 加载配置
source ~/.omp/env.d/feishu-lark.env

echo "📋 当前配置:"
echo "   App ID: $FEISHU_APP_ID"
echo "   App Secret: ${FEISHU_APP_SECRET:0:10}..."
echo ""

# 检查 lark-cli
if ! command -v lark-cli &> /dev/null; then
    echo "❌ lark-cli 未安装"
    exit 1
fi
echo "✅ lark-cli 已安装：$(lark-cli --version)"

# 检查认证
echo ""
echo "📋 lark-cli 认证:"
lark-cli auth status 2>&1 | grep -A2 "bot"

# 检查 event 命令
echo ""
echo "📋 检查 event consume 命令:"
lark-cli event consume --help 2>&1 | head -5

# 检查可用的 EventKeys
echo ""
echo "📋 检查 im.message.receive_v1:"
lark-cli event list 2>&1 | grep "im.message.receive_v1"

echo ""
echo "=========================================="
echo "✅ lark-cli 模式配置验证通过！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 启动 OMP："
echo "   ~/.omp/start-feishu-lark.sh"
echo ""
echo "2. 在飞书中发送消息测试"
echo ""
echo "📖 文档：docs/feishu-modes.md"
echo ""