function base64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


function fromBase64url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");

  while (str.length % 4) {
    str += "=";
  }

  const binary = atob(str);

  return Uint8Array.from(
    binary,
    c => c.charCodeAt(0)
  );
}


async function makeToken(password) {

  const timestamp = Date.now().toString();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(timestamp)
  );

  return `${timestamp}.${base64url(new Uint8Array(signature))}`;
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


function json(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
        "Cache-Control":
          "no-store"
      }
    }
  );
}


// ===============================
// ADMIN LOGIN
// POST /api/admin
// ===============================

export async function onRequestPost(ctx) {

  try {

    const body =
      await ctx.request.json();

    const password =
      body?.password;

    if (!password) {

      return json(
        {
          ok: false,
          message:
            "Password required"
        },
        400
      );
    }

    if (!ctx.env.ADMIN_PASSWORD) {

      return json(
        {
          ok: false,
          message:
            "ADMIN_PASSWORD is not configured"
        },
        500
      );
    }

    if (
      password !==
      ctx.env.ADMIN_PASSWORD
    ) {

      return json(
        {
          ok: false,
          message:
            "Invalid password"
        },
        401
      );
    }

    const token =
      await makeToken(
        ctx.env.ADMIN_PASSWORD
      );

    return json({
      ok: true,
      token
    });

  } catch (err) {

    return json(
      {
        ok: false,
        message:
          err.message ||
          "Login error"
      },
      500
    );
  }
}


// ===============================
// GET PAYMENT LIST + SLIP URL
// GET /api/admin
// ===============================

export async function onRequestGet(ctx) {

  try {

    // ---------------------------
    // CHECK ADMIN TOKEN
    // ---------------------------

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
          message:
            "Unauthorized"
        },
        401
      );
    }

    const token =
      auth.slice(7);

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


    // ---------------------------
    // GET PAYMENTS
    // ---------------------------

    const url =
      `${ctx.env.SUPABASE_URL}` +
      `/rest/v1/payments` +
      `?select=` +
      `id,order_id,name,email,amount,method,` +
      `slip_path,status,certificate_id,` +
      `created_at,approved_at` +
      `&order=created_at.desc`;


    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            apikey:
              ctx.env.SUPABASE_SECRET_KEY
          }
        }
      );


    const text =
      await response.text();


    if (!response.ok) {

      return json(
        {
          ok: false,
          message:
            "Supabase error",
          details:
            text
        },
        response.status
      );
    }


    const payments =
      JSON.parse(text);


    // ---------------------------
    // CREATE SIGNED SLIP URLS
    // ---------------------------

    for (
      const payment of payments
    ) {

      if (
        !payment.slip_path
      ) {
        payment.slip_url = null;
        continue;
      }


      try {

        const signUrl =
          `${ctx.env.SUPABASE_URL}` +
          `/storage/v1/object/sign/` +
          `payment-slips/` +
          encodeURIComponent(
            payment.slip_path
          );


        const signResponse =
          await fetch(
            signUrl,
            {
              method: "POST",

              headers: {
                apikey:
                  ctx.env.SUPABASE_SECRET_KEY,

                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                expiresIn: 600
              })
            }
          );


        const signText =
          await signResponse.text();


        if (!signResponse.ok) {

          payment.slip_url = null;

          payment.slip_error =
            signText;

          continue;
        }


        const signed =
          JSON.parse(signText);


        if (
          signed.signedURL
        ) {

          payment.slip_url =
            `${ctx.env.SUPABASE_URL}` +
            `/storage/v1` +
            signed.signedURL;

        } else {

          payment.slip_url =
            null;
        }

      } catch (err) {

        payment.slip_url = null;

        payment.slip_error =
          err.message ||
          "Slip URL error";
      }
    }


    // ---------------------------
    // RETURN DATA
    // ---------------------------

    return json({
      ok: true,
      payments
    });


  } catch (err) {

    return json(
      {
        ok: false,
        message:
          err.message ||
          "Admin API error"
      },
      500
    );
  }
}
