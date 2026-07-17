// =============================================================================
// Feishu IM Plugin - Main Entry Point
// =============================================================================
// 注册为 OMP 插件，提供飞书 IM 集成

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
 */
export class FeishuImPlugin {
  private config: FeishuBotConfig;
  private client: FeishuClient;
  private commandRouter: CommandRouter;
  private stateSync: StateSync;
  private outputFormatter: OutputFormatter;
  private confirmationManager: ConfirmationManager;
  private running = false;

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
    this.stateSync = new StateSync(5000, () => {}); // 5 秒同步一次
    this.outputFormatter = new OutputFormatter();
    this.confirmationManager = new ConfirmationManager();
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
  async start(): Promise<void> {
    if (this.running) return;

    console.log("Starting Feishu IM plugin...");

    // 验证配置
    if (!this.config.appId || !this.config.appSecret) {
      throw new Error("Feishu Bot configuration is incomplete. Please provide appId and appSecret.");
    }

    // 启动状态同步
    this.stateSync.start();

    this.running = true;
    console.log("Feishu IM plugin started successfully.");
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

    this.running = false;
    console.log("Feishu IM plugin stopped.");
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
   * 执行 OMP 命令
   */
  private async executeCommand(command: OmpCommand): Promise<OmpResponse> {
    try {
      // 这里应该调用 OMP 的 RPC 接口
      // 暂时返回模拟响应
      return {
        type: "response",
        command: command.type,
        success: true,
        data: { message: "Command executed (mock)" },
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

  /**
   * 发送确认卡片
   */
  async sendConfirmation(request: ConfirmationRequest): Promise<ConfirmationResponse> {
    // 这里需要知道要发送到哪个会话
    // 暂时返回模拟响应
    const response = await this.confirmationManager.createConfirmation(request);
    return response;
  }

  /**
   * 获取 OMP 状态
   */
  async getState(): Promise<OmpState> {
    // 这里应该调用 OMP 的 get_state API
    return {
      branch: "unknown",
      mainBranch: "unknown",
      contextUsage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0,
      },
      cost: 0,
      model: "unknown",
      sessionId: "unknown",
    };
  }
}

/**
 * 创建插件实例
 */
export function createFeishuImPlugin(config: PluginConfig): FeishuImPlugin {
  return new FeishuImPlugin(config);
}