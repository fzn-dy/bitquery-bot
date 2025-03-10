import { Hono } from "hono";
import { Telegraf } from "telegraf";
import { fetchNewTokens } from "./bitquery";
import { TELEGRAM_BOT_TOKEN, MARKET_CAP_THRESHOLD } from "./config";

const app = new Hono();
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
let subscribers: number[] = [];

const webhookPath = `/bot${TELEGRAM_BOT_TOKEN}`;
const webhookUrl = `https://bot-bitquery.funffufufafa.workers.dev${webhookPath}`;

// Bot Start Command
bot.start((ctx) => {
  console.log("✅ Bot received /start command from:", ctx.chat.id);

  ctx.reply("🚀 Selamat datang di Solana Market Bot! Anda akan menerima notifikasi jika ada token baru dengan market cap > 50K USD.")
    .then(() => console.log(`📨 Welcome message sent to ${ctx.chat.id}`))
    .catch((error) => console.error(`❌ Failed to send welcome message:`, error));

  if (!subscribers.includes(ctx.chat.id)) {
    subscribers.push(ctx.chat.id);
    console.log(`✅ Added new subscriber: ${ctx.chat.id}`);
  } else {
    console.log(`⚠️ Subscriber ${ctx.chat.id} already exists`);
  }
});

// Fungsi untuk mengecek token baru
const checkNewTokens = async () => {
  console.log("🔍 Checking for new tokens...");

  try {
    console.log("⏳ Fetching new tokens...");
    const tokens = await fetchNewTokens();

    if (!tokens || tokens.length === 0) {
      console.log("⚠️ No new tokens found.");
      return;
    }

    let foundTokens = false;

    tokens.forEach((token) => {
      const { Buy, Sell, Dex } = token.Trade;
      if (Buy.PriceInUSD >= MARKET_CAP_THRESHOLD) {
        foundTokens = true;

        const message = `🔥 Token Baru di Solana!
        
💰 **Nama:** ${Buy.Currency.Name} (${Buy.Currency.Symbol})
📈 **Market Cap:** $${Buy.PriceInUSD.toLocaleString()}
💳 **Mint Address:** ${Buy.Currency.MintAddress}
🔄 **DEX:** ${Dex.ProtocolName}
        
🚀 Segera cek sebelum terlambat!`;

        subscribers.forEach((chatId) => {
          console.log(`📤 Sending message to chat ID: ${chatId}`);
          bot.telegram.sendMessage(chatId, message, { parse_mode: "Markdown" })
            .then(() => console.log(`✅ Message sent to ${chatId}`))
            .catch((error) => console.error(`❌ Failed to send message to ${chatId}:`, error));
        });
      }
    });

    if (!foundTokens) {
      console.log("⚠️ No tokens met the MARKET_CAP_THRESHOLD.");
    }
  } catch (error) {
    console.error("❌ Error in checkNewTokens:", error);
  }
};

// Cloudflare Worker Routes
app.get("/", (c) => c.text("Solana Market Bot is Running"));

// Endpoint untuk mengecek token baru secara manual
app.get("/check-tokens", async (c) => {
  await checkNewTokens();
  return c.text("✅ Token check executed.");
});

// Set webhook hanya saat Worker pertama kali dipanggil
app.get("/set-webhook", async (c) => {
  console.log("⚙️ Setting Telegram Webhook...");
  const res = await bot.telegram.setWebhook(webhookUrl);
  console.log("✅ Webhook Response:", res);
  return c.text("Webhook set successfully!");
});

app.get("/subscribers", (c) => {
  console.log("📋 Fetching subscribers list...");
  return c.json({ subscribers });
});

// Tambahkan route untuk menerima update dari Telegram
app.post(webhookPath, async (c) => {
  const body = await c.req.json();
  console.log("📩 Incoming Telegram Update:", JSON.stringify(body, null, 2));
  
  if (!body.message || !body.message.text) {
    console.log("⚠️ Update does not contain a message or text");
    return c.json({ success: false, message: "No valid message received" });
  }

  console.log(`🔍 Processing message from chat ID: ${body.message.chat.id}`);

  try {
    console.log(`🔍 Handling update for chat ID: ${body.message.chat.id}, Message: ${body.message.text}`);
    await bot.handleUpdate(body);
    console.log("✅ bot.handleUpdate executed successfully");
  } catch (error) {
    console.error("❌ Error in bot.handleUpdate:", error);
  }

  return c.json({ success: true });
});

// Final Export
export default {
  async fetch(req, env, ctx) {
    return app.fetch(req, env, ctx);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkNewTokens());
  }
};