import { Context } from "hono";
import { stream, streamText, streamSSE } from 'hono/streaming'
import {EventStreamContentType, fetchEventSource} from '@fortaine/fetch-event-source';
import {StatusCode} from "hono/dist/types/utils/http-status";


let id = 0

const upStreamUrl:string = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

async function chatCompletions (c: Context){

    let streamResponse:boolean = true;

    let failedStatusCode:StatusCode|null = null;
    let failedMessage:string|null = null;

    let fetchES = await fetchEventSource(upStreamUrl, {
        async onopen(response:Response) {
            if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
                console.log("onOpen:", response);

                return; // everything's good

            } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                // client-side errors are usually non-retriable:
                console.log("onOpen, but has error:", response);

                streamResponse = false;

                const contentType = response.headers.get("content-type");
                console.log("upstream response content type: ", contentType);

                if (contentType?.startsWith("text/plain") || contentType?.startsWith("application/json")) {
                    let responseText:string = await response.clone().text();
                    console.log("statusCode:",response.status);
                    console.log("responseText:",responseText);

                    failedStatusCode = response.status as StatusCode;
                    failedMessage = responseText;

                }

                console.log("fallback to json response");

            } else {
                console.log("onOpen, but content-type not except:", response);
            }
        },
        onmessage(msg) {
            // if the server emits an error message, throw an exception
            // so it gets handled by the onerror callback below:

            console.log("onMessage:", msg);
        },
        onclose() {
            // if the server closes the connection unexpectedly, retry:

            console.log("onClose");
        },
        onerror(err:Response) {
            console.log("onerror:", err);
        }
    });

    console.log("after fetchES");
    console.log("streamResponse:", streamResponse);

    if(streamResponse === true){
        return streamSSE(c, async (stream) => {
        });
    }else{
        c.status(failedStatusCode!);
        c.res.headers.set("Content-Type","application/json");
        return c.text(failedMessage!)
    }
}

export {
    chatCompletions
}