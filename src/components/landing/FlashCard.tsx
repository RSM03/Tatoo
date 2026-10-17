import React from 'react';
import { strokesOf, type InkArt } from './inkArt';

interface Props {
  art: InkArt;
  caption: string;
  classes: { face: string; art: string; ring: string; cap: string };
}

// Cara de la lámina: ilustración en línea dorada de lo que representa, dentro de un medallón punteado,
// con marco doble y su nombre abajo.
export default function FlashCard({ art, caption, classes }: Props) {
  return (
    <div className={classes.face}>
      <svg className={classes.art} viewBox="0 0 200 200" aria-hidden="true">
        <circle className={classes.ring} cx="100" cy="100" r="92" />
        {strokesOf(art).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      <span className={classes.cap}>{caption}</span>
    </div>
  );
}
