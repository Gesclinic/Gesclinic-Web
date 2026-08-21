declare module '@/components/ui/PageLayout' {
  import type { ReactNode } from 'react';

  interface Breadcrumb {
    label: string;
    path?: string | null;
  }

  interface PageLayoutProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: Breadcrumb[] | null;
    actions?: ReactNode;
    children?: ReactNode;
  }

  export default function PageLayout(props: PageLayoutProps): ReactNode;
}

declare module '@/hooks/useBreadcrumbs' {
  interface BreadcrumbInput {
    label: string;
    path?: string;
  }

  interface Breadcrumb {
    label: string;
    path: string | null;
  }

  export function useBreadcrumbs(custom: BreadcrumbInput[]): Breadcrumb[] | null;
}

declare module '@/contexts/SupabaseAuthContext' {
  import type { User } from '@supabase/supabase-js';

  interface AuthContextValue {
    user: User | null;
    loading: boolean;
    clinicId: string | null;
    currentRole: string | null;
    [key: string]: unknown;
  }

  export function useAuth(): AuthContextValue;
}

declare module '@/lib/customSupabaseClient' {
  import type { SupabaseClient } from '@supabase/supabase-js';

  export const supabase: SupabaseClient;
  export const customSupabaseClient: SupabaseClient;
}

declare module '@/lib/paymentMethodsConfig' {
  export const PAYMENT_METHODS: Record<string, string>;
  export const PAYMENT_METHOD_LABELS: Record<string, string>;
}

declare module '@/components/ui/button' {
  import type { ButtonHTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';

  interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
  }

  export const Button: ForwardRefExoticComponent<
    ButtonProps & RefAttributes<HTMLButtonElement>
  >;
}

declare module '@/components/ui/input' {
  import type { ForwardRefExoticComponent, InputHTMLAttributes, RefAttributes } from 'react';

  export const Input: ForwardRefExoticComponent<
    InputHTMLAttributes<HTMLInputElement> & RefAttributes<HTMLInputElement>
  >;
}

declare module '@/components/ui/select' {
  export const Select: typeof import('@radix-ui/react-select').Root;
  export const SelectGroup: typeof import('@radix-ui/react-select').Group;
  export const SelectValue: typeof import('@radix-ui/react-select').Value;
  export const SelectTrigger: typeof import('@radix-ui/react-select').Trigger;
  export const SelectContent: typeof import('@radix-ui/react-select').Content;
  export const SelectLabel: typeof import('@radix-ui/react-select').Label;
  export const SelectItem: typeof import('@radix-ui/react-select').Item;
  export const SelectSeparator: typeof import('@radix-ui/react-select').Separator;
}

declare module '@/components/ui/card' {
  import type { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

  type DivComponent = ForwardRefExoticComponent<
    HTMLAttributes<HTMLDivElement> & RefAttributes<HTMLDivElement>
  >;

  export const Card: DivComponent;
  export const CardHeader: DivComponent;
  export const CardContent: DivComponent;
  export const CardFooter: DivComponent;
  export const CardTitle: ForwardRefExoticComponent<
    HTMLAttributes<HTMLHeadingElement> & RefAttributes<HTMLHeadingElement>
  >;
  export const CardDescription: ForwardRefExoticComponent<
    HTMLAttributes<HTMLParagraphElement> & RefAttributes<HTMLParagraphElement>
  >;
}

declare module '@/components/ui/table' {
  import type { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

  export const Table: ForwardRefExoticComponent<
    HTMLAttributes<HTMLTableElement> & RefAttributes<HTMLTableElement>
  >;
  export const TableHeader: ForwardRefExoticComponent<
    HTMLAttributes<HTMLTableSectionElement> & RefAttributes<HTMLTableSectionElement>
  >;
  export const TableBody: typeof TableHeader;
  export const TableFooter: typeof TableHeader;
  export const TableRow: ForwardRefExoticComponent<
    HTMLAttributes<HTMLTableRowElement> & RefAttributes<HTMLTableRowElement>
  >;
  export const TableHead: ForwardRefExoticComponent<
    HTMLAttributes<HTMLTableCellElement> & RefAttributes<HTMLTableCellElement>
  >;
  export const TableCell: typeof TableHead;
  export const TableCaption: ForwardRefExoticComponent<
    HTMLAttributes<HTMLTableCaptionElement> & RefAttributes<HTMLTableCaptionElement>
  >;
}

declare module '@/components/ui/badge' {
  import type { HTMLAttributes, ReactNode } from 'react';

  interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }

  export function Badge(props: BadgeProps): ReactNode;
}