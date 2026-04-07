interface PromptTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function PromptTextarea({ value, onChange, placeholder }: PromptTextareaProps) {
  return (
    <div>
      {/* TODO: implement autocomplete-enabled textarea */}
      <textarea
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
      />
    </div>
  );
}
