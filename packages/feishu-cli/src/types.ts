// =============================================================================
// Feishu CLI Plugin Type Definitions
// =============================================================================

/**
 * 飞书应用配置
 */
export interface FeishuCliConfig {
  /** 飞书应用 App ID */
  appId: string;
  /** 飞书应用 App Secret */
  appSecret: string;
  /** 飞书事件订阅 Verification Token (可选) */
  verificationToken?: string;
  /** 飞书事件订阅 Encrypt Key (可选) */
  encryptKey?: string;
  /** 飞书事件回调 URL (可选) */
  callbackUrl?: string;
  /** 飞书服务器端口 (默认 18790) */
  serverPort?: number;
  /** 飞书服务器主机 (默认 0.0.0.0) */
  serverHost?: string;
}

/**
 * 飞书消息事件类型
 */
export type FeishuEventType =
  | "im.message.receive_v1"
  | "p2im.message.receive_v1";

/**
 * 飞书消息事件
 */
export interface FeishuMessageEvent {
  type: FeishuEventType;
  message_id: string;
  chat_type: "p2p" | "group";
  sender_id: string;
  content: string;
  create_time: string;
  message: {
    chat_id: string;
    chat_type: string;
    content: string;
    message_id: string;
    message_type: string;
    receive_id: string;
    sender: {
      id: string;
      id_type: string;
      sender_id_type: string;
      sender_type: string;
      tenant_key: string;
    };
    create_time: string;
    update_time: string;
    mention: string[];
  };
}

/**
 * OMP 命令类型
 */
export type OmpCommandType =
  | "prompt"
  | "steer"
  | "follow_up"
  | "abort"
  | "new_session"
  | "switch_session"
  | "branch"
  | "get_state"
  | "set_model"
  | "compact"
  | "bash"
  | "handoff"
  | "get_messages";

/**
 * OMP 命令
 */
export interface OmpCommand {
  type: OmpCommandType;
  content?: string;
  sessionId?: string;
  model?: string;
  limit?: number;
}

/**
 * OMP 响应
 */
export interface OmpResponse {
  type: "response";
  command: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * 飞书卡片元素类型
 */
export type FeishuCardElement =
  | { tag: "div"; text: { tag: "lark_md"; content: string } }
  | { tag: "div"; elements: FeishuCardElement[] }
  | { tag: "markdown"; content: string }
  | { tag: "action"; actions: FeishuCardAction[] }
  | { tag: "hr" }
  | { tag: "note"; elements: { tag: "plain_text"; content: string }[] };

/**
 * 飞书卡片按钮操作
 */
export interface FeishuCardAction {
  tag: "button" | "select_static";
  type?: "primary" | "danger" | "default";
  text: { tag: "plain_text"; content: string };
  value?: Record<string, unknown>;
}

/**
 * 飞书消息卡片
 */
export interface FeishuCard {
  config: {
    wide_screen_mode: boolean;
  };
  header: {
    title: {
      tag: "plain_text";
      content: string;
    };
    template: string;
  };
  elements: FeishuCardElement[];
}

/**
 * 确认请求
 */
export interface ConfirmationRequest {
  id: string;
  description: string;
  risk: "low" | "medium" | "high";
  timeout: number;
}

/**
 * 确认响应
 */
export type ConfirmationResponse =
  | { type: "confirm"; requestId: string }
  | { type: "reject"; requestId: string; reason?: string };

/**
 * OMP 状态信息
 */
export interface OmpState {
  branch: string;
  mainBranch: string;
  contextUsage: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  cost: number;
  currentTask?: string;
  model: string;
  sessionId: string;
}