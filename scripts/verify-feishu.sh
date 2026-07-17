#!/bin/bash
# =============================================================================
# 快速验证飞书配置
# =============================================================================

echo "=== 飞书配置验证 ==="
echo ""

# 加载配置
source ~/.omp/env.d/feishu.env

echo "📋 当前配置:"
echo "   App ID: $FEISHU_APP_ID"
echo "   App Secret: ${FEISHU_APP_SECRET:0:10}..."
echo "   服务器端口：$FEISHU_SERVER_PORT"
echo ""

# 检查 lark-cli 配置
echo "📋 lark-cli 配置:"
lark-cli config show 2>&1 | head -10
echo ""

# 检查 lark-cli 认证
echo "📋 lark-cli 认证:"
lark-cli auth status 2>&1
echo ""

# 测试 FeishuClient 初始化
echo "📋 测试 FeishuClient 初始化..."
cd /home/alice/oh-my-pi
cat > /tmp/test-client.ts << EOF
import { FeishuClient } from "/home/alice/oh-my-pi/packages/coding-agent/src/plugins/feishu-im/src/feishu-client.ts";

const appConfig = {
  appId: process.env.FEISHU_APP_ID!,
  appSecret: process.env.FEISHU_APP_SECRET!,
};

try {
  const client = new FeishuClient(appConfig);
  console.log("✅ FeishuClient 初始化成功");
  console.log("   应用 ID:", client.appId);
} catch (err) {
  console.error("❌ FeishuClient 初始化失败:", err);
  process.exit(1);
}
EOF

# 使用环境变量运行测试
FEISHU_APP_ID=$FEISHU_APP_ID FEISHU_APP_SECRET=$FEISHU_APP_SECRET bun run /tmp/test-client.ts 2>&1

# 清理
rm /tmp/test-client.ts

echo ""
echo "=========================================="
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 配置验证通过！"
else
    echo "❌ 配置验证失败"
fi
echo "=========================================="
echo ""
echo "下一步："
echo "1. 在飞书开放平台配置事件订阅"
echo "   - 回调地址：http://你的服务器:$FEISHU_SERVER_PORT/webhook/event"
echo "   - 事件：im.message.receive_v1"
echo ""
echo "2. 启动 OMP："
echo "   ~/.omp/start-feishu.sh"
echo ""
echo "3. 在飞书中发送消息测试"
echo ""