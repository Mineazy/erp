import { getAiTools } from '../src/lib/ai-tools';

async function main() {
    const tools = getAiTools('admin');
    
    console.log("=== Testing getDatabaseSchema ===");
    const schemaResults = await tools.getDatabaseSchema.execute({}, { messages: [], toolCallId: '1' });
    console.log(`Found ${schemaResults.length} models.`);
    
    console.log("\n=== Testing queryDatabase ===");
    const queryResults = await tools.queryDatabase.execute({
        modelName: 'erpProduct',
        queryArgs: {
            take: 2,
            select: { name: true, stock: true }
        }
    }, { messages: [], toolCallId: '2' });
    
    console.log("Query Results:");
    console.log(JSON.stringify(queryResults, null, 2));

    console.log("\n=== Testing queryDatabase RBAC (as sales querying HR) ===");
    const salesTools = getAiTools('sales');
    const rbacResults = await salesTools.queryDatabase.execute({
        modelName: 'erpEmployee',
        queryArgs: { take: 5 }
    }, { messages: [], toolCallId: '3' });
    console.log("RBAC Results:");
    console.log(JSON.stringify(rbacResults, null, 2));
}

main().catch(console.error);
