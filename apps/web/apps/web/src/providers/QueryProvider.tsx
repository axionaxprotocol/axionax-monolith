'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface Props {
  children: React.ReactNode;
}

export function QueryProvider({ children }: Props) {
  // สร้าง QueryClient instance ภายใน component เพื่อหลีกเลี่ยง sharing state ระหว่าง requests
  // ตาม Next.js 14+ best practices
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ตั้งค่า staleTime เพื่อลด refetch ที่ไม่จำเป็น
            staleTime: 60 * 1000, // 1 minute
            // ปิด refetch on window focus สำหรับ production
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
