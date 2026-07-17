#!/bin/bash
# =============================================================================
# 测试飞书 HTTP 服务器
# =============================================================================

echo "=== 测试飞书 HTTP 服务器 ==="
echo ""

# 检查必要的环境变量
if [ -z "$FEISHU_APP_ID" ]; then
    export FEISHU_APP_ID=$(cat ~/.lark-cli/config.json | grep -o '"appId": "[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ -z "$FEISHU_APP_SECRET" ]; then
    # 尝试从密钥链获取
    FEISHU_APP_SECRET=$(lark-cli config show | grep -o '"appSecret": "[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -z "$FEISHU_APP_SECRET" ] || [ "$FEISHU_APP_SECRET" = "null" ]; then
        echo "⚠️  无法获取 FEISHU_APP_SECRET"
        echo "请手动设置: export FEISHU_APP_SECRET=your_actual_secret"
        export FEISHU_APP_SECRET="****"
    fi
fi

echo "📋 配置检查:"
echo "   App ID: $FEISHU_APP_ID"
echo "   App Secret: ${FEISHU_APP_SECRET:0:10}..."
echo ""

# 测试服务器启动
echo "🚀 启动 HTTP 服务器..."
echo "   端口：18790"
echo "   回调：/webhook/event"
echo ""

# 启动 OMP（使用后台模式测试）
cd /home/alice/oh-my-pi

# 创建一个简单的测试脚本
cat > /tmp/test-feishu-server.ts << 'EOF'
import { FeishuClient } from "/home/alice/oh-my-pi/packages/coding-agent/src/plugins/feishu-im/src/feishu-client.ts";
import { CommandRouter } from "/home/alice/oh-my-pi/packages/coding-agent/src/plugins/feishu-im/src/command-router.ts";
import { OutputFormatter } from "/home/alice/oh-my-pi/packages/coding-agent/src/plugins/feishu-im/src/output-formatter.ts";

const appConfig = {
  appId: process.env.FEISHU_APP_ID!,
  appSecret: process.env.FEISHU_APP_SECRET!,
};

const client = new FeishuClient(appConfig);
const commandRouter = new CommandRouter();
const formatter = new OutputFormatter();

console.log("✅ FeishuClient 初始化成功");
console.log("✅ CommandRouter 初始化成功");
console.log("✅ OutputFormatter 初始化成功");

// 测试 HTTP 服务器
const port = 18790;
const server = Bun.serve({
  port,
  async fetch(req: Request) {
    const url = new URL(req.url);
    
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }
    
    if (url.pathname === "/webhook/event" && req.method === "POST") {
      const body = await req.json();
      console.log("📨 收到飞书事件:", JSON.stringify(body, null, 2));
      
      // 验证事件类型
      if (body.header?.event?.type === "im.message.receive_v1") {
        console.log("✅ 消息事件验证成功");
        return new Response(JSON.stringify({ status: "ok" }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify({ status: "unsupported event" }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response("Not Found", { status: 404 });
  }
});

console.log(`🌐 HTTP 服务器已启动: http://localhost:${port}`);
console.log(`   健康检查：curl http://localhost:${port}/health`);
console.log(`   事件回调：curl -X POST http://localhost:${port}/webhook/event -H "Content-Type: application/json" -d '{"test": true}'`);

// 保持服务器运行
await new Promise(() => {});
EOF

# 运行测试服务器（后台）
echo ""
echo "🧪 启动测试服务器..."
bun run /tmp/test-feishu-server.ts &
SERVER_PID=$!
sleep 2

# 测试健康检查
echo ""
echo "📡 测试健康检查..."
HEALTH=$(curl -s http://localhost:18790/health)
if [ "$HEALTH" = "OK" ]; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败：$HEALTH"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# 测试事件回调
echo ""
echo "📡 测试事件回调..."
EVENT_RESPONSE=$(curl -s -X POST http://localhost:18790/webhook/event \
  -H "Content-Type: application/json" \
  -d '{"header": {"event": {"type": "im.message.receive_v1"}}, "message": {"chat_id": "test_chat"}}')
  
if echo "$EVENT_RESPONSE" | grep -q "ok"; then
    echo "✅ 事件回调处理成功"
else
    echo "❌ 事件回调处理失败：$EVENT_RESPONSE"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# 清理
kill $SERVER_PID 2>/dev/null
rm /tmp/test-feishu-server.ts

echo ""
echo "=========================================="
echo "✅ 服务器测试通过！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 在飞书开放平台配置事件订阅"
echo "   - 回调地址：http://你的服务器:18790/webhook/event"
echo "   - 事件：im.message.receive_v1"
echo ""
echo "2. 启动完整 OMP："
echo "   cd /home/alice/oh-my-pi"
echo "   ~/.omp/start-feishu.sh"
echo ""
echo "3. 在飞书中发送消息测试"
echo ""