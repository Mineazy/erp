const { streamText } = require('ai'); 
async function run() { 
    try {
        const res = await streamText({ 
            model: { specificationVersion: 'v1', id: 'test', provider: 'test', doStream: async () => {} }, 
            prompt: 'hi' 
        }); 
        console.log(Object.keys(res)); 
    } catch(e) {
        console.error(e.message);
    }
} 
run();
