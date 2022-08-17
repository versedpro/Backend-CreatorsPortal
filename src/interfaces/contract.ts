export interface DeployCollectionContractRequest {
  collectionName: string;
  collectionSymbol: string;
  metadataUriPrefix: string;
  royaltyAddress: string;
  payoutAddress: string;
  tokenId?: number;
  quantity?: number;
  price: string;
  royalty: number;
}

export interface AbiInputComponentParam {
  name?: string;
  type?: string;
  components?: Array<AbiInputComponentParamNested>;
}

export interface AbiInputComponentParamNested {
  name?: string;
  type?: string;
  components?: Array<object>;
}

export interface ContractParam {
  name?: string;
  type?: string;
  components?: Array<AbiInputComponentParam>;
  indexed?: boolean;
}

export interface MethodAbi {
  anonymous?: boolean;
  constant?: boolean;
  inputs?: Array<ContractParam>;
  name?: string;
  outputs?: Array<ContractParam>;
  payable?: boolean;
  stateMutability?: string;
  type?: string;
}

export interface RpcLogEvent {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string | number;
  transactionHash: string;
  transactionIndex: string | number;
  blockHash: string;
  logIndex: string | number;
  removed: boolean;
}

export interface LogEvent {
  data?: DecodedCallData;
  topics: Array<string>;
  logIndex: number;
  transactionIndex: number;
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  address: string;
  removed?: boolean;
}

export interface DecodedCallData {
  name?: string;
  signature?: string;
  params?: Array<CallDataParam>;
}

export interface CallDataParam {
  name?: string;
  type?: string;
  indexed?: boolean;
  value?: string;
}

export interface AddMaxSupplyCallRequest {
  contractAddress: string;
  tokenId?: number;
  quantity: number;
}

export interface SetMintPriceCallRequest {
  contractAddress: string;
  tokenId?: number;
  // price in eth
  price: string;
}

export interface GetTokenBalanceCallRequest {
  contractAddress: string;
  tokenId?: number;
}

export interface SetRoyaltyRequest {
  contractAddress: string;
  royalty: number;
}
