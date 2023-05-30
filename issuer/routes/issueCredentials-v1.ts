import express from 'express';
import {
  allCredentialExchangeRecords,
  send,
} from '../controllers/issueCredentials';

const router = express.Router();

router.route('/send').post(send);
router.route('/records/all').get(allCredentialExchangeRecords);

export default router;
