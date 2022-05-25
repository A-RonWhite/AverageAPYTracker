const solanaWeb3 = require("@solana/web3.js");

const basisProjectedReturns = async () => {
  const solana = new solanaWeb3.Connection(
    "https://api.mainnet-beta.solana.com"
  );
  const basisAccount = new solanaWeb3.PublicKey(
    "3sBX8hj4URsiBCSRV26fEHkake295fQnM44EYKKsSs51"
  );

  const account = await solana.getParsedAccountInfo(basisAccount);
  const tokenVault = account.value.data.parsed.info.tokenAmount.uiAmount;

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const currDate = new Date();

  const currentYear = currDate.getFullYear();
  const currentMonth = currDate.getMonth() + 1; // 👈️ months are 0-based

  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);

  const projectedReturns = async () => {
    var t = tokenVault,
      currentMonthNum = currDate.getMonth(),
      daysInMonthNum = daysInCurrentMonth,
      emissions = [0, 3e7, 3e7, 2e7, 2e7, 1e7, 1e7, 1e7, 1e7, 1e7][
        currentMonthNum - 1
      ],
      emissionsPerDay = emissions / daysInMonthNum,
      l = 144,
      d = emissionsPerDay / l / t;
    console.log({
      currentMonth: currentMonthNum, //05
      daysInCurrentMonth: daysInMonthNum, //31
      emissions: emissions,
      emissionsPerDay: emissionsPerDay,
    });
    var m = d * l * 365;
    return 100 * (Math.pow(1 + m / 52560, 52560) - 1);
  };

  const APY = await projectedReturns();

  console.log(`Basis Print: ${APY}`);
  return Math.round(APY);
};

module.exports = { basisProjectedReturns };
