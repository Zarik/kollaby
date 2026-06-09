"use client";

import { useEffect, useRef, useState } from "react";
import { teamPhotoUrl } from "@/config/game";

/** Фото команды с сайта «Бегущего города». Если фото нет (404) — ничего не рендерит. */
export default function TeamPhoto({
  number,
  className,
}: {
  number: string;
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  const ref = useRef<HTMLImageElement>(null);

  // Если картинка успела сломаться до гидрации — onError не сработает, проверяем вручную.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setOk(false);
  }, []);

  if (!ok) return null;

  return (
    // Внешнее изображение фиксированного размера 500×225 — обычный <img> без next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={teamPhotoUrl(number)}
      alt={`Фото команды №${number}`}
      width={500}
      height={225}
      onError={() => setOk(false)}
      className={className}
    />
  );
}
