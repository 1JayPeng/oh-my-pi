// =============================================================================
// Feishu IM Plugin - Main Entry Point
// =============================================================================
// 注册为 OMP 插件，提供飞书 IM 集成
//
// 部署模式：内嵌模块部署
// - OMP CLI 内部加载飞书 IM 插件
// - 插件通过 HTTP 服务器接收飞书事件推送
// - 支持 WebSocket 长连接（可选）

import type { HookAPI, HookFactory } from "../../../extensibility/hooks/types.js";
import type {
  FeishuBotConfig,
  FeishuMessageEvent,
  ConfirmationRequest,
  ConfirmationResponse,
  OmpState,
  OmpCommand,
  OmpResponse,
} from "./types.js";
import { FeishuClient } from "./feishu-client.js";
import { CommandRouter } from "./command-router.js";
import { StateSync } from "./state-sync.js";
import { OutputFormatter } from "./output-formatter.js";
import { ConfirmationManager } from "./confirmation.js";

/**
 * 飞书 IM 插件配置
 */
interface PluginConfig {
  feishuAppId: string;
  feishuAppSecret: string;
  feishuVerificationToken?: string;
  feishuEncryptKey?: string;
  feishuCallbackUrl?: string;
}

/**
 * 飞书 IM 插件
 * 实现为 HookFactory，通过 OMP 的插件系统加载
 *
 * 插件通过以下方式与 OMP 集成：
 * 1. HTTP 服务器接收飞书事件推送（/webhook/event）
 * 2. 订阅 OMP 会话事件（turn_end、agent_end 等）获取状态
 * 3. 通过 pi.exec() 执行 shell 命令（如 git branch）
 * 4. 通过飞书 Bot API 发送消息和卡片
 */
export class FeishuImPlugin {
  private config: FeishuBotConfig;
  private client: FeishuClient;
  private commandRouter: CommandRouter;
  private stateSync: StateSync;
  private outputFormatter: OutputFormatter;
  private confirmationManager: ConfirmationManager;
  private httpServer: Bun.Server<any> | null = null;
  private running = false;
  private pi: HookAPI | null = null;
  private stateListener: (() => void) | null = null;
  private lastState: OmpState | null = null;

  constructor(pluginConfig: PluginConfig) {
    this.config = {
      appId: pluginConfig.feishuAppId,
      appSecret: pluginConfig.feishuAppSecret,
      verificationToken: pluginConfig.feishuVerificationToken,
      encryptKey: pluginConfig.feishuEncryptKey,
      callbackUrl: pluginConfig.feishuCallbackUrl,
    };

    this.client = new FeishuClient(this.config);
    this.commandRouter = new CommandRouter();
    this.stateSync = new StateSync(5000, (state) => this.notifyStateChange(state), () => this.getState());
    this.outputFormatter = new OutputFormatter();
    this.confirmationManager = new ConfirmationManager();
  }

  /**
   * 设置 HookAPI 实例（由 OMP 插件系统调用）
   */
  setHookAPI(pi: HookAPI): void {
    this.pi = pi;
    this.registerEventListeners();
  }

  /**
   * 注册 OMP 会话事件监听器
   */
  private registerEventListeners(): void {
    if (!this.pi) return;

    // 监听 turn_end 事件获取 token 使用量
    this.pi.on("turn_end", (event: any) => {
      const usage = event.tokensUsed;
      const model = event.model;
      const sessionId = event.sessionId;

      if (usage || model || sessionId) {
        const newState: OmpState = {
          branch: this.lastState?.branch || "unknown",
          mainBranch: this.lastState?.mainBranch || "unknown",
          contextUsage: usage || { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          cost: 0,
          model: model || "unknown",
          sessionId: sessionId || "unknown",
        };
        this.notifyStateChange(newState);
      }
    });

    this.pi.on("agent_end", (event: any) => {
      const newState: OmpState = {
        branch: this.lastState?.branch || "unknown",
        mainBranch: this.lastState?.mainBranch || "unknown",
        contextUsage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        cost: 0,
        model: event.model || "unknown",
        sessionId: event.sessionId || "unknown",
      };
      this.notifyStateChange(newState);
    });
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(state: OmpState): void {
    if (!this.statesEqual(state, this.lastState)) {
      this.lastState = state;
      // 状态变化已更新，可通过飞书推送通知
    }
  }

  /**
   * 比较两个状态是否相等
   */
  private statesEqual(a: OmpState | null, b: OmpState | null): boolean {
    if (!a || !b) return a === b;
    return (
      a.branch === b.branch &&
      a.mainBranch === b.mainBranch &&
      a.contextUsage.total === b.contextUsage.total &&
      a.cost === b.cost &&
      a.model === b.model &&
      a.sessionId === b.sessionId
    );
  }

  /**
   * 插件工厂函数
   * OMP 插件系统会调用此函数
   */
  static factory(): HookFactory {
    return (pi: HookAPI) => {
      const plugin = new FeishuImPlugin({
        feishuAppId: process.env.FEISHU_APP_ID || "",
        feishuAppSecret: process.env.FEISHU_APP_SECRET || "",
        feishuVerificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
        feishuEncryptKey: process.env.FEISHU_ENCRYPT_KEY,
        feishuCallbackUrl: process.env.FEISHU_CALLBACK_URL,
      });

      // 设置 HookAPI 并注册事件监听
      plugin.setHookAPI(pi);

      plugin.start();

      // 注册 session_start 钩子，在会话开始时初始化
      pi.on("session_start", async () => {
        console.log("Feishu IM plugin initialized for new session");
      });
    };
  }

  /**
   * 启动插件
   */
  start(): void {
    if (this.running) return;

    console.log("[info]: [ \"Feishu IM plugin starting...\" ]");

    // 启动 HTTP 服务器接收飞书事件
    this.startHttpServer();

    // 启动状态同步
    this.stateSync.start();

    this.running = true;
    console.log("[info]: [ \"Feishu IM plugin ready\" ]");
  }

  /**
   * 停止插件
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    console.log("Stopping Feishu IM plugin...");

    // 停止状态同步
    this.stateSync.stop();

    // 取消所有待确认
    this.confirmationManager.cancelAll();

    // 关闭 HTTP 服务器
    if (this.httpServer) {
      this.httpServer.stop();
      this.httpServer = null;
    }

    this.running = false;
    console.log("Feishu IM plugin stopped.");
  }

  /**
   * 启动 HTTP 服务器接收飞书事件
   */
  private startHttpServer(): void {
    const port = parseInt(process.env.FEISHU_SERVER_PORT || "18790", 10);
    const host = process.env.FEISHU_SERVER_HOST || "0.0.0.0";

    console.log(`[info]: [ "Starting HTTP server on ${host}:${port}" ]`);

    try {
      const self = this;
      this.httpServer = Bun.serve({
        port,
        hostname: host,
        fetch(req: Request) {
          const url = new URL(req.url);

          // 处理飞书事件验证
          if (url.pathname === "/webhook/event" && req.method === "POST") {
            return self.handleEventRequest(req);
          }

          return new Response("OK", { status: 200 });
        },
      });

      console.log(`[info]: [ "HTTP server listening on ${host}:${port}" ]`);
    } catch (error) {
      console.error(`[error]: [ "Failed to start HTTP server: ${error}" ]`);
    }
  }

  /**
   * 处理飞书事件请求
   */
  private async handleEventRequest(req: Request): Promise<Response> {
    try {
      const body = (await req.json()) as any;
      const event = body?.event || body;

      // 飞书事件验证（challenge 验证）
      if (event?.type === "url_verification") {
        return new Response(JSON.stringify({ challenge: event.challenge }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (event?.type === "im.message.receive_v1") {
        await this.handleFeishuMessage(event);
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      this.pi?.logger?.error("Event handling failed", { error: err });
      return new Response("Error", { status: 500 });
    }
  }

  /**
   * 处理飞书消息
   */
  async handleMessage(event: FeishuMessageEvent): Promise<void> {
    // 解析命令
    const parsed = this.commandRouter.parseMessage(event);

    // 如果是确认响应
    if (parsed.isConfirmation) {
      this.confirmationManager.handleConfirmation(
        parsed.requestId,
        parsed.action,
      );
      return;
    }

    // 执行命令
    const response = await this.executeCommand(parsed.command);

    // 发送响应
    if (response.success && response.data) {
      const content = JSON.stringify(response.data, null, 2);
      await this.client.sendMessage(event.message.chat_id, content);
    } else {
      const errorCard = this.outputFormatter.formatErrorOutput(
        "命令执行失败",
        response.error || "未知错误",
      );
      await this.client.sendCard(event.message.chat_id, errorCard);
    }
  }

  /**
   * 处理飞书消息事件（从 HTTP 请求）
   */
  private async handleFeishuMessage(event: any): Promise<void> {
    try {
      const message = event.message || {};
      const chatId = message.chat_id || "";
      const messageType = message.message_type || "";
      const content = message.content || "{}";

      // 解析消息内容
      let text = "";
      try {
        const parsed = JSON.parse(content);
        text = parsed.text || "";
      } catch {
        text = content;
      }

      // 转换为内部事件格式
      const internalEvent: FeishuMessageEvent = {
        message_id: message.message_id || event.message_id || "",
        type: event.event_type || "im.message.receive_v1",
        message: {
          chat_id: chatId,
          chat_type: message.chat_type || "p2p",
          content: content,
          message_id: message.message_id || "",
          message_type: messageType,
          receive_id: "",
          sender: {
            id: event.sender?.sender_id?.open_id || "",
            id_type: event.sender?.sender_id?.id_type || "",
            sender_id_type: event.sender?.sender_id?.id_type || "",
            sender_type: event.sender?.sender_id?.id_type || "",
            tenant_key: "",
          },
          create_time: message.create_time || "",
          update_time: "",
          mention: [],
        },
        chat_type: message.chat_type || "p2p",
        sender_id: event.sender?.sender_id?.open_id || "",
        create_time: event.create_time || "",
        content: content,
      };

      // 处理消息
      await this.handleMessage(internalEvent);
    } catch (error) {
      this.pi?.logger?.error("Failed to handle Feishu message", { error, event });
    }
  }

  /**
   * 执行 OMP 命令
   * 通过 pi.exec() 执行 shell 命令，模拟 OMP RPC 接口
   */
  private async executeCommand(command: OmpCommand): Promise<OmpResponse> {
    try {
      if (!this.pi) {
        return {
          type: "response",
          command: command.type,
          success: false,
          error: "OMP plugin not initialized (HookAPI not available)",
        };
      }

      // 根据命令类型执行不同的操作
      switch (command.type) {
        case "prompt":
          return await this.executePromptCommand(command);
        case "get_state":
        case "branch":
          return await this.executeGetStateCommand();
        case "get_messages":
          return await this.executeGetMessagesCommand(command);
        default:
          return await this.executeGenericCommand(command);
      }
    } catch (error) {
      return {
        type: "response",
        command: command.type,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 执行提示命令
   */
  private async executePromptCommand(command: OmpCommand): Promise<OmpResponse> {
    if (command.type !== "prompt") {
      return {
        type: "response",
        command: command.type,
        success: false,
        error: "Invalid command type for prompt",
      };
    }
    return {
      type: "response",
      command: "prompt",
      success: true,
      data: {
        message: `Prompt received: ${command.content}`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 执行状态查询命令
   */
  private async executeGetStateCommand(): Promise<OmpResponse> {
    const state = await this.getState();
    return {
      type: "response",
      command: "get_state",
      success: true,
      data: state,
    };
  }

  /**
   * 执行获取消息命令
   */
  private async executeGetMessagesCommand(command: OmpCommand): Promise<OmpResponse> {
    const limit = command.type === "get_messages" ? command.limit : undefined;
    return {
      type: "response",
      command: "get_messages",
      success: true,
      data: {
        messages: [],
        limit: limit || 10,
      },
    };
  }

  /**
   * 执行通用命令
   */
  private async executeGenericCommand(command: OmpCommand): Promise<OmpResponse> {
    try {
      if (!this.pi) {
        return {
          type: "response",
          command: command.type,
          success: false,
          error: "OMP plugin not initialized",
        };
      }

      // 对于 bash 命令，直接执行
      if (command.type === "bash" && "content" in command) {
        const result = await this.pi.exec("sh", ["-c", command.content]);
        return {
          type: "response",
          command: "bash",
          success: true,
          data: {
            stdout: result.stdout,
            stderr: result.stderr,
          },
        };
      }

      // 对于其他命令，通过 pi.exec() 执行
      const args = ["content" in command ? (command as any).content : ""];
      const result = await this.pi.exec(command.type, args.filter(Boolean));

      return {
        type: "response",
        command: command.type,
        success: true,
        data: {
          stdout: result.stdout,
          stderr: result.stderr,
        },
      };
    } catch (error) {
      return {
        type: "response",
        command: command.type,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 获取 OMP 状态
   * 优先使用 pi.exec() 查询 git 分支，结合事件监听获取 token 使用量
   */
  async getState(): Promise<OmpState> {
    try {
      let branch = "unknown";
      let mainBranch = "unknown";

      // 查询 git 分支
      if (this.pi) {
        try {
          const branchResult = await this.pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
          branch = branchResult.stdout.trim() || "unknown";

          // 查询主分支
          try {
            const mainResult = await this.pi.exec("git", [
              "rev-parse",
              "--abbrev-ref",
              "--symbolic-full-name",
              "@{upstream}",
            ]);
            mainBranch = mainResult.stdout.trim() || "unknown";
          } catch {
            // Git 查询主分支失败，使用默认值
          }
        } catch {
          // Git 查询失败，使用默认值
        }
      }

      // 如果有缓存的状态，合并 git 分支信息
      if (this.lastState) {
        return {
          ...this.lastState,
          branch,
          mainBranch,
        };
      }

      // 否则返回基本状态
      return {
        branch,
        mainBranch,
        contextUsage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        cost: 0,
        model: "unknown",
        sessionId: "unknown",
      };
    } catch (error) {
      return {
        branch: "unknown",
        mainBranch: "unknown",
        contextUsage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        cost: 0,
        model: "unknown",
        sessionId: "unknown",
      };
    }
  }

  /**
   * 发送确认卡片
   */
  async sendConfirmation(request: ConfirmationRequest): Promise<ConfirmationResponse> {
    try {
      const response = await this.confirmationManager.createConfirmation(request);

      // 如果需要发送到飞书，这里可以添加发送逻辑
      // 例如：await this.client.sendCard(request.id, confirmationCard);

      return response;
    } catch (error) {
      return {
        type: "reject",
        requestId: request.id,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * 创建插件实例
 */
export function createFeishuImPlugin(config: PluginConfig): FeishuImPlugin {
  return new FeishuImPlugin(config);
}

/**
 * 加载飞书 IM 插件
 * REQ-7: 提供 loadImPlugin() 函数
 *
 * @param config - 飞书 Bot 配置
 * @returns HookFactory，可传递给 OMP 插件系统
 */
export function loadImPlugin(config?: Partial<PluginConfig>): HookFactory {
  return (pi: HookAPI) => {
    const pluginConfig: PluginConfig = {
      feishuAppId: config?.feishuAppId || process.env.FEISHU_APP_ID || "",
      feishuAppSecret: config?.feishuAppSecret || process.env.FEISHU_APP_SECRET || "",
      feishuVerificationToken: config?.feishuVerificationToken || process.env.FEISHU_VERIFICATION_TOKEN,
      feishuEncryptKey: config?.feishuEncryptKey || process.env.FEISHU_ENCRYPT_KEY,
      feishuCallbackUrl: config?.feishuCallbackUrl || process.env.FEISHU_CALLBACK_URL,
    };

    const plugin = new FeishuImPlugin(pluginConfig);
    plugin.setHookAPI(pi);
    plugin.start();

    // 注册 session_start 钩子
    pi.on("session_start", async () => {
      console.log("Feishu IM plugin initialized for new session");
    });
  };
}

/**
 * 禁用飞书 IM 插件
 * REQ-7: 提供 disableImPlugin() 函数
 *
 * @param plugin - 插件实例
 */
export async function disableImPlugin(plugin: FeishuImPlugin): Promise<void> {
  await plugin.stop();
}