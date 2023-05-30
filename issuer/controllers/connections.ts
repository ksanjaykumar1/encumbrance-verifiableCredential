import express from 'express';
import {
  agent,
  connectedConnectionRecord,
  initialOutOfBandRecord,
} from '../integration/integration';
import { sendMessage } from '../integration/integration';
import { Aries, NotFound } from '../errors';

const getAllConnections = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const connections = await agent.connections.getAll();
    res.status(200).json({ connections });
  } catch (error) {
    throw new Aries(error);
  }
};

const sendMessageToAgent = async (
  req: express.Request,
  res: express.Response
) => {
  const { conn_id: connectionRecordId } = req.params;
  //   const connectionId = connectionRecordId || connectedConnectionRecord;
  const connectionId = connectionRecordId;
  const { message } = req.body;
  await sendMessage(connectedConnectionRecord.id, message);
  res.status(200).json({ msg: `successfully sent message:  ${message}` });
};

const getConnectedConnectionRecord = async (
  req: express.Request,
  res: express.Response
) => {
  if (!connectedConnectionRecord) {
    throw new NotFound(`Not connected to any agent`);
  }
  res.status(200).json({ connectedConnectionRecord });
};

const getAllConnectionsByOobId = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const connections = await agent.connections.findAllByOutOfBandId(
      initialOutOfBandRecord.id
    );
    res.status(200).json({ connections });
  } catch (error) {
    throw new Aries(error);
  }
};

export {
  getAllConnections,
  sendMessageToAgent,
  getConnectedConnectionRecord,
  getAllConnectionsByOobId,
};
