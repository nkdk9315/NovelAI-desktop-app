import { useGenerationParamsStore } from "@/stores/generation-params-store";
import MainPromptSection from "./MainPromptSection";
import CharacterAddButtons from "./CharacterAddButtons";
import CharacterSection from "./CharacterSection";
import ArtistStyleSection from "./ArtistStyleSection";
import VibeSection from "./VibeSection";
import CharacterReferenceSection from "./CharacterReferenceSection";
import SidebarPresetGroups from "./sidebar-preset-groups/SidebarPresetGroups";
import MangaSection from "./manga/MangaSection";
import { useMangaStore } from "@/stores/manga-store";

export default function LeftPanel() {
  const characters = useGenerationParamsStore((s) => s.characters);
  const mangaOn = useMangaStore((s) => s.page.enabled);

  // Flat sections separated by hairlines — no card-in-panel stacking.
  const sectionCls = "border-b border-border px-4 py-4 last:border-b-0";

  return (
    <div>
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
      {mangaOn && (
        <section className={sectionCls}>
          <MangaSection />
        </section>
      )}
      <section className={sectionCls}>
        <SidebarPresetGroups />
      </section>
      <section className={sectionCls}>
        <ArtistStyleSection />
      </section>
      <section className={sectionCls}>
        <VibeSection />
      </section>
      <section className={sectionCls}>
        <CharacterReferenceSection />
      </section>
    </div>
  );
}
