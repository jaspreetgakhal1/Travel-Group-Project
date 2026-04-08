import express from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Notification } from '../models/Notification.js';
import { TripJoinRequest } from '../models/TripJoinRequest.js';
import type { AuthenticatedUser } from '../types/auth.js';

const router = express.Router();

router.get('/count', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const userId = authRequest.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  try {
    const [pendingJoinRequestResult, unreadCount] = await Promise.all([
      TripJoinRequest.aggregate<{ pendingCount: number }>([
        {
          $match: {
            hostId: new Types.ObjectId(userId),
            status: 'pending',
          },
        },
        {
          $count: 'pendingCount',
        },
      ]),
      Notification.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    const pendingCount = pendingJoinRequestResult[0]?.pendingCount ?? 0;

    return res.status(200).json({
      pendingCount,
      unreadCount,
      totalCount: pendingCount + unreadCount,
    });
  } catch (error) {
    console.error('GET /api/notifications/count failed', error);
    return res.status(500).json({ message: 'Unable to load notifications count right now.' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const userId = authRequest.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  try {
    const notifications = await Notification.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .select('_id type title message isRead metadata createdAt')
      .lean();

    return res.status(200).json({
      notifications: notifications.map((notification) => ({
        id: String(notification._id),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: Boolean(notification.isRead),
        metadata: notification.metadata ?? null,
        createdAt: notification.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/notifications failed', error);
    return res.status(500).json({ message: 'Unable to load notifications right now.' });
  }
});

router.post('/:id/read', requireAuth, async (req, res) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const userId = authRequest.user?.id;
  const notificationId = typeof req.params.id === 'string' ? req.params.id : '';

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  if (!Types.ObjectId.isValid(notificationId)) {
    return res.status(400).json({ message: 'Notification id is invalid.' });
  }

  try {
    const updatedNotification = await Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: { isRead: true },
      },
      {
        new: true,
      },
    )
      .select('_id isRead')
      .lean();

    if (!updatedNotification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    return res.status(200).json({
      message: 'Notification marked as read.',
      notification: {
        id: String(updatedNotification._id),
        isRead: Boolean(updatedNotification.isRead),
      },
    });
  } catch (error) {
    console.error('POST /api/notifications/:id/read failed', error);
    return res.status(500).json({ message: 'Unable to update this notification right now.' });
  }
});

export default router;
