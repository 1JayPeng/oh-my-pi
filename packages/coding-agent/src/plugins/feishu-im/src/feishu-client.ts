// =============================================================================
// Feishu Bot Client
// =============================================================================
// 基于 @larksuiteoapi/node-sdk 实现飞书 Bot 客户端
// 支持：App ID + Secret 认证、事件订阅、消息发送、签名验证

import { Client } from "@larksuiteoapi/node-sdk";
 import type {
   FeishuBotConfig,
   FeishuCard,
   ConfirmationRequest,
   OmpState,
 } from "./types.js";

/**
 * 飞书 Bot 客户端
 */
export class FeishuClient {
  private client: Client;
  private config: FeishuBotConfig;

  constructor(config: FeishuBotConfig) {
    this.config = config;
    this.client = new Client({
      appId: config.appId,
      appSecret: config.appSecret,
    });
  }


  /**
   * 发送文本消息
   */
  async sendMessage(chatId: string, content: string): Promise<void> {
    const response = await this.client.request<{
      code: number;
      msg: string;
      data: { message_id: string };
    }>({
      url: "/im/v1/messages",
      method: "POST",
      data: {
        receive_id: chatId,
        msg_type: "text",
        content: JSON.stringify({ text: content }),
      },
    });

    if (response.code !== 0) {
      throw new Error(`Failed to send message: ${response.msg}`);
    }
  }
  /**
   * 发送 Interactive 卡片
   */
  async sendCard(chatId: string, card: FeishuCard): Promise<void> {
    const response = await this.client.request<{
      code: number;
      msg: string;
      data: { message_id: string };
    }>({
      url: "/im/v1/messages",
      method: "POST",
      data: {
        receive_id: chatId,
        msg_type: "interactive",
        content: JSON.stringify(card),
      },
    });

    if (response.code !== 0) {
      throw new Error(`Failed to send card: ${response.msg}`);
    }
  }

  /**
   * 验证消息签名
   */
  async verifySignature(
    timestamp: string,
    nonce: string,
    encryption: string | undefined,
    body: string,
  ): Promise<boolean> {
    if (!this.config.verificationToken) {
      return true; // 未配置验证 token，跳过验证
    }

    const stringToSign = `${timestamp}${nonce}${encryption ?? ""}${body}`;
    // 使用 crypto 模块计算 SHA256
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex === this.config.verificationToken;
  }

  /**
   * 解密消息（如果配置了 Encrypt Key）
   */
  async decryptMessage(encrypted: string): Promise<string> {
    if (!this.config.encryptKey) {
      return encrypted;
    }

    // 使用 crypto 模块解密
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const key = encoder.encode(this.config.encryptKey.slice(0, 32).padEnd(32, "0"));
    const iv = encoder.encode("0000000000000000"); // 固定 IV

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-CBC" },
      false,
      ["decrypt"],
    );

    const encryptedBuffer = Buffer.from(encrypted, "base64");
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      encryptedBuffer,
    );

    return decoder.decode(decrypted);
  }

  /**
   * 创建确认卡片
   */
  createConfirmationCard(request: ConfirmationRequest): FeishuCard {
    const riskColor = request.risk === "high" ? "red" : request.risk === "medium" ? "orange" : "green";

    return {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: "plain_text",
          content: `⚠️ 危险操作确认`,
        },
        template: riskColor,
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**操作描述：**\n${request.description}\n\n**风险等级：** ${request.risk === "high" ? "高" : request.risk === "medium" ? "中" : "低"}\n\n**超时时间：** ${request.timeout / 1000} 秒`,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              type: "danger",
              text: { tag: "plain_text", content: "确认执行" },
              value: { type: "confirm", requestId: request.id },
            },
            {
              tag: "button",
              type: "default",
              text: { tag: "plain_text", content: "取消" },
              value: { type: "reject", requestId: request.id },
            },
          ],
        },
      ],
    };
  }

  /**
   * 创建状态卡片
   */
  createStateCard(state: OmpState): FeishuCard {
    const contextPercent = state.contextUsage.total > 0 ? 
      `${(state.contextUsage.total / 128000 * 100).toFixed(1)}%` : "N/A";

    return {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: "plain_text",
          content: `📊 OMP 状态`,
        },
        template: "blue",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**Git 分支：** \`${state.branch}\`\n**主分支：** \`${state.mainBranch}\`\n**模型：** \`${state.model}\`\n**会话 ID：** \`${state.sessionId}\``,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**上下文消耗：**\n- 输入：${state.contextUsage.input.toLocaleString()} tokens\n- 输出：${state.contextUsage.output.toLocaleString()} tokens\n- 缓存读取：${state.contextUsage.cacheRead.toLocaleString()} tokens\n- 缓存写入：${state.contextUsage.cacheWrite.toLocaleString()} tokens\n- **总计：${state.contextUsage.total.toLocaleString()} tokens** (${contextPercent})`,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**费用：** $${state.cost.toFixed(4)}\n${state.currentTask ? `**当前任务：** ${state.currentTask}` : ""}`,
          },
        },
      ],
    };
  }
}