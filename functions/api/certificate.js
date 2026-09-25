function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}


export async function onRequestGet(ctx) {

  try {

    const url =
      new URL(ctx.request.url);

    const certificateId =
      url.searchParams.get(
        "id"
      );


    if (!certificateId) {

      return json(
        {
          ok: false,
          message:
            "Certificate ID is required"
        },
        400
      );

    }


    const supabaseUrl =
      `${ctx.env.SUPABASE_URL}` +
      `/rest/v1/payments` +
      `?select=name,certificate_id,approved_at,status` +
      `&certificate_id=eq.` +
      encodeURIComponent(
        certificateId
      ) +
      `&status=eq.approved`;


    const response =
      await fetch(
        supabaseUrl,
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


    const rows =
      JSON.parse(text);


    if (!rows.length) {

      return json(
        {
          ok: false,
          message:
            "Certificate မတွေ့ပါ။"
        },
        404
      );

    }


    const payment =
      rows[0];


    return json({

      ok: true,

      certificate: {

        name:
          payment.name,

        certificate_id:
          payment.certificate_id,

        approved_at:
          payment.approved_at

      }

    });


  } catch (err) {

    return json(
      {
        ok: false,
        message:
          err.message ||
          "Certificate API error"
      },
      500
    );

  }

}
