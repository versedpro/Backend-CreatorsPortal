export interface ConvertCurrencyRequest {
  from: string;
  to: string;
  amount: string;
}

export interface GetPriceRequest {
  from: string;
  to: string;
}

export interface ConvertCurrencyResponse {
  from: string;
  to: string;
  amount: string;
}

export interface MarketOrderRequest {
  profile_id?: string;
  side: CoinbaseOrderSide;
  pair: string;
  amount: string;
}

export enum CoinbaseOrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export interface MarketOrderResponse {
  id: string;
  size: string;
  product_id: string;
  side: string;
  stp: string;
  funds: string;
  type: string;
  post_only: boolean;
  created_at: Date;
  fill_fees: string;
  filled_size: string;
  executed_value: string;
  status: string;
  settled: boolean;
}
