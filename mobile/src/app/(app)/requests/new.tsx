import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateRequest } from '@/lib/queries';
import { EMPTY_REQUEST, RequestForm } from '@/components/request-form';
import { Screen } from '@/components/ui';

export default function NewRequest() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const create = useCreateRequest();
  return (
    <Screen edges={['bottom']}>
      <RequestForm
        initial={{ ...EMPTY_REQUEST, vehicleId: vehicleId ?? '' }}
        allowPhotos
        submitLabel="Post request"
        pending={create.isPending}
        submitError={create.isError ? 'Could not post your request. Try again.' : null}
        onSubmit={(data, photos) =>
          create.mutate(
            { data, photos },
            {
              onSuccess: ({ request, failed }) => {
                router.replace(`/requests/${request.id}`);
                Alert.alert(
                  'Your request is live',
                  failed
                    ? `Garages near you can now see it. ${failed} photo${failed > 1 ? 's' : ''} didn’t upload.`
                    : 'Garages near you can now see it and send quotes. We’ll notify you when the first one lands.',
                );
              },
            },
          )
        }
      />
    </Screen>
  );
}
