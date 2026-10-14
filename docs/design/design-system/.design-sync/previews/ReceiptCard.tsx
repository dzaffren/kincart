import { ReceiptCard } from 'shop-together';

export const Paid = () => (
  <div className="screen">
    <ReceiptCard
      receipt={{
        item: { id: 'strap', name: 'Adjustable Wide Slippers with Hook-and-Loop Strap', cents: 3250 },
        paidAt: new Date('2026-10-20T10:16:00'),
        transactionId: '3HJ11850TY537110R',
      }}
    />
    <p className="small">Rose sees this receipt too.</p>
  </div>
);
