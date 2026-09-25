function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}


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


    // -----------------------------
    // APPROVE
    // -----------------------------

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


      return json({

        ok: true,

        message:
          "Payment approved",

        certificate_id:
          certificateId,

        payment:
          rows[0]

      });

    }


    // -----------------------------
    // REJECT
    // -----------------------------

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
