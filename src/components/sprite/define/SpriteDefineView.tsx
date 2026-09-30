import SetSettingsSection from "./SetSettingsSection";
import PosesSection from "./PosesSection";
import RegionsSection from "./RegionsSection";
import OutfitSection from "./OutfitSection";
import AxesSection from "./AxesSection";

/** Everything that defines the set: settings, poses, regions, outfit and axes. */
export default function SpriteDefineView() {
  return (
    <div className="mx-auto max-w-4xl pb-16">
      <SetSettingsSection />
      <PosesSection />
      <RegionsSection />
      <OutfitSection />
      <AxesSection />
    </div>
  );
}
