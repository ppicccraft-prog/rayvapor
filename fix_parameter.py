import re
with open('src/components/views/Parameter.tsx', 'r') as f:
    content = f.read()

content = content.replace("if (cachedData) { setData(cachedData); setIsLoading(false); return; }", "if (cachedData) { setGeneralParams(cachedData.params); setLiquidCategories(cachedData.liquid); setNote(cachedData.note); setIsLoading(false); return; }")

content = re.sub(r'(setNote\(currentNote\);)', r'\1\n          cachedData = { params, liquid, note: currentNote };', content)

with open('src/components/views/Parameter.tsx', 'w') as f:
    f.write(content)
