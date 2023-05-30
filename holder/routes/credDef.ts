import express from 'express';


import {
  getCredDefById,
  getCredDefBySchemaName,
  registerCredDef,
} from '../controllers/credDef';

const router = express.Router();

router.route('/').get(getCredDefById);
router.route('/register').post(registerCredDef);
router.route('/name').get(getCredDefBySchemaName);

export default router;
