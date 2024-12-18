# Telegram Integration for smallweb

## Install

First install the entrypoint:

```ts
// ~/smallweb/telegram/main.ts
import { Telegram } from "jsr:@smallweb/telegram@<version>";

const telegram = new Telegram();

export default telegram;
```

Then, register the app as an admin app:

```json
// ~/.smallweb/config.json
{
    // ...
    "adminApps": [
        // ...
        "telegram"
    ]
}
```

## Initial Setup

1. Create a new bot using the [BotFather](https://t.me/botfather)
2. Set-up the required environment variables
    - Copy the token and set it as the `TELEGRAM_BOT_TOKEN` environment variable
    - Set the `TELEGRAM_BOT_SECRET` environment variable to a random string
3. Use `smallweb run telegram set-webhook` to set the webhook

You should also set up the `TELEGRAM_CHAT_ID` environment variable to the chat id of the chat that should be allowed to run smallweb commands.

## Usage

Most cli commands are available. Use `help` to see the list of available commands.
