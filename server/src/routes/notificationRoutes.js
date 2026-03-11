import express from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { TripJoinRequest } from '../models/TripJoinRequest.js';
const router = express.Router();
router.get('/count', requireAuth, async (req, res) => {
    const authRequest = req;
    const hostId = authRequest.user?.id;
    if (!hostId) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const [result] = await TripJoinRequest.aggregate([
            {
                $match: {
                    hostId: new Types.ObjectId(hostId),
                    status: 'pending',
                },
            },
            {
                $count: 'pendingCount',
            },
        ]);
        return res.status(200).json({
            pendingCount: result?.pendingCount ?? 0,
        });
    }
    catch (error) {
        console.error('GET /api/notifications/count failed', error);
        return res.status(500).json({ message: 'Unable to load notifications count right now.' });
    }
});
export default router;
