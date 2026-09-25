const cfg = {
  url: "https://kmtuecypckhhdsonuvnu.supabase.co",
  key: "sb_publishable_l-Ek3faVssYGENChtAKoPw_ZJyDi7uK"
};

function copyText(id) {
  navigator.clipboard.writeText(
    document.getElementById(id).textContent
  );
}

const form = document.getElementById("payform");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  msg.textContent = "Submitting...";

  try {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const file = document.getElementById("slip").files[0];

    if (!name) {
      msg.textContent = "Name ထည့်ပါ";
      return;
    }

    if (!email) {
      msg.textContent = "Email ထည့်ပါ";
      return;
    }

    if (!file) {
      msg.textContent = "Slip ရွေးပါ";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      msg.textContent = "Slip file size 5MB အောက် ဖြစ်ရပါမယ်";
      return;
    }

    const id =
      "WC-" +
      crypto.randomUUID().slice(0, 8).toUpperCase();

    const ext =
      file.name.includes(".")
        ? file.name.split(".").pop().toLowerCase()
        : "jpg";

    const path = `${id}-${Date.now()}.${ext}`;

    // =========================
    // 1. Upload payment slip
    // =========================

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let up;

    try {
      up = await fetch(
        `${cfg.url}/storage/v1/object/payment-slips/${path}`,
        {
          method: "POST",
          headers: {
            apikey: cfg.key,
            Authorization: `Bearer ${cfg.key}`,
            "Content-Type": file.type || "image/jpeg",
            "x-upsert": "false"
          },
          body: file,
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!up.ok) {
      const errorText = await up.text();
      throw new Error(
        `Slip upload failed (${up.status}): ${errorText}`
      );
    }

    // =========================
    // 2. Save payment request
    // =========================

    const row = {
      order_id: id,
      name: name,
      email: email,
      amount: 50000,
      method: "KPay",
      slip_path: path,
      status: "pending"
    };

    const ins = await fetch(
      `${cfg.url}/rest/v1/payments`,
      {
        method: "POST",
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(row)
      }
    );

    if (!ins.ok) {
      const errorText = await ins.text();
      throw new Error(
        `Payment save failed (${ins.status}): ${errorText}`
      );
    }

    // =========================
    // Success
    // =========================

    form.reset();

    msg.innerHTML = `
      <b>✓ Payment submitted</b><br>
      Order ID: ${id}<br>
      ငွေဝင်ရောက်မှု စစ်ဆေးပြီးမှ Certificate ထုတ်ပေးပါမယ်။
    `;

  } catch (err) {

    console.error("Payment Error:", err);

    if (err.name === "AbortError") {
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
