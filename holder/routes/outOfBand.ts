import express from 'express';

import { getInvitation, receiveInvitation } from '../controllers/outOfBand';

const router = express.Router();

router.route('/invitation').get(getInvitation);
router.route('/receive-invitation').post(receiveInvitation);

export default router;
