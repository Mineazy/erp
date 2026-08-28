import re
path = '/var/www/erp/prisma/schema.prisma'
with open(path, 'r') as f:
    content = f.read()
# Fix the mangled notes line
content = content.replace(
    'notes                    String?    @map(" notes)',
    'notes                    String?    @map("notes")'
)
with open(path, 'w') as f:
    f.write(content)
print('Fixed')
