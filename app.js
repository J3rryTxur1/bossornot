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

  if (navigator.clipboard) {

    navigator.clipboard.writeText(text)
      .then(() => {
        console.log("Copied:", text);
      })
      .catch((err) => {
        console.error("Copy failed:", err);
      });

  }

}


/* =========================================
   FORM ELEMENTS
========================================= */

const form =
  document.getElementById("payform");

const msg =
  document.getElementById("msg");


/* =========================================
   FORM CHECK
========================================= */

if (!form) {

  console.error(
    "Payment form #payform not found."
  );

} else {


  /* =======================================
     SUBMIT FORM
  ======================================= */

  form.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      /* =====================================
         INITIAL MESSAGE
      ===================================== */

      if (msg) {

        msg.textContent =
          "Submitting...";

      }


      try {


        /* ===================================
           GET NAME
        =================================== */

        const nameEl =
          document.getElementById("name");

        const name =
          nameEl
            ? nameEl.value.trim()
            : "";


        /* ===================================
           GET EMAIL
        =================================== */

        const emailEl =
          document.getElementById("email");

        const email =
          emailEl
            ? emailEl.value.trim()
            : "";


        /* ===================================
           GET SLIP
        =================================== */

        const fileInput =
          document.getElementById("slip");

        const file =
          fileInput &&
          fileInput.files
            ? fileInput.files[0]
            : null;


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

        let id = "";

        if (
          window.crypto &&
          crypto.randomUUID
        ) {

          id =
            "WC-" +
            crypto
              .randomUUID()
              .slice(0, 8)
              .toUpperCase();

        } else {

          id =
            "WC-" +
            Math.random()
              .toString(36)
              .substring(2, 10)
              .toUpperCase();

        }


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
           STORAGE PATH
        =================================== */

        const path =
          `${id}-${Date.now()}.${ext}`;


        /* ===================================
           1. UPLOAD SLIP
        =================================== */

        msg.textContent =
          "Slip တင်နေပါတယ်...";


        const uploadController =
          new AbortController();


        const uploadTimeout =
          setTimeout(
            () => uploadController.abort(),
            30000
          );


        let uploadResponse;


        try {

          uploadResponse =
            await fetch(

              `${cfg.url}/storage/v1/object/payment-slips/${encodeURIComponent(path)}`,

              {
                method: "POST",

                headers: {

                  /*
                   * Supabase Storage
                   * Upload
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
                  uploadController.signal

              }

            );

        } finally {

          clearTimeout(
            uploadTimeout
          );

        }


        /* ===================================
           UPLOAD RESPONSE
        =================================== */

        if (!uploadResponse.ok) {

          let uploadError = "";

          try {

            uploadError =
              await uploadResponse.text();

          } catch {

            uploadError =
              "Unable to read upload error";

          }


          throw new Error(
            `Slip upload failed (${uploadResponse.status}): ${uploadError}`
          );

        }


        console.log(
          "Slip uploaded:",
          path
        );


        /* ===================================
           2. CREATE PAYMENT DATA
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


        console.log(
          "Payment row:",
          row
        );


        /* ===================================
           3. SAVE PAYMENT TO SUPABASE
        =================================== */

        const insertController =
          new AbortController();


        const insertTimeout =
          setTimeout(
            () => insertController.abort(),
            30000
          );


        let insertResponse;


        try {

          insertResponse =
            await fetch(

              `${cfg.url}/rest/v1/payments`,

              {

                method:
                  "POST",

                headers: {

                  /*
                   * IMPORTANT
                   *
                   * Publishable key ကို
                   * apikey header မှာပဲသုံးမယ်။
                   *
                   * Authorization:
                   * Bearer ...
                   *
                   * မထည့်ပါ။
                   */

                  apikey:
                    cfg.key,

                  "Content-Type":
                    "application/json",

                  Prefer:
                    "return=minimal"

                },

                body:
                  JSON.stringify(row),

                signal:
                  insertController.signal

              }

            );

        } finally {

          clearTimeout(
            insertTimeout
          );

        }


        /* ===================================
           4. CHECK DATABASE RESPONSE
        =================================== */

        if (!insertResponse.ok) {

          let dbError = "";

          try {

            dbError =
              await insertResponse.text();

          } catch {

            dbError =
              "Unable to read database error";

          }


          console.error(
            "Supabase INSERT error:",
            insertResponse.status,
            dbError
          );


          throw new Error(
            `Payment save failed (${insertResponse.status}): ${dbError}`
          );

        }


        /* ===================================
           5. SUCCESS
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
            amount: 50000,
            method: selectedMethod,
            slip_path: path
          }
        );


      } catch (err) {


        /* ===================================
           CONSOLE ERROR
        =================================== */

        console.error(
          "Payment Error:",
          err
        );


        /* ===================================
           TIMEOUT
        =================================== */

        if (
          err.name ===
          "AbortError"
        ) {

          msg.innerHTML = `

            <b>❌ Request Timeout</b><br><br>

            Server ကိုချိတ်ဆက်တာ
            အချိန်ကြာသွားပါတယ်။<br>

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
          err.message ===
          "Failed to fetch"
        ) {

          msg.innerHTML = `

            <b>❌ Server Connection Error</b><br><br>

            Supabase server ကို
            ချိတ်ဆက်လို့မရပါ။<br><br>

            ခဏစောင့်ပြီး ထပ်စမ်းပါ။

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
