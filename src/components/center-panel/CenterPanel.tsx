import ImageDisplay from "./ImageDisplay";
import ActionBar from "./ActionBar";

export default function CenterPanel() {
  return (
    <div className="flex h-full flex-col">
      <ImageDisplay />
      <ActionBar />
    </div>
  );
}
