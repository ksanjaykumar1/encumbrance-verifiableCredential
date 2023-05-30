import express from 'express';
import { send } from '../controllers/issueCredentials';

const router = express.Router();

router.route('/send').post(send);

export default router;
