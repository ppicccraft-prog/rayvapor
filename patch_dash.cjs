const fs = require("fs");
let code = fs.readFileSync("src/components/DashboardContent.tsx", "utf8");

code = code.replace(
  "import { ReportBundling } from './views/ReportBundling';",
  "import { ReportBundling } from './views/ReportBundling';\nimport { Chatbot } from './Chatbot';"
);

code = code.replace(
  "return (\n    <div className=\"flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50\">\n      <div className=\"w-full space-y-6 lg:space-y-8\">\n        {renderContent()}\n      </div>\n    </div>\n  );",
  "return (\n    <div className=\"flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50 relative\">\n      <div className=\"w-full space-y-6 lg:space-y-8\">\n        {renderContent()}\n      </div>\n      <Chatbot contextData={{ activeMenu, stats: parsedData.stats, topProducts: parsedData.topProducts.slice(0, 10), monthlyTrend: parsedData.monthlyTrend }} />\n    </div>\n  );"
);

fs.writeFileSync("src/components/DashboardContent.tsx", code);
