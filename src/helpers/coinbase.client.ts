import axios, { AxiosRequestConfig } from 'axios';

import { HttpClient } from '../external/http.client.interceptor';
import { coinbaseConfig } from '../constants';
import { Logger } from './Logger';
import * as crypto from 'crypto';
import {
  ConvertCurrencyRequest,
  ConvertCurrencyResponse,
  GetPriceRequest,
  MarketOrderRequest,
  MarketOrderResponse
} from '../interfaces/coinbase';
import { CustomError } from './custom.error';
import { StatusCodes } from 'http-status-codes';

export class CoinbaseClient extends HttpClient {

  constructor() {
    super(coinbaseConfig.baseUrl);

    this.initializeRequestInterceptor();
  }

  buildChecksum(config: AxiosRequestConfig): {
    accessSign: string,
    accessTimestamp: string,
  } {
    const timestamp = Date.now() / 1000;
    const method = config.method?.toUpperCase();
    const postData = config.data;
    const reqPath = config.url;
    Logger.Info(method, reqPath, postData);
    let message = timestamp + (method || 'GET') + reqPath;
    if (postData) {
      message += JSON.stringify(postData);
    }

    // decode the base64 secret
    const key = Buffer.from(coinbaseConfig.secret, 'base64');

// create a sha256 hmac with the secret
    const hmac = crypto.createHmac('sha256', key);

// sign the required message with the hmac and base64 encode the result
    const accessSign = hmac.update(message).digest('base64');

    return {
      accessSign,
      accessTimestamp: timestamp.toString(),
    };
  }

  private initializeRequestInterceptor = () => {
    this.instance.interceptors.request.use(
      this.handleRequest,
      this.handleError,
    );
  };

  private handleRequest = (config: AxiosRequestConfig) => {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers['Content-Type'] = 'application/json';
    config.headers['CB-ACCESS-KEY'] = coinbaseConfig.apiKey;
    config.headers['CB-ACCESS-PASSPHRASE'] = coinbaseConfig.passphrase;
    const { accessSign, accessTimestamp } = this.buildChecksum(config);
    config.headers['CB-ACCESS-SIGN'] = accessSign;
    config.headers['CB-ACCESS-TIMESTAMP'] = accessTimestamp;

    return config;
  };

  // for trading
  async ConvertCurrency(body: ConvertCurrencyRequest): Promise<ConvertCurrencyResponse> {
    try {
      const responseData = (await this.instance.post('/conversions', {
        ...body,
        profile_id: '7518e07b-0680-4f8b-be2a-15d86a28f1f4'
      })) as ConvertCurrencyResponse;
      return {
        from: responseData.from,
        to: responseData.to,
        amount: responseData.amount,
      };
    } catch (err: any) {
      Logger.Error(err.response?.data || err);
      throw new CustomError(StatusCodes.SERVICE_UNAVAILABLE, 'Could not convert amount');
    }
  }

  // for trading
  async createMarketOrder(body: MarketOrderRequest): Promise<MarketOrderResponse> {
    try {
      const responseData = (await this.instance.post('/orders', {
        profile_id: body.profile_id,
        type: 'market',
        side: body.side,
        post_only: 'false',
        product_id: body.pair,
        size: body.amount,
      })) as ConvertCurrencyResponse;

      return responseData as unknown as MarketOrderResponse;
    } catch (err: any) {
      Logger.Error(err.response?.data || err);
      throw new CustomError(StatusCodes.SERVICE_UNAVAILABLE, 'Could not convert amount');
    }
  }

  async getPrice(body: GetPriceRequest): Promise<ConvertCurrencyResponse> {
    try {
      const responseData = (await axios.get(`https://api.coinbase.com/v2/prices/${body.from}-${body.to}/sell`)).data.data;
      return {
        from: responseData.base,
        to: responseData.currency,
        amount: responseData.amount,
      };
    } catch (err: any) {
      Logger.Error(err);
      throw new CustomError(StatusCodes.SERVICE_UNAVAILABLE, 'Could not convert amount');
    }
  }

  async getProfiles(): Promise<any> {
    try {
      const responseData = (await this.instance.get('/profiles'));
      Logger.Info(responseData);
    } catch (err: any) {
      Logger.Error(err);
    }
  }

  async getProducts(): Promise<any> {
    try {
      const responseData = (await this.instance.get('/products'));
      Logger.Info(responseData);
    } catch (err: any) {
      Logger.Error(err);
    }
  }

  async getBalances(): Promise<any> {
    try {
      const responseData = (await this.instance.get('/coinbase-accounts'));
      Logger.Info(responseData);
    } catch (err: any) {
      Logger.Error(err);
    }
  }
}
