import { ListingPicker } from 'shop-together';

// An empty image, so each listing shows the grey square a photo sits on while it loads.
const photo = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const listings = [
  {
    id: 'clog',
    name: "Women's Memory Foam Slip-On Clog Slippers, Closed Toe",
    cents: 2499,
    shop: 'walmart.com',
    url: 'https://www.walmart.com/',
    imageUrl: photo,
    what: 'Soft clog slippers with a fleece lining and a rubber sole.',
    why: 'The open heel lets you step in without bending down, and size 8 is in stock.',
    watch: 'They run about half a size small, so check the size chart.',
  },
  {
    id: 'strap',
    name: 'Adjustable Wide Slippers with Hook-and-Loop Strap',
    cents: 3250,
    shop: 'amazon.com',
    url: 'https://www.amazon.com/',
    imageUrl: photo,
    what: 'Wide slippers that open across the top and close with a strap.',
    why: 'You open them right up to put them on, then press the strap shut.',
    watch: "They're a wide fit, so they may feel loose on a narrow foot.",
  },
  {
    id: 'moccasin',
    name: 'Fleece-Lined Moccasin Slippers',
    cents: 1800,
    shop: 'target.com',
    url: 'https://www.target.com/',
    what: 'Warm moccasin slippers lined with soft fleece.',
    why: "They're the warmest of the three and come in size 8.",
    watch: "You push your heel in, so they're harder to put on than the other two.",
  },
];

export const ThreeOptions = () => (
  <div className="screen">
    <h1 id="listings-default">Pick the one you like</h1>
    <form className="stack">
      <ListingPicker listings={listings} labelledBy="listings-default" />
    </form>
  </div>
);

export const Picked = () => (
  <div className="screen">
    <h1 id="listings-picked">Pick the one you like</h1>
    <form className="stack">
      <ListingPicker listings={listings} labelledBy="listings-picked" picked="strap" />
    </form>
  </div>
);

export const NothingPicked = () => (
  <div className="screen">
    <h1 id="listings-error">Pick the one you like</h1>
    <form className="stack">
      <ListingPicker listings={listings.slice(0, 2)} labelledBy="listings-error" error />
    </form>
  </div>
);
