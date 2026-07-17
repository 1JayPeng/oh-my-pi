// =============================================================================
// Feishu CLI Types Tests
// =============================================================================

import { describe, it, expect } from "bun:test";
import type {
  FeishuCliConfig,
  FeishuMessageEvent,
  OmpCommand,
  OmpResponse,
  FeishuCard,
  ConfirmationRequest,
  ConfirmationResponse,
  OmpState,
} from "../src/types.js";

describe("Feishu CLI Types", () => {
  describe("FeishuCliConfig", () => {
    it("should create a valid config with all required fields", () => {
      const config: FeishuCliConfig = {
        appId: "cli_aad0fb6917f8dcc8",
        appSecret: "test_secret",
        verificationToken: "test_token",
        encryptKey: "test_encrypt",
        callbackUrl: "https://example.com/callback",
        serverPort: 18790,
        serverHost: "0.0.0.0",
      };

      expect(config.appId).toBe("cli_aad0fb6917f8dcc8");
      expect(config.appSecret).toBe("test_secret");
      expect(config.serverPort).toBe(18790);
      expect(config.serverHost).toBe("0.0.0.0");
    });

    it("should create a valid config with minimal fields", () => {
      const config: FeishuCliConfig = {
        appId: "cli_aad0fb6917f8dcc8",
        appSecret: "test_secret",
      };

      expect(config.appId).toBe("cli_aad0fb6917f8dcc8");
      expect(config.appSecret).toBe("test_secret");
      expect(config.serverPort).toBeUndefined();
      expect(config.serverHost).toBeUndefined();
    });
  });

  describe("FeishuMessageEvent", () => {
    it("should create a valid message event", () => {
      const event: FeishuMessageEvent = {
        type: "im.message.receive_v1",
        message: {
          chat_id: "oc_test123",
          message_id: "om_test456",
          message_type: "text",
          content: JSON.stringify({ text: "Hello" }),
          create_time: "1234567890",
          sender: {
            sender_id: {
              open_id: "ou_test789",
              sender_id_type: "open_id",
            },
            sender_type: "person",
          },
        },
        sender: {
          sender_id: {
            open_id: "ou_test789",
            sender_id_type: "open_id",
          },
          sender_type: "person",
        },
        create_time: "1234567890",
      };

      expect(event.type).toBe("im.message.receive_v1");
      expect(event.message.chat_id).toBe("oc_test123");
      expect(event.sender.sender_id.open_id).toBe("ou_test789");
    });

    it("should handle different event types", () => {
      const textEvent: FeishuMessageEvent = {
        type: "im.message.receive_v1",
        message: { chat_id: "oc_1", message_id: "om_1", message_type: "text", content: "{}", create_time: "123" },
        sender: { sender_id: { open_id: "ou_1", sender_id_type: "open_id" }, sender_type: "person" },
        create_time: "123",
      };

      expect(textEvent.type).toBe("im.message.receive_v1");
    });
  });

  describe("OmpCommand", () => {
    it("should create prompt command", () => {
      const cmd: OmpCommand = {
        type: "prompt",
        content: "Hello world",
      };

      expect(cmd.type).toBe("prompt");
      expect(cmd.content).toBe("Hello world");
    });

    it("should create abort command", () => {
      const cmd: OmpCommand = {
        type: "abort",
      };

      expect(cmd.type).toBe("abort");
    });

    it("should create new_session command", () => {
      const cmd: OmpCommand = {
        type: "new_session",
      };

      expect(cmd.type).toBe("new_session");
    });

    it("should create bash command", () => {
      const cmd: OmpCommand = {
        type: "bash",
        content: "ls -la",
      };

      expect(cmd.type).toBe("bash");
      expect(cmd.content).toBe("ls -la");
    });
  });

  describe("OmpResponse", () => {
    it("should create successful response", () => {
      const resp: OmpResponse = {
        type: "response",
        command: "prompt",
        success: true,
        data: { message: "Success" },
      };

      expect(resp.success).toBe(true);
      expect(resp.data).toEqual({ message: "Success" });
    });

    it("should create error response", () => {
      const resp: OmpResponse = {
        type: "response",
        command: "prompt",
        success: false,
        error: "Something went wrong",
      };

      expect(resp.success).toBe(false);
      expect(resp.error).toBe("Something went wrong");
    });
  });

  describe("FeishuCard", () => {
    it("should create a valid card", () => {
      const card: FeishuCard = {
        config: { wide_screen_mode: true },
        header: {
          title: {
            tag: "plain_text",
            content: "Test Card",
          },
          template: "blue",
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: "**Hello** World",
            },
          },
        ],
      };

      expect(card.config.wide_screen_mode).toBe(true);
      expect(card.header.title.content).toBe("Test Card");
      expect(card.elements).toHaveLength(1);
    });

    it("should support markdown element", () => {
      const card: FeishuCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: "MD Card" },
          template: "green",
        },
        elements: [
          {
            tag: "markdown",
            content: "# Heading\n\nParagraph",
          },
        ],
      };

      expect(card.elements[0].tag).toBe("markdown");
    });

    it("should support action buttons", () => {
      const card: FeishuCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: "Action Card" },
          template: "orange",
        },
        elements: [
          {
            tag: "action",
            actions: [
              {
                tag: "button",
                text: { tag: "plain_text", content: "Confirm" },
                type: "primary",
                value: { action: "confirm" },
              },
            ],
          },
        ],
      };

      const action = card.elements[0];
      expect(action.tag).toBe("action");
      if (action.tag === "action") {
        expect(action.actions).toHaveLength(1);
        expect(action.actions[0].text.content).toBe("Confirm");
      }
    });
  });

  describe("ConfirmationRequest", () => {
    it("should create a valid confirmation request", () => {
      const request: ConfirmationRequest = {
        id: "req_123",
        description: "Delete file",
        risk: "high",
        timeout: 30000,
      };

      expect(request.id).toBe("req_123");
      expect(request.risk).toBe("high");
      expect(request.timeout).toBe(30000);
    });
  });

  describe("ConfirmationResponse", () => {
    it("should create confirm response", () => {
      const response: ConfirmationResponse = {
        type: "confirm",
        requestId: "req_123",
      };

      expect(response.type).toBe("confirm");
      expect(response.requestId).toBe("req_123");
    });

    it("should create reject response with reason", () => {
      const response: ConfirmationResponse = {
        type: "reject",
        requestId: "req_123",
        reason: "User canceled",
      };

      expect(response.type).toBe("reject");
      expect(response.reason).toBe("User canceled");
    });
  });

  describe("OmpState", () => {
    it("should create a valid state object", () => {
      const state: OmpState = {
        branch: "main",
        mainBranch: "main",
        contextUsage: {
          input: 1000,
          output: 500,
          cacheRead: 200,
          cacheWrite: 100,
          total: 1800,
        },
        cost: 0.05,
        model: "gpt-4",
        sessionId: "session_123",
      };

      expect(state.branch).toBe("main");
      expect(state.model).toBe("gpt-4");
      expect(state.sessionId).toBe("session_123");
      expect(state.contextUsage.total).toBe(1800);
    });
  });
});