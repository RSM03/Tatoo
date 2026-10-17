'use client';

import React, { useRef } from 'react';
import { Edges, Final, HeroCards, HowSteps, Services, Statement, pageClass } from '@/components/landing/Sections';
import Landing3D from '@/components/landing/Landing3D';
import { useLandingMotion } from '@/components/landing/useLandingMotion';

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  useLandingMotion(root);

  return (
    <div ref={root} className={pageClass}>
      <Landing3D />
      <Edges />
      <HeroCards />
      <Services />
      <Statement />
      <HowSteps />
      <Final />
    </div>
  );
}
