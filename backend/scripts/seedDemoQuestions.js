import 'dotenv/config';
import mongoose from 'mongoose';

import Product from '../models/Product.js';
import Question from '../models/Question.js';
import User from '../models/User.js';

/**
 * Real questions on real products, answered by the vendor who actually sells
 * them.
 *
 *   npm run seed:demo-questions
 *
 * Without this the Q&A section and the vendor queue are both working and both
 * empty, which is indistinguishable from broken.
 *
 * ## What these questions are, and aren't
 *
 * Every one below can be **answered from the listing itself** — the RAM and
 * storage are in the product name, "Dual SIM" is in the name, a PSN card says
 * its region, a charger says UK plug, a power bank says its capacity. That's
 * deliberate, and it's the same rule the rest of this app follows: nothing
 * here promises a warranty term, a delivery window or a returns period,
 * because none of those exist behind the copy. `warranty` is empty on all 901
 * products, so a seeded answer quoting one would be inventing shop policy and
 * putting it in a seller's mouth.
 *
 * Which is also why these are the *realistic* questions. What a shopper
 * actually asks on a Kenyan electronics listing is "is it dual SIM", "is that
 * the UK three-pin", "will this toner fit my printer", "is the PSN card the
 * right region" — questions about the thing, asked because the spec line is
 * dense and they want a human to confirm it.
 *
 * ## Shape of the seeded data
 *
 * - Askers are the demo customer and the five review accounts, never the
 *   product's own vendor (the API refuses that, and it would be a testimonial
 *   with extra steps).
 * - Answers come from the product's real `vendor`, so the "Seller" badge on
 *   the product page belongs to the account that actually holds the listing.
 * - Roughly a third are left **unanswered on purpose**, spread so every vendor
 *   has something waiting — an empty queue can't show what the queue is for.
 *
 * Idempotent: a product that already carries a question is skipped.
 */

/**
 * `match` picks a product whose name fits the question, so "does it come with
 * the UK plug" doesn't land on a PS5 game. Where it's absent, any product in
 * the category will do.
 *
 * `exclude` is the other half of that, and it earns its keep: `/ps5/i` alone
 * matched a *PS5 charging cable* and asked whether it was a disc or a download
 * code, and `/toner|ink/i` matched an *ink tank printer* and asked which
 * printers it fits. A keyword that appears in both the thing and its accessory
 * needs the accessory ruled out.
 *
 * `answer: null` leaves it for the vendor queue.
 */
const QUESTIONS = {
  smartphones: [
    {
      match: /dual sim/i,
      body: 'Is this the dual SIM version, or does the second slot take a memory card instead?',
      answer:
        "It's true dual SIM — two physical nano-SIM slots, both usable at once. There's no hybrid tray on this model, so the second slot isn't shared with storage.",
    },
    {
      match: /iphone/i,
      body: 'Is this an official unit with the Kenyan charger in the box, or an import?',
      answer:
        'Sealed retail unit, sold as listed. Apple ships this box without a wall plug — you get the USB-C cable only, so if you need a plug it has to be bought separately.',
    },
    {
      match: /iphone 1[67]/i,
      body: 'Can I use this on Safaricom with eSIM, or do I need the physical SIM?',
      answer: null,
    },
    {
      body: 'The listing shows the RAM and storage — is the storage expandable with an SD card?',
      answer:
        "No card slot on this one, so what's in the title is what you have. Pick the storage size you want up front.",
    },
    {
      match: /tecno|vivo|oneplus/i,
      body: 'Does it support the fast charger, and is that charger included?',
      answer: null,
    },
  ],

  computing: [
    {
      match: /toner|cartridge|ink bt/i,
      exclude: /printer/i,
      body: 'Which printers does this fit? I have a Brother HL model and I want to be sure before I order.',
      answer:
        "Check the cartridge code against your printer's manual — the code in the title is the one to match. If your manual lists it, it fits; Brother codes don't cross over between series.",
    },
    {
      match: /toner|cartridge/i,
      exclude: /printer/i,
      body: 'Is this the original Brother cartridge or a compatible one?',
      answer:
        'Genuine Brother, listed under the Brother brand. We do not stock refills or third-party compatibles for this code.',
    },
    {
      match: /macbook|laptop|hp/i,
      body: 'Is the RAM soldered, or can I upgrade it later?',
      answer: null,
    },
    {
      match: /macbook|spectre|pavilion/i,
      body: 'Does it come with Windows already installed, or is that separate?',
      answer:
        'It ships with the operating system in the title already installed and activated — nothing extra to buy or set up before you can use it.',
    },
    {
      match: /laptop|macbook/i,
      body: 'Is the keyboard backlit?',
      answer: null,
    },
  ],

  gaming: [
    {
      match: /psn|wallet|card/i,
      body: 'This says USA — will it work on my Kenyan PSN account?',
      answer:
        'It only works on an account registered to the region in the title. A Kenyan account will reject a USA code, so you would need a USA account for this one.',
    },
    {
      match: /\(ps4\)/i,
      body: 'Will this PS4 disc play on a PS5?',
      answer:
        "Yes, on a PS5 with a disc drive — the digital edition has no drive, so it can't take a disc at all.",
    },
    {
      match: /\(ps5\)/i,
      exclude: /cable|charging|controller|headset|stand|cover/i,
      body: 'Is this the disc or a download code?',
      answer:
        "It's the physical disc in the retail case, not a code. The listing would say so if it were digital.",
    },
    {
      match: /call of duty|spiderman|last of us/i,
      body: 'Is it sealed, and is the disc region-free?',
      answer: null,
    },
    {
      match: /pub g|nioh|the last of us/i,
      body: 'Does this need PS Plus to play, or can I play it offline?',
      answer: null,
    },
  ],

  tablets: [
    {
      match: /wifi only/i,
      body: 'This says WiFi only — so there is no SIM slot at all?',
      answer:
        "Correct, no SIM slot on the WiFi model. If you need mobile data, the 5G version of the same iPad is listed separately — it's the same tablet otherwise.",
    },
    {
      match: /ipad/i,
      body: 'Does the Apple Pencil work with this one, and is it included?',
      answer:
        'The Pencil is sold separately — not in this box. Which Pencil generation pairs with it depends on the iPad model, so check that before buying one.',
    },
    {
      match: /ipad pro|ipad air/i,
      body: 'Can I get a keyboard case for it here?',
      answer: null,
    },
    {
      match: /kidpad|itel/i,
      body: 'What age is this suitable for, and does it have parental controls?',
      answer:
        "It's built for younger children — the educational software is preloaded and the launcher is locked down, so a child can't wander out into the general settings.",
    },
    {
      match: /samsung tab|ipad a16/i,
      body: 'Is the charger in the box?',
      answer: null,
    },
  ],

  accessories: [
    {
      match: /uk|plug|charger|adapter/i,
      body: 'Is this the UK three-pin plug, or do I need an adapter?',
      answer:
        "UK three-pin, which is the standard socket here — it goes straight into a Kenyan wall socket with no adapter.",
    },
    {
      match: /power bank|mah/i,
      body: 'Can this charge a laptop, or is it phones only?',
      answer:
        'Phones, earbuds and similar. The USB-A output on it is not enough for a laptop that charges over USB-C power delivery.',
    },
    {
      match: /power bank/i,
      body: 'How many full phone charges would I get from it?',
      answer:
        "Depends on your phone's battery — divide the capacity in the title by your battery size and take off roughly a fifth for conversion loss. On a typical 5000mAh phone that's a bit over one and a half charges.",
    },
    {
      match: /headphone|earbud|neckband|speaker|airpod/i,
      body: 'Does it work with both Android and iPhone?',
      answer:
        'Yes — it pairs over standard Bluetooth, so anything with Bluetooth will find it. Nothing on it is tied to one platform.',
    },
    {
      match: /watch|smartwatch/i,
      exclude: /cable|charger|strap|band\b/i,
      body: 'Does it need a phone app, and is that app available in Kenya?',
      answer: null,
    },
    {
      match: /mouse|keyboard/i,
      body: 'Is it rechargeable or does it take AA batteries?',
      answer: null,
    },
    {
      match: /microphone|lavalier/i,
      body: 'Will this plug into a phone directly, or does it need an adapter?',
      answer: null,
    },
  ],
};

const ASKER_EMAILS = [
  'demo.customer@bazaarke.dev',
  'wanjiku.reviews@bazaarke.dev',
  'brian.reviews@bazaarke.dev',
  'aisha.reviews@bazaarke.dev',
  'kevin.reviews@bazaarke.dev',
  'naomi.reviews@bazaarke.dev',
];

/** Backdated so the queue's "waiting N days" badge has something to show. */
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/bazaarke';
  await mongoose.connect(uri);

  const askers = await User.find({ email: { $in: ASKER_EMAILS } }).select('_id email').lean();
  if (askers.length === 0) {
    console.error('No demo accounts — run `npm run seed:demo-users` first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await Question.countDocuments();
  if (existing > 0) {
    console.log(`${existing} questions already exist — leaving them alone.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const used = new Set();
  let created = 0;
  let unanswered = 0;
  let askerIndex = 0;
  let age = 11;

  for (const [category, templates] of Object.entries(QUESTIONS)) {
    for (const template of templates) {
      // A product that fits the question, and that nothing has been asked
      // about yet — one question per product keeps the seeded data looking
      // like a catalogue rather than a thread.
      const filter = {
        category,
        isActive: { $ne: false },
        vendor: { $ne: null },
        _id: { $nin: [...used] },
        // One `name` key, both conditions inside it. Spreading two separate
        // `{ name: … }` objects looked equivalent and wasn't — the second
        // key replaced the first, so a template with an `exclude` lost its
        // `match` entirely and matched anything that merely wasn't excluded.
        // That is how a question about toner cartridges ended up on an HP
        // laptop.
        ...(template.match || template.exclude
          ? {
              name: {
                ...(template.match ? { $regex: template.match } : {}),
                ...(template.exclude ? { $not: template.exclude } : {}),
              },
            }
          : {}),
      };

      // No blind fallback for a targeted question: one that misses is one
      // whose whole point was the product it was aimed at, and dropping it on
      // an arbitrary row is how a PS5 cable gets asked about disc regions.
      const product = await Product.findOne(filter).select('_id name vendor').lean();

      if (!product) continue;
      used.add(product._id);

      // Never the seller of the thing being asked about.
      let asker = askers[askerIndex % askers.length];
      askerIndex += 1;
      if (String(asker._id) === String(product.vendor)) {
        asker = askers[askerIndex % askers.length];
        askerIndex += 1;
      }

      const askedAt = daysAgo(age);
      age = age > 1 ? age - 1 : 9;

      const question = new Question({
        product: product._id,
        vendor: product.vendor,
        user: asker._id,
        body: template.body,
        answers: template.answer
          ? [
              {
                body: template.answer,
                author: product.vendor,
                authorRole: 'vendor',
                // A day after it was asked, so the thread reads in order.
                createdAt: new Date(askedAt.getTime() + 86400000),
              },
            ]
          : [],
      });

      // `timestamps` would stamp today over the backdating above.
      question.createdAt = askedAt;
      question.updatedAt = askedAt;
      await question.save({ timestamps: false });

      created += 1;
      if (!template.answer) unanswered += 1;

      console.log(
        `  ${template.answer ? '✓' : '·'} ${category.padEnd(12)} ${product.name.slice(0, 52)}`,
      );
    }
  }

  // The demo vendor is the account someone signs in as to look at the queue,
  // so it must not be the one vendor with nothing waiting.
  const demoVendor = await User.findOne({ email: 'demo.vendor@bazaarke.dev' }).select('_id').lean();
  const demoWaiting = demoVendor
    ? await Question.countDocuments({ vendor: demoVendor._id, isAnswered: false })
    : 0;

  console.log(
    `\n${created} questions across ${Object.keys(QUESTIONS).length} categories — ` +
      `${created - unanswered} answered, ${unanswered} waiting on a seller.`,
  );
  if (demoVendor) {
    console.log(
      demoWaiting > 0
        ? `demo.vendor@bazaarke.dev has ${demoWaiting} waiting at /dashboard/vendor/questions.`
        : 'demo.vendor@bazaarke.dev has none waiting — the other vendors hold the unanswered ones.',
    );
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
