import express from 'express';
import * as fs from 'fs';
import {
  agent,
  connectedConnectionRecord,
  issueCredentialV1,
} from '../integration/integration';
import { sendMessage } from '../integration/integration';
import { Aries } from '../errors';

const send = async (req: express.Request, res: express.Response) => {
  const { attributes } = req.body;
  let { connectionId, credentialDefinitionId } = req.body;
  if (!connectionId) {
    connectionId = connectedConnectionRecord.id;
  }
  console.log(attributes);
  if (!credentialDefinitionId) {
    const initialCredDefBuffer = fs.readFileSync(
      `./data/credentialDefinition.json`,
      'utf8'
    );
    const initialCredDef = JSON.parse(initialCredDefBuffer);
    credentialDefinitionId = initialCredDef.id;
  }
  console.log(
    `sending credential offer for connection id ${connectionId} using cred def ${credentialDefinitionId}`
  );
  try {
    const credentialOffer = await issueCredentialV1(
      credentialDefinitionId,
      connectionId,
      attributes
    );
    res.status(200).json({ credentialOffer: credentialOffer });
  } catch (error) {
    throw new Aries(error);
  }
};

export { send };
