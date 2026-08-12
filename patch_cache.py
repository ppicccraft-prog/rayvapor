import os
import re

components = [
    'src/components/views/TransferToko.tsx',
    'src/components/views/Bundling.tsx',
    'src/components/views/Diskon.tsx',
    'src/components/views/Forecast.tsx',
    'src/components/views/BiLiquid.tsx',
    'src/components/views/RiwayatPembelian.tsx',
    'src/components/views/TransaksiPenjualan.tsx',
    'src/components/views/Parameter.tsx'
]

for filepath in components:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}")
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()

    if 'let cachedData' in content:
        print(f"Already patched {filepath}")
        continue

    # 1. Add let cachedData after imports
    content = re.sub(
        r'(import .*?;?\n+)(export (?:default )?function)', 
        r'\1let cachedData: any = null;\n\n\2', 
        content,
        count=1
    )

    # 2. Change useState for data
    # const [data, setData] = useState<any[]>([]); -> const [data, setData] = useState<any[]>(cachedData || []);
    content = re.sub(
        r'(const \[data, setData\] = useState<[^>]*>)\(\[\]\);',
        r'\1(cachedData || []);',
        content
    )

    # 3. Change setIsLoading
    # const [isLoading, setIsLoading] = useState(true); -> const [isLoading, setIsLoading] = useState(!cachedData);
    content = re.sub(
        r'(const \[isLoading, setIsLoading\] = useState)\(true\);',
        r'\1(!cachedData);',
        content
    )

    # 4. Skip fetching if cached
    # const fetch... = async () => {\n    setIsLoading(true);
    # -> const fetch... = async () => {\n    if (cachedData) { setData(cachedData); setIsLoading(false); return; }\n    setIsLoading(true);
    content = re.sub(
        r'(const fetch.*? = async.*?{)(\s*setIsLoading\(true\);)',
        r'\1\n    if (cachedData) { setData(cachedData); setIsLoading(false); return; }\2',
        content
    )

    # 5. Cache the results
    # setData(results.data); -> cachedData = results.data; setData(results.data);
    content = re.sub(
        r'(setData\(results\.data.*?\);)',
        r'cachedData = results.data; \1',
        content
    )
    
    # 6. For Parameter.tsx specifically (has setData(results.data as any[]) or something? Let's catch generic setData)
    # Actually wait, maybe it doesn't use results.data directly. Let's see.

    with open(filepath, 'w') as f:
        f.write(content)
        
    print(f"Patched {filepath}")

