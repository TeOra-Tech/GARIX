import { useLocalSearchParams } from 'expo-router';
import { Thread } from '@/components/thread';

export default function CustomerThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Thread id={id} side="customer" />;
}
