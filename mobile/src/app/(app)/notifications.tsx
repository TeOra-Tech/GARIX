import { notificationRoute } from '@/lib/inbox';
import { NotificationList } from '@/components/notification-list';

export default function Notifications() {
  return <NotificationList route={notificationRoute} empty="Nothing yet. We’ll let you know when a garage quotes or messages you." />;
}
