// functions/api/links.js

/**
 * Fungsi utama yang menangani semua permintaan ke /api/links.
 * @param {object} context - Konteks permintaan, berisi request, env, dll.
 */
export async function onRequest(context) {
  // Memeriksa metode HTTP dari permintaan (GET, POST, dll.)
  if (context.request.method === "GET") {
    // Menangani permintaan pengalihan dari path URL
    // Contoh: 0on.qzz.io/my-slug -> akan ditangani di sini
    const url = new URL(context.request.url);
    if (url.pathname.startsWith('/api/links')) {
        // Permintaan GET ke endpoint API itu sendiri, bukan untuk redirect
        return new Response('Endpoint ini untuk membuat link pendek (POST) atau redirect (GET di root).', { status: 405 });
    }
    return await handleRedirect(context);
  }

  if (context.request.method === "POST") {
    // Menangani pembuatan link baru
    return await handleCreateLink(context);
  }

  // Jika metode bukan GET atau POST, kembalikan error
  return new Response("Metode tidak diizinkan", { status: 405 });
}

/**
 * Menangani pengalihan URL pendek.
 * @param {object} context - Konteks permintaan.
 */
async function handleRedirect({ request, env }) {
  const url = new URL(request.url);
  const shortCode = url.pathname.slice(1);

  if (!shortCode) {
    return new Response("Silakan masukkan kode pendek.", { status: 400 });
  }

  const longUrl = await env.URL_STORE.get(shortCode);

  if (longUrl === null) {
    return new Response("URL pendek tidak ditemukan.", { status: 404 });
  }

  return Response.redirect(longUrl, 302);
}

/**
 * Menangani pembuatan link pendek baru.
 * @param {object} context - Konteks permintaan.
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

  const shortUrl = `${new URL(request.url).origin}/${shortCode}`;

  return new Response(JSON.stringify({ shortUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
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

// Perbaikan pada onRequest untuk menangani GET ke root domain
export async function onRequestGet(context) {
    return await handleRedirect(context);
}

export async function onRequestPost(context) {
    const url = new URL(context.request.url);
    if (url.pathname === '/api/links') {
        return await handleCreateLink(context);
    }
    return new Response("Endpoint POST tidak ditemukan", { status: 404 });
}

// Menyesuaikan ekspor untuk Pages Functions agar lebih eksplisit
// Hapus `onRequest` utama dan gunakan `onRequestGet` dan `onRequestPost`
// Cloudflare Pages akan merutekan berdasarkan metode HTTP ke fungsi-fungsi ini
// Namun, untuk kesederhanaan dan kompatibilitas yang lebih luas, kita akan menggunakan satu file `_middleware.js`
// Untuk proyek ini, kita akan membuat file `functions/[[path]].js` untuk menangkap semua rute.

// Kode Final untuk `functions/[[path]].js`
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/links") {
        return handleCreateLink(context);
    }
    
    if (request.method === "GET") {
        // Jangan redirect jika path adalah untuk API atau file statis
        if (url.pathname.startsWith('/api/')) {
            return new Response('Endpoint tidak ditemukan', { status: 404 });
        }
        // Jika path bukan root, coba redirect
        if (url.pathname!== '/') {
            return handleRedirect(context);
        }
    }

    // Jika tidak ada yang cocok, biarkan Pages menyajikan file statis dari /public
    return context.next();
}