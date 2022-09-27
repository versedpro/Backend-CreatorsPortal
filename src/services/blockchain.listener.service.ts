import { ethers } from 'ethers';
import { ApiRelayerParams } from 'defender-relay-client/lib/relayer';
import { defenderConfig, lunaFactoryAddresses } from '../constants';
import { DefenderRelayProvider } from 'defender-relay-client/lib/ethers';
import { KnexHelper } from '../helpers/knex.helper';
import { PaymentActive, PaymentStatus } from '../interfaces/PaymentRequest';
import { NftCollectionStatus } from '../interfaces/collection';
import { callContract } from './collection.service';
import { PaymentPurpose } from '../interfaces/stripe.card';
import { Logger } from '../helpers/Logger';
import { BigNumber } from 'bignumber.js';

const FACTORY_ABI = require('../abis/LunaFactory.json');

export function runListener() {
  const credentials: ApiRelayerParams = defenderConfig['ethereum'];
  // @ts-ignore
  const provider = new DefenderRelayProvider(credentials);

  const contract = new ethers.Contract(lunaFactoryAddresses['ethereum'], FACTORY_ABI, provider);
  contract.on('PaidETHForDeployment', async (address, amount, collectionId, event) => {
    Logger.Info(typeof event);
    Logger.Info('PAID FOR DEPLOYMENT ON CHAIN', `address => ${address}`, `amount => ${amount}`, `collectionId => ${collectionId}`,);
    const feePayment = await KnexHelper.getSingleFeePayment({
      collection_id: collectionId,
      active: PaymentActive.ACTIVE,
      purpose: PaymentPurpose.CONTRACT_DEPLOYMENT,
      status: PaymentStatus.PENDING,
    });
    const collection = await KnexHelper.getNftCollectionByID(collectionId);

    if (feePayment) {
      const ethAmountPaidSoFar = new BigNumber(ethers.utils.formatEther(amount)).plus(feePayment.amount_paid || 0);
      const expectedAmount = new BigNumber(feePayment.amount_expected);
      if (ethAmountPaidSoFar.lt(expectedAmount)) {
        // save amount
        Logger.Info('PAID LESS FOR DEPLOYMENT ON CHAIN', 'Updating Fee payment details');
        await KnexHelper.updateFeePayment(feePayment.id, {
          amount_paid: ethAmountPaidSoFar.toNumber().toFixed(8),
          sender: address,
        });
        return;
      }
      Logger.Info('PAID FULLY FOR DEPLOYMENT ON CHAIN', 'Updating Fee payment details');
      await KnexHelper.updateFeePayment(feePayment.id, {
        amount_paid: ethAmountPaidSoFar.toNumber().toFixed(8),
        status: PaymentStatus.SUCCESSFUL,
        sender: address,
        active: null,
      });
    }
    if (collection) {
      await KnexHelper.updateNftCollectionPayment(collectionId, {
        status: NftCollectionStatus.DEPLOYMENT_IN_PROGRESS,
      });
      callContract(collection).then();
    }
  });
}
