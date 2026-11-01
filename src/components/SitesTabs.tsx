'use client';
/* Abas do menu "Sites": modelos premium e modelos/prévias no mesmo lugar. */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCan } from './Shell';

export function SitesTabs() {
  const path = usePathname();
  const can = useCan();
  const tabs: [string, string, string, string][] = [
    ['/modelos-premium', 'Modelos premium', 'Sites prontos que a IA personaliza para cada cliente', 'modelos_premium'],
    ['/modelos', 'Exemplos e prévias', 'Exemplos por nicho e a prévia automática', 'modelos'],
  ];
  return (
    <nav className="sites-tabs" aria-label="Sites">
      {tabs
        .filter(([, , , p]) => can(p))
        .map(([href, label, title]) => {
          const on = href === '/modelos' ? path === '/modelos' || (path.startsWith('/modelos/') && !path.startsWith('/modelos-premium')) : path.startsWith(href);
          return (
            <Link key={href} href={href} className={on ? 'on' : ''} title={title} aria-current={on ? 'page' : undefined}>
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
