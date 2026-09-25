const cfg={url:"https://kmtuecypckhhdsonuvnu.supabase.co",key:"sb_publishable_l-Ek3faVssYGENChtAKoPw_ZJyDi7uK"};
function copyText(id){navigator.clipboard.writeText(document.getElementById(id).textContent)}
const form=document.getElementById("payform"),msg=document.getElementById("msg");
form.addEventListener("submit",async e=>{
 e.preventDefault(); msg.textContent="Submitting...";
 if(cfg.url.startsWith("YOUR_")){msg.textContent="Setup မပြီးသေးပါ။ README ထဲက Supabase settings ကို ထည့်ပါ။";return}
 const name=document.getElementById("name").value.trim(), email=document.getElementById("email").value.trim(), file=document.getElementById("slip").files[0];
 if(!file){msg.textContent="Slip ရွေးပါ";return}
 const id="WC-"+crypto.randomUUID().slice(0,8).toUpperCase(), path=`${id}-${Date.now()}.${file.name.split(".").pop()}`;
 const up=await fetch(`${cfg.url}/storage/v1/object/payment-slips/${path}`,{method:"POST",headers:{"apikey":cfg.key,"Authorization":"Bearer "+cfg.key,"Content-Type":file.type},body:file});
 if(!up.ok){msg.textContent="Slip upload မအောင်မြင်ပါ။ Supabase Storage setup ကိုစစ်ပါ။";return}
 const row={order_id:id,name,email,amount:50000,method:"KPay",slip_path:path,status:"pending"};
 const ins=await fetch(`${cfg.url}/rest/v1/payments`,{method:"POST",headers:{"apikey":cfg.key,"Authorization":"Bearer "+cfg.key,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(row)});
 if(!ins.ok){msg.textContent="Payment request မသိမ်းနိုင်ပါ။";return}
 form.reset();msg.innerHTML=`<b>✓ Payment submitted</b><br>Order ID: ${id}<br>ငွေဝင်ရောက်မှု စစ်ဆေးပြီးမှ Certificate ထုတ်ပေးပါမယ်။`;
});
