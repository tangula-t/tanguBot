---
layout: default
title: Tasklist
parent: Configuration
nav_order: 0
---

# Tasklist configuration
{: .no_toc }

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

# Intro
The slave tasklist configuration are found in `./slaves/<slavename>/tasks/*.json`. All json files in this folder are interpreted as tasklist-files. A file can contain one or more tasklists

```
{
  "tasklistName": [
    {
      "task": "First task",
      "chance": 1
    },
    {
      "task": "Second task",
      "chance": 2
    }
  ],
  "tasklistName2: [ ... ]
}
```


# Tasklist sections

The simplest task has a [`task`](#task), the text of what to do and a [`chance`](#chance). But they can be extended with [`timeout`](#timeout) and [`replies`](#replies)

```
...
  {
    "task": ..,
    "chance": ..,
    "timeout": ..,
    "replies": ..
  },
...
```

## task
The `task` string of a tasklist is a single string that represents the task. There are some optional things that will be parsed.

- `[#]` will be replaced with a random number up to and including `#`  
*example* `[6]` will be a number between 1 and 6
- `[a:b]` will be replaced with a random number between `a` and `b`  
*example* `[1:6]` will be a number between 1 and 6
- `[xxx?]` has a 50 percent chance of printing `xxx`   
*example* `[Something fishy is going on?]` has an equal chance of printing `Something fishy is going on` or ` `(nothing) at that place
- `[a|b|..|d]` has an equal chance of printing each of the items.   
*example* `[a|b|c]` had an equal chance or printing either `a`, `b` or `c`

- `(#%[];#%[])` Sets a percentual chance for `[]`. `[]` wil have been parsed as above.  
*example* `(40%[6];60%[6:8])` has a 40% chance of a random number up to 6. And a 60% chance of a random number between 6 and 8

## chance
### Simple integer chance
The `chance` can be a single `integer` (whole number). All chances will be accumulated, then divided by the total to get the percentual chance of a task occuring.
```
  ..
  chance: 5,
  ..
```

### Variable based chance
A `chance` can also have multiple logical evaluations to vary the chance. First match is used.

```
  ..
  chance: { 
    "variable<5": 1,
    "(variable>7)&&(anotherVariable==false)": 2,
    "(timehour>=23)||(timehour<6)": 3,
    "true": 4
  },
  ...
```

This task will have a relative chance of 
- **1**: if `variable` is a number below 5 (not 5)
- **2**: if `variable` is a number above 7 (not 7) and `anotherVariable` is `false`
- **3**: if the hour (GMT) is above or equal to 23 or before 6 
- **4**: if none of the above are matched

`chance` evaluations have access to all of a slaves `state` variables (could be initialised with a [status]({% link configuration/slave.md %}#statusesjson). In addition there are 3 date related variables:
- `timeday` Day of week
- `timehour` Hour of day
- `timeminute` Minute of hour

## replies

Replies present as buttons under a discord embed. In addition to all these buttons, a cancel-button is always presented. Should the slave press cancel, @master-role role is pinged.

```
  ..
  "replies": {
    "Button A": {
      "status": {
        "stateVariable": 5
      },
      "reply": "Some text reply"
    },
    "Button B": {
      "status": {
        "stateVariable": -10
      },
      "tasklist": "taskList"
    },
    "Button C": {
      "tasks": [
        { "chance": 1, "task": "test1" },
        { "chance": 1, "task": "test2" }
      ]
    } 
},
  ...
```

In this example, pressing
- `Button A` will increase `stateVariable` in the slaves state with 5, and show a simple text reply `Some text reply`. 
- `Button B` will descrease the `stateVariable` and execute `taskList` for a new task.
- `Button C` demonstrates using a `tasks` field (instead of `taskList`-reference) to define a reply-tasklist inline.

## timeout
The configuration for a timeout is the same as a reply. Except that the timeout adds a `time` field to indicate the time to wait.  
This could for example be used to enforce a state-change, or assigning a new task if no reply is given within time.

```
  ...
  "timeout": {
    "time": 3000,
    "status": {
      "someState": false
    }
  },
  ...
```
In this example, after 3000ms,  `someState` will be set to false.


```
  ...
  "timeout": {
    "time": 45000,
    "tasklist": "someTaskList"
  },
  ...
```
In this second example, if no reply (button) is received within 45000ms, a new/additional task is selected from `someTaskList`
