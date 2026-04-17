import RoomContent from "./RoomContent";

// Static export config — required for `output: export` with dynamic segments
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function RoomPage() {
  return <RoomContent />;
}
