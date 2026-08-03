const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');

// Replace @default("'value'") with @default("value")
schema = schema.replace(/@default\("'(.*?)'"\)/g, '@default("$1")');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema quotes fixed successfully!');
