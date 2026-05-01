import type { Response } from 'express';

const notificationStreams = new Map<string, Set<Response>>();

export function addNotificationStream(userId: string, response: Response) {
  let streams = notificationStreams.get(userId);
  if (!streams) {
    streams = new Set<Response>();
    notificationStreams.set(userId, streams);
  }

  streams.add(response);
}

export function removeNotificationStream(userId: string, response: Response) {
  const streams = notificationStreams.get(userId);
  if (!streams) {
    return;
  }

  streams.delete(response);
  if (streams.size === 0) {
    notificationStreams.delete(userId);
  }
}

export function pushNotificationEvent(userId: string, payload: { type: 'notification'; at: string }) {
  const streams = notificationStreams.get(userId);
  if (!streams || streams.size === 0) {
    return;
  }

  const message = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const response of streams) {
    response.write(message);
  }
}
