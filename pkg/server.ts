import { Hono } from "hono"
import shlex from "shlex"

export function createServer(params: { chatID?: string, botToken: string, secretToken?: string }) {
    const { SMALLWEB_CLI_PATH, SMALLWEB_DIR } = Deno.env.toObject();
    return new Hono()
        .get("/", () => new Response("Telegram bot is running!"))
        .post("/", async (c) => {
            if (params.secretToken && c.req.header("x-telegram-webhook-secret") !== params.secretToken) {
                return new Response("Invalid secret", { status: 401 });
            }

            const update = await c.req.json()
            if (!update.message) {
                return new Response("OK")
            }

            if (!update.message?.text) {
                return
            }

            const chatID = update.message.chat.id.toString()
            if (params.chatID && chatID !== params.chatID) {
                console.error("Invalid chat ID")
                return new Response("OK")
            }

            const args = shlex.split(update.message.text);
            const command = new Deno.Command(SMALLWEB_CLI_PATH, {
                cwd: SMALLWEB_DIR,
                signal: c.req.raw.signal,
                args,
            })
            const output = await command.output()

            const text = new TextDecoder().decode(output.code === 0 ? output.stdout : output.stderr)
            await sendChunkedMessage(params.botToken, chatID, text);

            return new Response("OK")
        })
}

async function sendChunkedMessage(botToken: string, chatID: string, text: string) {
    const chunkSize = 4000;
    const lines = text.split('\n');
    let currentChunk = '';
    const chunks = [];

    for (let line of lines) {
        // Split long lines
        while (line.length > chunkSize) {
            const splitPoint = line.lastIndexOf(' ', chunkSize);
            const splitAt = splitPoint > 0 ? splitPoint : chunkSize;
            const linePart = line.substring(0, splitAt);
            line = line.substring(splitAt);

            if (currentChunk.length + linePart.length + 1 > chunkSize) {
                chunks.push(currentChunk);
                currentChunk = linePart;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + linePart;
            }
        }

        if (currentChunk.length + line.length + 1 > chunkSize) {
            chunks.push(currentChunk);
            currentChunk = line;
        } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    for (const chunk of chunks) {
        if (!chunk) {
            continue;
        }

        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: chatID,
                parse_mode: "MarkdownV2",
                text: ["```", chunk, "```"].join("\n"),
            }),
        });

        if (!res.ok) {
            console.error(await res.text());
        }
    }
}
