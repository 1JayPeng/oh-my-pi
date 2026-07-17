#!/usr/bin/env bun
// =============================================================================
// OMP 飞书插件 - 消息发送测试
// =============================================================================
// 使用真实凭证测试消息发送功能

import { FeishuClient } from "./src/feishu-client.js";

const config = {
  appId: "cli_aad0fb6917f8dcc8",
  appSecret: "iTXD3cItKQ4vVBNo81GKzhbsuQNCNuwl",
};

async function main() {
  console.log("=== OMP 飞书插件 - 消息发送测试 ===\n");

  const client = new FeishuClient(config);

  // 从命令行参数获取 chat_id
  const chatId = process.argv[2];

  if (!chatId) {
    console.log("❌ 错误：请提供 chat_id");
    console.log("\n使用方法: bun test-send.ts <chat_id>");
    console.log("\n如何获取 chat_id:");
    console.log("1. 启动 OMP 并加载飞书插件");
    console.log("2. 在飞书中向 Bot 发送任意消息");
    console.log("3. 查看 OMP 日志，找到 'Received event from chat_id:' 后的值");
    console.log("   格式：oc_xxxxxxxx");
    process.exit(1);
  }

  console.log(`📋 目标 chat_id: ${chatId}`);
  console.log("");

  try {
    // 发送文本消息
    console.log("📤 发送文本消息...");
    const textMessage = "🎉 OMP 飞书插件测试成功！\n\n你已成功发送消息到飞书。\n\n测试时间：" + new Date().toISOString();
    const textResult = await client.sendMessage(chatId, textMessage);
    console.log("✅ 文本消息发送成功");
    console.log(`   消息 ID: ${textResult.message_id}`);
    console.log("");

    // 发送卡片消息
    console.log("📤 发送卡片消息...");
    const card = client.createConfirmationCard({
      id: `test_${Date.now()}`,
      description: "这是 OMP 飞书插件的测试卡片",
      risk: "low",
      timeout: 30000,
    });

    const cardResult = await client.sendCard(chatId, card);
    console.log("✅ 卡片消息发送成功");
    console.log(`   卡片 ID: ${cardResult.message_id}`);
    console.log("");

    console.log("=== 测试完成 ===");
    console.log("\n🎉 所有测试通过！");
    console.log("\n📝 下一步:");
    console.log("1. 在飞书中查看收到的消息和卡片");
    console.log("2. 发送命令测试完整流程: /omp prompt 你好");
    console.log("3. 查看 OMP 日志确认事件处理正常");

  } catch (error) {
    console.error("\n❌ 测试失败:");
    console.error(error);
    process.exit(1);
  }
}

main();