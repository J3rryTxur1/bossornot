function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}


// =================================
// BASE64 HELPERS
// =================================

function base64url(bytes) {
  let binary = "";

  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


function fromBase64url(str) {

  str = str
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (str.length % 4) {
    str += "=";
  }

  const binary = atob(str);

  return Uint8Array.from(
    binary,
    c => c.charCodeAt(0)
  );
}


// =================================
// VERIFY ADMIN TOKEN
// =================================

async function verifyToken(token, password) {

  try {

    const [timestamp, signature] =
      token.split(".");

    if (!timestamp || !signature) {
      return false;
    }

    const age =
      Date.now() - Number(timestamp);

    // Token expires after 8 hours
    if (
      age < 0 ||
      age > 8 * 60 * 60 * 1000
    ) {
      return false;
    }

    const key =
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        {
          name: "HMAC",
          hash: "SHA-256"
        },
        false,
        ["sign"]
      );

    const expected =
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(timestamp)
      );

    const actual =
      fromBase64url(signature);

    if (
      actual.length !==
      expected.byteLength
    ) {
      return false;
    }

    const expectedBytes =
      new Uint8Array(expected);

    let diff = 0;

    for (
      let i = 0;
      i < expectedBytes.length;
      i++
    ) {
      diff |=
        expectedBytes[i] ^
        actual[i];
    }

    return diff === 0;

  } catch {

    return false;

  }
}


// =================================
// ESCAPE HTML
// =================================

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// =================================
// SEND CERTIFICATE EMAIL
// =================================

async function sendCertificateEmail(
  ctx,
  email,
  name,
  certificateId
) {

  const certificateUrl =
    "https://bossornot.pages.dev/certificate.html?id=" +
    encodeURIComponent(certificateId);

  const safeName =
    escapeHtml(name);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="
  margin:0;
  padding:30px 15px;
  background:#f1f3f6;
  font-family:Arial,sans-serif;
">

  <div style="
    max-width:600px;
    margin:auto;
    background:#ffffff;
    border-radius:16px;
    padding:35px 25px;
    text-align:center;
    box-shadow:0 8px 30px rgba(0,0,0,.08);
  ">

    <h1 style="
      margin:0 0 8px;
      font-size:30px;
      letter-spacing:2px;
    ">
      BOSSORNOT
    </h1>

    <p style="
      color:#888;
      letter-spacing:2px;
      font-size:12px;
    ">
      VERIFIED CERTIFICATE
    </p>

    <div style="
      margin:30px 0;
      padding:25px;
      border:2px solid #d4af37;
      border-radius:12px;
    ">

      <p style="
        margin:0 0 10px;
        color:#666;
      ">
        Congratulations!
      </p>

      <h2 style="
        margin:10px 0;
        font-size:28px;
      ">
        ${safeName}
      </h2>

      <p style="
        color:#666;
        line-height:1.6;
      ">
        Your BossOrNot Certificate has been successfully verified.
      </p>

      <p style="
        margin-top:20px;
        font-size:14px;
        color:#777;
      ">
        Certificate ID
      </p>

      <strong style="
        font-size:18px;
        letter-spacing:1px;
      ">
        ${escapeHtml(certificateId)}
      </strong>

    </div>

    <a
      href="${certificateUrl}"
      style="
        display:inline-block;
        background:#111111;
        color:#ffffff;
        text-decoration:none;
        padding:14px 28px;
        border-radius:8px;
        font-weight:bold;
        font-size:16px;
      "
    >
      View My Certificate
    </a>

    <p style="
      margin-top:30px;
      color:#999;
      font-size:12px;
      line-height:1.6;
    ">
      You can use this link anytime to view your verified certificate.
    </p>

  </div>

</body>
</html>
`;


  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${ctx.env.RESEND_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          from:
            "BossOrNot <onboarding@resend.dev>",

          to: [email],

          subject:
            "🏆 Your BossOrNot Certificate is Ready",

          html:
            html

        })
      }
    );


  const text =
    await response.text();


  if (!response.ok) {

    throw new Error(
      `Resend error (${response.status}): ${text}`
    );

  }


  const data =
    JSON.parse(text);

  return data;

}


// =================================
// APPROVE / REJECT PAYMENT
// POST /api/approve
// =================================

export async function onRequestPost(ctx) {

  try {

    // -----------------------------
    // CHECK ADMIN TOKEN
    // -----------------------------

    const auth =
      ctx.request.headers.get(
        "Authorization"
      ) || "";

    if (
      !auth.startsWith("Bearer ")
    ) {

      return json(
        {
          ok: false,
          message: "Unauthorized"
        },
        401
      );

    }


    const token =
      auth.slice(7);


    if (
      !ctx.env.ADMIN_PASSWORD
    ) {

      return json(
        {
          ok: false,
          message:
            "ADMIN_PASSWORD is not configured"
        },
        500
      );

    }


    const valid =
      await verifyToken(
        token,
        ctx.env.ADMIN_PASSWORD
      );


    if (!valid) {

      return json(
        {
          ok: false,
          message:
            "Invalid or expired token"
        },
        401
      );

    }


    // -----------------------------
    // READ REQUEST
    // -----------------------------

    const body =
      await ctx.request.json();

    const orderId =
      body?.order_id;

    const action =
      body?.action;


    if (!orderId) {

      return json(
        {
          ok: false,
          message:
            "order_id is required"
        },
        400
      );

    }


    if (
      action !== "approve" &&
      action !== "reject"
    ) {

      return json(
        {
          ok: false,
          message:
            "action must be approve or reject"
        },
        400
      );

    }


    // =================================
    // APPROVE
    // =================================

    if (action === "approve") {

      const certificateId =
        "BOSS-" +
        crypto
          .randomUUID()
          .slice(0, 8)
          .toUpperCase();


      const url =
        `${ctx.env.SUPABASE_URL}` +
        `/rest/v1/payments` +
        `?order_id=eq.` +
        encodeURIComponent(orderId);


      const response =
        await fetch(
          url,
          {
            method: "PATCH",

            headers: {
              apikey:
                ctx.env.SUPABASE_SECRET_KEY,

              "Content-Type":
                "application/json",

              Prefer:
                "return=representation"
            },

            body: JSON.stringify({

              status:
                "approved",

              certificate_id:
                certificateId,

              approved_at:
                new Date().toISOString()

            })
          }
        );


      const text =
        await response.text();


      if (!response.ok) {

        return json(
          {
            ok: false,
            message:
              "Supabase update error",
            details:
              text
          },
          response.status
        );

      }


      const rows =
        JSON.parse(text);


      if (!rows.length) {

        return json(
          {
            ok: false,
            message:
              "Order not found"
          },
          404
        );

      }


      const payment =
        rows[0];


      // -----------------------------
      // CHECK RESEND API KEY
      // -----------------------------

      if (!ctx.env.RESEND_API_KEY) {

        return json({

          ok: true,

          message:
            "Payment approved, but RESEND_API_KEY is not configured",

          certificate_id:
            certificateId,

          email_sent:
            false,

          payment:
            payment

        });

      }


      // -----------------------------
      // SEND CERTIFICATE EMAIL
      // -----------------------------

      try {

        const emailResult =
          await sendCertificateEmail(
            ctx,
            payment.email,
            payment.name,
            certificateId
          );


        return json({

          ok: true,

          message:
            "Payment approved and certificate email sent",

          certificate_id:
            certificateId,

          email_sent:
            true,

          email_id:
            emailResult?.id || null,

          payment:
            payment

        });


      } catch (emailError) {

        return json({

          ok: true,

          message:
            "Payment approved, but certificate email failed",

          certificate_id:
            certificateId,

          email_sent:
            false,

          email_error:
            emailError.message,

          payment:
            payment

        });

      }

    }


    // =================================
    // REJECT
    // =================================

    if (action === "reject") {

      const url =
        `${ctx.env.SUPABASE_URL}` +
        `/rest/v1/payments` +
        `?order_id=eq.` +
        encodeURIComponent(orderId);


      const response =
        await fetch(
          url,
          {
            method: "PATCH",

            headers: {
              apikey:
                ctx.env.SUPABASE_SECRET_KEY,

              "Content-Type":
                "application/json",

              Prefer:
                "return=representation"
            },

            body: JSON.stringify({

              status:
                "rejected"

            })
          }
        );


      const text =
        await response.text();


      if (!response.ok) {

        return json(
          {
            ok: false,
            message:
              "Supabase update error",
            details:
              text
          },
          response.status
        );

      }


      const rows =
        JSON.parse(text);


      if (!rows.length) {

        return json(
          {
            ok: false,
            message:
              "Order not found"
          },
          404
        );

      }


      return json({

        ok: true,

        message:
          "Payment rejected",

        payment:
          rows[0]

      });

    }


  } catch (err) {

    return json(
      {
        ok: false,
        message:
          err.message ||
          "Approve API error"
      },
      500
    );

  }

}
