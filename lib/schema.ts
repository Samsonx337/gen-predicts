export const marketSchema =
  'bytes32 marketId, string question, string category, uint64 deadline, string options, uint256 price, string imageUrl, address creator'

export const betSchema =
  'bytes32 marketId, address bettor, string option, uint256 amount'

export const resultSchema =
  'bytes32 marketId, string outcome, uint64 resolvedAt'


