import express from 'express';
import { serve, setup } from 'swagger-ui-express';

const router = express.Router();

const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    urls: [
      {
        url: '../specs/api.yaml',
        name: 'General'
      },
      {
        url: '../specs/user-creator.yaml',
        name: 'User'
      }
    ]
  }
};

// @ts-ignore
router.use('/', serve, setup(null, swaggerUiOptions));


export default router;
