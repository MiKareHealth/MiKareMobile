// supabase/functions/feedback-email/index.ts
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";
import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const client = new SMTPClient({
  connection: {
    hostname: Deno.env.get("SMTP_HOST")!,
    port: Number(Deno.env.get("SMTP_PORT") || "465"),
    tls: true, // implicit TLS for port 465
    auth: {
      username: Deno.env.get("SMTP_USER")!,
      password: Deno.env.get("SMTP_PASS")!,
    },
  },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const { name, feedback } = await req.json();
    if (!name || !feedback) {
      return new Response("Invalid payload", { status: 400, headers: corsHeaders });
    }

    // Basic input hardening
    const safeName = String(name).slice(0, 200);
    const safeFeedback = String(feedback).slice(0, 5000);

    await client.send({
      from: Deno.env.get("SMTP_FROM")!,
      to: Deno.env.get("SMTP_TO")!,
      subject: "New app feedback",
      content: `From: ${safeName}\n\n${safeFeedback}`,
      html: `<p><strong>From:</strong> ${safeName}</p><pre style="white-space:pre-wrap">${safeFeedback}</pre>`,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response("Failed to send email", { status: 502, headers: corsHeaders });
  }
});
