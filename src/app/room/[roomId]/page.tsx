import { RoomChatView } from "@/components/room/room-chat-view";

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  return <RoomChatView roomId={roomId} />;
}
