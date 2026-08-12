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
    with open(filepath, 'r') as f:
        content = f.read()

    if 'let cachedData' not in content:
        # insert before export function
        content = re.sub(
            r'(export (?:default )?function)', 
            r'let cachedData: any = null;\n\1', 
            content,
            count=1
        )
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
