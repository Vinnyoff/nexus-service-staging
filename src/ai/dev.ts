
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-ticket-report-summary.ts';
import '@/ai/flows/optimize-technician-routes.ts';
import '@/ai/flows/plan-preventive-routes.ts';
import '@/ai/flows/interactive-report-flow.ts';
import '@/ai/flows/fetch-whatsapp-groups.ts';
