import 'express-async-errors';
import { config } from 'dotenv';
config();
import qrcode from 'qrcode-terminal';
import express from 'express';
import * as http from 'http';

import * as winston from 'winston';
import * as expressWinston from 'express-winston';
import cors from 'cors';

import debug from 'debug';
import {
  agent,
  connectionListner,
  initialOutOfBandRecord,
  registerInitialScehmaAndCredDef,
  run,
} from './integration/integration';
import connections from './routes/connections';
import schema from './routes/schema';
import credDef from './routes/credDef';
import issueCredentialV1 from './routes/issueCredentials-v1';
import outOfBand from './routes/outOfBand';

import notFound from './middleware/not-found';
import { removeData } from './utils/file';
import errorHandler from './middleware/errorHandler';

let provision = <boolean | undefined>process.env.PROVISION;
const app: express.Application = express();
const server: http.Server = http.createServer(app);
const port = 3000;
const debugLog: debug.IDebugger = debug('app');

app.use(express.json());

// here we are adding middleware to allow cross-origin requests
app.use(cors());

// here we are preparing the expressWinston logging middleware configuration,
// which will automatically log all HTTP requests handled by Express.js
const loggerOptions: expressWinston.LoggerOptions = {
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.json(),
    winston.format.prettyPrint(),
    winston.format.colorize({ all: true })
  ),
};

if (!process.env.DEBUG) {
  loggerOptions.meta = false; // when not debugging, log requests as one-liners
}

// initialize the logger with the above configuration
app.use(expressWinston.logger(loggerOptions));
app.use('/api/v1/connections', connections);
app.use('/api/v1/schemas', schema);
app.use('/api/v1/credential-definitions', credDef);
app.use('/api/v1/issue-credential', issueCredentialV1);
app.use('/api/v1/out-of-band', outOfBand);

// this is a simple route to make sure everything is working properly
const runningMessage = `Server running at http://localhost:${port}`;
app.get('/', (req: express.Request, res: express.Response) => {
  res.status(200).send(runningMessage);
});

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    // "provision" is intended to be used one time per agent deployment
    // to establish its secure storage database and the required ledger objects.
    // if (!agent.wallet.isProvisioned) {
    // to clean local storage
    removeData();
    await run();
    await connectionListner(initialOutOfBandRecord);
    console.log('before registering schema and cred def');
    await registerInitialScehmaAndCredDef();
    // }

    server.listen(port, () => {
      // our only exception to avoiding console.log(), because we
      // always want to know when the server is done starting up
      console.log(runningMessage);
      // const invitationUrl = initialOutOfBandRecord.outOfBandInvitation.toUrl({
      //   domain: 'https://example.org',
      // });
      // console.log(`Invitation URL ${invitationUrl}`);
      // qrcode.generate(invitationUrl, { small: true });
    });
  } catch (error) {
    console.log(error);
  }
};

start();
