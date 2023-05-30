import express from 'express';
import {
  agent,
  connectedConnectionRecord,
  initialOutOfBandRecord,
} from '../integration/integration';
import { sendMessage } from '../integration/integration';
import { Aries, NotFound } from '../errors';

const getAllCredentials = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const credentials = await agent.credentials.getAll();
    res.status(200).json({ credentials });
  } catch (error) {
    throw new Aries(error);
  }
};

const getCredentialById = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { credential_id } = req.params;
    const credentials = await agent.credentials.findById(credential_id)
    res.status(200).json({ credentials });
  } catch (error) {
    throw new Aries(error);
  }
};

export {
  getAllCredentials,
  getCredentialById
};
