const cfg = {
  url: "https://kmtuecypkchhdsonuvnu.supabase.co",
  key: "sb_publishable_l-Ek3faVssYGENChtAKoPw_ZJyDi7uK"
};


/* =========================================
   COPY ACCOUNT NUMBER
========================================= */

function copyText(id) {

  const el = document.getElementById(id);

  if (!el) {
    return;
  }

  const text = el.textContent.trim();

  navigator.clipboard.writeText(text)
    .then(() => {
      console.log("Copied:", text);
    })
    .catch((err) => {
      console.error("Copy failed:", err);
    });

}


/* =========================================
   FORM ELEMENTS
========================================= */

const form =
  document.getElementById("payform");

const msg =
  document.getElementById("msg");


/* =========================================
   CHECK FORM
========================================= */

if (!form) {

  console.error(
    "Payment form #payform not found."
  );

} else {


  /* =======================================
     SUBMIT PAYMENT
  ======================================= */

  form.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      /* =====================================
         INITIAL MESSAGE
      ===================================== */

      msg.textContent =
        "Submitting...";


      try {


        /* ===================================
           GET FORM DATA
        =================================== */

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


        const fileInput =
          document.getElementById("slip");


        const file =
          fileInput?.files?.[0];


        /* ===================================
           VALIDATION
        =================================== */

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


        /* ===================================
           FILE SIZE
        =================================== */

        if (
          file.size >
          5 * 1024 * 1024
        ) {

          msg.textContent =
            "Slip file size 5MB အောက် ဖြစ်ရပါမယ်";

          return;

        }


        /* ===================================
           FILE TYPE
        =================================== */

        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp"
        ];


        if (
          file.type &&
          !allowedTypes.includes(file.type)
        ) {

          msg.textContent =
            "JPG, PNG, WEBP ပုံများသာ တင်နိုင်ပါတယ်";

          return;

        }


        /* ===================================
           PAYMENT METHOD
        =================================== */

        const selectedMethod =
          window.selectedPaymentMethod ||
          "KBZPay";


        /* ===================================
           ORDER ID
        =================================== */

        const id =
          "WC-" +
          crypto
            .randomUUID()
            .slice(0, 8)
            .toUpperCase();


        /* ===================================
           FILE EXTENSION
        =================================== */

        let ext = "jpg";


        if (
          file.name &&
          file.name.includes(".")
        ) {

          ext =
            file.name
              .split(".")
              .pop()
              .toLowerCase();

        }


        /* ===================================
           CLEAN EXTENSION
        =================================== */

        const allowedExtensions = [
          "jpg",
          "jpeg",
          "png",
          "webp"
        ];


        if (
          !allowedExtensions.includes(ext)
        ) {

          ext = "jpg";

        }


        /* ===================================
           STORAGE FILE PATH
        =================================== */

        const path =
          `${id}-${Date.now()}.${ext}`;


        /* ===================================
           1. UPLOAD PAYMENT SLIP
        =================================== */

        msg.textContent =
          "Slip တင်နေပါတယ်...";


        const controller =
          new AbortController();


        const timeout =
          setTimeout(
            () => controller.abort(),
            30000
          );


        let up;


        try {

          up = await fetch(

            `${cfg.url}/storage/v1/object/payment-slips/${encodeURIComponent(path)}`,

            {

              method:
                "POST",


              headers: {

                /*
                 * IMPORTANT
                 *
                 * Storage upload အတွက်
                 * publishable API key ကို
                 * apikey header ထဲမှာပဲ ပို့မယ်
                 */

                apikey:
                  cfg.key,


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


        /* ===================================
           CHECK UPLOAD RESPONSE
        =================================== */

        if (!up.ok) {

          let errorText = "";

          try {

            errorText =
              await up.text();

          } catch {

            errorText =
              "Unknown upload error";

          }


          throw new Error(
            `Slip upload failed (${up.status}): ${errorText}`
          );

        }


        /* ===================================
           2. CREATE PAYMENT RECORD
        =================================== */

        msg.textContent =
          "Payment information သိမ်းနေပါတယ်...";


        const row = {

          order_id:
            id,

          name:
            name,

          email:
            email,

          amount:
            50000,

          method:
            selectedMethod,

          slip_path:
            path,

          status:
            "pending"

        };


        /* ===================================
           SAVE TO SUPABASE
        =================================== */

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


        /* ===================================
           CHECK DATABASE RESPONSE
        =================================== */

        if (!ins.ok) {

          let errorText = "";

          try {

            errorText =
              await ins.text();

          } catch {

            errorText =
              "Unknown database error";

          }


          throw new Error(
            `Payment save failed (${ins.status}): ${errorText}`
          );

        }


        /* ===================================
           SUCCESS
        =================================== */

        form.reset();


        msg.innerHTML = `

          <b>✓ Payment submitted</b><br><br>

          Payment Method:
          ${selectedMethod}<br>

          Order ID:
          ${id}<br><br>

          ငွေဝင်ရောက်မှု စစ်ဆေးပြီးမှ
          Certificate ထုတ်ပေးပါမယ်။

        `;


        console.log(
          "Payment submitted successfully:",
          {
            order_id: id,
            name: name,
            email: email,
            method: selectedMethod,
            slip_path: path
          }
        );


      } catch (err) {


        /* ===================================
           ERROR LOG
        =================================== */

        console.error(
          "Payment Error:",
          err
        );


        /* ===================================
           TIMEOUT ERROR
        =================================== */

        if (
          err.name ===
          "AbortError"
        ) {

          msg.innerHTML = `

            <b>❌ Upload Timeout</b><br><br>

            Slip တင်တာ အချိန်ကြာသွားပါတယ်။<br>

            Internet connection ကိုစစ်ပြီး
            ထပ်စမ်းပါ။

          `;

          return;

        }


        /* ===================================
           NETWORK ERROR
        =================================== */

        if (
          err instanceof TypeError &&
          err.message === "Failed to fetch"
        ) {

          msg.innerHTML = `

            <b>❌ Slip Upload မအောင်မြင်ပါ</b><br><br>

            Server ကိုချိတ်ဆက်လို့မရပါ။<br>

            Internet connection ကိုစစ်ပြီး
            ခဏစောင့်ကာ ထပ်စမ်းပါ။

          `;

          return;

        }


        /* ===================================
           NORMAL ERROR
        =================================== */

        msg.innerHTML = `

          <b>❌ Payment မအောင်မြင်ပါ</b><br><br>

          ${err.message}

        `;

      }

    }
  );

}
