const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const fetch = require('node-fetch');

// =============================
// Configuration
// =============================
let config;
try {
  config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (err) {
  console.error("❌ Erreur : impossible de lire config.json");
  process.exit(1);
}

const token = config.token;
const dmMessage = config.dmMessage;

// =============================
// Couleurs console
// =============================
const red = "\x1b[31m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";

// =============================
// Utilitaires
// =============================

// Mélange aléatoire (Fisher-Yates)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Délai (promesse)
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Génère un délai aléatoire (ex: entre 3000ms et 7000ms)
function randomDelay(min = 3000, max = 7000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Vérifie si un utilisateur est ami
async function isFriend(userId) {
  try {
    const res = await fetch("https://discord.com/api/v9/users/@me/relationships", {
      headers: { "Authorization": token }
    });

    if (!res.ok) return false;

    const relationships = await res.json();
    return relationships.some(r => r.type === 1 && r.user.id === userId);
  } catch {
    return false;
  }
}

// =============================
// Client
// =============================
const client = new Client();

const asciiBanner = `
  _____   _____  _  _    ______  _____     
 |  __ \\ |___ / | || |  |  ____||  __ \\    
 | |  | |  |_ \\ | || |_ | |__   | |__) |   
 | |  | | ___) ||__   _||  __|  |  _  /    
 | |__| ||____/    | |  | |     | | \\ \\    
 |_____/           |_|  |_|     |_|  \\_\\   
`;

// =============================
// Evénements
// =============================
client.on('ready', async () => {
  console.log(`${green}[✅] Connecté en tant que ${client.user.tag}${reset}\n`);
  console.log(green + asciiBanner + reset);

  let usersToDM = [...client.users.cache.values()]
    .filter(user => !user.bot && user.id !== client.user.id);

  // 🔀 Mélange
  usersToDM = shuffle(usersToDM);

  const totalUsers = usersToDM.length;
  console.log(`${yellow}📩 Nombre de membres à traiter : ${totalUsers}${reset}\n`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const user of usersToDM) {
    const personalizedMessage = dmMessage.replace(/{user}/g, `<@${user.id}>`);
    const delay = randomDelay();

    // ✅ Vérifie si c'est un ami
    const friend = await isFriend(user.id);
    if (!friend) {
      console.log(`${yellow}[⏭️] Ignoré ${user.username} (pas dans tes amis)${reset}`);
      skippedCount++;
      continue;
    }

    try {
      await user.send(personalizedMessage);
      console.log(`${green}[✅] DM envoyé à ${user.username}${reset}`);
      successCount++;
    } catch {
      console.log(`${red}[❌] Impossible d’envoyer à ${user.username}${reset}`);
      failCount++;
    }

    // Attente aléatoire avant prochain DM
    console.log(`${yellow}⏳ Pause de ${(delay / 1000).toFixed(1)}s...${reset}`);
    await wait(delay);
  }

  console.log(`\n${green}✅ Succès : ${successCount}${reset}`);
  console.log(`${red}❌ Échecs : ${failCount}${reset}`);
  console.log(`${yellow}⏭️ Ignorés (non-amis) : ${skippedCount}${reset}`);
  console.log(`📊 Total traités : ${totalUsers}\n`);

  console.log(`${green}Déconnexion…${reset}`);
  await client.destroy();
  process.exit(0);
});

// =============================
// Connexion
// =============================
client.login(token).catch(err => {
  console.error(`${red}[❌] Impossible de se connecter. Vérifie ton token.${reset}`);
  console.error(err);
});
