# Baby Poshak — Setup গাইড (GitHub + Firebase)

## ধাপ ১: Firebase প্রজেক্ট বানান
1. https://console.firebase.google.com এ যান → **Add project** → নাম দিন (যেমন `baby-poshak`)।
2. বাম মেনু থেকে **Build → Firestore Database** → **Create database** → **Start in production mode** সিলেক্ট করুন।
3. বাম মেনু থেকে **Build → Authentication** → **Get started** → **Email/Password** enable করুন।
4. Authentication → **Users** ট্যাবে গিয়ে নিজের admin ইমেইল/পাসওয়ার্ড দিয়ে একটা ইউজার তৈরি করুন — এটাই Admin প্যানেলে লগইনের জন্য ব্যবহার হবে।
5. **Project settings (⚙️)** → **General** → নিচে স্ক্রল করে **Add app → Web (</>)** → একটা nickname দিন → SDK config কপি করুন।
6. এই config দিয়ে `firebase-config.js` ফাইলের ভেতরের মানগুলো replace করুন।

## ধাপ ২: Firestore Security Rules
Firestore → **Rules** ট্যাবে গিয়ে এটা বসান:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // শুধু আপনার Admin ইমেইল। ইমেইল বদলালে এখানেও (ছোট হাতের অক্ষরে) বদলান
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email == 'rafiqbpi09@gmail.com';
    }

    match /products/{doc} {
      allow read: if true;
      allow create, delete: if isAdmin();
      allow update: if isAdmin()
        || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['stock','sold'])
            && request.resource.data.stock >= 0
            && request.resource.data.stock < resource.data.stock
            && resource.data.stock - request.resource.data.stock <= 20
            && request.resource.data.get('sold', 0) - resource.data.get('sold', 0) == resource.data.stock - request.resource.data.stock);
    }

    match /orders/{doc} {
      allow get: if true;
      allow list, delete: if isAdmin();
      allow update: if isAdmin()
        || (resource.data.status in ['Shipped','Delivered']
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['customerConfirmed','customerConfirmedAt'])
            && request.resource.data.customerConfirmed == true
            && request.resource.data.customerConfirmedAt == request.time
            && !('customerConfirmed' in resource.data));
      allow create: if doc.matches('BP-[A-Z0-9]{8}')
        && request.resource.data.keys().hasOnly(['name','phone','addr','pay','items','deliveryArea','deliveryCharge','total','status','history','createdAt','trxId'])
        && request.resource.data.status == 'Pending'
        && request.resource.data.createdAt == request.time
        && request.resource.data.name is string && request.resource.data.name.size() < 100
        && request.resource.data.phone is string && request.resource.data.phone.size() < 20
        && request.resource.data.addr is string && request.resource.data.addr.size() < 400
        && request.resource.data.total is number
        && request.resource.data.items is list && request.resource.data.items.size() <= 50
        && (request.resource.data.pay == 'Cash on Delivery' || ('trxId' in request.resource.data))
        && (!('trxId' in request.resource.data) || (request.resource.data.trxId is string && request.resource.data.trxId.size() >= 5 && request.resource.data.trxId.size() <= 40));
    }

    match /memos/{doc} {
      allow read, write: if isAdmin();
    }

    match /offers/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /banners/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /ticker/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /visits/{doc} {
      allow create: if request.resource.data.keys().hasOnly(['vid','at','device','ref','type','name','phone'])
        && request.resource.data.vid is string && request.resource.data.vid.size() <= 30
        && request.resource.data.at == request.time
        && request.resource.data.device in ['Mobile','Desktop','Tablet']
        && (!('ref' in request.resource.data) || (request.resource.data.ref is string && request.resource.data.ref.size() <= 60))
        && (!('type' in request.resource.data) || request.resource.data.type == 'order')
        && (!('name' in request.resource.data) || (request.resource.data.name is string && request.resource.data.name.size() <= 100))
        && (!('phone' in request.resource.data) || (request.resource.data.phone is string && request.resource.data.phone.size() <= 20));
      allow read, update, delete: if isAdmin();
    }
  }
}
```
এতে যেকেউ প্রোডাক্ট দেখতে পারবে, অর্ডার দিতে পারবে (এবং অর্ডারের সময় শুধু স্টক কমতে পারবে), কিন্তু শুধু লগইন করা Admin প্রোডাক্ট এডিট বা অর্ডার স্ট্যাটাস চেঞ্জ করতে পারবে।

## ধাপ ৩: GitHub এ আপলোড ও Pages এ হোস্ট করা
1. GitHub এ নতুন একটা repository বানান (যেমন `baby-poshak`)।
2. `index.html` (কাস্টমার পেজ), `admin.html` (শুধু আপনার জন্য Admin পেজ), `invoice.html` (অর্ডারের মেমো/ইনভয়েস পেজ) এবং `firebase-config.js` — এই চারটা ফাইল রিপোতে আপলোড করুন।
   - কাস্টমার লিংক: `https://yourusername.github.io/baby-poshak/`
   - Admin লিংক: `https://yourusername.github.io/baby-poshak/admin.html` (এই লিংক কাস্টমারদের দেবেন না, শুধু নিজে বুকমার্ক করে রাখুন)
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → branch: `main`, folder: `/root` → **Save**।
4. কিছুক্ষণ পর একটা লিংক পাবেন — যেমন `https://yourusername.github.io/baby-poshak/` — এটাই আপনার লাইভ অ্যাপ, সবার জন্য একই ডেটা শেয়ার হবে।

## প্রাথমিক প্রোডাক্ট
প্রথমবার Firestore এ কোনো প্রোডাক্ট থাকবে না — Admin লগইন করে "+ নতুন প্রোডাক্ট" দিয়ে যোগ করে নিন।

## নোট
- Admin প্যানেলে ঢুকতে Firebase Authentication এ বানানো ইমেইল/পাসওয়ার্ড লাগবে।
- পেমেন্ট (bKash/Nagad) এখানে শুধু "মেথড সিলেক্ট" — আসল পেমেন্ট গেটওয়ে ইন্টিগ্রেশন আলাদা এবং তাদের নিজস্ব merchant account/API লাগবে; আপাতত অর্ডার WhatsApp এ পাঠিয়ে ম্যানুয়ালি কনফার্ম করার ব্যবস্থা আছে।


## Firebase নিরাপত্তা চেকলিস্ট (একবার করে নিন)
1. **নতুন অ্যাকাউন্ট খোলা বন্ধ করুন:** Firebase Console → Authentication → Settings → User actions → "Enable create (sign-up)" বন্ধ করুন। নাহলে যে কেউ আপনার সাইটের পাবলিক API key দিয়ে নিজে অ্যাকাউন্ট খুলে ফেলতে পারে।
2. **Rules এ Admin ইমেইল:** উপরের Rules এ আপনার Admin ইমেইল (`rafiqbpi09@gmail.com`) বসানো আছে। Admin ইমেইল বদলালে এখানেও ছোট হাতের অক্ষরে বদলে Publish করুন।
3. **API key সীমিত করুন:** Google Cloud Console → APIs & Services → Credentials → Browser key → Application restrictions: HTTP referrers → `https://rafiqbpi09-cyber.github.io/*`।
4. **খরচ নজরে রাখুন:** Firebase Console → Usage এ দেখুন। ফ্রি (Spark) প্ল্যানে দিনে ৫০,০০০ রিড ও ২০,০০০ রাইট ফ্রি। প্রতিটা ভিজিটে সব প্রোডাক্ট পড়া হয়, তাই প্রোডাক্ট বেশি হলে ভিজিটর বাড়লে সীমা পার হতে পারে।
