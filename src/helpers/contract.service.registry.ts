import { SupportedNetwork } from '../interfaces/network';
import { ContractService } from '../services/contract.service';

export class ContractServiceRegistry {
  static signers: Map<string, ContractService> = new Map<string, ContractService>();

  static registerService(network: string): void {
    ContractServiceRegistry.signers.set(network, new ContractService(network));
  }

  static getService(network: string): ContractService {
    const service = ContractServiceRegistry.signers.get(network);
    if (!service) {
      throw new Error('Network is not supported');
    }
    return service;
  }
}

ContractServiceRegistry.registerService(SupportedNetwork.ETHEREUM);
ContractServiceRegistry.registerService(SupportedNetwork.POLYGON);
