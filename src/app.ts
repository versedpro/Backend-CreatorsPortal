import dotenv from 'dotenv';

dotenv.config();

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import methodOverride from 'method-override';
import cors from 'cors';

import ApiRoutes from './routes';
import { ApiValidator } from './middlewares/openapi.validator';
import apiDocsRoutes from './routes/api.docs';
import * as CronHelper from './helpers/cron.helper';

const isProduction: boolean = process.env.NODE_ENV === 'production';

const app = express();

app.use(bodyParser.raw({ type: 'application/json' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.set('port', process.env.PORT);
app.set('env', process.env.NODE_ENV);


app.use(cookieParser());

app.use(cors());

app.use(
  compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false;
      }
      // fallback to standard filter function
      return compression.filter(req, res);
    },
  }),
);

/**
 * Helmet for additional server security
 *  xssfilter, frameguard etc.
 *  https://www.npmjs.com/package/helmet
 */
app.use(helmet());

app.disable('x-powered-by');

app.use(methodOverride());
app.use('/specs', express.static('specs'));

app.use('/api', ApiValidator);

const router = express.Router();

router.use('/api', ApiRoutes);

router.use('/api-docs', apiDocsRoutes);

router.use('/health', (req, res) => {
  res.send({ status: 'OK' });
});

app.use(router);

// Force all requests on production to be served over https
app.use(function (req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https' && isProduction) {
    const secureUrl = 'https://' + req.hostname + req.originalUrl;
    res.redirect(302, secureUrl);
  }
  next();
});

// eslint-disable-next-line no-unused-vars
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // format error
  return res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

CronHelper.cronUpdateExpiredInvites();
CronHelper.cronDeleteExpiredUserTokens();

export default app;
