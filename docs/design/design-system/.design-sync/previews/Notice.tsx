import { Notice } from 'shop-together';

export const Wait = () => (
  <div className="screen">
    <Notice tone="wait">Asked at 10:15 AM. This page changes by itself when Sam answers.</Notice>
  </div>
);

export const Neutral = () => (
  <div className="screen">
    <Notice tone="neutral">Sam said no to Fleece-Lined Moccasin Slippers.</Notice>
  </div>
);

export const Danger = () => (
  <div className="screen">
    <Notice tone="danger">Payment didn&apos;t go through. Nothing was taken.</Notice>
  </div>
);
