import * as sigUtil from '@metamask/eth-sig-util';

import { Admin } from '../interfaces/admin';
import { InvalidSignatureError } from '../interfaces';
import { UserInfo } from '../interfaces/user';

export interface SigVerificationBody {
  user: Admin | UserInfo;
  signature: string;
  publicAddress: string;
}

export class SignatureVerifier {
  static async verifySignature(body: SigVerificationBody): Promise<string> {
    const { user, signature, publicAddress } = body;
    // Frontend also has to sign this same message.
    const msg = `Luna Creators Portal Login: ${user.nonce}`;
    // We now are in possession of msg, publicAddress and signature. We
    // will use a helper from eth-sig-util to extract the address from the signature
    // const msgBufferHex = ethUtil.bufferToHex(Buffer.from(msg, 'utf8'));
    const address = sigUtil.recoverPersonalSignature({
        data: msg,
        signature
      }
    );
    // The signature verification is successful if the address found with
    // sigUtil.recoverPersonalSignature matches the initial publicAddress
    if (address.toLowerCase() === publicAddress.toLowerCase()) {
      return address;
    } else {
      throw new InvalidSignatureError();
    }
  }
}
