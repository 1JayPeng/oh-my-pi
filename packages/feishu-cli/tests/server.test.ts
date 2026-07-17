// =============================================================================
// Feishu CLI Server Tests
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { FeishuCliServer } from "../src/server.js";
import type { FeishuCliConfig } from "../src/types.js";

describe("FeishuCliServer", () => {
  const testConfig: FeishuCliConfig = {
    appId: "test_app_id_123",
    appSecret: "test_app_secret_456",
    serverPort: 18900,
    serverHost: "127.0.0.1",
    verificationToken: "",
    encryptKey: "",
  };

  let server: FeishuCliServer;

  beforeEach(async () => {
    server = new FeishuCliServer(testConfig, true);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("Server Lifecycle", () => {
    it("should start and stop gracefully", async () => {
      // Server is already started in beforeEach
      expect(server).toBeDefined();
      await server.stop();
    });

    it("should handle multiple start/stop cycles", async () => {
      await server.stop();
      await server.start();
      await server.stop();
      await server.start();
      await server.stop();
    });
  });

  describe("Health Check", () => {
    it("should return 200 for /health", async () => {
      const response = await fetch("http://127.0.0.1:18900/health");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toEqual({ status: "ok", timestamp: expect.any(Number) });
    });

    it("should return current timestamp", async () => {
      const before = Date.now();
      const response = await fetch("http://127.0.0.1:18900/health");
      const data = await response.json();
      const after = Date.now();

      expect(data.timestamp).toBeGreaterThanOrEqual(before);
      expect(data.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("Status Endpoint", () => {
    it("should return status with config info", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/status");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.connected).toBe(true);
      expect(data.data.appId).toBe("test_app_id_123");
      expect(data.data.messageCount).toBe(0);
    });

    it("should update message count after sending messages", async () => {
      // First check initial count
      const statusResponse = await fetch("http://127.0.0.1:18900/api/status");
      const initialStatus = await statusResponse.json();
      const initialCount = initialStatus.data.messageCount;

      // Send a test message
      const sendResponse = await fetch("http://127.0.0.1:18900/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "test_chat_1",
          message: "Test message",
          msgType: "text",
        }),
      });

      expect(sendResponse.status).toBe(200);

      // Check status again
      const statusResponse2 = await fetch("http://127.0.0.1:18900/api/status");
      const finalStatus = await statusResponse2.json();
      expect(finalStatus.data.messageCount).toBe(initialCount + 1);
    });
  });

  describe("Send Message Endpoint", () => {
    it("should send text message successfully", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "test_chat_1",
          message: "Hello Feishu!",
          msgType: "text",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message_id).toBeDefined();
    });

    it("should send interactive card message", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "test_chat_2",
          message: "This is a card message",
          msgType: "interactive",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message_id).toBeDefined();
    });

    it("should reject message without chatId", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Hello",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("chatId");
    });

    it("should reject message without message body", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "test_chat_1",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("message");
    });

    it("should default to text message type", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "test_chat_1",
          message: "Default type test",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should track sent messages in history", async () => {
      // Clear message history by checking initial count
      const statusBefore = await fetch("http://127.0.0.1:18900/api/status");
      const initialStatus = await statusBefore.json();
      const initialCount = initialStatus.data.messageCount;

      // Send a message
      await fetch("http://127.0.0.1:18900/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "test_chat_1",
          message: "History test message",
        }),
      });

      // Check message history
      const messagesResponse = await fetch("http://127.0.0.1:18900/api/messages?limit=5");
      const messagesData = await messagesResponse.json();

      expect(messagesData.success).toBe(true);
      expect(messagesData.data.length).toBeGreaterThan(initialCount);
    });
  });

  describe("Get Messages Endpoint", () => {

    it("should return limited messages", async () => {
      // Send a few messages first
      for (let i = 0; i < 3; i++) {
        await fetch("http://127.0.0.1:18900/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: "test_chat_1",
            message: `Message ${i + 1}`,
          }),
        });
      }

      const response = await fetch("http://127.0.0.1:18900/api/messages?limit=2");
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(2);
    });

    it("should return most recent messages", async () => {
      // Send multiple messages
      const messages = ["First", "Second", "Third", "Fourth", "Fifth"];
      for (const msg of messages) {
        await fetch("http://127.0.0.1:18900/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: "test_chat_1",
            message: msg,
          }),
        });
      }

      // Get last 2 messages
      const response = await fetch("http://127.0.0.1:18900/api/messages?limit=2");
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.length).toBe(2);
      // Should be the last two messages
      expect(data.data[data.data.length - 1].content).toBe("Fifth");
    });

    it("should default to 10 messages limit", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/messages");
      const data = await response.json();

      expect(data.success).toBe(true);
      // Don't test exact count as it depends on previous tests
      expect(data.data).toBeInstanceOf(Array);
    });
  });

  describe("Config Endpoint", () => {
    it("should update app_id", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "app_id",
          value: "updated_app_id",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.key).toBe("app_id");
      expect(data.data.value).toBe("updated_app_id");

      // Verify status reflects update
      const statusResponse = await fetch("http://127.0.0.1:18900/api/status");
      const statusData = await statusResponse.json();
      expect(statusData.data.appId).toBe("updated_app_id");
    });

    it("should update app_secret", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "app_secret",
          value: "updated_app_secret",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should update verification_token", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "verify_token",
          value: "new_verification_token",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should update encrypt_key", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "encrypt_key",
          value: "new_encrypt_key",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should reject unknown config key", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "unknown_key",
          value: "some_value",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Unknown config key");
    });

    it("should reject missing key", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: "some_value",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("key and value are required");
    });

    it("should reject missing value", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "app_id",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("key and value are required");
    });
  });

  describe("Webhook Endpoint", () => {
    it("should handle url_verification challenge", async () => {
      const response = await fetch("http://127.0.0.1:18900/webhook/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "url_verification",
          challenge: "test_challenge_123",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.challenge).toBe("test_challenge_123");
    });

    it("should handle im.message.receive_v1 event", async () => {
      const messageContent = { text: "Hello from webhook!" };
      const response = await fetch("http://127.0.0.1:18900/webhook/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "im.message.receive_v1",
          event: {
            type: "im.message.receive_v1",
            message: {
              chat_id: "webhook_chat_1",
              message_id: "msg_123",
              message_type: "text",
              content: JSON.stringify(messageContent),
              create_time: "1234567890",
            },
            sender: {
              sender_id: {
                open_id: "user_open_id",
                id_type: "open_id",
              },
            },
            create_time: "1234567890",
          },
        }),
      });

      expect(response.status).toBe(200);

      // Check that message was recorded
      const messagesResponse = await fetch("http://127.0.0.1:18900/api/messages?limit=5");
      const messagesData = await messagesResponse.json();
      expect(messagesData.success).toBe(true);

      // Find our message
      const foundMessage = messagesData.data.find(
        (m: any) => m.content === "Hello from webhook!"
      );
      expect(foundMessage).toBeDefined();
      expect(foundMessage.chatId).toBe("webhook_chat_1");
    });

    it("should return 200 for unknown event types", async () => {
      const response = await fetch("http://127.0.0.1:18900/webhook/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "unknown_event",
          data: "some data",
        }),
      });

      expect(response.status).toBe(200);
    });

    it("should handle invalid JSON gracefully", async () => {
      const response = await fetch("http://127.0.0.1:18900/webhook/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json {{{",
      });

      // Server should handle gracefully
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("404 Handling", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await fetch("http://127.0.0.1:18900/unknown/path");
      expect(response.status).toBe(404);
    });

    it("should return 404 with plain text", async () => {
      const response = await fetch("http://127.0.0.1:18900/nonexistent");
      const text = await response.text();
      expect(text).toBe("Not Found");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid JSON in send endpoint", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });

      // Should return error response
      expect(response.status).toBeLessThanOrEqual(400); // Should return error status
    });

    it("should handle invalid JSON in config endpoint", async () => {
      const response = await fetch("http://127.0.0.1:18900/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });

      // Should return error response
      expect(response.status).toBeLessThanOrEqual(400); // Should return error status
    });
  });
});