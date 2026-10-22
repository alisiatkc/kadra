import { env } from 'cloudflare:workers';
import { handleState } from '../../../lib/map-state.mjs';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>handleState(request,env.DB);
export const PUT=(request:Request)=>handleState(request,env.DB);
