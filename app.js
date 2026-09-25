const cfg = {
  url: "https://kmtuecypkchhdsonuvnu.supabase.co",
  key: "sb_publishable_l-Ek3faVssYGENChtAKoPw_ZJyDi7uK"
};


/* =========================================
   COPY ACCOUNT NUMBER
========================================= */

function copyText(id) {

  navigator.clipboard.writeText(
    document.getElementById(id).textContent.trim()
  );

}


/* =========================================
   FORM
========================================= */

const form =
  document.getElementById("payform");

const msg =
  document.getElementById("msg");


form.addEventListener("submit", async (e) => {

  e.preventDefault();

  msg.textContent =
    "Submitting...";


  try {

    /* =====================================
       FORM DATA
    ===================================== */

    const name =
      document
        .getElementById("name")
        .value
        .trim();


    const email =
      document
        .getElementById("email")
        .value
        .trim();


    const file =
      document
        .getElementById("slip")
        .files[0];


    /* =====================================
       VALIDATION
    ===================================== */

    if (!name) {

      msg.textContent =
        "Name ထည့်ပါ";

      return;

    }


    if (!email) {

      msg.textContent =
        "Email ထည့်ပါ";

      return;

    }


    if (!file) {

      msg.textContent =
        "Slip ရွေးပါ";

      return;

    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {

      msg.textContent =
        "Slip file size 5MB အောက် ဖြစ်ရပါမယ်";

      return;

    }


    /* =====================================
       SELECTED PAYMENT METHOD
       
       index.html က
       KBZPay / Wave Money
       ကို ဒီ variable ထဲထည့်ပေးထားမယ်
    ===================================== */

    const selectedMethod =
      window.selectedPaymentMethod ||
      "KBZPay";


    /* =====================================
       ORDER ID
    ===================================== */

    const id =
      "WC-" +
      crypto
        .randomUUID()
        .slice(0, 8)
        .toUpperCase();


    /* =====================================
       FILE EXTENSION
    ===================================== */

    const ext =
      file.name.includes(".")
        ? file.name
            .split(".")
            .pop()
            .toLowerCase()
        : "jpg";


    const path =
      `${id}-${Date.now()}.${ext}`;


    /* =====================================
       1. UPLOAD PAYMENT SLIP
    ===================================== */

    const controller =
      new AbortController();


    const timeout =
      setTimeout(
        () => controller.abort(),
        20000
      );


    let up;


    try {

      up = await fetch(

        `${cfg.url}/storage/v1/object/payment-slips/${path}`,

        {
          method: "POST",

          headers: {

            apikey:
              cfg.key,

            Authorization:
              `Bearer ${cfg.key}`,

            "Content-Type":
              file.type ||
              "image/jpeg",

            "x-upsert":
              "false"

          },

          body:
            file,

          signal:
            controller.signal

        }

      );

    } finally {

      clearTimeout(timeout);

    }


    /* =====================================
       CHECK UPLOAD
    ===================================== */

    if (!up.ok) {

      const errorText =
        await up.text();

      throw new Error(
        `Slip upload failed (${up.status}): ${errorText}`
      );

    }


    /* =====================================
       2. SAVE PAYMENT REQUEST
    ===================================== */

    const row = {

      order_id:
        id,

      name:
        name,

      email:
        email,

      amount:
        50000,

      /*
        IMPORTANT

        User ရွေးထားတဲ့ Payment Method ကို
        Database ထဲသိမ်းမယ်

        KBZPay
        OR
        Wave Money
      */

      method:
        selectedMethod,

      slip_path:
        path,

      status:
        "pending"

    };


    /* =====================================
       SAVE TO SUPABASE
    ===================================== */

    const ins =
      await fetch(

        `${cfg.url}/rest/v1/payments`,

        {

          method:
            "POST",

          headers: {

            apikey:
              cfg.key,

            Authorization:
              `Bearer ${cfg.key}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=minimal"

          },

          body:
            JSON.stringify(row)

        }

      );


    /* =====================================
       CHECK DATABASE SAVE
    ===================================== */

    if (!ins.ok) {

      const errorText =
        await ins.text();

      throw new Error(
        `Payment save failed (${ins.status}): ${errorText}`
      );

    }


    /* =====================================
       SUCCESS
    ===================================== */

    form.reset();


    msg.innerHTML = `

      <b>✓ Payment submitted</b><br>

      Payment Method:
      ${selectedMethod}<br>

      Order ID:
      ${id}<br>

      ငွေဝင်ရောက်မှု စစ်ဆေးပြီးမှ
      Certificate ထုတ်ပေးပါမယ်။

    `;


  } catch (err) {


    console.error(
      "Payment Error:",
      err
    );


    /* =====================================
       TIMEOUT
    ===================================== */

    if (
      err.name ===
      "AbortError"
    ) {

      msg.textContent =
        "Request timeout ဖြစ်သွားပါတယ်။ Internet connection ကိုစစ်ပြီး ထပ်စမ်းပါ။";

    } else {

      msg.innerHTML = `

        <b>❌ Payment မအောင်မြင်ပါ</b><br>

        ${err.message}

      `;

    }

  }

});
