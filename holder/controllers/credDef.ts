import express from 'express';
import { agent, connectedConnectionRecord } from '../integration/integration';
import { sendMessage } from '../integration/integration';
import { utils } from '@aries-framework/core';
import * as fs from 'fs';
import { Aries, NotFound } from '../errors';

const getCredDefById = async (req: express.Request, res: express.Response) => {
  const { credDef_id } = req.body;
  const initialCredDefBuffer = fs.readFileSync(`./data/credentialDefinition.json`, 'utf8');
  const initialCredDef = JSON.parse(initialCredDefBuffer);

  const credDefId = credDef_id || initialCredDef.id;
  try {
    const credDef = await agent.ledger.getCredentialDefinition(credDefId);
    res.status(200).json({ credDef });
  } catch (error) {
    throw new Aries(error);
  }
};
const registerCredDef = async (req: express.Request, res: express.Response) => {
  const { schemaName } = req.body;
  try {
    const schemaBuffer = fs.readFileSync(`/data/${schemaName}.json`, 'utf-8');
    if (!schemaBuffer) {
      throw new NotFound(
        `Schema with name ${name} doesn't exit in local storage `
      );
    }
    const schemaFile = JSON.parse(schemaBuffer);
    const schema = await agent.ledger.getSchema(JSON.parse(schemaFile.id));

    const credDef = await agent.ledger.registerCredentialDefinition({
      schema,
      supportRevocation: false,
      tag: 'latest',
    });
    const dir = './data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(
      `./data/credDef${schemaName}.json`,
      JSON.stringify(credDef)
    );
    res.status(200).json({ credDef });
  } catch (error) {
    throw new Aries(error);
  }
};

const getCredDefBySchemaName = async (
  req: express.Request,
  res: express.Response
) => {
  const { schemaName } = req.body;
  const credDef = fs.readFileSync(`/data/credDef${schemaName}.json`);
  if (!credDef) {
    throw new NotFound(
      `credDef with name credDef${schemaName} doesn't exit in local storage `
    );
  }
  res.status(200).json({ msg: 'Schema successfully registered', credDef });
};

export {
  getCredDefById,
  registerCredDef,
  getCredDefBySchemaName,
};
