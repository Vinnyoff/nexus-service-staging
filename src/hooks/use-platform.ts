"use client";
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

type Platform = 'web' | 'android' | 'ios';

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('web');

  useEffect(() => {
    // Simulating Android environment for testing
    setPlatform('android');

    // Original logic:
    // if (Capacitor.isNativePlatform()) {
    //     setPlatform(Capacitor.getPlatform());
    // }
  }, []);

  return platform;
}
