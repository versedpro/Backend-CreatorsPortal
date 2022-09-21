import { DecodedCallData, LogEvent, MethodAbi, RpcLogEvent } from '../interfaces/contract';
import { BigNumber, ethers } from 'ethers';
import { toIntNumber } from './string.utils';
import { Logger } from './Logger';

export function convertRpcLogEvents(events: RpcLogEvent[], contractAbi: MethodAbi[]): LogEvent[] {
  const iFace = new ethers.utils.Interface(contractAbi);

  const formattedEvents: LogEvent[] = [];
  // Logger.Info(providerUrl, contractAbi, iFace);

  for (const event of events) {
    const logEvent: LogEvent = {
      address: event.address,
      topics: event.topics,
      blockNumber: toIntNumber(event.blockNumber),
      transactionHash: event.transactionHash,
      transactionIndex: toIntNumber(event.transactionIndex),
      blockHash: event.blockHash,
      logIndex: toIntNumber(event.logIndex),
    };
    // Decode log
    const decodedCallData: DecodedCallData = {};
    // Decode logs wif ABI is present
    Logger.Info('parsing log');
    try {
      // This decodes the log using the contract abi, it finds the method that matches the event function signature
      const { eventFragment, name, signature, args } = iFace.parseLog(event);

      if (eventFragment.type === 'event') {
        decodedCallData.name = name;
        decodedCallData.signature = signature;
        decodedCallData.params = [];

        // Here we want to extract the call input params and also their values
        // An example of the decoded data is seen here: ../data/DecodeRpcEventSample.json
        if (eventFragment.inputs) {
          for (let i = 0; i < eventFragment.inputs.length; i++) {
            const input = eventFragment.inputs[i];
            const argValue = args[i];
            // Logic to get values
            let value = argValue;
            if (typeof argValue === 'object') {
              // Get number value
              if (input.baseType && (input.baseType.includes('int'))) {
                value = BigNumber.from(argValue._hex).toString();
              }
            }
            const param = {
              name: input.name,
              type: input.type,
              indexed: input.indexed,
              value: JSON.stringify(value),
            };
            decodedCallData.params.push(param);
          }
        }
        logEvent.data = decodedCallData;
      } else {
        logEvent.data = eventFragment;
      }
    } catch (err: any) {
      Logger.Error(`Error decoding event logIndex: ${event.logIndex} Tx hash: ${event.transactionHash} Block No. ${event.blockNumber}`);
    }

    formattedEvents.push(logEvent);
  }
  return formattedEvents;
}
