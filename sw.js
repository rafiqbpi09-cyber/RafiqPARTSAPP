// ============================================================
// KILL-SWITCH SERVICE WORKER
// ============================================================
// পুরনো sw.js (rafiqparts-v1) সব fetch cache-first ভাবে সার্ভ করত এবং
// কখনো নিজে থেকে network-এ যেত না — তাই যেই ডিভাইসে এটা একবার install
// হয়ে গেছে, সেই ডিভাইস চিরস্থায়ীভাবে পুরনো index.html-এ আটকে থাকত,
// নতুন কোনো index.html কখনো ডাউনলোডই হতো না (নতুন কোড কখনো চালুই হতো না,
// তাই index.html-এর ভেতরের auto-update সিস্টেমও কখনো কাজ করার সুযোগ পেত না)।
//
// এই ফাইলটি সেই পুরনো worker-কে replace করে এবং একবার activate হয়েই
// নিজে-নিজেকে ধ্বংস করে দেয়: সব cache মুছে ফেলে, নিজেকে unregister করে,
// এবং যেসব ট্যাব/অ্যাপ এর দ্বারা controlled ছিল সেগুলোকে force-reload করে।
// এরপর থেকে সেই ডিভাইস আর কোনো service worker দ্বারা controlled থাকবে না —
// সব request সরাসরি network/HTTP-তে যাবে, ঠিক যেভাবে ভালোভাবে কাজ করা
// ডিভাইসে (Mobile 1) হচ্ছে।
//
// ⚠️ এই ফাইলটি ডিলিট করবেন না বা repo থেকে সরাবেন না — পুরনো আটকে থাকা
// ডিভাইসগুলোর জন্য এটাই একমাত্র "রিকভারি পথ"। ব্রাউজার/WebView নিজে থেকেই
// (সাধারণত পরবর্তী app ওপেনে, সর্বোচ্চ ~২৪ ঘণ্টার মধ্যে) এই নতুন sw.js
// ফাইলটি চেক করে পুরনো worker-কে এটা দিয়ে replace করবে — কোনো uninstall,
// reinstall, বা manual cache clear ছাড়াই।

self.addEventListener('install', () => {
  // পুরনো worker-এর জন্য অপেক্ষা না করে সাথে সাথে নিজেকে activate করার চেষ্টা করবে
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // ধাপ ১: এই origin-এর সব Cache Storage entry মুছে ফেলা (পুরনো cached
      // index.html সহ) — যাতে পরের request গুলো বাধ্য হয়ে network-এ যায়
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }

    try {
      // ধাপ ২: নিজেকে unregister করে দেওয়া, যাতে ভবিষ্যতে আর কোনো
      // request-ই এই worker দ্বারা intercept না হয়
      await self.registration.unregister();
    } catch (e) { /* ignore */ }

    try {
      // ধাপ ৩: যেসব ট্যাব/APK window এই worker দ্বারা controlled ছিল,
      // সেগুলোকে একই URL-এ force-navigate করানো — ফলে সেগুলো এখন সম্পূর্ণ
      // fresh network fetch দিয়ে লেটেস্ট index.html লোড করবে (যেটার ভেতরে
      // ইতিমধ্যে থাকা version-check সিস্টেম এরপর থেকে নিজে থেকেই কাজ করবে)
      const allClients = await self.clients.matchAll({ type: 'window' });
      allClients.forEach((client) => {
        try { client.navigate(client.url); } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }
  })());
});

// ইচ্ছাকৃতভাবে কোনো 'fetch' event listener যোগ করা হয়নি —
// এর মানে এই worker কোনো request-ই intercept/cache করবে না;
// activate সম্পন্ন হওয়ার আগ পর্যন্তও সব request স্বাভাবিকভাবে
// browser-এর নিজস্ব network handling দিয়েই চলে যাবে।
