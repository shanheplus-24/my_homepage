import { handleAdmin } from '../../../scripts/admin/handler.mjs';
import snapshot from '../../../scripts/admin/snapshot.generated.mjs';
export const onRequest = ({request,env}) => handleAdmin(request,env ?? {},{snapshot:()=>snapshot});
export default onRequest;
