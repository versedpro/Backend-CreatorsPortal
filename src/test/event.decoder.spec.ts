import { convertRpcLogEvents } from '../helpers/event.helper';
const FACTORY_ABI = require('../abis/LunaFactory.json');

const newTx = require('./data/newTx.json');

describe('Test event decoding', () => {
  it('should return new logs with decode data', async () => {
    const result = convertRpcLogEvents(newTx.logs, FACTORY_ABI);
    const ownershipTransferredEvent = result.find(x => x.data && x.data.name === 'OwnershipTransferred');
    expect(ownershipTransferredEvent?.data).toEqual({
      'name': 'OwnershipTransferred',
      'signature': 'OwnershipTransferred(address,address)',
      'params': [
        {
          'name': 'previousOwner',
          'type': 'address',
          'indexed': true,
          'value': '"0x0000000000000000000000000000000000000000"'
        },
        {
          'name': 'newOwner',
          'type': 'address',
          'indexed': true,
          'value': '"0x8283D5864003Eb97458EE3C1A0B001De86475BC5"'
        }
      ]
    });
  });
});
