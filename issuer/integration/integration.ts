import { config } from 'dotenv';
config();
import * as fs from 'fs';
import qrcode from 'qrcode-terminal';

import {
  CredentialsModule,
  DidsModule,
  InitConfig,
  V2CredentialProtocol,
  MediationRecipientModule,
  ConnectionsModule,
  KeyDidResolver,
  AutoAcceptCredential,
  ProofsModule,
  AutoAcceptProof,
  V2ProofProtocol,
  Agent,
  OutOfBandRecord,
  LogLevel,
  utils,
  ConsoleLogger,
  HttpOutboundTransport,
  WsOutboundTransport,
  ConnectionStateChangedEvent,
  ConnectionEventTypes,
  DidExchangeState,
  KeyType,
  TypedArrayEncoder,
  ConnectionRecord,
  CredentialEventTypes,
  CredentialState,
  CredentialStateChangedEvent,
  ProofStateChangedEvent,
  ProofEventTypes,
  ProofState,
  V2CredentialPreview,
} from '@aries-framework/core';

import { HttpInboundTransport, agentDependencies } from '@aries-framework/node';

import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1CredentialPreview,
  V1CredentialProtocol,
  V1ProofProtocol,
} from '@aries-framework/anoncreds';
import { AskarModule } from '@aries-framework/askar';
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
} from '@aries-framework/indy-vdr';
import { AnonCredsRsModule } from '@aries-framework/anoncreds-rs';

import { ariesAskar } from '@hyperledger/aries-askar-nodejs';
import { anoncreds } from '@hyperledger/anoncreds-nodejs';
import { indyVdr } from '@hyperledger/indy-vdr-nodejs';

import { ledgers } from '../utils/ledgers';
import { Aries } from '../errors';

const publicDidSeed = <string>process.env.PUBLIC_DID_SEED;
const issuerId = <string>process.env.ISSUER_DID;
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
  // logger: new ConsoleLogger(LogLevel.info),
  label: label + utils.uuid(),
  walletConfig: {
    id: label,
    key: 'demoagentissuer00000000000000000',
  },
};

async function initializeAgent(agentConfig: InitConfig) {
  try {
    const legacyIndyCredentialFormatService =
      new LegacyIndyCredentialFormatService();
    const legacyIndyProofFormatService = new LegacyIndyProofFormatService();

    const agent = new Agent({
      config: agentConfig,
      dependencies: agentDependencies,
      modules: {
        connections: new ConnectionsModule({
          autoAcceptConnections: true,
        }),
        mediationRecipient: new MediationRecipientModule({
          mediatorInvitationUrl,
        }),
        credentials: new CredentialsModule({
          autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
          credentialProtocols: [
            new V2CredentialProtocol({
              credentialFormats: [new AnonCredsCredentialFormatService()],
            }),
          ],
        }),
        proofs: new ProofsModule({
          autoAcceptProofs: AutoAcceptProof.ContentApproved,
          proofProtocols: [
            new V2ProofProtocol({
              proofFormats: [new AnonCredsProofFormatService()],
            }),
          ],
        }),
        anoncreds: new AnonCredsModule({
          registries: [new IndyVdrAnonCredsRegistry()],
        }),
        anoncredsRs: new AnonCredsRsModule({
          anoncreds,
        }),
        indyVdr: new IndyVdrModule({
          indyVdr,
          networks: [ledgers],
        }),
        dids: new DidsModule({
          resolvers: [new IndyVdrIndyDidResolver(), new KeyDidResolver()],
          registrars: [],
        }),
        askar: new AskarModule({
          ariesAskar,
        }),
      },
    });
    // Registering the required in- and outbound transports
    agent.registerOutboundTransport(new HttpOutboundTransport());
    //   agent.registerInboundTransport(new HttpInboundTransport({ port: agentPort }));
    agent.registerOutboundTransport(new WsOutboundTransport());
    console.log('Initializing agent...');
    await agent.initialize();
    console.log('Initializing agent... Success');
    // To clear all the old records in the wallet
    // await agent.wallet.delete();
    return agent;
  } catch (error) {
    console.log(error);
    process.exit(0);
  }
}

export async function run() {
  agent = await initializeAgent(agentConfig);
  try {
    initialOutOfBandRecord = await agent.oob.createInvitation();
    invitationUrl = initialOutOfBandRecord.outOfBandInvitation.toUrl({
      domain: 'https://example.org',
    });
    console.log(`Invitation URL ${invitationUrl}`);
    qrcode.generate(invitationUrl, { small: true });
  } catch (error) {}
}

const createOutOfBandRecord = async () => {
  // updating initial OOB with the latest one
  initialOutOfBandRecord = await agent.oob.createInvitation();
  invitationUrl = initialOutOfBandRecord.outOfBandInvitation.toUrl({
    domain: 'https://example.org',
  });
  return invitationUrl;
};

const importDID = async () => {
  console.log('issuerId');
  console.log(issuerId);
  agent.dids.import({
    did: issuerId,
    overwrite: true,
    privateKeys: [
      {
        keyType: KeyType.Ed25519,
        privateKey: TypedArrayEncoder.fromString(publicDidSeed),
      },
    ],
  });
};

const registerSchema = async (
  attributes: string[],
  name: string,
  version: string
) => {
  console.log('registerSchema');
  try {
    if (!issuerId) {
      throw new Error('Missing anoncred issuerId');
    }

    const schemaTemplate = {
      name: name + utils.uuid(),
      version: version,
      attrNames: attributes,
      issuerId: issuerId,
    };
    const { schemaState } = await agent.modules.anoncreds.registerSchema({
      schema: schemaTemplate,
      options: {
        endorserMode: 'internal',
        endorserDid: issuerId,
      },
    });
    console.log(schemaState);

    if (schemaState.state !== 'finished') {
      throw new Error(
        `Error registering schema: ${
          schemaState.state === 'failed' ? schemaState.reason : 'Not Finished'
        }`
      );
    }
    const dir = './data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync('./data/schema.json', JSON.stringify(schemaState));
    return schemaState;
  } catch (error) {
    console.log(error);
  }
};

const registerCredentialDefinition = async (schema: any) => {
  try {
    const { credentialDefinitionState } =
      await agent.modules.anoncreds.registerCredentialDefinition({
        credentialDefinition: {
          schemaId: schema.schemaId,
          issuerId: issuerId,
          tag: 'latest',
        },
        options: {},
      });

    if (credentialDefinitionState.state !== 'finished') {
      throw new Error(
        `Error registering credential definition: ${
          credentialDefinitionState.state === 'failed'
            ? credentialDefinitionState.reason
            : 'Not Finished'
        }}`
      );
    }
    fs.writeFileSync(
      './data/credentialDefinition.json',
      JSON.stringify(credentialDefinitionState)
    );

    return credentialDefinitionState;
  } catch (error) {
    console.log(error);
  }
};

const registerInitialScehmaAndCredDef = async () => {
  const schema = await registerSchema(
    ['LandID', 'OwnerName', 'OwnerAadhar'],
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
    credentialPreview = await V2CredentialPreview.fromRecord(attributes);
    console.log(credentialPreview);
    console.log(attributes);
  } catch (error) {
    throw new Aries(`credentialPreview : ${error}`);
  }
  try {
    const offerCredential = await agent.credentials.offerCredential({
      connectionId,
      protocolVersion: <never>'v2',
      credentialFormats: {
        anoncreds: {
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

export {
  agent,
  invitationUrl,
  registerInitialScehmaAndCredDef,
  registerSchema,
  registerCredentialDefinition,
  initialOutOfBandRecord,
  createOutOfBandRecord,
  connectionListner,
  sendMessage,
  connectedConnectionRecord,
  issueCredentialV1,
  importDID,
};
