// functions/[[path]].js
/**
 * Fungsi untuk menangani pembuatan link pendek baru (POST requests).
 * @param {object} context - Konteks permintaan dari Cloudflare.
 */
async function handleCreateLink({ request, env }) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    return new Response("Body JSON tidak valid", { status: 400 });
  }
  const { longUrl, customSlug } = requestBody;
  if (!longUrl) {
    return new Response(JSON.stringify({ error: "longUrl diperlukan" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  let shortCode;
  if (customSlug) {
    shortCode = customSlug;
    const existingUrl = await env.URL_STORE.get(shortCode);
    if (existingUrl) {
      return new Response(JSON.stringify({ error: "URL kustom ini sudah digunakan." }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    let isUnique = false;
    while (!isUnique) {
      shortCode = generateRandomString(6);
      const existingUrl = await env.URL_STORE.get(shortCode);
      if (!existingUrl) {
        isUnique = true;
      }
    }
  }
  await env.URL_STORE.put(shortCode, longUrl);
  const baseUrl = new URL(request.url).origin;
  const shortUrl = `${baseUrl}/${shortCode}`;
  return new Response(JSON.stringify({ shortUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Fungsi untuk menangani pengalihan URL pendek (GET requests).
 * @param {object} context - Konteks permintaan dari Cloudflare.
 */
async function handleRedirect({ request, env }) {
  const url = new URL(request.url);
  const shortCode = url.pathname.slice(1);
  if (!shortCode) {
    return new Response("Kode pendek tidak valid.", { status: 400 });
  }
  const longUrl = await env.URL_STORE.get(shortCode);
  if (longUrl === null) {
    return new Response("URL pendek tidak ditemukan.", { status: 404 });
  }
  return Response.redirect(longUrl, 302);
}

/**
 * Fungsi bantuan untuk menghasilkan string acak.
 * @param {number} length - Panjang string yang diinginkan.
 */
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Fungsi utama yang menangani semua permintaan (router).
 * @param {object} context - Konteks permintaan dari Cloudflare.
 */
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // Rute 1: Tangani permintaan pembuatan link baru
    if (request.method === "POST" && url.pathname === "/api/links") {
        return handleCreateLink(context);
    }
    
    // Rute 2: Tangani permintaan pengalihan link
    if (request.method === "GET") {
        // Jika path adalah root ('/'), atau dimulai dengan '/api/',
        // jangan coba redirect, biarkan Pages yang menanganinya.
        if (url.pathname === '/' || url.pathname.startsWith('/api/')) {
            // Lanjutkan ke penanganan file statis oleh Pages
        } else {
            // Jika path bukan root dan bukan API, asumsikan itu adalah short code dan coba redirect.
            return handleRedirect(context);
        }
    }
    
    // Jika tidak ada rute yang cocok di atas, teruskan permintaan ke Cloudflare Pages
    // untuk menyajikan file statis dari folder /public (seperti index.html, style.css).
    return context.next();
}
