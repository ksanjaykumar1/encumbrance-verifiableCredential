import express from 'express';
import {
  connectedConnectionRecord,
  sendProofRequest,
} from '../integration/integration';
import { Aries, BadRequest } from '../errors';

const request = async (req: express.Request, res: express.Response) => {
  let { connectionId, credentialDefinitionId } = req.body;
  if (!connectionId) {
    connectionId = connectedConnectionRecord.id;
  }

  if (!credentialDefinitionId) {
    throw new BadRequest('Credential Definition Id has to be passed');
  }
  console.log(
    `sending proof request for connection id ${connectionId} with Credential Definition Id ${credentialDefinitionId}`
  );
  try {
    const credentialOffer = await sendProofRequest(
      credentialDefinitionId,
      connectionId
    );
    res.status(200).json({ credentialOffer: credentialOffer });
  } catch (error) {
    throw new Aries(error);
  }
};

export { request };
