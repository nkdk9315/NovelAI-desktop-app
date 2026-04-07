import HistoryHeader from "./HistoryHeader";
import ThumbnailGrid from "./ThumbnailGrid";

export default function RightPanel() {
  return (
    <div className="flex h-full flex-col">
      <HistoryHeader />
      <ThumbnailGrid />
    </div>
  );
}
