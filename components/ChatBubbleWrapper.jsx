"use client";

import { usePathname } from "next/navigation";
import ChatBubble from "./ChatBubble";

export default function ChatBubbleWrapper() {
  const pathname = usePathname();

  // ❌ الصفحات اللي بدك تخفي فيها الشات
  const hiddenPages = [
    "/dashboard",
    "/dashboard/game2",
    "/dashboard/game",
    "/dashboard/training",
  ];

  if (hiddenPages.includes(pathname)) {
    return null;
  }

  return <ChatBubble />;
}