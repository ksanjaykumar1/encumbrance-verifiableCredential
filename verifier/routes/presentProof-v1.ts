import express from 'express';
import { request } from '../controllers/presentProof';

const router = express.Router();

router.route('/request').post(request);

export default router;
