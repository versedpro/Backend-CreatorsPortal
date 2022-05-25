export const APP_NAME = 'Luna Marketplace Backend';
export const dbTables = {
  nftCollections: 'nft_collections',
  organizations: 'organizations',
  admins: 'admins',
};
// Will make env variables later.
export const ADMIN_ADDRESSES: string[] = ['0x22a8cd3a7a07527b3447eb42db073342b36c1d49']; // Fill up with permitted admin wallet addresses
export const JWT_PUBLIC_KEY = <string> process.env.JWT_PUBLIC_KEY;
export const nftTypes = ['AVATAR', 'ACCESSORY', 'GAME_ITEM'];
export const tokenFormats = ['ERC721', 'ERC1155'];

