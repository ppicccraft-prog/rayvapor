import re

filepath = 'src/components/views/OverviewRekomendasi.tsx'
with open(filepath, 'r') as f:
    content = f.read()

if 'let cachedMetrics' not in content:
    content = re.sub(
        r'(import .*?;?\n+)(export (?:default )?function)', 
        r'\1let cachedMetrics: any = null;\n\n\2', 
        content,
        count=1
    )
    
    content = re.sub(
        r'(const \[metrics, setMetrics\] = useState<any>)\(null\);',
        r'\1(cachedMetrics);',
        content
    )

    content = re.sub(
        r'(const \[loading, setLoading\] = useState)\(true\);',
        r'\1(!cachedMetrics);',
        content
    )

    content = re.sub(
        r'(async function loadData\(\) {\n\s*try {)',
        r'async function loadData() {\n      if (cachedMetrics) { setMetrics(cachedMetrics); setLoading(false); return; }\n      try {',
        content
    )

    content = re.sub(
        r'(setMetrics\(\{)',
        r'cachedMetrics = {',
        content
    )
    
    content = re.sub(
        r'(cachedMetrics = \{.*?\n\s*\})(\);)',
        r'\1;\n        setMetrics(cachedMetrics\2',
        content,
        flags=re.DOTALL
    )

with open(filepath, 'w') as f:
    f.write(content)
print("Patched OverviewRekomendasi")
