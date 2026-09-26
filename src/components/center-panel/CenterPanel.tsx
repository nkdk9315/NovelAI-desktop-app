import ImageDisplay from "./ImageDisplay";
import ActionBar from "./ActionBar";
import BaseImagePanel from "./BaseImagePanel";

export default function CenterPanel() {
  return (
    <div className="flex h-full flex-col">
      <ImageDisplay />
      <BaseImagePanel />
      <ActionBar />
    </div>
  );
}
