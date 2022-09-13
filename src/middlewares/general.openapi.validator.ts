import fs from 'fs';
import * as OpenApiValidator from 'express-openapi-validator';

const specPath = './specs/general.yaml';
if (!fs.existsSync(specPath)) {
  throw new Error('API spec path is not valid');
}

export const PublicApiValidator = OpenApiValidator.middleware({
  apiSpec: specPath,
  validateRequests: true, // (default)
  validateResponses: false,
  validateSecurity: false,
  ignoreUndocumented: true,
  fileUploader: false,
});
