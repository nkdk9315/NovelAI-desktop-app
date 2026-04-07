interface CharacterSectionProps {
  index: number;
  genreName: string;
}

export default function CharacterSection({ index, genreName }: CharacterSectionProps) {
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      {/* TODO: implement character prompt, negative, position sliders, group picker */}
      <p className="text-xs font-medium">
        Character {index + 1} ({genreName})
      </p>
    </div>
  );
}
