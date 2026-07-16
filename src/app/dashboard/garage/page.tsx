import { redirect } from 'next/navigation';

// The single-garage dashboard moved to per-garage dashboards.
export default function Page() {
  redirect('/dashboard/garages');
}
