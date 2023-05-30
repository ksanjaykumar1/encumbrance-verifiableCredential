import express from 'express';

import {
  getAllCredentials,
  getCredentialById,
} from '../controllers/credential';

const router = express.Router();

router.route('/all').get(getAllCredentials);
router.route('/:credential_id').get(getCredentialById);

export default router;
