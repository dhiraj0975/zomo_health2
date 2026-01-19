import { NextFunction, Request, Response } from 'express';

// ALLOWLIST for known GOOD bots
const goodBotRegex = /googlebot|bingbot|slackbot|linkedinbot|duckduckbot|MyInternalPHPClient/i;

// BLOCKLIST for known BAD bots or suspicious tools
const badBotRegex = /bot|crawl|spider|slurp|curl|wget|python-requests|scrapy|ahrefsbot|semrushbot|mj12bot|dotbot|yandex|baidu|blexbot|seznambot|masscan|sqlmap|nmap/i;

export const botFirewall = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'];

  if (!userAgent) {
    return res.status(403).send('Access Forbidden: Invalid User-Agent.');
  }

  // First, check if it's a good bot and let it pass
  if (goodBotRegex.test(userAgent)) {
    return next();
  }

  // Next, check if it's a bad bot and block it
  if (badBotRegex.test(userAgent)) {
    console.log(`Blocked bad bot: ${userAgent}`);
    return res.status(403).send('Access Forbidden: Bots are not allowed.');
  }

  // Otherwise, it's a regular user. Let it pass.
  next();
};