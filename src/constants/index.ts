import { ApiRelayerParams } from 'defender-relay-client/lib/relayer';

export const APP_NAME = 'Luna Marketplace Backend';
export const dbTables = {
  nftCollections: 'nft_collections',
  organizations: 'organizations',
  admins: 'admins',
  nftItems: 'nft_items',
  apiSecretKeys: 'api_secret_keys',
  firstPartyQuestionAnswers: 'first_party_question_answers',
  users: 'users',
  organizationInvites: 'organization_invites',
  organizationAuths: 'organization_auths',
  passwordResets: 'password_resets',
  userTokens: 'user_tokens',
  feesPayments: 'fees_payments',
  stripeCustomers: 'stripe_customers',
};
// Will make env variables later.
export const ADMIN_ADDRESSES: string[] = (<string>process.env.ADMIN_ADDRESSES || '').split(','); // Fill up with permitted admin wallet addresses
export const JWT_PUBLIC_KEY = <string>process.env.JWT_PUBLIC_KEY;
export const nftTypes = ['AVATAR', 'ACCESSORY', 'GAME_ITEM'];
export const tokenFormats = ['ERC721', 'ERC1155'];
export const awsConfig = {
  secretAccessKey: <string>process.env.AWS_SECRET_KEY,
  accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
  region: <string>process.env.AWS_REGION,
  s3BucketName: <string>process.env.AWS_S3_BUCKET,
};

export const defenderConfig: { [network: string]: ApiRelayerParams } = {
  ethereum: {
    apiKey: <string>process.env.ETHEREUM_DEFENDER_API_KEY,
    apiSecret: <string>process.env.ETHEREUM_DEFENDER_API_SECRET,
  },
  polygon: {
    apiKey: <string>process.env.POLYGON_DEFENDER_API_KEY,
    apiSecret: <string>process.env.POLYGON_DEFENDER_API_SECRET,
  },
};

export const lunaFactoryAddresses: { [network: string]: string } = {
  ethereum: <string>process.env.ETHEREUM_NFT_FACTORY_CONTRACT_ADDRESS,
  polygon: <string>process.env.POLYGON_NFT_FACTORY_CONTRACT_ADDRESS,
};

export const sendgrid = {
  apiKey: <string> process.env.SENDGRID_API_KEY,
  sender: {
    name: 'Insomnia Labs',
    email: <string> process.env.SENDGRID_SENDER_EMAIL,
  },
  templates: {
    orgInvite: <string> process.env.SENDGRID_INVITE_TEMPLATE_ID,
    forgotPassword: <string> process.env.SENDGRID_FORGOT_PASSWORD_TEMPLATE_ID,
    adminCreatedAccount: <string> process.env.SENDGRID_ADMIN_CREATED_ACCOUNT_TEMPLATE_ID,
    passwordResetSuccessful: <string> process.env.SENDGRID_PASSWORD_RESET_SUCCESS_TEMPLATE_ID,
  }
};
export const FRONTEND_URL = <string> process.env.FRONTEND_URL;

export const stripeConfig = {
  secretKey: <string> process.env.STRIPE_SECRET_KEY,
  endpointSecret: <string> process.env.STRIPE_SIGNATURE,
};
export const nodeEnv = <string> process.env.NODE_ENV;
