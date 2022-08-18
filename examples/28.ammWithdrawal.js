#!/usr/bin/env node
/* eslint-disable no-unused-vars */

/*
DO NOT EDIT THIS FILE BY HAND!
Examples are generated using helpers/buildExamples.js script.
Check README.md for more details.
*/

const sw = require('starkware_crypto')
const getWeb3 = require('./helpers/getWeb3')

const DVF = require('../src/dvf')
const envVars = require('./helpers/loadFromEnvOrConfig')(
  process.env.CONFIG_FILE_NAME
)
const logExampleResult = require('./helpers/logExampleResult')(__filename)

const ethPrivKey = envVars.ETH_PRIVATE_KEY
// NOTE: you can also generate a new key using:`
// const starkPrivKey = dvf.stark.createPrivateKey()
const starkPrivKey = envVars.STARK_PRIVATE_KEY
const rpcUrl = envVars.RPC_URL

const { web3, provider } = getWeb3(ethPrivKey, rpcUrl)

const dvfConfig = {
  api: envVars.API_URL,
  dataApi: envVars.DATA_API_URL,
  useAuthHeader: true,
  wallet: {
    type: 'tradingKey',
    meta: {
      starkPrivateKey: starkPrivKey
    }
  }
  // Add more variables to override default values
}

;(async () => {
  const dvf = await DVF(web3, dvfConfig)

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

  let ammDeposit = await dvf.postAmmFundingOrders(
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

})()
.catch(error => {
  console.error(error)
  process.exit(1)
})
