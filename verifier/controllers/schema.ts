import express from 'express';
import { agent, connectedConnectionRecord } from '../integration/integration';
import { sendMessage } from '../integration/integration';
import { utils } from '@aries-framework/core';
import * as fs from 'fs';
import { Aries, NotFound } from '../errors';

const getSchemaById = async (req: express.Request, res: express.Response) => {
  const { schema_id } = req.body;
  const initialSchemaBuffer = fs.readFileSync(`./data/schema.json`, 'utf8');
  const initialSchema = JSON.parse(initialSchemaBuffer);

  const schemaId = schema_id || initialSchema.id;
  try {
    const schema = await agent.ledger.getSchema(schemaId);
    res.status(200).json({ schema });
  } catch (error) {
    throw new Aries(error);
  }
};
const registerSchema = async (req: express.Request, res: express.Response) => {
  const { attributes, name, version } = req.body;
  const schema = await agent.ledger.registerSchema({
    attributes,
    name: `${name}-${utils.uuid()}`,
    version,
  });
  const dir = './data';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFileSync(`./data/${name}.json`, JSON.stringify(schema));
  res.status(200).json({ schema });
};

const getSchemaByName = async (req: express.Request, res: express.Response) => {
  const { name } = req.body;
  const schema = fs.readFileSync(`/data/${name}.json`);
  if (!schema) {
    throw new NotFound(
      `Schema with name ${name} doesn't exit in local storage `
    );
  }
  res.status(200).json({ msg: 'Schema successfully registered', schema });
};

export { getSchemaById, registerSchema, getSchemaByName };
