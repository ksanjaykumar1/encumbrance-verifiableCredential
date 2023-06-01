import { config } from 'dotenv';
config();
import * as fs from 'fs';

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
} from '@aries-framework/core';

import { HttpInboundTransport, agentDependencies } from '@aries-framework/node';

import qrcode from 'qrcode-terminal';

import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
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
  // logger: new ConsoleLogger(env === 'dev' ? LogLevel.trace : LogLevel.info),
  logger: new ConsoleLogger(LogLevel.info),
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
          autoAcceptCredentials: AutoAcceptCredential.Always,
          credentialProtocols: [
            new V2CredentialProtocol({
              credentialFormats: [new AnonCredsCredentialFormatService()],
            }),
          ],
        }),
        proofs: new ProofsModule({
          autoAcceptProofs: AutoAcceptProof.Always,
          proofProtocols: [
            new V1ProofProtocol({
              indyProofFormat: legacyIndyProofFormatService,
            }),
            new V2ProofProtocol({
              proofFormats: [
                legacyIndyProofFormatService,
                new AnonCredsProofFormatService(),
              ],
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
    await agent.modules.anoncreds.createLinkSecret();
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

// send basic message

const sendMessage = async (connectionRecordId: string, message: string) => {
  await agent.basicMessages.sendMessage(connectionRecordId, message);
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
        console.log(
          `connectedConnectionRecord id is ${connectedConnectionRecord.id}`
        );
        await sendMessage(
          payload.connectionRecord.id,
          `Hello you are being connected with us, your connection record id is${payload.connectionRecord.id}`
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
        // const linkSecretIds = await agent.modules.anoncreds.getLinkSecretIds();
        // if (linkSecretIds.length === 0) {
        //   await agent.modules.anoncreds.createLinkSecret();
        // }

        // agent.credentials.acceptOffer({
        //   credentialRecordId: payload.credentialRecord.id,
        // });
      }
      if (payload.credentialRecord.state === CredentialState.CredentialIssued) {
        console.log('credential successfully recieved');
        console.log(payload);
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
  initialOutOfBandRecord,
  connectionListner,
  sendMessage,
  connectedConnectionRecord,
  credentialOfferListener,
  proofRequestListener,
};
