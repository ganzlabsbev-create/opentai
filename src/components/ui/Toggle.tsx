"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full border-0 transition-colors ${checked ? "bg-accent" : "bg-surface-elevated"}`}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  );
}
