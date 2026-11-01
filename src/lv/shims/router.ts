// @ts-nocheck
'use client';
/* Troca do react-router (Lovable) pelo roteamento do Next. */
import { useParams as useNextParams, useSearchParams as useNextSearch, useRouter, usePathname } from 'next/navigation';

export function useParams<T = Record<string, string>>(): T {
  return (useNextParams() || {}) as any;
}
export function useSearchParams(): [URLSearchParams, (p: URLSearchParams | Record<string, string>) => void] {
  const sp = useNextSearch();
  const router = useRouter();
  const path = usePathname();
  const set = (p: URLSearchParams | Record<string, string>) => {
    const q = p instanceof URLSearchParams ? p : new URLSearchParams(p);
    router.replace(`${path}?${q.toString()}`);
  };
  return [new URLSearchParams(sp?.toString() || ''), set];
}
export function useNavigate() {
  const router = useRouter();
  return (to: string | number) => (typeof to === 'number' ? router.back() : router.push(to));
}
