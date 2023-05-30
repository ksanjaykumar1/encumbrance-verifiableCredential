import { config } from 'dotenv';
config();
import * as fs from 'fs';

import {
  Agent,
  AutoAcceptCredential,
  AutoAcceptProof,
  ConnectionEventTypes,
  ConnectionRecord,
  ConnectionStateChangedEvent,
  ConsoleLogger,
  CredentialEventTypes,
  CredentialState,
  CredentialStateChangedEvent,
  DidExchangeState,
  HttpOutboundTransport,
  InitConfig,
  LogLevel,
  OutOfBandRecord,
  ProofEventTypes,
  ProofState,
  ProofStateChangedEvent,
  V1CredentialPreview,
  WsOutboundTransport,
  utils,
} from '@aries-framework/core';

import { HttpInboundTransport, agentDependencies } from '@aries-framework/node';

import qrcode from 'qrcode-terminal';

import { ledgers } from '../utils/ledgers';
import { Aries } from '../errors';

const publicDidSeed = <string>process.env.PUBLIC_DID_SEED;
const schemaName = <string>process.env.SCHEMA_NAME;
const mediatorInvitationUrl = <string>process.env.MEDIATOR_URL;
const label = <string>process.env.LABEL;
const env = <string>process.env.ENV;
// const agentPort = <number>(<unknown>process.env.AGENT_PORT);

let invitationUrl: string;
let agent: Agent;
let initialOutOfBandRecord: OutOfBandRecord;
let connectedConnectionRecord: ConnectionRecord;

const agentConfig: InitConfig = {
  logger: new ConsoleLogger(env === 'dev' ? LogLevel.trace : LogLevel.info),
  label: label + utils.uuid(),
  autoAcceptConnections: true,
  autoAcceptProofs: AutoAcceptProof.Always,
  autoAcceptCredentials: AutoAcceptCredential.Always,
  mediatorConnectionsInvite: mediatorInvitationUrl,
  indyLedgers: ledgers,
  publicDidSeed,
  walletConfig: {
    id: label,
    key: 'demoagentissuer00000000000000000',
    // storage: { type: 'sqlite' },
  },
};

async function initializeAgent(agentConfig: InitConfig) {
  try {
    const agent = new Agent({
      config: agentConfig,
      dependencies: agentDependencies,
    });
    // Registering the required in- and outbound transports
    agent.registerOutboundTransport(new HttpOutboundTransport());
    //   agent.registerInboundTransport(new HttpInboundTransport({ port: agentPort }));
    agent.registerOutboundTransport(new WsOutboundTransport());
    console.log('Initializing agent...');
    await agent.wallet.createAndOpen;
    await agent.initialize();
    console.log('Initializing agent... Success');
    // To clear all the old records in the wallet
    return agent;
  } catch (error) {
    console.log(error);
    process.exit(0);
  }
}

export async function run() {
  agent = await initializeAgent(agentConfig);
  try {
    // initialOutOfBandRecord = await agent.oob.createInvitation();
    // invitationUrl = initialOutOfBandRecord.outOfBandInvitation.toUrl({
    //   domain: 'https://example.org',
    // });
    // console.log(`Invitation URL ${invitationUrl}`);
    // qrcode.generate(invitationUrl, { small: true });
  } catch (error) {}
}

const registerSchema = async (
  attributes: string[],
  name: string,
  version: string
) => {
  console.log('registerSchema');
  try {
    const schema = await agent.ledger.registerSchema({
      attributes,
      name,
      version,
    });
    console.log('schema');
    console.log(schema);

    // create a folder if doesn't exits to store data
    const dir = './data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync('./data/schema.json', JSON.stringify(schema));
    return schema;
  } catch (error) {
    console.log(error);
  }
};

const registerCredentialDefinition = async (schema: any) => {
  try {
    const credentialDefinition =
      await agent.ledger.registerCredentialDefinition({
        schema,
        supportRevocation: false,
        tag: 'latest',
      });
    fs.writeFileSync(
      './data/credentialDefinition.json',
      JSON.stringify(credentialDefinition)
    );

    return credentialDefinition;
  } catch (error) {}
};

const registerInitialScehmaAndCredDef = async () => {
  console.log('called registerInitialScehmaAndCredDef');

  const schema = await registerSchema(
    ['name', 'age'],
    schemaName + utils.uuid(),
    '1.0'
  );
  console.log(schema);
  const credentialDefinition = await registerCredentialDefinition(schema);
};

// send basic message

const sendMessage = async (connectionRecordId: string, message: string) => {
  await agent.basicMessages.sendMessage(connectionRecordId, message);
};

const issueCredentialV1 = async (
  credentialDefinitionId: string,
  connectionId: string,
  attributes: any
) => {
  let credentialPreview;
  try {
    credentialPreview = await V1CredentialPreview.fromRecord(attributes);
    console.log(credentialPreview);
  } catch (error) {
    throw new Aries(`credentialPreview : ${error}`);
  }
  try {
    const offerCredential = await agent.credentials.offerCredential({
      protocolVersion: 'v1',
      connectionId,
      credentialFormats: {
        indy: {
          credentialDefinitionId,
          attributes: credentialPreview.attributes,
        },
      },
    });
    return offerCredential;
  } catch (error) {
    throw new Aries(`issuance : ${error}`);
  }
};

// Listners

// connection Listner

const connectionListner = (outOfBandRecord: OutOfBandRecord) => {
  agent.events.on<ConnectionStateChangedEvent>(
    ConnectionEventTypes.ConnectionStateChanged,
    async ({ payload }) => {
      if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) return;
      if (payload.connectionRecord.state === DidExchangeState.Completed) {
        // the connection is now ready for usage in other protocols!
        console.log(
          `Connection for out-of-band id ${outOfBandRecord.id} completed`
        );
        connectedConnectionRecord = payload.connectionRecord;
        await sendMessage(
          payload.connectionRecord.id,
          `Hello you are being connected us with connection record ${payload.connectionRecord.id}`
        );
      }
    }
  );
};

// credential  listner

const credentialOfferListener = () => {
  agent.events.on(
    CredentialEventTypes.CredentialStateChanged,
    async ({ payload }: CredentialStateChangedEvent) => {
      if (payload.credentialRecord.state === CredentialState.OfferReceived) {
        console.log('received credential');
        console.log(payload.credentialRecord);
      }
    }
  );
};

// proof lisnter
const proofRequestListener = () => {
  agent.events.on(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }: ProofStateChangedEvent) => {
      if (payload.proofRecord.state === ProofState.RequestReceived) {
        console.log(payload.proofRecord);
      }
    }
  );
};
export {
  agent,
  invitationUrl,
  registerInitialScehmaAndCredDef,
  registerSchema,
  registerCredentialDefinition,
  initialOutOfBandRecord,
  connectionListner,
  sendMessage,
  connectedConnectionRecord,
  issueCredentialV1,
  credentialOfferListener,
  proofRequestListener,
};
