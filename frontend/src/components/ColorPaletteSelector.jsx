import { Check } from "lucide-react";

export const COLORS = [
  { name: "Sand", value: "#FDB851" },
  { name: "Peach", value: "#FF9E79" },
  { name: "Pistachio", value: "#D4F48A" },
  { name: "Lavender", value: "#B386FF" },
  { name: "Sky", value: "#00C6FF" }
];

const ColorPaletteSelector = ({ selectedColor, onChange }) => {
  return (
    <div className="form-control mb-6">
      <label className="label mb-1.5">
        <span className="text-sm font-semibold tracking-wide text-base-content/80">Select Note Vibe</span>
      </label>
      <div className="flex items-center gap-3">
        {COLORS.map((color) => {
          const isSelected = selectedColor === color.value;
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={`group relative size-10 rounded-full transition-all duration-300 ease-out hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer`}
              style={{
                backgroundColor: color.value,
                boxShadow: isSelected 
                  ? `0 0 0 3px var(--fallback-b1,oklch(var(--b1))), 0 0 0 5px #1A1A1A` 
                  : "0 2px 8px rgba(0,0,0,0.06)"
              }}
              title={color.name}
            >
              {isSelected && (
                <Check className="size-4 text-black font-extrabold animate-scaleIn" />
              )}
              {/* Tooltip on hover */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {color.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorPaletteSelector;
