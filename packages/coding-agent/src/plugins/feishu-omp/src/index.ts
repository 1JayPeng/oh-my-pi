// =============================================================================
// Feishu OMP Plugin - 飞书集成插件
// =============================================================================
// 使用 lark-cli event consume 接收消息，无需回调服务器
// 直接集成到 OMP，使用 OMP 已有的模型配置

import type { HookAPI, HookFactory } from "../../../extensibility/hooks/types.js";
import { FeishuClient, type FeishuConfig, type FeishuMessage } from "./feishu-client.js";

/**
 * 飞书 OMP 插件配置
 */
interface PluginConfig {
  feishuAppId: string;
  feishuAppSecret: string;
}

/**
 * 飞书 OMP 插件
 *
 * 插件通过 lark-cli event consume 接收消息，无需回调服务器
 */
export class FeishuOmpPlugin {
  private config: PluginConfig;
  private client: FeishuClient | null = null;
  private running = false;
  private pi: HookAPI | null = null;

  constructor(pluginConfig: PluginConfig) {
    this.config = pluginConfig;
  }

  /**
   * 插件工厂函数
   */
  static factory(api: HookAPI): HookFactory {
    return (pi: HookAPI) => {
      const plugin = new FeishuOmpPlugin({
        feishuAppId: process.env.FEISHU_APP_ID || "cli_aad0fb6917f8dcc8",
        feishuAppSecret: process.env.FEISHU_APP_SECRET || "",
      });
      plugin.start(pi);
    };
  }

  /**
   * 启动插件
   */
  async start(pi: HookAPI): Promise<void> {
    this.pi = pi;
    this.running = true;

    console.log("[feishu-omp] 飞书 OMP 插件已启动");
    console.log("[feishu-omp] App ID:", this.config.feishuAppId);

    // 创建飞书客户端
    this.client = new FeishuClient({
      appId: this.config.feishuAppId,
      appSecret: this.config.feishuAppSecret,
    });

    // 设置消息处理回调
    this.client.onMessage = (message: FeishuMessage) => {
      this.handleFeishuMessage(message);
    };

    // 启动 lark-cli event consume 进程
    await this.client.start();
  }

  /**
   * 停止插件
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
    console.log("[feishu-omp] 飞书 OMP 插件已停止");
  }

  /**
   * 处理飞书消息
   */
  private async handleFeishuMessage(message: FeishuMessage): Promise<void> {
    console.log("[feishu-omp] 处理飞书消息:", message);

    if (!this.pi) return;

    try {
      // 1. 将消息发送到 OMP 会话
      const response = await this.pi.sendMessage({
        type: "feishu_message",
        content: message.content,
        metadata: {
          chatId: message.chatId,
          senderId: message.senderId,
          messageId: message.messageId,
        }
      });

      // 2. 获取模型回复
      const reply = await this.callModel(response);

      // 3. 发送回复到飞书
      if (reply) {
        await this.client?.sendMessage(message.chatId, reply);
      }
    } catch (error) {
      console.error("[feishu-omp] 处理消息失败:", error);
    }
  }

  /**
   * 调用模型
   */
  private async callModel(message: any): Promise<string> {
    // 这里需要调用 OMP 的模型 API
    // 使用模型 ID "1"
    console.log("[feishu-omp] 调用模型 ID: 1");
    
    // 临时返回固定回复
    return "模型调用待实现";
  }
}

// 导出 HookFactory 函数
export default FeishuOmpPlugin.factory;