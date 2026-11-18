// Vehicle photos: same private bucket and path convention as the web
// (vehicle-images/{owner_id}/{vehicle_id}/{uuid}.ext, signed URLs to show them).
import { Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { currentUserId, supabase } from '@/lib/supabase';
import { Button, ErrorText } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

const MAX_PHOTO_MB = 5;

/** Signed URL for the private vehicle photo; null when the vehicle has none. */
export function useVehiclePhotoUrl(photoPath: string | null | undefined) {
  return useQuery({
    queryKey: ['vehicle_photo', photoPath],
    enabled: !!photoPath,
    staleTime: 50 * 60 * 1000, // signed for 60 min
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage.from('vehicle-images').createSignedUrl(photoPath!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useSetVehiclePhoto(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ asset, previousPath }: { asset: ImagePicker.ImagePickerAsset; previousPath: string | null }) => {
      if (asset.fileSize && asset.fileSize > MAX_PHOTO_MB * 1024 * 1024) throw new Error('TOO_BIG');
      const uid = await currentUserId();
      const mime = asset.mimeType ?? 'image/jpeg';
      const ext = asset.fileName?.includes('.') ? asset.fileName.slice(asset.fileName.lastIndexOf('.')) : mime === 'image/png' ? '.png' : '.jpg';
      const path = `${uid}/${vehicleId}/${Math.random().toString(36).slice(2)}${Date.now()}${ext}`;
      const body = await (await fetch(asset.uri)).arrayBuffer();
      const up = await supabase.storage.from('vehicle-images').upload(path, body, { contentType: mime });
      if (up.error) throw up.error;
      const { error } = await supabase.from('vehicles').update({ photo_path: path }).eq('id', vehicleId);
      if (error) throw error;
      if (previousPath) await supabase.storage.from('vehicle-images').remove([previousPath]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicle_photo'] });
    },
  });
}

/** Round photo, or the first letter of the car's name when there's no photo. */
export function VehicleAvatar({ photoPath, label, size = 48 }: { photoPath: string | null | undefined; label: string; size?: number }) {
  const photo = useVehiclePhotoUrl(photoPath);
  const box = { width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: colors.line };
  if (photo.data) {
    return <Image source={{ uri: photo.data }} style={box} accessibilityLabel={`Photo of ${label}`} />;
  }
  return (
    <View style={[box, { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.4, color: colors.navy }}>
        {label.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase() || 'G'}
      </Text>
    </View>
  );
}

/** Large photo on the vehicle screen with an add / change button. */
export function VehiclePhoto({ vehicleId, photoPath, label }: { vehicleId: string; photoPath: string | null; label: string }) {
  const photo = useVehiclePhotoUrl(photoPath);
  const setPhoto = useSetVehiclePhoto(vehicleId);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    setPhoto.mutate({ asset: result.assets[0], previousPath: photoPath });
  }

  return (
    <View style={{ gap: 8 }}>
      {photo.data ? (
        <Image
          source={{ uri: photo.data }}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: colors.surface }}
          accessibilityLabel={`Photo of ${label}`}
        />
      ) : null}
      <Button title={photoPath ? 'Change photo' : 'Add a photo'} variant="secondary" onPress={pick} loading={setPhoto.isPending} />
      <ErrorText>
        {setPhoto.isError
          ? (setPhoto.error as Error).message === 'TOO_BIG'
            ? `Photos must be under ${MAX_PHOTO_MB} MB.`
            : 'Could not upload the photo. Try again.'
          : photo.isError
            ? 'Could not load the photo.'
            : null}
      </ErrorText>
    </View>
  );
}
