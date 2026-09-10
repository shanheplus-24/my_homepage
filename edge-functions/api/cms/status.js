import { handleOAuth } from '../../../scripts/cms/oauth.mjs';
export const onRequest = ({ request, env }) => handleOAuth(request, env);
