interface TagListProps {
  tags: string[];
}

export default function TagList({ tags }: TagListProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {/* TODO: implement with Badge component */}
      {tags.map((tag) => (
        <span key={tag} className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
          {tag}
        </span>
      ))}
    </div>
  );
}
