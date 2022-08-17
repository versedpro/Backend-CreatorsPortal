import fs from 'fs';
import * as OpenApiValidator from 'express-openapi-validator';

const specPath = './specs/api.yaml';
if (!fs.existsSync(specPath)) {
  throw new Error('API spec path is not valid');
}
const uuidV4RegExp = new RegExp(/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/);

export const ApiValidator = OpenApiValidator.middleware({
  apiSpec: specPath,
  validateRequests: true, // (default)
  validateResponses: false,
  validateSecurity: false,
  ignoreUndocumented: false,
  ignorePaths: (path: string) => {
    if(path.startsWith('/api//users')) {
      return true;
    }
    if (path.endsWith('/')) {
      path = path.substring(0, path.length - 1);
    }
    const split = path.trim().split('/');
    if (split.length === 5 && split[1] === 'api' && split[3] === 'admin' && split[4].match(new RegExp('(\\b0x[a-fA-F0-9]{40}\\b)'))) {
      return true;
    }
    const lastPath = split[split.length - 1];
    return (lastPath === 'organizations') || (lastPath === 'collections') || (lastPath.match(uuidV4RegExp) !== null);
  },
  formats: [
    {
      name: 'bytes',
      type: 'string',
      validate: (a) => {
        return Buffer.from(a, 'base64').length > 0;
      },
    },
  ],
  fileUploader: false,
});
