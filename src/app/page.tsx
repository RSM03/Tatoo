'use client';

import React, { useRef } from 'react';
import { Edges, Final, HeroCards, HowSteps, Statement, pageClass } from '@/components/landing/Sections';
import { useLandingMotion } from '@/components/landing/useLandingMotion';

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  useLandingMotion(root);

  return (
    <div ref={root} className={pageClass}>
      <Edges />
      <HeroCards />
      <Statement />
      <HowSteps />
      <Final />
    </div>
  );
}
