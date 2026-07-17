// =============================================================================
// Output Formatter
// =============================================================================
// 将 OMP 输出转换为飞书卡片格式

import type { FeishuCard } from "./types.js";

/**
 * 输出格式化器
 */
export class OutputFormatter {
  /**
   * 创建基础卡片配置
   */
  private createBaseCard(title: string, template: string): FeishuCard {
    return {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: "plain_text",
          content: title,
        },
        template,
      },
      elements: [],
    };
  }

  /**
   * 将文本输出转换为 Markdown 卡片
   */
  formatTextOutput(title: string, content: string): FeishuCard {
    const card = this.createBaseCard(title, "blue");
    card.elements = [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: this.escapeMarkdown(content),
        },
      },
    ];
    return card;
  }

  /**
   * 将错误输出转换为错误卡片
   */
  formatErrorOutput(title: string, error: string): FeishuCard {
    const card = this.createBaseCard(title, "red");
    card.elements = [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**错误详情：**\n\`\`\`\n${error}\n\`\`\``,
        },
      },
    ];
    return card;
  }

  /**
   * 将成功输出转换为成功卡片
   */
  formatSuccessOutput(title: string, message: string): FeishuCard {
    const card = this.createBaseCard(title, "green");
    card.elements = [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: message,
        },
      },
    ];
    return card;
  }

  /**
   * 将代码片段转换为代码卡片
   */
  formatCodeOutput(title: string, language: string, code: string): FeishuCard {
    const card = this.createBaseCard(title, "blue");
    card.elements = [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `\`\`\`${language}\n${code}\n\`\`\``,
        },
      },
    ];
    return card;
  }

  /**
   * 转义 Markdown 特殊字符
   */
  private escapeMarkdown(text: string): string {
    // 转义 Markdown 特殊字符
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\*/g, "\\*")
      .replace(/_/g, "\\_")
      .replace(/`/g, "\\`")
      .replace(/#/g, "\\#")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/>/g, "\\>")
      .replace(/-/g, "\\-")
      .replace(/\+/g, "\\+")
      .replace(/=/g, "\\=");
  }
}