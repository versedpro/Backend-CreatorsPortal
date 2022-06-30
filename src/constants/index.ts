export const APP_NAME = 'Luna Marketplace Backend';
export const dbTables = {
  nftCollections: 'nft_collections',
  organizations: 'organizations',
  admins: 'admins',
  nftItems: 'nft_items',
  apiSecretKeys: 'api_secret_keys',
  firstPartyQuestionAnswers: 'first_party_question_answers',
};
// Will make env variables later.
export const ADMIN_ADDRESSES: string[] = (<string> process.env.ADMIN_ADDRESSES || '').split(','); // Fill up with permitted admin wallet addresses
export const JWT_PUBLIC_KEY = <string> process.env.JWT_PUBLIC_KEY;
export const nftTypes = ['AVATAR', 'ACCESSORY', 'GAME_ITEM'];
export const tokenFormats = ['ERC721', 'ERC1155'];
export const awsConfig = {
  secretAccessKey: <string> process.env.AWS_SECRET_KEY,
  accessKeyId: <string> process.env.AWS_ACCESS_KEY_ID,
  region: <string> process.env.AWS_REGION,
  s3BucketName: <string> process.env.AWS_S3_BUCKET,
};
