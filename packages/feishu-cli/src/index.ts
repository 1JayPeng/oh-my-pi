// =============================================================================
// Feishu CLI Plugin - Extension Entry Point
// =============================================================================
// 注册为 OMP 扩展，提供飞书 CLI 集成

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { z } from "zod/v4";

export default function feishuCliExtension(pi: ExtensionAPI) {
  pi.setLabel("飞书 CLI 集成");

  // ========================================================================
  // 飞书命令注册
  // ========================================================================

  // /feishu send - 发送消息到飞书
  pi.registerCommand("feishu-send", {
    description: "发送消息到飞书",
    handler: async (args, ctx) => {
      try {
        const [chatId, ...messageParts] = args.split(/\s+/);
        const message = messageParts.join(" ");
        
        if (!chatId || !message) {
          ctx.ui.notify("用法：/feishu-send <chat_id> <message>", "info");
          return;
        }

        // 调用飞书工具发送消息
        const result = await pi.exec("feishu_send_message", {
          chatId,
          message,
        });

        ctx.ui.notify("消息已发送", "info");
      } catch (error) {
        ctx.ui.notify(`发送失败：${error}`, "error");
      }
    },
  });

  // /feishu status - 查看飞书连接状态
  pi.registerCommand("feishu-status", {
    description: "查看飞书连接状态",
    handler: async (_args, ctx) => {
      try {
        const result = await pi.exec("feishu_get_status", {});
        
        if (result.success) {
          ctx.ui.notify(`飞书已连接：${result.data.connected}`, "info");
        } else {
          ctx.ui.notify(`飞书未连接：${result.error}`, "error");
        }
      } catch (error) {
        ctx.ui.notify(`查询状态失败：${error}`, "error");
      }
    },
  });

  // /feishu config - 配置飞书应用
  pi.registerCommand("feishu-config", {
    description: "配置飞书应用",
    handler: async (args, ctx) => {
      try {
        const parts = args.split(/\s+/);
        const [key, value] = parts;
        
        if (!key || !value) {
          ctx.ui.notify("用法：/feishu-config <key> <value>", "info");
          ctx.ui.notify("可配置项：app_id, app_secret, verify_token, encrypt_key", "info");
          return;
        }

        await pi.exec("feishu_set_config", { key, value });
        ctx.ui.notify(`配置已更新：${key}`, "info");
      } catch (error) {
        ctx.ui.notify(`配置失败：${error}`, "error");
      }
    },
  });

  // /feishu messages - 获取飞书消息历史
  pi.registerCommand("feishu-messages", {
    description: "获取飞书消息历史",
    handler: async (args, ctx) => {
      try {
        const limit = args ? parseInt(args, 10) : 10;
        
        if (isNaN(limit) || limit < 1) {
          ctx.ui.notify("用法：/feishu-messages [数量]", "info");
          return;
        }

        const result = await pi.exec("feishu_get_messages", { limit });
        
        if (result.success) {
          ctx.ui.notify(`获取到 ${result.data.length} 条消息`, "info");
          // 输出消息列表
          for (const msg of result.data) {
            ctx.ui.notify(`[${msg.create_time}] ${msg.content}`, "info");
          }
        } else {
          ctx.ui.notify(`获取消息失败：${result.error}`, "error");
        }
      } catch (error) {
        ctx.ui.notify(`获取消息失败：${error}`, "error");
      }
    },
  });

  // ========================================================================
  // 飞书工具注册
  // ========================================================================

  // 发送飞书消息工具
  pi.registerTool({
    name: "feishu_send_message",
    label: "发送飞书消息",
    description: "向飞书用户或群组发送消息",
    parameters: z.object({
      chatId: z.string().describe("飞书会话 ID"),
      message: z.string().describe("消息内容"),
      msgType: z.enum(["text", "interactive"]).default("text").describe("消息类型"),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const response = await fetch("http://localhost:18790/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const data = await response.json();
        
        if (data.success) {
          return {
            content: [{ type: "text", text: `消息发送成功，消息 ID: ${data.message_id}` }],
            details: { messageId: data.message_id },
          };
        } else {
          return {
            content: [{ type: "text", text: `发送失败：${data.error}` }],
            isError: true,
          };
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `发送失败：${error}` }],
          isError: true,
        };
      }
    },
  });

  // 获取飞书状态工具
  pi.registerTool({
    name: "feishu_get_status",
    label: "飞书状态",
    description: "获取飞书连接状态和配置信息",
    parameters: z.object({}).passthrough(),
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      try {
        const response = await fetch("http://localhost:18790/api/status");
        const data = await response.json();
        
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          details: data,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `无法获取状态：${error}` }],
          isError: true,
        };
      }
    },
  });

  // 获取飞书消息历史工具
  pi.registerTool({
    name: "feishu_get_messages",
    label: "飞书消息历史",
    description: "获取最近的飞书消息",
    parameters: z.object({
      limit: z.number().default(10).describe("获取消息数量，默认 10").optional(),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const response = await fetch(
          `http://localhost:18790/api/messages?limit=${params.limit}`
        );
        const data = await response.json();
        
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          details: data,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `获取消息失败：${error}` }],
          isError: true,
        };
      }
    },
  });

  // ========================================================================
  // 事件处理
  // ========================================================================

  // 会话启动时初始化
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("飞书 CLI 插件已加载", "info");
    
    // 检查飞书配置
    try {
      const status = await pi.exec("feishu_get_status", {});
      if (!status.success || !status.data?.connected) {
        ctx.ui.notify("飞书未配置，请运行 /feishu-config 配置", "warn");
      }
    } catch {
      // 静默处理
    }
  });

  // 会话关闭时清理
  pi.on("session_shutdown", async (_event, _ctx) => {
    // 清理资源
  });
}