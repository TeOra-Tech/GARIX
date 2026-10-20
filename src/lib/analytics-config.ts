// Server-safe GA4 gate (no 'use client' — see the note in lib/analytics.ts).
// NEXT_PUBLIC_* is inlined at build for both server and client.
export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';
export const gaEnabled = /^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== 'G-XXXXXXX';
