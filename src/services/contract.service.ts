import { ApiRelayerParams } from 'defender-relay-client/lib/relayer';
import { DefenderRelayProvider, DefenderRelaySigner } from 'defender-relay-client/lib/ethers';
import { ethers } from 'ethers';
import { AddMaxSupplyCallRequest, DeployCollectionContractRequest } from '../interfaces/contract';
import { Logger } from '../helpers/Logger';
import { convertRpcLogEvents } from '../helpers/event.helper';

const FACTORY_ABI = require('../abis/LunaFactory.json');
const COLLECTION_ABI = require('../abis/LunaCollection.json');

const credentials: ApiRelayerParams = {
  apiKey: <string>process.env.DEFENDER_API_KEY,
  apiSecret: <string>process.env.DEFENDER_API_SECRET,
};
const provider = new DefenderRelayProvider(credentials);
const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fast' });

export async function deployNftCollection(body: DeployCollectionContractRequest): Promise<any> {
  const factory = new ethers.Contract(<string>process.env.NFT_FACTORY_CONTRACT_ADDRESS, FACTORY_ABI, signer);

  try {
    const tx = await factory.deployERC1155(
      body.tokenName,
      body.tokenSymbol,
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

export async function addMaxSupply(body: AddMaxSupplyCallRequest): Promise<any> {
  const collection = new ethers.Contract(body.contractAddress, COLLECTION_ABI, signer);
  try {
    const tx = await collection.setMaxSupply(body.tokenId || 1, body.quantity);
    const minedTx = await tx.wait();
    Logger.Info('Completed max supply call', minedTx);
    return minedTx;
  } catch (error) {
    console.log(error);
  }
}
