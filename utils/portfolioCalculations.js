 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/utils/portfolioCalculations.js b/utils/portfolioCalculations.js
index 5f2fb765072a7cb05f0aeb80f4448a52b73d7587..14fd8659a1b0c41f787fd2ac5f43d19f50d94ac7 100644
--- a/utils/portfolioCalculations.js
+++ b/utils/portfolioCalculations.js
@@ -1,12 +1,17 @@
 // Example helper functions your tests will call
 
 export function calculateExpectedReturn(portfolio) {
   return portfolio.reduce((acc, asset) => acc + asset.weight * asset.expectedReturn, 0);
 }
 
 export function calculateFutureValue(currentSavings, monthlyContribution, annualReturn, years) {
   const r = annualReturn / 12;
   const n = years * 12;
+
+  if (r === 0) {
+    return currentSavings + monthlyContribution * n;
+  }
+
   return currentSavings * Math.pow(1 + r, n) +
          monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
 }
 
EOF
)
