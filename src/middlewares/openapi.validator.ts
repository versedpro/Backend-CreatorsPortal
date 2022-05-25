import fs from 'fs';
import * as OpenApiValidator from 'express-openapi-validator';

const specPath = './specs/api.yaml';
if (!fs.existsSync(specPath)) {
  throw new Error('API spec path is not valid');
}

export const ApiValidator = OpenApiValidator.middleware({
  apiSpec: specPath,
  validateRequests: true, // (default)
  validateResponses: false,
  validateSecurity: false,
  ignoreUndocumented: false,
  formats: [
    {
      name: 'bytes',
      type: 'string',
      validate: (a) => {
        return Buffer.from(a, 'base64').length > 0;
      },
    },
  ],
});
