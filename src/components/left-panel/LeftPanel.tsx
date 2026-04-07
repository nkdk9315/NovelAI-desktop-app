import MainPromptSection from "./MainPromptSection";
import CharacterAddButtons from "./CharacterAddButtons";
import ArtistStyleSection from "./ArtistStyleSection";
import VibeSection from "./VibeSection";

export default function LeftPanel() {
  return (
    <div className="space-y-4 p-4">
      <MainPromptSection />
      <hr className="border-border" />
      <CharacterAddButtons />
      {/* TODO: CharacterSection list rendered here */}
      <hr className="border-border" />
      <ArtistStyleSection />
      <hr className="border-border" />
      <VibeSection />
    </div>
  );
}
