"use client";
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

type Platform = 'web' | 'android' | 'ios';

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('web');

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
        setPlatform(Capacitor.getPlatform() as Platform);
    }
  }, []);

  return platform;
}
