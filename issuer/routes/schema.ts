import express from 'express';

import {
  getSchemaById,
  getSchemaByName,
  registerSchema,
} from '../controllers/schema';

const router = express.Router();

router.route('/').get(getSchemaById);
router.route('/register').post(registerSchema);
router.route('/name').get(getSchemaByName);

export default router;
