import { notFound } from "next/navigation";
import { ChatPage } from "@/components/chat/ChatPage";
import { api } from "@/lib/api";

interface Props {
  params: { conversationId: string };
}

export default async function ConversationDetailPage({ params }: Props) {
  let messages, conversations;
  try {
    [messages, conversations] = await Promise.all([
      api.getMessages(params.conversationId),
      api.listConversations(),
    ]);
  } catch {
    notFound();
  }
  const conv = conversations.conversations.find((c) => c.id === params.conversationId);
  if (!conv) notFound();

  return (
    <ChatPage
      conversationId={params.conversationId}
      initialMessages={messages.messages}
      initialTitle={conv.title}
    />
  );
}
