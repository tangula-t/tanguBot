---
layout: default
title: Installation 
has_children: false 
---

# Seup your own tangubot

# Prerequisites
The bot runs on nodeJS - it can run on a host, but also from a docker container.
NPM is used to handle dependencies
'tangubot.sh' assumes docker is available.

# Clone repository
Clone the repository from [tanguBot at GitHub](//github.com/tangula-t/tanguBot)

# Get the discord clientId and token for your new bot

1. Login to discord in a browser and navigate to: [https://discord.com/developers/applications](//discord.com/developers/applications)
2. Select the button in the top-right corner 'New Application'.
3. Give your application a name
4. From the 'General Information' page for your new application, copy the 'APPLICATION ID' and set this in your [config.json]({% link configuration/bot.md %}) as discord clientId
5. On the page "Bot" (Left menu), click the 'Create bot' button
6. Copy the 'TOKEN' and set this in your [config.json]({% link configuration/bot.md %}) as discord token

# Optional Telegram API key

From your telegram account, send a new message to [@BotFather](//t.me/BotFather): `/newbot`. BotFather will ask you some questions and give you the token. Set this in your [config.json]({% link configuration/bot.md %}) as telegram token.

# Invite to guild

Go back to [https://discord.com/developers/applications](//discord.com/developers/applications) and select your application. There open the OAuth2 menu and the URL Generator.
Select 'bot' and 'application.commands' in the top 'scopes'. Then 'Administrator' in the lower one. Open the generated URL in your browser and select the server you want it added in.

# Configure a slave

In /slaves, copy the empty_slave folder to a folder with the name of your slave. Create a designated channel for your slave, and a master-role. 
Then edit all config files accordingly: See [Slave configuration]({% link configuration/slave.md %}). 
