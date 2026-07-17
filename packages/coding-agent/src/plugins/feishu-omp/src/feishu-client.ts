// =============================================================================
// Feishu Client - lark-cli 集成
// =============================================================================
// 使用 lark-cli 进行飞书消息的发送和接收

export interface FeishuConfig {
  appId: string;
  appSecret: string;
}

export interface FeishuMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: number;
}

/**
 * 飞书客户端（基于 lark-cli）
 */
export class FeishuClient {
  private config: FeishuConfig;
  private process: any = null;

  constructor(config: FeishuConfig) {
    this.config = config;
  }

  /**
   * 启动 lark-cli event consume 进程
   */
  async start(): Promise<void> {
    console.log("[feishu-client] 启动 lark-cli event consume...");

    this.process = Bun.spawn([
      "lark-cli", "event", "consume", "im.message.receive_v1", "--as", "bot"
    ], {
      env: {
        LARK_APP_ID: this.config.appId,
        LARK_APP_SECRET: this.config.appSecret,
        ...process.env
      }
    });

    this.process.stdout.on("data", (data: Buffer) => {
      this.handleEvent(data.toString());
    });

    this.process.stderr.on("data", (data: Buffer) => {
      console.error("[feishu-client] stderr:", data.toString());
    });

    this.process.on("close", (code: number) => {
      console.log(`[feishu-client] lark-cli 进程退出，代码：${code}`);
    });
  }

  /**
   * 处理飞书事件
   */
  private handleEvent(data: string): void {
    try {
      const event = JSON.parse(data);
      this.processEvent(event);
    } catch (error) {
      console.error("[feishu-client] 解析事件失败:", error);
    }
  }

  /**
   * 处理事件
   */
  private processEvent(event: any): void {
    if (!event || !event.event) return;

    const eventData = event.event;
    
    // 解析消息内容
    const message = this.parseMessage(eventData);
    if (message) {
      console.log("[feishu-client] 收到消息:", message);
      // 通知插件处理消息
      if (this.onMessage) {
        this.onMessage(message);
      }
    }
  }

  /**
   * 解析飞书消息
   */
  private parseMessage(eventData: any): FeishuMessage | null {
    if (!eventData.message) return null;

    const message = eventData.message;
    const content = message.content ? JSON.parse(message.content) : {};
    
    return {
      messageId: message.message_id,
      chatId: message.chat_id,
      senderId: eventData.sender?.sender_id?.open_id || "",
      content: content.text || "",
      timestamp: eventData.create_time ? parseInt(eventData.create_time) : Date.now(),
    };
  }

  /**
   * 发送文本消息
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    console.log("[feishu-client] 发送消息到", chatId, ":", text);

    try {
      await Bun.spawn([
        "lark-cli", "message", "send",
        "--chat-id", chatId,
        "--content", JSON.stringify({ text })
      ], { stdio: "inherit" }).exited;

      return true;
    } catch (error) {
      console.error("[feishu-client] 发送消息失败:", error);
      return false;
    }
  }

  /**
   * 停止
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      console.log("[feishu-client] lark-cli 进程已停止");
    }
  }

  onMessage?: (message: FeishuMessage) => void;
}