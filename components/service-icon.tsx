import type { ComponentType, SVGProps } from 'react';
import {
  ActivityIcon,
  ApiIcon,
  DatabaseIcon,
  GlobeIcon,
  ServerIcon,
  ShieldIcon,
  StoreIcon,
} from './icons';

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  'data-center': ServerIcon,
  'public-api': ApiIcon,
  'seller-panel': StoreIcon,
  authentication: ShieldIcon,
  database: DatabaseIcon,
  website: GlobeIcon,
};

export function ServiceIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] ?? ActivityIcon;
  return <Icon className={className ?? 'h-4 w-4 shrink-0 text-muted'} />;
}
