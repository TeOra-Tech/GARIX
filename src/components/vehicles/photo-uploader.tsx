'use client';

import { useRef } from 'react';
import { useSetVehiclePhoto } from '@/lib/vehicles/care';
import { VehicleAvatar } from '@/components/dashboard/customer-overview';

/** Vehicle "profile picture": avatar with an upload/replace control. */
export function VehiclePhotoUploader({
  vehicleId,
  photoPath,
  label,
}: {
  vehicleId: string;
  photoPath: string | null;
  label: string;
}) {
  const setPhoto = useSetVehiclePhoto(vehicleId);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <VehicleAvatar photoPath={photoPath} label={label} size="lg" />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Photo for ${label}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPhoto.mutate({ file, previousPath: photoPath });
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="text-sm font-semibold text-volt-bright hover:underline"
        disabled={setPhoto.isPending}
        onClick={() => fileRef.current?.click()}
      >
        {setPhoto.isPending ? 'Uploading…' : photoPath ? 'Change photo' : 'Add a photo'}
      </button>
      {setPhoto.isError && (
        <p role="alert" className="text-sm text-danger">
          {setPhoto.error instanceof Error ? setPhoto.error.message : 'Upload failed. Try again.'}
        </p>
      )}
    </div>
  );
}
