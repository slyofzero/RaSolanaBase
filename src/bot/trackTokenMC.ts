import {
  cleanUpBotMessage,
  generateTextFooter,
  hardCleanUpBotMessage,
} from "@/utils/bot";
import { tokenMCTracking } from "@/vars/priceTracking";
import { trendingTokens } from "@/vars/trending";
import { teleBot } from "..";
import { CHANNEL_ID } from "@/utils/env";
import { errorHandler, log } from "@/utils/handlers";
import { formatM2Number } from "@/utils/general";
import { DEXSCREEN_URL } from "@/utils/constants";

export async function trackTokenMC() {
  if (!CHANNEL_ID) {
    return log("Channel ID or PINNED_MSG_ID is undefined");
  }

  // Checking prices for trending tokens and adding a token to tracking if not present
  for (const [index, [token, tokenData]] of trendingTokens.entries()) {
    const { fdv: currentMC, pairAddress } = tokenData;
    const tokenTrackingData = tokenMCTracking[token];
    if (!tokenTrackingData) {
      tokenMCTracking[token] = { initialMC: currentMC, pastBenchmark: 1 };
      continue;
    }

    const { initialMC, pastBenchmark } = tokenTrackingData;
    const exactIncrease = Number((currentMC / initialMC).toFixed(2));
    const increase = Math.floor(exactIncrease);
    const dexToolsLink = `https://www.dextools.io/app/en/base/pair-explorer/${pairAddress}`;
    const dexSLink = `${DEXSCREEN_URL}/base/${token}`;

    if (increase > pastBenchmark) {
      tokenMCTracking[token] = {
        ...tokenMCTracking[token],
        pastBenchmark: increase,
      };

      const { scanLinksText, keyboard } = generateTextFooter(token);
      const { name } = tokenData.baseToken;

      const message = `🏆 ${hardCleanUpBotMessage(
        name
      )} did *${cleanUpBotMessage(increase)}x* since trending 🏆

📍Discovery \\- $${formatM2Number(initialMC)}
📍Currently \\- $${formatM2Number(currentMC)}

Trending at \\#${index + 1}

📊 [*DexT*](${dexToolsLink}) \\| [*DexS*](${dexSLink})
${scanLinksText}`;

      try {
        await teleBot.api.sendMessage(CHANNEL_ID, message, {
          parse_mode: "MarkdownV2",
          // @ts-expect-error Type not found
          disable_web_page_preview: true,
          reply_markup: keyboard,
        });
      } catch (e) {
        // eslint-disable-next-line
        console.log(message);
        errorHandler(e);
      }
    }
  }

  // Remove token from tracking if not trending anymore
  for (const token in tokenMCTracking) {
    const isTokenTrending = trendingTokens.some(
      (trending) => trending.at(0) === token
    );
    if (!isTokenTrending) {
      delete tokenMCTracking[token];
    }
  }
}
