---
layout: default
title: /Master
parent: Commands
nav_order: 1
---

# /master
{: .no_toc }

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

/master commands are available to discord users having the 'master role' for one or more slaves. A master can only use the commands on the slave their role is configured for.

## /master reload [slave: `slave`]
- `slave`: User to reload\*

Reload the slaves tasklist(s) and state.   

## /master state
### /master state get [slave: `slave`]
- `slave`: User to reload\*

Get the current state (list) of the slave. May have multiple pages.

### /master state set id:`id` value:`value` [slave: `slave`]
- `value`: New value
- `id`: state setting
- `slave`: User to reload\*

Set `id` to `value`. `id` must be an existing state (see /master state get). `value` is checked against the current type. Can only set a number to a number, a boolean to a boolean, or a string otherwise.

### /master listtasks tasklist:`tasklist` [slave: `slave`]
- `tasklist`: Name of the tasklist.
- `slave`: User to reload\*

Shows the master the current tasklist, with their chances based on the current state.

### /master givetask tasklist`tasklist` [slave: `slave`]
- `tasklist`: Name of the tasklist.
- `slave`: User to reload\*

Execute the `tasklist`: Hand the slave a task from `tasklist` based on it's chances.

## /master task **TODO**
Should have 'give' and 'list' here. Maybe 'custom' and/or 'test'. Though test could be a separate command.  

TODO
{: .label .label-yellow }
  
  


\*`slave` Argument is required when more than 1 slave is known in the guild (server). It's non-existant when there is only 1 slave.
