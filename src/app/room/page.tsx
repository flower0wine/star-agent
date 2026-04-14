import { redirect } from "next/navigation";

export default function RoomEntryPage() {
  redirect(`/room/room-${Date.now()}`);
}
