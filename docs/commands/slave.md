---
layout: default
title: /Slave
parent: Commands
nav_order: 0
---

# /slave
{: .no_toc }

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

/slave commands are only available to the discord user that's in the configuration file as a slave.

## /slave reload
Reload the slaves tasklist(s) and state.

## /slave permission for:`for`
- `for`: Thing to ask permission for.
 
Request permission for `for`.  
This will reply based on the tasklist associated with this permission in your configuration. If `for` is not found
in your configuration an ephemeral reply is shown with the valid permissions that can be asked for.  

## /slave status 
### /slave status set:`status`
- `status`: Status to set.

Set your status to `status`.
This will set your status, and execute possible state-initialisations based on your configuration. If `status` is not a
valid status for you, an ephemeral reply is shown with the valid statuses.

### /slave status task
Request a task for your current status.
This will execute the associated tasklist (if any) from your configuration.

## /slave chore **TODO**
TODO
{: .label .label-yellow }


## /slave camjoin (temporary)
Execute the 'oncam' tasklist and announce to `#bot-channel`

## /slave wake (temporary)
Execute the 'wake' tasklist
