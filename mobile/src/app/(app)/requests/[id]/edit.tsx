import { router, useLocalSearchParams } from 'expo-router';
import { EDITABLE_REQUEST_STATUSES, requestActionError, useMyRequest, useUpdateRequest } from '@/lib/queries';
import { RequestForm } from '@/components/request-form';
import { Body, Loading, Screen } from '@/components/ui';

export default function EditRequest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useMyRequest(id);
  const update = useUpdateRequest(id);
  const r = request.data;

  if (!r) return <Screen edges={['bottom']}><Loading /></Screen>;
  if (!EDITABLE_REQUEST_STATUSES.includes(r.status)) {
    return (
      <Screen edges={['bottom']}>
        <Body>A garage has already quoted on this request, so it can no longer be edited. If the details have changed, delete it and post a new one.</Body>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <RequestForm
        initial={{
          vehicleId: r.vehicle_id,
          serviceCategoryId: r.service_category_id ?? '',
          problemCategoryId: r.problem_category_id ?? '',
          title: r.title,
          description: r.description,
          urgency: r.urgency,
          locationTown: r.location_town ?? '',
          locationCounty: r.location_county ?? '',
          collectionRequired: r.collection_required,
          budgetAmount: r.budget_amount != null ? String(r.budget_amount) : '',
          expectedCompletionDate: r.expected_completion_date ?? '',
        }}
        allowPhotos={false}
        submitLabel="Save changes"
        pending={update.isPending}
        submitError={update.isError ? requestActionError(update.error) : null}
        onSubmit={(data) => update.mutate(data, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
