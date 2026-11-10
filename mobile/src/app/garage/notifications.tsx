import { garageNotificationRoute } from '@/lib/inbox';
import { NotificationList } from '@/components/notification-list';

export default function GarageNotifications() {
  return <NotificationList route={garageNotificationRoute} empty="Nothing yet. We’ll let you know about new requests near you, accepted quotes and messages." />;
}
