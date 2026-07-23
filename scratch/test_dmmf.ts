import { Prisma } from '@prisma/client';

const models = Prisma.dmmf.datamodel.models;
console.log(`Found ${models.length} models.`);
if (models.length > 0) {
    const firstModel = models[0];
    console.log(`First model: ${firstModel.name}`);
    console.log(`Fields: ${firstModel.fields.map(f => f.name).join(', ')}`);
}
