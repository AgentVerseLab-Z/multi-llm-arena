import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-LLM Arena — 多模型对话对比",
  description: "同时与多个大语言模型对话，对比不同模型的回答",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-slate-900 min-h-screen">{children}</body>
    </html>
  );
}
