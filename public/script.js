// public/script.js

// 1. Pilih elemen-elemen HTML yang kita butuhkan
const form = document.getElementById('shorten-form');
const longUrlInput = document.getElementById('long-url');
const customSlugInput = document.getElementById('custom-slug');
const resultContainer = document.getElementById('result-container');
const resultDiv = document.getElementById('result');

// 2. Tambahkan event listener ke form saat disubmit
form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Mencegah form mengirimkan data dengan cara default browser

    // 3. Ambil nilai dari input
    const longUrl = longUrlInput.value;
    const customSlug = customSlugInput.value;

    // Tampilkan status loading (opsional)
    resultContainer.classList.remove('hidden');
    resultDiv.className = '';
    resultDiv.textContent = 'Memproses...';

    // 4. Buat objek data untuk dikirim ke backend
    const requestData = {
        longUrl: longUrl,
    };
    if (customSlug) {
        requestData.customSlug = customSlug;
    }

    try {
        // 5. Kirim permintaan ke API backend kita menggunakan fetch
        const response = await fetch('/api/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();

        // 6. Tangani respons dari server
        if (response.ok) { // Status HTTP 200-299
            displaySuccess(data.shortUrl);
        } else { // Status error
            displayError(data.error |

| 'Terjadi kesalahan yang tidak diketahui.');
        }
    } catch (error) {
        // Tangani jika ada error jaringan
        displayError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }
});

// Fungsi untuk menampilkan hasil sukses
function displaySuccess(shortUrl) {
    resultDiv.className = 'success';
    resultDiv.innerHTML = `URL pendek Anda: <a href="${shortUrl}" target="_blank">${shortUrl}</a>`;
}

// Fungsi untuk menampilkan pesan error
function displayError(message) {
    resultDiv.className = 'error';
    resultDiv.textContent = message;
}