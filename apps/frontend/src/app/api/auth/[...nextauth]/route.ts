// Expose the shared NextAuth handlers through the App Router's GET and POST contract.
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
