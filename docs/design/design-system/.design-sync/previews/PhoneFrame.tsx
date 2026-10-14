import { PhoneFrame } from 'shop-together';

export const Rose = () => <PhoneFrame who="Rose" href="about:blank" />;
export const Sample = () => (
  <PhoneFrame who="Sam">
    <div className="screen">
      <h1>Rose would like this</h1>
    </div>
  </PhoneFrame>
);
