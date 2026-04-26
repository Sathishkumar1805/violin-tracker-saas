// app/page.tsx — Root redirect
// The real auth check happens inside /dashboard and /parent.
import { redirect } from 'next/navigation';
export default function Home() {
  redirect('/dashboard');
}
