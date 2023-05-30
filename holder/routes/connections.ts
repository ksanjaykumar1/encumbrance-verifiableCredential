import express from 'express';
import {
  getAllConnections,
  getAllConnectionsByOobId,
  getConnectedConnectionRecord,
  sendMessageToAgent,
} from '../controllers/connections';

const router = express.Router();

router.route('/all').get(getAllConnections);
router.route('/connectionsByOobId').get(getAllConnectionsByOobId);
router.route('/connectedConnectionRecord').get(getConnectedConnectionRecord);
router.route('/:conn_id/sendMessage').post(sendMessageToAgent);

export default router;
