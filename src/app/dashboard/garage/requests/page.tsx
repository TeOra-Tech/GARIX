import { redirect } from 'next/navigation';

// The request feed now lives inside each garage's dashboard.
export default function Page() {
  redirect('/dashboard/garages');
}
