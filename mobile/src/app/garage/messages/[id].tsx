import { useLocalSearchParams } from 'expo-router';
import { Thread } from '@/components/thread';

export default function GarageThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Thread id={id} side="garage" />;
}
