/* =========================================================
   BOSSORNOT PAYMENT APP
========================================================= */

const cfg = {
  url: "https://kmtuecypkchhdsonuvnu.supabase.co",
  key: "sb_publishable_l-Ek3faVssYGENChtAKoPw_ZJyDi7uK"
};


/* =========================================================
   START
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("payform");
  const msg = document.getElementById("msg");
  const slipInput = document.getElementById("slip");
  const uploadBox = document.querySelector(".upload-box");
  const uploadText = document.querySelector(".upload-text strong");

  console.log("BossOrNot app.js loaded");


  /* =======================================================
     BASIC CHECK
  ======================================================= */

  if (!form) {
    console.error("Payment form not found: #payform");

    if (msg) {
      msg.innerHTML =
        "<b>❌ Payment form မတွေ့ပါ</b>";
    }

    return;
  }


  /* =======================================================
     COPY FUNCTION
  ======================================================= */

  window.copyText = function (id) {

    const el = document.getElementById(id);

    if (!el) {
      return;
    }

    const text = el.textContent.trim();

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Copied:", text);
        })
        .catch(() => {
          fallbackCopy(text);
        });

    } else {

      fallbackCopy(text);

    }

  };


  function fallbackCopy(text) {

    const textarea =
      document.createElement("textarea");

    textarea.value = text;

    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);

    textarea.select();

    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Copy failed:", err);
    }

    textarea.remove();

  }


  /* =======================================================
     FILE PICKER
  ======================================================= */

  if (uploadBox && slipInput) {

    uploadBox.addEventListener(
      "click",
      (e) => {

        /*
         * File input ကိုယ်တိုင်နှိပ်တာဆိုရင်
         * double trigger မဖြစ်အောင်ထားမယ်
         */

        if (e.target === slipInput) {
          return;
        }

        slipInput.click();

      }
    );

  }


  /* =======================================================
     FILE SELECTED
  ======================================================= */

  if (slipInput) {

    slipInput.addEventListener(
      "change",
      () => {

        const file =
          slipInput.files &&
          slipInput.files[0];

        if (!file) {

          if (uploadText) {
            uploadText.textContent =
              "Transfer Slip ရွေးပါ";
          }

          return;
        }


        /* FILE SIZE */

        if (
          file.size >
          5 * 1024 * 1024
        ) {

          if (msg) {

            msg.innerHTML = `
              <b>❌ File အရမ်းကြီးပါတယ်</b><br>
              5MB အောက် file ပဲ တင်နိုင်ပါတယ်။
            `;

          }

          slipInput.value = "";

          if (uploadText) {
            uploadText.textContent =
              "Transfer Slip ရွေးပါ";
          }

          return;
        }


        /* FILE TYPE */

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

          if (msg) {

            msg.innerHTML = `
              <b>❌ File type မမှန်ပါ</b><br>
              JPG, PNG, WEBP ပဲ တင်နိုင်ပါတယ်။
            `;

          }

          slipInput.value = "";

          if (uploadText) {
            uploadText.textContent =
              "Transfer Slip ရွေးပါ";
          }

          return;
        }


        /* SHOW FILE NAME */

        if (uploadText) {

          uploadText.textContent =
            file.name;

        }


        if (msg) {

          msg.innerHTML = `
            <span style="color:#f7c45c;">
              ✓ Slip ရွေးပြီးပါပြီ
            </span>
          `;

        }

        console.log(
          "Selected file:",
          file.name,
          file.size,
          file.type
        );

      }
    );

  }


  /* =======================================================
     PAYMENT FORM
  ======================================================= */

  form.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      /* ================================================
         RESET MESSAGE
      ================================================= */

      if (msg) {

        msg.innerHTML = `
          <span style="color:#f7c45c;">
            Processing...
          </span>
        `;

      }


      try {


        /* ================================================
           GET NAME
        ================================================= */

        const nameElement =
          document.getElementById("name");

        const name =
          nameElement
            ? nameElement.value.trim()
            : "";


        /* ================================================
           GET EMAIL
        ================================================= */

        const emailElement =
          document.getElementById("email");

        const email =
          emailElement
            ? emailElement.value.trim()
            : "";


        /* ================================================
           GET FILE
        ================================================= */

        const file =
          slipInput &&
          slipInput.files &&
          slipInput.files[0]
            ? slipInput.files[0]
            : null;


        /* ================================================
           VALIDATION
        ================================================= */

        if (!name) {

          showError(
            "Name ထည့်ပါ"
          );

          return;
        }


        if (!email) {

          showError(
            "Email Address ထည့်ပါ"
          );

          return;
        }


        if (!file) {

          showError(
            "Transfer Slip ရွေးပါ"
          );

          return;
        }


        /* ================================================
           EMAIL FORMAT
        ================================================= */

        const emailRegex =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!emailRegex.test(email)) {

          showError(
            "Email Address မှန်ကန်စွာ ထည့်ပါ"
          );

          return;
        }


        /* ================================================
           FILE SIZE
        ================================================= */

        if (
          file.size >
          5 * 1024 * 1024
        ) {

          showError(
            "Slip file size 5MB အောက် ဖြစ်ရပါမယ်"
          );

          return;
        }


        /* ================================================
           PAYMENT METHOD
        ================================================= */

        const selectedMethod =
          window.selectedPaymentMethod ||
          "KBZPay";


        /* ================================================
           CREATE ORDER ID
        ================================================= */

        let orderId;


        if (
          window.crypto &&
          typeof crypto.randomUUID ===
            "function"
        ) {

          orderId =
            "WC-" +
            crypto
              .randomUUID()
              .substring(0, 8)
              .toUpperCase();

        } else {

          orderId =
            "WC-" +
            Math.random()
              .toString(36)
              .substring(2, 10)
              .toUpperCase();

        }


        /* ================================================
           FILE EXTENSION
        ================================================= */

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


        /* ================================================
           STORAGE PATH
        ================================================= */

        const filePath =
          `${orderId}-${Date.now()}.${ext}`;


        /* ================================================
           STEP 1
           UPLOAD SLIP
        ================================================= */

        showLoading(
          "① Slip တင်နေပါတယ်..."
        );


        console.log(
          "Uploading:",
          filePath
        );


        const uploadUrl =
          `${cfg.url}/storage/v1/object/payment-slips/${encodeURIComponent(filePath)}`;


        let uploadResponse;


        try {

          uploadResponse =
            await fetch(
              uploadUrl,
              {
                method: "POST",

                headers: {

                  apikey:
                    cfg.key,

                  "Content-Type":
                    file.type ||
                    "image/jpeg",

                  "x-upsert":
                    "false"

                },

                body:
                  file
              }
            );

        } catch (uploadNetworkError) {

          console.error(
            "Storage network error:",
            uploadNetworkError
          );

          throw new Error(
            "Storage server ကို ချိတ်ဆက်လို့မရပါ"
          );

        }


        /* ================================================
           CHECK STORAGE RESPONSE
        ================================================= */

        if (!uploadResponse.ok) {

          let storageError = "";

          try {

            storageError =
              await uploadResponse.text();

          } catch {

            storageError =
              "Unknown Storage error";

          }


          console.error(
            "Storage error:",
            uploadResponse.status,
            storageError
          );


          throw new Error(
            `Slip upload failed (${uploadResponse.status})`
          );

        }


        console.log(
          "Slip upload successful:",
          filePath
        );


        /* ================================================
           STEP 2
           CREATE DATABASE ROW
        ================================================= */

        showLoading(
          "② Payment information သိမ်းနေပါတယ်..."
        );


        const paymentRow = {

          order_id:
            orderId,

          name:
            name,

          email:
            email,

          amount:
            50000,

          method:
            selectedMethod,

          slip_path:
            filePath,

          status:
            "pending"

        };


        console.log(
          "Database row:",
          paymentRow
        );


        const databaseUrl =
          `${cfg.url}/rest/v1/payments`;


        let databaseResponse;


        try {

          databaseResponse =
            await fetch(
              databaseUrl,
              {
                method: "POST",

                headers: {

                  /*
                   * IMPORTANT
                   *
                   * Supabase publishable key
                   * ကို apikey မှာပဲပို့မယ်။
                   */

                  apikey:
                    cfg.key,

                  "Content-Type":
                    "application/json",

                  Prefer:
                    "return=minimal"

                },

                body:
                  JSON.stringify(
                    paymentRow
                  )
              }
            );

        } catch (databaseNetworkError) {

          console.error(
            "Database network error:",
            databaseNetworkError
          );

          throw new Error(
            "Database server ကို ချိတ်ဆက်လို့မရပါ"
          );

        }


        /* ================================================
           CHECK DATABASE
        ================================================= */

        if (!databaseResponse.ok) {

          let databaseError = "";

          try {

            databaseError =
              await databaseResponse.text();

          } catch {

            databaseError =
              "Unknown database error";

          }


          console.error(
            "Database error:",
            databaseResponse.status,
            databaseError
          );


          throw new Error(
            `Payment save failed (${databaseResponse.status}): ${databaseError}`
          );

        }


        /* ================================================
           SUCCESS
        ================================================= */

        console.log(
          "Payment successfully submitted:",
          orderId
        );


        form.reset();


        if (uploadText) {

          uploadText.textContent =
            "Transfer Slip ရွေးပါ";

        }


        if (msg) {

          msg.innerHTML = `

            <div style="
              color:#f7c45c;
              font-weight:700;
              line-height:1.8;
            ">

              ✓ Payment submitted

            </div>

            <div style="
              margin-top:8px;
              color:#ccc;
              line-height:1.8;
            ">

              Payment Method:
              ${escapeHtml(selectedMethod)}
              <br>

              Order ID:
              <strong>
                ${escapeHtml(orderId)}
              </strong>

              <br><br>

              ငွေဝင်ရောက်မှု စစ်ဆေးပြီးမှ
              Certificate ထုတ်ပေးပါမယ်။

            </div>

          `;

        }


      } catch (error) {


        /* ================================================
           ERROR
        ================================================= */

        console.error(
          "Payment Error:",
          error
        );


        showError(
          error.message ||
          "Payment မအောင်မြင်ပါ"
        );

      }

    }
  );


  /* =======================================================
     HELPERS
  ======================================================= */

  function showLoading(text) {

    if (!msg) {
      return;
    }

    msg.innerHTML = `

      <div style="
        color:#f7c45c;
        font-weight:600;
        line-height:1.8;
      ">

        ${escapeHtml(text)}

      </div>

    `;

  }


  function showError(text) {

    if (!msg) {
      return;
    }

    msg.innerHTML = `

      <div style="
        color:#ff6b6b;
        font-weight:700;
        line-height:1.8;
      ">

        ❌ ${escapeHtml(text)}

      </div>

    `;

  }


  function escapeHtml(value) {

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }

});
