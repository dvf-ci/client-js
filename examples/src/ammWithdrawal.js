const waitForDepositCreditedOnChain = require('./helpers/waitForDepositCreditedOnChain')

const token1 = 'ETH'
const token2 = 'USDT'

if (process.env.DEPOSIT_FIRST === 'true') {
  const depositETHResponse = await dvf.deposit(token1, 0.1, starkPrivKey)
  const depositUSDTResponse = await dvf.deposit(token2, 1000, starkPrivKey)

  if (process.env.WAIT_FOR_DEPOSIT_READY === 'true') {
    await waitForDepositCreditedOnChain(dvf, depositETHResponse)
    await waitForDepositCreditedOnChain(dvf, depositUSDTResponse)
  }
}

const pool = `${token1}${token2}`

const ammDepositOrderData = await dvf.getAmmFundingOrderData({
  pool,
  token: token1,
  amount: 0.1
})

let ammDeposit = await dvf.postAmmFundingOrder(
  ammDepositOrderData
)

await P.retry(
  { times: 360, interval: 1000 },
  async () => {
    ammDeposit = await dvf.getAmmFunding(ammDeposit._id)
    if (ammDeposit.pending) {
      throw new Error('funding order for amm deposit still pending')
    }
  }
)

const { BN } = Web3.utils

const ammWithdrawalOrderData = await dvf.getAmmFundingOrderData({
  pool,
  token: `LP-${pool}`,
  // Withdraw previously deposited liquidity by returning all LP tokens.
  amount: ammDeposit.orders.reduce(
    (sum, order) => sum.add(new BN(order.amountBuy)),
    new BN(0)
  )
})

const ammWithdrawal = await dvf.postAmmFundingOrders(
  await dvf.applyFundingOrderDataSlippage(ammWithdrawalOrderData, 0.05)
)

logExampleResult(ammWithdrawal)
