require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const schedule = require('node-schedule');
const User = require('./models/User');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

const positiveResponses = ['oui', 'yes', 'bien sûr', 'bien sur', 'ok', 'd\'accord', 'daccord', 'chaud', 'partant', 'go', 'ouais', 'yep', 'yeah'];
const negativeResponses = ['non', 'no', 'jamais', 'pas intéressé', 'pas interesse', 'arrête', 'arrete', 'stop'];

function isPositiveResponse(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase().trim();
  return positiveResponses.some(response => lowerText.includes(response));
}

function isNegativeResponse(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase().trim();
  return negativeResponses.some(response => lowerText.includes(response));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendAdminNotification(message) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId) {
    try {
      await bot.sendMessage(adminId, `🔔 ${message}`);
    } catch (error) {
      console.error('❌ Erreur notification admin:', error);
    }
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'ami';
  const username = msg.from.username || '';

  try {
    let user = await User.findOne({ chatId });
    
    if (!user) {
      user = new User({
        chatId,
        firstName,
        username,
        currentStage: 'initial'
      });
      await user.save();
    } else {
      user.firstName = firstName;
      user.username = username;
      user.currentStage = 'initial';
      user.hasResponded = false;
      user.responseType = 'none';
      user.lastMessageTime = new Date();
      await user.save();
    }

    await bot.sendVideo(chatId, process.env.VIDEO_START, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔥 Rejoindre le canal',
              url: 'https://t.me/+tPrtqmEX7otiMmM0'
            }
          ]
        ]
      }
    });
    console.log(`📹 Vidéo start envoyée à ${firstName} (${chatId})`);

    await sleep(15000);

    for (let i = 1; i <= 5; i++) {
      await bot.sendVideo(chatId, process.env[`VIDEO_TEMOIGNAGE_${i}`]);
      console.log(`📹 Vidéo témoignage ${i} envoyée à ${firstName}`);
      await sleep(1000);
    }

    user.currentStage = 'sent_testimonials';
    await user.save();

    await sleep(30000);

    await bot.sendMessage(chatId, "Du coup, voulez-vous gagner avec nous ?? 💰");
    console.log(`💬 Message question envoyé à ${firstName}`);

    user.currentStage = 'sent_question';
    user.lastMessageTime = new Date();
    await user.save();

    scheduleFollowup1(chatId, firstName);

  } catch (error) {
    console.error('❌ Erreur dans /start:', error);
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text && text.startsWith('/')) return;

  try {
    const user = await User.findOne({ chatId });
    if (!user) return;

    if (user.currentStage === 'followup_3') {
      if (isPositiveResponse(text) && !user.hasResponded) {
        user.hasResponded = true;
        user.responseType = 'positive';
        user.currentStage = 'completed';
        user.linkSent = true;
        user.linkSentAt = new Date();
        await user.save();

        await bot.sendMessage(chatId, `Voici le lien d'inscription : ${process.env.LINK_REGISTER} 🚀`);
        console.log(`🔗 Lien d'inscription envoyé à ${user.firstName} (${chatId})`);
        
        await sendAdminNotification(`💰 CONVERSION! ${user.firstName} (@${user.username || 'pas de username'}) a reçu le lien d'inscription (étape: followup_3)`);
      } else if (isNegativeResponse(text) && !user.hasResponded) {
        user.hasResponded = true;
        user.responseType = 'negative';
        user.currentStage = 'completed';
        await user.save();
        console.log(`❌ Réponse négative finale de ${user.firstName} (${chatId})`);
      }
      return;
    }

    if (user.currentStage === 'sent_question' || user.currentStage === 'awaiting_response' || 
        user.currentStage === 'followup_1' || user.currentStage === 'followup_2') {
      
      if (isPositiveResponse(text)) {
        user.hasResponded = true;
        user.responseType = 'positive';
        user.currentStage = 'completed';
        await user.save();

        await bot.sendMessage(chatId, "Super ! 🎉 Veuillez m'envoyer un message privé et je te guide étape par étape ! 📩 @juzzpp");
        console.log(`✅ Réponse positive de ${user.firstName} (${chatId})`);
        
        await sendAdminNotification(`✅ Réponse OUI de ${user.firstName} (@${user.username || 'pas de username'}) - Étape: ${user.currentStage}`);
        
      } else if (isNegativeResponse(text)) {
        user.hasResponded = true;
        user.responseType = 'negative';
        user.currentStage = 'completed';
        await user.save();
        console.log(`❌ Réponse négative de ${user.firstName} (${chatId})`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur traitement message:', error);
  }
});

function scheduleFollowup1(chatId, firstName) {
  setTimeout(async () => {
    try {
      const user = await User.findOne({ chatId });
      if (!user || user.hasResponded) return;

      await bot.sendMessage(chatId, "T'es là ? 👋 Prends vite ta décision et on t'aide à gagner ! DM moi @juzzpp 💬");
      console.log(`⏰ Followup 1 (5min) envoyé à ${firstName}`);
      
      user.currentStage = 'followup_1';
      await user.save();

      scheduleFollowup2(chatId, firstName);
    } catch (error) {
      console.error('❌ Erreur followup 1:', error);
    }
  }, 5 * 60 * 1000);
}

function scheduleFollowup2(chatId, firstName) {
  setTimeout(async () => {
    try {
      const user = await User.findOne({ chatId });
      if (!user || user.hasResponded) return;

      await bot.sendMessage(chatId, `${firstName}, il ne reste que 10 places, mon VIP va être complet bientôt ! T'es chaud ? 🔥 Contacte-moi en DM maintenant !  @juzzpp💬`);
      console.log(`⏰ Followup 2 (30min) envoyé à ${firstName}`);
      
      user.currentStage = 'followup_2';
      await user.save();

      scheduleFollowup3(chatId, firstName);
    } catch (error) {
      console.error('❌ Erreur followup 2:', error);
    }
  }, 30 * 60 * 1000);
}

function scheduleFollowup3(chatId, firstName) {
  setTimeout(async () => {
    try {
      const user = await User.findOne({ chatId });
      if (!user || user.hasResponded) return;

      for (let i = 7; i <= 10; i++) {
        await bot.sendVideo(chatId, process.env[`VIDEO_FINAL_${i}`]);
        console.log(`📹 Vidéo finale ${i} envoyée à ${firstName}`);
        await sleep(1000);
      }

      await sleep(10000);

      await bot.sendMessage(chatId, `Salut ! On n'attend que toi ${firstName} ! 🎯 Voulais-tu que je t'envoie le lien de l'inscription ?? 🔗`);
      console.log(`⏰ Followup 3 (12h) envoyé à ${firstName}`);
      
      user.currentStage = 'followup_3';
      await user.save();

    } catch (error) {
      console.error('❌ Erreur followup 3:', error);
    }
  }, 12 * 60 * 60 * 1000);
}

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (chatId.toString() !== process.env.ADMIN_TELEGRAM_ID) {
    await bot.sendMessage(chatId, "❌ Commande réservée à l'administrateur.");
    return;
  }

  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ currentStage: { $ne: 'completed' } });
    const completedUsers = await User.countDocuments({ currentStage: 'completed' });
    const positiveResponses = await User.countDocuments({ responseType: 'positive' });
    const negativeResponses = await User.countDocuments({ responseType: 'negative' });
    const linksSent = await User.countDocuments({ linkSent: true });
    
    const stageBreakdown = await User.aggregate([
      { $group: { _id: '$currentStage', count: { $sum: 1 } } }
    ]);

    const conversionRate = totalUsers > 0 ? ((linksSent / totalUsers) * 100).toFixed(2) : 0;
    const positiveRate = totalUsers > 0 ? ((positiveResponses / totalUsers) * 100).toFixed(2) : 0;

    let statsMessage = `📊 *STATISTIQUES DU BOT*\n\n`;
    statsMessage += `👥 *Utilisateurs totaux:* ${totalUsers}\n`;
    statsMessage += `✅ *Parcours terminés:* ${completedUsers}\n`;
    statsMessage += `🔄 *Parcours en cours:* ${activeUsers}\n\n`;
    
    statsMessage += `💚 *Réponses positives:* ${positiveResponses} (${positiveRate}%)\n`;
    statsMessage += `❌ *Réponses négatives:* ${negativeResponses}\n\n`;
    
    statsMessage += `🔗 *Liens envoyés:* ${linksSent}\n`;
    statsMessage += `📈 *Taux de conversion:* ${conversionRate}%\n\n`;
    
    statsMessage += `📍 *Répartition par étape:*\n`;
    stageBreakdown.forEach(stage => {
      const stageNames = {
        'initial': '🔵 Initial',
        'sent_testimonials': '📹 Témoignages envoyés',
        'sent_question': '❓ Question posée',
        'awaiting_response': '⏳ En attente réponse',
        'followup_1': '⏰ Relance 5min',
        'followup_2': '⏰ Relance 30min',
        'followup_3': '⏰ Relance 12h',
        'completed': '✅ Terminé'
      };
      statsMessage += `${stageNames[stage._id] || stage._id}: ${stage.count}\n`;
    });

    await bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
    console.log('📊 Stats envoyées à l\'admin');
    
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    await bot.sendMessage(chatId, "❌ Erreur lors de la récupération des statistiques.");
  }
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  
  if (chatId.toString() !== process.env.ADMIN_TELEGRAM_ID) {
    await bot.sendMessage(chatId, "❌ Commande réservée à l'administrateur.");
    return;
  }

  const message = match[1];
  
  try {
    const users = await User.find({});
    let successCount = 0;
    let failCount = 0;

    await bot.sendMessage(chatId, `📢 Début de la diffusion à ${users.length} utilisateurs...`);

    for (const user of users) {
      try {
        await bot.sendMessage(user.chatId, message);
        successCount++;
        await sleep(100);
      } catch (error) {
        failCount++;
        console.error(`❌ Erreur envoi à ${user.chatId}:`, error.message);
      }
    }

    await bot.sendMessage(chatId, `✅ Diffusion terminée!\n\n✅ Succès: ${successCount}\n❌ Échecs: ${failCount}`);
    console.log(`📢 Broadcast terminé: ${successCount} succès, ${failCount} échecs`);
    
  } catch (error) {
    console.error('❌ Erreur broadcast:', error);
    await bot.sendMessage(chatId, "❌ Erreur lors de la diffusion.");
  }
});

console.log('🤖 Bot Telegram démarré avec succès !');

process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du bot...');
  await mongoose.connection.close();
  process.exit(0);
});
