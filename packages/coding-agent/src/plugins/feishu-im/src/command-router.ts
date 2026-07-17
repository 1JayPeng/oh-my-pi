// =============================================================================
// Command Router
// =============================================================================
// 将飞书消息映射到 OMP 命令

 import type { FeishuMessageEvent, OmpCommand } from "./types.js";

/**
 * 命令解析结果
 */
export interface ParsedCommand {
  command: OmpCommand;
  /** 是否是确认响应 */
  isConfirmation?: false;
}

export interface ConfirmationResult {
  isConfirmation: true;
  requestId: string;
  action: "confirm" | "reject";
}

export type ParsedMessage = ParsedCommand | ConfirmationResult;

/**
 * 飞书命令路由器
 */
export class CommandRouter {
  /**
   * 解析飞书消息为 OMP 命令
   */
  parseMessage(event: FeishuMessageEvent): ParsedMessage {
    const content = event.content.trim();

    // 检查是否是确认响应（通过消息 ID 或特殊前缀）
    const confirmMatch = content.match(/^!(\d+):?(confirm|reject)?$/i);
    if (confirmMatch) {
      return {
        isConfirmation: true,
        requestId: confirmMatch[1],
        action: confirmMatch[2]?.toLowerCase() === "reject" ? "reject" : "confirm",
      };
    }

    // 检查是否是 /omp 命令
    if (content.startsWith("/omp ")) {
      return this.parseOmpCommand(content.slice(5));
    }

    // 默认视为 prompt
    return {
      command: { type: "prompt", content },
    };
  }

  /**
   * 解析 /omp 命令
   */
  private parseOmpCommand(input: string): ParsedMessage {
    const parts = input.split(/\s+/);
    // 归一化命令名：移除连字符和下划线
    const command = parts[0].toLowerCase().replace(/[-_]/g, '');
    const args = parts.slice(1).join(" ");

    switch (command) {
      case "prompt":
        return { command: { type: "prompt", content: args } };
      case "steer":
        return { command: { type: "steer", content: args } };
      case "followup":
        return { command: { type: "follow_up", content: args } };
      case "abort":
        return { command: { type: "abort" } };
      case "newsession":
        return { command: { type: "new_session" } };
      case "switchsession":
        return { command: { type: "switch_session", sessionId: args } };
      case "branch":
        return { command: { type: "branch" } };
      case "state":
        return { command: { type: "get_state" } };
      case "setmodel":
        return { command: { type: "set_model", model: args } };
      case "compact":
        return { command: { type: "compact" } };
      case "bash":
        return { command: { type: "bash", content: args } };
      case "handoff":
        return { command: { type: "handoff", content: args } };
      case "messages":
        return { command: { type: "get_messages", limit: args ? parseInt(args, 10) : undefined } };
      default:
        return {
          command: {
            type: "prompt",
            content: "未知命令，输入 /omp help 查看帮助",
          },
        };
    }
  }
}