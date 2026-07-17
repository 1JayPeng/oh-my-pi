// =============================================================================
// Feishu CLI Integration Tests
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { FeishuCliServer } from "../src/server.js";
import type { FeishuCliConfig } from "../src/types.js";

describe("Feishu CLI Integration", () => {
  const testConfig: FeishuCliConfig = {
    appId: "cli_aad0fb6917f8dcc8",
    appSecret: "test_secret_integration",
    serverPort: 18901,
    serverHost: "127.0.0.1",
    verificationToken: "test_token",
    encryptKey: "test_encrypt",
  };

  let server: FeishuCliServer;

  beforeEach(async () => {
    server = new FeishuCliServer(testConfig, true);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("Full Message Flow", () => {
    it("should handle complete message lifecycle", async () => {
      // 1. Check initial status
      const statusBefore = await fetch("http://127.0.0.1:18901/api/status");
      const initialStatus = await statusBefore.json();
      expect(initialStatus.success).toBe(true);
      expect(initialStatus.data.messageCount).toBe(0);

      // 2. Send a message
      const sendResponse = await fetch("http://127.0.0.1:18901/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "oc_integration_test",
          message: "Integration test message",
          msgType: "text",
        }),
      });

      expect(sendResponse.status).toBe(200);
      const sendData = await sendResponse.json();
      expect(sendData.success).toBe(true);
      const messageId = sendData.message_id;

      // 3. Verify message was recorded
      const messagesResponse = await fetch("http://127.0.0.1:18901/api/messages?limit=5");
      const messagesData = await messagesResponse.json();
      expect(messagesData.success).toBe(true);
      expect(messagesData.data.length).toBe(1);
      expect(messagesData.data[0].chatId).toBe("oc_integration_test");
      expect(messagesData.data[0].content).toBe("Integration test message");

      // 4. Check status reflects new message count
      const statusAfter = await fetch("http://127.0.0.1:18901/api/status");
      const finalStatus = await statusAfter.json();
      expect(finalStatus.data.messageCount).toBe(1);
    });

  });

  describe("Configuration Flow", () => {
    it("should update and verify configuration changes", async () => {
      // Initial config
      const statusBefore = await fetch("http://127.0.0.1:18901/api/status");
      const initialStatus = await statusBefore.json();
      expect(initialStatus.data.appId).toBe("cli_aad0fb6917f8dcc8");

      // Update app_id
      const updateResponse = await fetch("http://127.0.0.1:18901/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "app_id",
          value: "cli_updated_app_id",
        }),
      });

      expect(updateResponse.status).toBe(200);

      // Verify update
      const statusAfter = await fetch("http://127.0.0.1:18901/api/status");
      const finalStatus = await statusAfter.json();
      expect(finalStatus.data.appId).toBe("cli_updated_app_id");
    });

  });

  describe("Health and Status", () => {
    it("should maintain health during operations", async () => {
      // Initial health check
      const healthBefore = await fetch("http://127.0.0.1:18901/health");
      expect(healthBefore.status).toBe(200);

      // Perform multiple operations
      for (let i = 0; i < 5; i++) {
        await fetch("http://127.0.0.1:18901/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: "oc_test",
            message: `Health check ${i + 1}`,
          }),
        });
      }

      // Final health check
      const healthAfter = await fetch("http://127.0.0.1:18901/health");
      const healthData = await healthAfter.json();
      expect(healthData.status).toBe("ok");
    });

    it("should provide accurate message counts", async () => {
      // Send 3 messages
      for (let i = 0; i < 3; i++) {
        await fetch("http://127.0.0.1:18901/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: "oc_test",
            message: `Count message ${i + 1}`,
          }),
        });
      }

      // Check status
      const statusResponse = await fetch("http://127.0.0.1:18901/api/status");
      const statusData = await statusResponse.json();
      expect(statusData.data.messageCount).toBeGreaterThanOrEqual(3);
    });
  });
});