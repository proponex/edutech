const https = require('https');
const fs = require('fs');
const path = require('path');

const ASSETS = {
  heroLaptop: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTHV0-W2MfgKEIbhq4_OpnH5jD5TCDZok98yhP3H-Gqb4ukaBBXgPEClazuvAQ_T6GdqZOWbM5ewNk1kfqABPrjTy1GHf69YAydaKT2D5f1k90HsY5_kkDo4dtjBVBVJb9KcVpTtB6-YVsJRwg2wFoF7jQraL7sbOFIgIVsys2fFBfgS200Plc6H-QD5IrIesLnhwiUJg9cRdV3VTYrSlWSz4OC-oJmP-TW-aCSpNHKY2KhFrb5mE6',
  heroBooks: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCo6Zt2dv-ZQGaevzZ3YQlQWRdG_DVzVMiLumDdgVTjz79xbZhXOTkYkDYU-WubIilR7Stu3oN7dfxBwarcNp13Vq0AhuTULo0M41flV0UcqBavkEsjGcfOfjtxh8U8vWWzArBkZcjpEjFxVNL4cTlP9J_9uVmiGCSvMDGRFhVqDVfBIntrV0iZ4NsxYgKxwIc6HHDc6WhqMst7QbkF9FcG652fZ2zXAll55Rw2ox4yd21o5rz6BuWv',
  centerpieceNarrative: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJ_zTfQOi9HGD8Si1beiOIT3Uy3k1_zNlg0_5PqjgKqsqYUoL9NuETTSaZU-JME0aNP3-E5vdjbg4_F8Nv8_AFbYApP0foElHjYO3t5Mo0NGMnjwSzbicyhjSD2cAU6vlS-6am3i3KBA3khrz4DMJE8_Ka42PFo0-2Eesd8ahX3VDyJM-pozKcw33ebmuU42CbUyw2cU-dQjI-ki3jB2KEHmg2ki72iYI4503zGQAqv8DZ2QDc2pYU',
  studyDesk: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNnxX-l24NI1MVcdklSlzZF5kMaPkzt0gQDz54HLyQ8Vc5ToIITsy6pslzW2Pee6SCB01ZxZ5vqT-D3QjlCF_LmOjmRW5mQfkXGnNpDghPkxcE_fRocW_jDeWmN7uX6B8RSW0o13IuNts6VtbD-sPUq7YPK8LJ5PkVYm_rT87Or0xbx2SP-r08SM-BPuJ8fr3JqZi_i3tNHJBKOv0g0U93LcMAXWmdhzbd_otZu-ZRStjbdZfZyVxs'
};

async function download(name, url) {
  const dest = path.join('scratch', name + '.png');
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        console.log('Downloaded', name);
        resolve(dest);
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const [name, url] of Object.entries(ASSETS)) {
    await download(name, url);
  }
}

main().catch(console.error);
