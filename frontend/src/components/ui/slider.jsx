import * as SliderPrimitive from "@radix-ui/react-slider";

export function Slider({ value, min = 1, max = 5, onChange }) {
  return (
    <div className="w-full py-2">
      <SliderPrimitive.Root
        className="relative flex items-center w-full h-5"
        min={min}
        max={max}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      >
        <SliderPrimitive.Track className="bg-gray-300 relative flex-grow h-1 rounded">
          <SliderPrimitive.Range className="absolute bg-blue-500 h-1 rounded" />
        </SliderPrimitive.Track>

        <SliderPrimitive.Thumb className="block w-4 h-4 bg-blue-600 rounded-full shadow hover:bg-blue-500 transition" />
      </SliderPrimitive.Root>
    </div>
  );
}