import React from 'react';

// Recorte de una lámina del fondo de flashes (public/tattoo-flash-bg.jpg, 1673×940) en coordenadas de la imagen.
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SHEET_W = 1673;
const SHEET_H = 940;

export function cropStyle({ x, y, w, h }: Crop): React.CSSProperties {
  return {
    backgroundSize: `${(SHEET_W / w) * 100}% ${(SHEET_H / h) * 100}%`,
    backgroundPosition: `${(x / (SHEET_W - w)) * 100}% ${(y / (SHEET_H - h)) * 100}%`,
  };
}

interface Props {
  crop: Crop;
  caption: string;
  classes: { face: string; art: string; cap: string };
}

// Cara de la lámina: motivo en relieve dorado con marco doble y su nombre abajo.
export default function FlashCard({ crop, caption, classes }: Props) {
  return (
    <div className={classes.face}>
      <div className={classes.art} style={cropStyle(crop)} />
      <span className={classes.cap}>{caption}</span>
    </div>
  );
}
