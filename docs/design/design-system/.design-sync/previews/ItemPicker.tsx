import { ItemPicker } from 'shop-together';

const items = [
  { id: 'glasses', name: 'Reading glasses, +2.00', cents: 1899 },
  { id: 'pills', name: 'Weekly pill organiser', cents: 1250 },
  { id: 'batteries', name: 'AA batteries, pack of 8', cents: 999 },
];

export const Default = () => (
  <div className="screen">
    <h1 id="pick-default">What do you need?</h1>
    <form className="stack">
      <ItemPicker items={items} labelledBy="pick-default" />
    </form>
  </div>
);

export const Picked = () => (
  <div className="screen">
    <h1 id="pick-picked">What do you need?</h1>
    <form className="stack">
      <ItemPicker items={items} labelledBy="pick-picked" picked="pills" />
    </form>
  </div>
);

export const NothingPicked = () => (
  <div className="screen">
    <h1 id="pick-error">What do you need?</h1>
    <form className="stack">
      <ItemPicker items={items} labelledBy="pick-error" error />
    </form>
  </div>
);
