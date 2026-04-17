import { useGenerationParamsStore } from "@/stores/generation-params-store";
import MainPromptSection from "./MainPromptSection";
import CharacterAddButtons from "./CharacterAddButtons";
import CharacterSection from "./CharacterSection";
import ArtistStyleSection from "./ArtistStyleSection";
import VibeSection from "./VibeSection";
import SidebarPresetGroups from "./sidebar-preset-groups/SidebarPresetGroups";

export default function LeftPanel() {
  const characters = useGenerationParamsStore((s) => s.characters);

  return (
    <div className="space-y-4 p-4">
      <MainPromptSection />
      <hr className="border-border" />
      <CharacterAddButtons />
      {characters.map((char, index) => (
        <CharacterSection key={char.id} index={index} />
      ))}
      <hr className="border-border" />
      <SidebarPresetGroups />
      <hr className="border-border" />
      <ArtistStyleSection />
      <hr className="border-border" />
      <VibeSection />
    </div>
  );
}
