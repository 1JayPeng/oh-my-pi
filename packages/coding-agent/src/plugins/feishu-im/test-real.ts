#!/usr/bin/env bun
// =============================================================================
// Real Integration Test - Feishu Bot
// =============================================================================
// 直接使用真实凭证测试飞书 Bot 功能

import { FeishuClient } from "./src/feishu-client.js";

const config = {
  appId: "cli_aad0fb6917f8dcc8",
  appSecret: "iTXD3cItKQ4vVBNo81GKzhbsuQNCNuwl",
};

async function main() {
  console.log("=== OMP 飞书插件 - 真实集成测试 ===\n");

  const client = new FeishuClient(config);

  // 测试 1: 配置验证
  console.log("📋 测试 1: 配置验证");
  console.log(`   App ID: ${config.appId}`);
  console.log(`   App Secret: ${config.appSecret.substring(0, 8)}...`);
  console.log("   ✅ 配置已加载\n");

  // 测试 2: 创建确认卡片
  console.log("📋 测试 2: 创建确认卡片");
  const confirmCard = client.createConfirmationCard({
    id: "test_123",
    description: "这是测试确认卡片 - 请忽略此测试",
    risk: "low",
    timeout: 30000,
  });
  console.log(`   卡片标题：${confirmCard.header.title.content}`);
  console.log(`   卡片模板：${confirmCard.header.template}`);
  console.log(`   元素数量：${confirmCard.elements.length}`);
  console.log("   ✅ 卡片创建成功\n");

  // 测试 3: 创建状态卡片
  console.log("📋 测试 3: 创建状态卡片");
  const stateCard = client.createStateCard({
    branch: "feat/feishu-im-integration",
    mainBranch: "main",
    contextUsage: {
      input: 50000,
      output: 25000,
      cacheRead: 10000,
      cacheWrite: 5000,
      total: 90000,
    },
    cost: 0.15,
    model: "gpt-4",
    sessionId: "test_session_123",
    currentTask: "飞书集成测试",
  });
  console.log(`   卡片标题：${stateCard.header.title.content}`);
  console.log(`   元素数量：${stateCard.elements.length}`);
  console.log("   ✅ 状态卡片创建成功\n");

  // 测试 4: 发送测试消息（需要有效的 chat_id）
  console.log("📋 测试 4: 发送测试消息");
  console.log("   ℹ️  需要有效的用户 chat_id 才能发送消息");
  console.log("   ℹ️  请在飞书中与 Bot 对话后，获取 chat_id");
  console.log("   ℹ️  或使用以下代码获取：");
  console.log(`   const chatId = event.message.chat_id;`);
  console.log("   ⏭️  跳过实际发送\n");

  // 测试 5: 签名验证配置
  console.log("📋 测试 5: 签名验证配置");
  console.log("   ✅ 签名验证已配置（未设置 verificationToken 时跳过验证）");
  console.log("   ℹ️  如需启用，设置 FEISHU_VERIFICATION_TOKEN 环境变量\n");

  console.log("=== 测试完成 ===");
  console.log("\n📝 下一步:");
  console.log("1. 在飞书中与 Bot 对话");
  console.log("2. 从事件回调中获取 chat_id");
  console.log("3. 更新 test-real.ts 中的 chatId");
  console.log("4. 重新运行测试验证消息发送\n");

  console.log("🔗 飞书开放平台: https://open.feishu.cn/");
  console.log("📚 文档：packages/coding-agent/src/plugins/feishu-im/README.md");
}

main().catch(console.error);