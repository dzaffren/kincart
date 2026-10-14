import { Button } from 'shop-together';

export const Primary = () => (
  <div className="screen">
    <Button type="submit">Ask Sam</Button>
  </div>
);

export const Secondary = () => (
  <div className="screen">
    <Button type="button" kind="secondary">Try other words</Button>
  </div>
);

export const Busy = () => (
  <div className="screen">
    <Button type="submit" busy busyLabel="Paying…">OK, pay $32.50</Button>
  </div>
);

export const ApproveOrDecline = () => (
  <div className="screen">
    <div className="stack">
      <Button type="submit" name="answer" value="ok">OK, pay $32.50</Button>
      <Button type="submit" name="answer" value="no" kind="secondary">No</Button>
    </div>
  </div>
);
