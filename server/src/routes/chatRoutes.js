import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { verifyTripAccess } from '../middleware/verifyTripAccess.js';
const router = express.Router();
// Example protected route showing trip-level access control for chat features.
router.get('/:tripId/access', requireAuth, verifyTripAccess, async (_req, res) => {
    return res.status(200).json({ message: 'Trip chat access granted.' });
});
export default router;
