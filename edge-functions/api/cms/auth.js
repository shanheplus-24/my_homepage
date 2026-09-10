import { handleOAuth } from '../../../scripts/cms/oauth.mjs';
export function onRequest(context) { return handleOAuth(context.request, context.env); }
export default onRequest;
