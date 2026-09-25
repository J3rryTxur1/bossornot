export async function onRequestPost(ctx){
 const {request}=ctx;
 const auth=request.headers.get("Authorization")||"";
 if(!auth.startsWith("Bearer ")) return new Response("Unauthorized",{status:401});
 // Production implementation: verify the Supabase Auth JWT, then update the payment
 // with the service-role key kept only in Cloudflare secrets, and send email via Resend.
 return new Response(JSON.stringify({ok:false,message:"Configure SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY from README first."}),{status:501,headers:{"Content-Type":"application/json"}});
}