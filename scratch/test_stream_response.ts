import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function test() {
    const result = await streamText({
        model: openai('gpt-4o'),
        prompt: 'test'
    });
    const response = result.toUIMessageStreamResponse();
    console.log(response.status);
    console.log(response.headers);
}

test().catch(console.error);
