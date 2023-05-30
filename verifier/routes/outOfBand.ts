import express from 'express';

import {
  createInvitation,
  getInvitation,
  receiveInvitation,
} from '../controllers/outOfBand';

const router = express.Router();

router.route('/invitation').get(getInvitation);
router.route('/create-invitation').get(createInvitation);
router.route('/receive-invitation').post(receiveInvitation);

export default router;
