const path = `44'/60'/0'/0'/0`
const token = 'ETH'
const amount = 0.10

const starkWithdrawalData = await rhinofi.stark.ledger.createWithdrawalData(
  path,
  token,
  amount
)

const withdrawResponse = await rhinofi.ledger.withdraw(
  token,
  amount,
  starkWithdrawalData
)

logExampleResult(withdrawResponse)
