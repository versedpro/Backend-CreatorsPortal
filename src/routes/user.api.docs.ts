import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
const router = express.Router();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Luna Creators Portal User API Docs',
      version: '1.0.0',
      description: 'Base path for user API endpoints is /api/users',
    },
  },
  // swaggerDefinition,
  apis: ['./specs/user-creator.yaml'],
};

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerJSDoc(options)));


export default router;
