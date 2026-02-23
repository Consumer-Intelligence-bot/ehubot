/**
 * Run validation checks against the demo data.
 * Returns an array of { check, expected, actual, pass }.
 * Use from browser console (Ctrl+Shift+V when app is loaded) or /validation route.
 */
export function runValidation(data) {
  const results = [];

  function addCheck(name, expected, actual) {
    const pass =
      typeof expected === 'number' && typeof actual === 'number'
        ? Number.isInteger(expected)
          ? actual === expected
          : Math.abs(actual - expected) < 0.01
        : actual === expected;
    results.push({ check: name, expected, actual, pass });
  }

  if (!data || data.length === 0) {
    results.push({ check: 'Data loaded', expected: 'non-empty array', actual: data?.length ?? 0, pass: false });
    return results;
  }

  // Total renewals
  addCheck('Total renewals', 161, data.length);

  // Unique insurers
  const uniqueInsurers = new Set(data.map(r => r.CurrentCompany).filter(Boolean)).size;
  addCheck('Unique insurers', 34, uniqueInsurers);

  // Shoppers count
  const shoppers = data.filter(r => r.Shoppers === 'Shoppers').length;
  addCheck('Shoppers count', 112, shoppers);

  // Non-shoppers count
  const nonShoppers = data.filter(r => r.Shoppers === 'Non-shoppers').length;
  addCheck('Non-shoppers count', 49, nonShoppers);

  // Switcher count
  const switchers = data.filter(r => r.Switchers === 'Switcher').length;
  addCheck('Switcher count', 48, switchers);

  // Non-switcher count
  const nonSwitchers = data.filter(r => r.Switchers === 'Non-switcher').length;
  addCheck('Non-switcher count', 112, nonSwitchers);

  // New-to-market count
  const newToMarket = data.filter(r => r.Switchers === 'New-to-market').length;
  addCheck('New-to-market count', 1, newToMarket);

  // Price change percentages (excluding new-to-market = 160 base)
  const priceBase = data.filter(
    r =>
      r['Renewal premium change'] !==
      "I didn't have a motor insurance policy before my recent renewal/purchase"
  );
  addCheck('Price analysis base (excl new-to-market)', 160, priceBase.length);

  const priceUp = priceBase.filter(r => r['Renewal premium change'] === 'Higher').length;
  addCheck('Price Up count', 79, priceUp);
  addCheck('Price Up %', 0.494, priceUp / priceBase.length);

  const priceDown = priceBase.filter(r => r['Renewal premium change'] === 'Lower').length;
  addCheck('Price Down count', 57, priceDown);
  addCheck('Price Down %', 0.356, priceDown / priceBase.length);

  const unchanged = priceBase.filter(r => r['Renewal premium change'] === 'It was unchanged').length;
  addCheck('Unchanged count', 24, unchanged);
  addCheck('Unchanged %', 0.15, unchanged / priceBase.length);

  // Shopping rate
  addCheck('Shopping rate', 0.696, shoppers / data.length);

  // Non-shopping rate
  addCheck('Non-shopping rate', 0.304, nonShoppers / data.length);

  // PCW usage (of shoppers)
  const shoppersData = data.filter(r => r.Shoppers === 'Shoppers');
  const pcwYes = shoppersData.filter(r => r['Did you use a PCW for shopping'] === 'Yes').length;
  addCheck('PCW usage (of shoppers)', 0.911, pcwYes / shoppersData.length);

  // Insurers with n >= 50
  const insurerCounts = {};
  data.forEach(r => {
    const name = r.CurrentCompany;
    if (name) insurerCounts[name] = (insurerCounts[name] || 0) + 1;
  });
  const over50 = Object.values(insurerCounts).filter(n => n >= 50).length;
  addCheck('Insurers with n >= 50', 0, over50);

  return results;
}
