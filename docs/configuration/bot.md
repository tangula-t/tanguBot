---
layout: default
title: Bot
parent: Configuration
nav_order: 2
---

# Bot configuration
The main configuration of the bot is done in `config.json`, provided in the repository is `config.json.example`

```
{
  "defaultTimeout": 600000,
  "discord": {
    "token": "Discord Bot Token",
    "clientId": "Discord client ID"
  },
  "telegram": {
    "token": "Telegram Token"
  },
  "prefix": "!"
}
```

- `defaultTimeout` is the default timeout for TaskInstance embeds. How much time the bot will remain listening to replies (buttons)
- `discord` Discord configuration settings
  - `token` Discord bot token (obtained via the Discord Developer Portal)
  - `clientId` Discord client ID (obtained via the Discord Developer Portal)
- `telegram`
  - `token` Telegram auth token Obtained via @BotFather
- `prefix` Prefix used for old style chat commands  (*I should remove this*)

