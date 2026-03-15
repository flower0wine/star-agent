"use client";

interface PulseRingsProps {
  isVisible: boolean;
}

export function PulseRings({ isVisible }: PulseRingsProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {[0, 1, 2].map((index) => (
        <div
          className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
          key={index}
          style={{
            animationDelay: `${index * 0.3}s`,
            animationDuration: "2s",
          }}
        />
      ))}
    </>
  );
}
