import re

def get_selects(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = re.finditer(r'<select(.*?)>', content, re.DOTALL)
    for i, match in enumerate(matches):
        tag = match.group(0).replace('\n', ' ')
        print(f"Select {i+1}: {tag}")

print("--- EntryFormModal.tsx ---")
get_selects(r'd:\PROJETOS\brn-suite-escolas\src\components\financial\EntryFormModal.tsx')
print("\n--- ReprogrammedBalancesModal.tsx ---")
get_selects(r'd:\PROJETOS\brn-suite-escolas\src\components\financial\ReprogrammedBalancesModal.tsx')
