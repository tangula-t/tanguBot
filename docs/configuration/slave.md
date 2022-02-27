---
layout: default
title: Slave
parent: Configuration
nav_order: 0
---

# Slave configuration
{: .no_toc }

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

The slave configuration are found in `./slaves/<slavename>/*`

## config.json
Main slave configuration is in `config.json`
```{
  "name": "EXAMPLE",
  "ids": {
    "guild": "Discord Guild ID",
    "discord": "Discord Slave UserID",
    "discordchannel": "Discord Slave Bot Interaction Channel",
    "masterrole": "Discord Role ID of master role",
    "telegram": "Telegram UserID"
  }
}
```
- `name` Name of the slave. Mostly internal, occasionaly used in communication
- `ids` IDs for this slave
  - `guild` ID of the Discord Guild (server) this slave is in
  - `discord` Discord User ID for the slave
  - `discordchannel` ID of the main discord channel to use for communication
  - `masterrole` ID of the master-role in the guild this slave is in
  - `telegram` Optional Telegram ID of the slave for notifications

Most of these IDs can be generated with [/createslave]({% link commands/others.md %}#createslave-slaveslave-mastermaster-channelchannel)

## permissions.json
All the things the slave can ask permission for are in `permissions.json`
```
{
        "name": {
                "status": {
                        "merit": -1
                },
                "tasks": "taskList"
        },
	"anotherName": {
		tasks: "taskList2"
	}
}
```
Given the example above, the slave can ask permission for `name` and `anotherName` with [/slave permission]({% link commands/slave.md %}#slave-permission-forfor).  
Asking for `name` will decrease the slave state-variable `merit` by 1. `name` will execute `taskList`
`tasks` is required. `status` is not.

## statuses.json
All the statuses a slave can set are in `statuses.json`
```
{
  "name": {
    "description": "Free Text",
      "forcestate": {
        "aStateVariable": 1
      },
      "ignoreStateAfter": ["name2"]
  },
  "name2": {
    "description": "Free text for name2",
    "forcestate": {
      "test":2
    },
    "timer": {
      "time": 60,
      "tasklist": "timertasks"
    }
  },
  "name3": {
    "description": "Free Text for name 3",
    "tasklist": "taskList"
  }
``` 
In the example above there are 3 statuses for the slave to set: `name`, `name2` and `name3`.
- When the slave sets their status to `name`, `aStateVariable` will be initialised to 1, unless the previous state was `name2`.
- When the slave sets their status to `name2`, `test` will be initialised to 2.
- When the slave sets their status to `name2`, every 60 seconds a task from tasklist `timertasks` will be chosen
- When the slave sets their status to `name3`, [/slave status task]({% link commands/slave.md %}#slave-status-task) will execute tasklist `taskList`


All settings, except description are optional.

TODO
{: .label .label-yellow }
incomplete!

## slave.json
`slave.json` contains the current state and location of the slave. This file is edited by the bot.
```
{ 
  "state": {
    "stateVar1": 1,
    "stateVar2": true,
    "stateVar3": "text"
  },
  "status": "something"
}
```

Initialising this file with  `{ "state": { "merit": 0 } }` should suffice.

## tasks/*.json
In this folder all [tasklists]({% link configuration/tasklist.md %}) reside.


