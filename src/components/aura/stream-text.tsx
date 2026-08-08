import { useEffect, useState } from "react";

export function StreamText({
  text,
  speed = 18,
  className,
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <span className={className}>
      {shown}
      {shown.length < text.length ? (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-primary align-middle" />
      ) : null}
    </span>
  );
}
