import { redirect } from 'next/navigation';

// Quoting moved under the per-garage dashboard.
export default function Page() {
  redirect('/dashboard/garages');
}
