// =============================================================================
// Feishu IM Plugin Type Definitions
// =============================================================================

/**
 * 飞书 Bot 配置
 */
export interface FeishuBotConfig {
  /** 飞书应用 App ID */
  appId: string;
  /** 飞书应用 App Secret */
  appSecret: string;
  /** 飞书事件订阅 Verification Token */
  verificationToken?: string;
  /** 飞书事件订阅 Encrypt Key */
  encryptKey?: string;
  /** 飞书事件回调 URL */
  callbackUrl?: string;
}

/**
 * 飞书消息事件
 */
export interface FeishuMessageEvent {
  /** 消息 ID */
  message_id: string;
  /** 消息类型 */
  type: "im.message.receive_v1" | "p2im.message.receive_v1";
  /** 会话类型 */
  chat_type: "p2p" | "group";
  /** 发送者 ID */
  sender_id: string;
  /** 消息内容 */
  content: string;
  /** 消息时间戳 */
  create_time: string;
  /** 消息体 */
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
 * 飞书卡片元素
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
  tag: "button" | "select_static" | "button";
  type?: "primary" | "danger" | "default";
  text: { tag: "plain_text"; content: string };
  value?: Record<string, unknown>;
  confirm?: {
    title: { tag: "plain_text"; content: string };
    text: { tag: "plain_text"; content: string };
  };
  url?: string;
}

/**
 * OMP 状态信息
 */
export interface OmpState {
  /** 当前 git 分支 */
  branch: string;
  /** 主分支 */
  mainBranch: string;
  /** 上下文窗口消耗（tokens） */
  contextUsage: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  /** 费用（美元） */
  cost: number;
  /** 当前任务 */
  currentTask?: string;
  /** 模型信息 */
  model: string;
  /** 会话 ID */
  sessionId: string;
}

/**
 * OMP RPC 命令
 */
export type OmpCommand =
  | { type: "prompt"; content: string }
  | { type: "steer"; content: string }
  | { type: "follow_up"; content: string }
  | { type: "abort" }
  | { type: "new_session" }
  | { type: "switch_session"; sessionId: string }
  | { type: "branch" }
  | { type: "get_state" }
  | { type: "set_model"; model: string }
  | { type: "compact" }
  | { type: "bash"; content: string }
  | { type: "handoff"; content: string }
  | { type: "get_messages"; limit?: number };

/**
 * OMP RPC 响应
 */
export interface OmpResponse {
  type: "response";
  command: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * 确认请求
 */
export interface ConfirmationRequest {
  /** 确认 ID */
  id: string;
  /** 命令描述 */
  description: string;
  /** 危险等级 */
  risk: "low" | "medium" | "high";
  /** 超时时间（毫秒） */
  timeout: number;
}

/**
 * 确认响应
 */
export type ConfirmationResponse =
  | { type: "confirm"; requestId: string }
  | { type: "reject"; requestId: string; reason?: string };

/**
 * 插件实例
 */
export interface FeishuImPlugin {
  /** 启动插件 */
  start(): Promise<void>;
  /** 停止插件 */
  stop(): Promise<void>;
  /** 发送消息 */
  sendMessage(chatId: string, content: string, card?: FeishuCard): Promise<void>;
  /** 发送卡片消息 */
  sendCard(chatId: string, card: FeishuCard): Promise<void>;
  /** 发送确认卡片 */
  sendConfirmation(request: ConfirmationRequest): Promise<ConfirmationResponse>;
  /** 获取 OMP 状态 */
  getState(): Promise<OmpState>;
  /** 执行 OMP 命令 */
  executeCommand(command: OmpCommand): Promise<OmpResponse>;
  /** 插件配置 */
  config: FeishuBotConfig;
  /** 插件是否已启动 */
  running: boolean;
}