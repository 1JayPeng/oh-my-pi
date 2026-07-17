// =============================================================================
// Feishu CLI Plugin - Backend Server
// =============================================================================
// HTTP 服务器，提供飞书 API 代理和消息处理

import type { Server } from "bun";
import { Client } from "@larksuiteoapi/node-sdk";
import type { FeishuCliConfig, FeishuCard } from "./types.js";

/**
 * 飞书 CLI 后端服务器
 */
export class FeishuCliServer {
  private config: FeishuCliConfig;
  private client: Client;
  private server: Server | null = null;
  private running = false;
  private messageHistory: Array<{
    chatId: string;
    content: string;
    createTime: string;
    senderId: string;
  }> = [];

  constructor(config: FeishuCliConfig, private testMode = false) {
    this.config = config;
    if (!this.testMode) {
      this.client = new Client({
        appId: config.appId,
        appSecret: config.appSecret,
      });
    }
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (this.running) return;

    const port = this.config.serverPort || parseInt(process.env.FEISHU_SERVER_PORT || "18790", 10);
    const host = this.config.serverHost || process.env.FEISHU_SERVER_HOST || "0.0.0.0";

    console.log(`[Feishu CLI] Starting server on ${host}:${port}`);

    this.server = Bun.serve({
      port,
      hostname: host,
      fetch: (req: Request) => this.handleRequest(req),
    });

    this.running = true;
    console.log(`[Feishu CLI] Server running at http://${host}:${port}`);
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (!this.running || !this.server) return;

    console.log("[Feishu CLI] Stopping server...");
    await this.server.stop();
    this.server = null;
    this.running = false;
    console.log("[Feishu CLI] Server stopped");
  }

  /**
   * 处理 HTTP 请求
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // 健康检查
      if (path === "/health") {
        return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // 状态查询
      if (path === "/api/status") {
        return this.handleStatus();
      }

      // 发送消息
      if (path === "/api/send" && req.method === "POST") {
        return this.handleSendMessage(req);
      }

      // 获取消息历史
      if (path === "/api/messages") {
        return this.handleGetMessages(url);
      }

      // 配置管理
      if (path === "/api/config" && req.method === "POST") {
        return this.handleConfig(req);
      }

      // 飞书事件回调
      if (path === "/webhook/event" && req.method === "POST") {
        return this.handleEventCallback(req);
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("[Feishu CLI] Request error:", error);
      return new Response(
        JSON.stringify({ success: false, error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * 处理状态查询
   */
  private handleStatus(): Response {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          connected: true,
          appId: this.config.appId,
          messageCount: this.messageHistory.length,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * 处理发送消息
   */
  private async handleSendMessage(req: Request): Promise<Response> {
    let body: { chatId?: string; message?: string; msgType?: string };
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const chatId = body.chatId;
    const message = body.message;
    const msgType = body.msgType || "text";

    if (!chatId || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "chatId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (this.testMode) {
      // In test mode, simulate successful API response
      const messageId = `test_msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      this.messageHistory.push({
        chatId,
        content: message,
        createTime: new Date().toISOString(),
        senderId: "system",
      });
      return new Response(
        JSON.stringify({
          success: true,
          message_id: messageId,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const response = await this.client.request<{
        code: number;
        msg: string;
        data: { message_id: string };
      }>({
        url: "/im/v1/messages",
        method: "POST",
        data: {
          receive_id: chatId,
          msg_type: msgType === "interactive" ? "interactive" : "text",
          content:
            msgType === "interactive"
              ? JSON.stringify(this.createSimpleCard(message))
              : JSON.stringify({ text: message }),
        },
      });

      if (response.code === 0) {
        // 记录消息历史
        this.messageHistory.push({
          chatId,
          content: message,
          createTime: new Date().toISOString(),
          senderId: "system",
        });

        return new Response(
          JSON.stringify({
            success: true,
            message_id: response.data.message_id,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: response.msg }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * 处理获取消息历史
   */
  private handleGetMessages(url: URL): Response {
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const messages = this.messageHistory.slice(-limit);

    return new Response(
      JSON.stringify({ success: true, data: messages }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * 处理配置更新
   */
  private async handleConfig(req: Request): Promise<Response> {
    let body: { key?: string; value?: string };
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const key = body.key;
    const value = body.value;

    if (!key || !value) {
      return new Response(
        JSON.stringify({ success: false, error: "key and value are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 更新配置
    switch (key) {
      case "app_id":
        this.config.appId = value;
        break;
      case "app_secret":
        this.config.appSecret = value;
        break;
      case "verify_token":
        this.config.verificationToken = value;
        break;
      case "encrypt_key":
        this.config.encryptKey = value;
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown config key: ${key}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: { key, value } }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * 处理飞书事件回调
   */
  private async handleEventCallback(req: Request): Promise<Response> {
    try {
      const body: Record<string, unknown> = await req.json();
      const event = body.event || body;

      // 验证请求
      if (event?.type === "url_verification") {
        return new Response(
          JSON.stringify({ challenge: event.challenge }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // 处理消息接收事件
      if (event?.type === "im.message.receive_v1") {
        const message = event.message as { chat_id?: string; content?: string; create_time?: string } | undefined;
        const chatId = message?.chat_id || "";
        const content = JSON.parse(message?.content || "{}");
        const text = content.text || "";

        // 记录消息
        this.messageHistory.push({
          chatId,
          content: text,
          createTime: message?.create_time || new Date().toISOString(),
          senderId: "unknown",
        });

        // 这里可以调用 OMP 的 RPC 接口处理消息
        // 例如：发送 prompt、steer 等命令
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("[Feishu CLI] Event handling error:", error);
      return new Response("Error", { status: 500 });
    }
  }

  /**
   * 创建简单的卡片消息
   */
  private createSimpleCard(content: string): FeishuCard {
    return {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: "plain_text",
          content: "OMP 响应",
        },
        template: "blue",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content,
          },
        },
      ],
    };
  }
}