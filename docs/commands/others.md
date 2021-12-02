---
layout: default
title: Other commands
parent: Commands
nav_order: 5
---

# Other commands
{: .no_toc }

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

These commands are available to all.

## /createslave slave:`slave` master:`master` channel:`channel`
- `slave`: slave **user** 
- `master`: master **role**
- `channel`: channel **channel**

Create a slave-configuration-json with the current guild(server), `slave`, `master` and `channel`. Will include instructions on how to obtain a telegram userID

## /roll dice:`dice`
- `dice`: dice string to roll

Will roll the `dice` for you. For example '1d6' or '2d5+5' etc. 
Based on [node-roll](//github.com/troygoode/node-roll){:target="_blank"}

