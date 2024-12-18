import { Hono } from "hono"
import shlex from "shlex"
import { exists } from "@std/fs"

if (!await exists("data")) {
    await Deno.mkdir("data")
}


export function createServer(params: { chatID?: string, botToken: string, secretToken?: string }) {
    const { SMALLWEB_CLI_PATH, SMALLWEB_DIR } = Deno.env.toObject();
    return new Hono()
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
            const res = await fetch(`https://api.telegram.org/bot${params.botToken}/sendMessage`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chat_id: chatID,
                    parse_mode: "MarkdownV2",
                    text: ["```", text, "```"].join("\n"),
                }),
            });

            if (!res.ok) {
                console.error(await res.text())
            }

            return new Response("OK")
        })
}

