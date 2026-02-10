import os
import re

src_dir = r'd:\PROJETOS\brn-suite-escolas\src'
results = []

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find all <select tags (multiline included)
            selects = re.finditer(r'<select(.*?)>', content, re.DOTALL)
            for match in selects:
                tag_body = match.group(1)
                if 'title=' not in tag_body:
                    results.append(f"{path} : {match.group(0).replace('\n', ' ')}")

with open(r'd:\PROJETOS\brn-suite-escolas\audit_selects.txt', 'w', encoding='utf-8') as f:
    for r in results:
        f.write(r + '\n')

print(f"Found {len(results)} selects without title.")
