import { redirect } from 'next/navigation';

// Reviews now live inside each garage's dashboard.
export default function Page() {
  redirect('/dashboard/garages');
}
