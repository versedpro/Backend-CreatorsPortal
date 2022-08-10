import { ApiRelayerParams } from 'defender-relay-client/lib/relayer';
import { DefenderRelayProvider, DefenderRelaySigner } from 'defender-relay-client/lib/ethers';
import { BigNumber, ethers } from 'ethers';
import {
  AddMaxSupplyCallRequest,
  DeployCollectionContractRequest, GetTokenBalanceCallRequest,
  SetMintPriceCallRequest, SetRoyaltyRequest
} from '../interfaces/contract';
import { Logger } from '../helpers/Logger';
import { convertRpcLogEvents } from '../helpers/event.helper';
import { defenderConfig, lunaFactoryAddresses } from '../constants';

const FACTORY_ABI = require('../abis/LunaFactory.json');
const COLLECTION_ABI = require('../abis/LunaCollectible.json');

export class ContractService {
  signer: DefenderRelaySigner;
  lunaFactoryAddress: string;

  constructor(network: string) {
    this.lunaFactoryAddress = lunaFactoryAddresses[network];
    const credentials: ApiRelayerParams = defenderConfig[network];
    // @ts-ignore
    const provider = new DefenderRelayProvider(credentials);
    // @ts-ignore
    this.signer = new DefenderRelaySigner(credentials, provider, { speed: 'fast' });
  }

  async deployNftCollection(body: DeployCollectionContractRequest): Promise<any> {
    const factory = new ethers.Contract(this.lunaFactoryAddress, FACTORY_ABI, this.signer);

    try {
      const tx = await factory.deployERC1155(
        body.collectionName,
        body.collectionSymbol,
        body.metadataUriPrefix,
        body.royaltyAddress,
        body.payoutAddress,
      );

      const minedTx = await tx.wait();
      minedTx.logs = convertRpcLogEvents(minedTx.logs, FACTORY_ABI);
      Logger.Info('Completed deployment', minedTx);
      return minedTx;
    } catch (error) {
      console.log(error);
    }
  }

  async addMaxSupply(body: AddMaxSupplyCallRequest): Promise<any> {
    const collection = new ethers.Contract(body.contractAddress, COLLECTION_ABI, this.signer);
    try {
      Logger.Info('Making max supply call');
      const tx = await collection.setMaxSupply(body.tokenId || 1, body.quantity, { gasLimit: 120000 });
      const minedTx = await tx.wait();
      Logger.Info('Completed max supply call', minedTx);
      return minedTx;
    } catch (error) {
      console.log(error);
    }
  }

  async setMintPrice(body: SetMintPriceCallRequest): Promise<any> {
    const collection = new ethers.Contract(body.contractAddress, COLLECTION_ABI, this.signer);
    try {
      Logger.Info('Making set mint price call');
      const tx = await collection.setMintPrice(body.tokenId || 1, ethers.utils.parseEther(body.price), { gasLimit: 120000 });
      const minedTx = await tx.wait();
      Logger.Info('Completed set mint price call', minedTx);
      return minedTx;
    } catch (error) {
      console.log(error);
    }
  }

  async setRoyalty(body: SetRoyaltyRequest): Promise<any> {
    const collection = new ethers.Contract(body.contractAddress, COLLECTION_ABI, this.signer);
    try {
      Logger.Info('Making set royalty call');
      const tx = await collection.setRoyaltyPercent(body.royalty, { gasLimit: 120000 });
      const minedTx = await tx.wait();
      Logger.Info('Completed set royalty call', minedTx);
      return minedTx;
    } catch (error) {
      console.log(error);
    }
  }

  async getTokenBalance(body: GetTokenBalanceCallRequest): Promise<number | undefined> {
    const collection = new ethers.Contract(body.contractAddress, COLLECTION_ABI, this.signer);
    try {
      Logger.Info('Making getTokenBalance call');
      let balance = await collection.balanceForTokenId(body.tokenId || 1);
      balance = (balance as BigNumber).toNumber();
      Logger.Info('Completed getTokenBalance: ', balance);
      return balance;
    } catch (error) {
      console.log(error);
    }
  }

  async getMaxSupply(body: GetTokenBalanceCallRequest): Promise<number | undefined> {
    const collection = new ethers.Contract(body.contractAddress, COLLECTION_ABI, this.signer);
    try {
      Logger.Info('Making maxSupply call');
      let maxSupply = await collection.maxSupply(body.tokenId || 1);
      maxSupply = (maxSupply as BigNumber).toNumber();
      Logger.Info('Completed maxSupply: ', maxSupply);
      return maxSupply;
    } catch (error) {
      console.log(error);
    }
  }
}
