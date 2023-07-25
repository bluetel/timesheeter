import { useRouter } from 'next/router';
import { useCallback } from 'react';

export const useRefetchServersideProps = () => {
  const router = useRouter();

  const refetchServersideProps = useCallback(() => router.replace(router.asPath), [router]);

  return refetchServersideProps;
};
