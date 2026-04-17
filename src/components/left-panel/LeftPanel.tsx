import { useGenerationParamsStore } from "@/stores/generation-params-store";
import MainPromptSection from "./MainPromptSection";
import CharacterAddButtons from "./CharacterAddButtons";
import CharacterSection from "./CharacterSection";
import ArtistStyleSection from "./ArtistStyleSection";
import VibeSection from "./VibeSection";
import SidebarPresetGroups from "./sidebar-preset-groups/SidebarPresetGroups";

export default function LeftPanel() {
  const characters = useGenerationParamsStore((s) => s.characters);

  const sectionCls =
    "rounded-lg border border-border/60 bg-card/40 p-4 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.03)]";

  return (
    <div className="space-y-3 p-3">
      <section className={sectionCls}>
        <MainPromptSection />
      </section>
      <section className={sectionCls}>
        <CharacterAddButtons />
        {characters.length > 0 && (
          <div className="mt-3 space-y-3">
            {characters.map((char, index) => (
              <CharacterSection key={char.id} index={index} />
            ))}
          </div>
        )}
      </section>
      <section className={sectionCls}>
        <SidebarPresetGroups />
      </section>
      <section className={sectionCls}>
        <ArtistStyleSection />
      </section>
      <section className={sectionCls}>
        <VibeSection />
      </section>
    </div>
  );
}
