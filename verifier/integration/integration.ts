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
  qrcode.generate(invitationUrl, { small: true });
  return invitationUrl;
};

// send basic message

const sendMessage = async (connectionRecordId: string, message: string) => {
  await agent.basicMessages.sendMessage(connectionRecordId, message);
};

const sendProofRequest = async (
  credentialDefinitionId: string,
  connectionId: string
) => {
  const proofAttribute = {
    name: {
      names: ['LandID', 'OwnerAadhar'],
      restrictions: [
        {
          cred_def_id: credentialDefinitionId,
        },
      ],
    },
  };
  const proofRequest = await agent.proofs.requestProof({
    protocolVersion: 'v2',
    connectionId,
    proofFormats: {
      anoncreds: {
        name: 'proof-request',
        version: '1.0',
        nonce: '1298236324864',
        requested_attributes: proofAttribute,
      },
    },
  });
  return proofRequest;
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

// Proof request Accepted Listner
const proofAcceptedListener = () => {
  agent.events.on(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }: ProofStateChangedEvent) => {
      if (payload.proofRecord.state === ProofState.Done) {
        console.log(payload.proofRecord);
        console.log(payload);
        if (payload.proofRecord.isVerified) {
          console.log('succesfully veriferd......');
          await sendMessage(
            <string>payload.proofRecord.connectionId,
            `Your credential is verified`
          );
        } else {
          await sendMessage(
            <string>payload.proofRecord.connectionId,
            `Verification failed and we cannot issue you simcar.`
          );
        }
      }
    }
  );
};

export {
  agent,
  invitationUrl,
  initialOutOfBandRecord,
  createOutOfBandRecord,
  connectionListner,
  sendMessage,
  connectedConnectionRecord,
  sendProofRequest,
  proofAcceptedListener,
};
