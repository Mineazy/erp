import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

async function main() {
    try {
        const messages = [
            {
                role: 'user',
                parts: [{ type: 'text', text: 'Hello' }]
            }
        ];

        console.log("Calling streamText...");
        const result = await streamText({
            model: openai('gpt-4o'),
            messages: messages as any,
            system: "Test",
        });

        console.log("Success! toDataStreamResponse:", typeof result.toDataStreamResponse);
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

main();
