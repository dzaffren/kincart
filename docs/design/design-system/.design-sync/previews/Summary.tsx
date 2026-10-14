import { Summary } from 'shop-together';

export const ForApproval = () => (
  <div className="screen">
    <Summary
      title="Adjustable Wide Slippers with Hook-and-Loop Strap"
      cents={3250}
      note="From amazon.com. Paid from Rose's PayPal if you say OK."
    />
  </div>
);

export const AmountOnly = () => (
  <div className="screen">
    <Summary cents={1899} note="Paid from Rose's PayPal if you say OK." />
  </div>
);
